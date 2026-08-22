import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const HEALTH_URL = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export type BackendStatus = "checking" | "online" | "offline" | "paused";

export type WatchdogState = {
  status: BackendStatus;
  lastCheckedAt: Date | null;
  attempts: number;
  nextRetryInMs: number;
  lastError: string | null;
  lastRequestId: string | null;
  lastHttpStatus: number | null;
  latencyMs: number | null;
  retryNow: () => Promise<boolean>;
};

/**
 * Watchdog: backend (hosted database) paused/unreachable হলে exponential
 * backoff সহ বারবার পিং করে, আবার অনলাইনে এলে সব query রিফ্রেশ করে।
 */
export function useBackendWatchdog(options?: {
  baseDelayMs?: number;
  maxDelayMs?: number;
  healthyIntervalMs?: number;
}): WatchdogState {
  const baseDelayMs = options?.baseDelayMs ?? 5000; // প্রথম রিট্রাই ৫ সেকেন্ড
  const maxDelayMs = options?.maxDelayMs ?? 300000; // সর্বোচ্চ ৫ মিনিট
  const healthyIntervalMs = options?.healthyIntervalMs ?? 60000;
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<BackendStatus>("checking");
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [nextRetryInMs, setNextRetryInMs] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [lastHttpStatus, setLastHttpStatus] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const statusRef = useRef<BackendStatus>("checking");
  const attemptsRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const backoffFor = useCallback(
    (failures: number) => {
      const exp = baseDelayMs * Math.pow(2, Math.max(0, failures - 1));
      const capped = Math.min(exp, maxDelayMs);
      // jitter ±20% যাতে সব ট্যাব একসাথে হিট না করে
      const jitter = capped * 0.2 * (Math.random() * 2 - 1);
      return Math.round(capped + jitter);
    },
    [baseDelayMs, maxDelayMs]
  );

  const ping = useCallback(async () => {
    const started = performance.now();
    try {
      const controller = new AbortController();
      const t = window.setTimeout(() => controller.abort(), 8000);
      const res = await fetch(HEALTH_URL, {
        method: "GET",
        headers: { apikey: API_KEY },
        signal: controller.signal,
        cache: "no-store",
      });
      window.clearTimeout(t);
      const rid =
        res.headers.get("x-request-id") ||
        res.headers.get("sb-request-id") ||
        res.headers.get("cf-ray");
      const ok = res.ok || res.status === 401 || res.status === 404;
      return {
        ok,
        httpStatus: res.status,
        requestId: rid,
        error: ok ? null : `HTTP ${res.status} ${res.statusText}`,
        paused: res.status === 503 || res.status === 540 || res.status === 544,
        latency: Math.round(performance.now() - started),
      };
    } catch (e: any) {
      return {
        ok: false,
        httpStatus: null,
        requestId: null,
        error: e?.name === "AbortError" ? "Timeout (8s)" : e?.message || "Network error",
        paused: false,
        latency: Math.round(performance.now() - started),
      };
    }
  }, []);

  const check = useCallback(async () => {
    const r = await ping();
    setLastCheckedAt(new Date());
    setLastError(r.error);
    setLastRequestId(r.requestId);
    setLastHttpStatus(r.httpStatus);
    setLatencyMs(r.latency);

    const failures = r.ok ? 0 : attemptsRef.current + 1;
    attemptsRef.current = failures;
    setAttempts(failures);

    const next: BackendStatus = r.ok ? "online" : r.paused ? "paused" : "offline";
    const was = statusRef.current;
    statusRef.current = next;
    setStatus(next);

    if (r.ok && (was === "offline" || was === "paused")) {
      queryClient.invalidateQueries();
      queryClient.refetchQueries({ type: "active" });
    }
    return r.ok;
  }, [ping, queryClient]);

  useEffect(() => {
    let cancelled = false;

    const startCountdown = (ms: number) => {
      if (countdownRef.current) window.clearInterval(countdownRef.current);
      const target = Date.now() + ms;
      setNextRetryInMs(ms);
      countdownRef.current = window.setInterval(() => {
        const left = target - Date.now();
        setNextRetryInMs(left > 0 ? left : 0);
      }, 1000);
    };

    const run = async () => {
      if (cancelled) return;
      const ok = await check();
      if (cancelled) return;
      const delay = ok ? healthyIntervalMs : backoffFor(attemptsRef.current);
      startCountdown(delay);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(run, delay);
    };

    run();

    const onFocus = () => {
      if (statusRef.current !== "online") run();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (countdownRef.current) window.clearInterval(countdownRef.current);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [check, backoffFor, healthyIntervalMs]);

  const retryNow = useCallback(async () => {
    attemptsRef.current = Math.max(0, attemptsRef.current);
    return check();
  }, [check]);

  return {
    status,
    lastCheckedAt,
    attempts,
    nextRetryInMs,
    lastError,
    lastRequestId,
    lastHttpStatus,
    latencyMs,
    retryNow,
  };
}
