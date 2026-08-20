import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const HEALTH_URL = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export type BackendStatus = "checking" | "online" | "offline";

/**
 * Watchdog: backend (hosted database) paused/unreachable হলে নির্দিষ্ট
 * ইন্টারভ্যালে বারবার পিং করে, আবার অনলাইনে এলে সব query রিফ্রেশ করে।
 */
export function useBackendWatchdog(options?: {
  intervalMs?: number;
  healthyIntervalMs?: number;
}) {
  const intervalMs = options?.intervalMs ?? 15000; // offline: প্রতি ১৫ সেকেন্ডে
  const healthyIntervalMs = options?.healthyIntervalMs ?? 60000; // online: প্রতি ১ মিনিটে
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<BackendStatus>("checking");
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [attempts, setAttempts] = useState(0);
  const statusRef = useRef<BackendStatus>("checking");
  const timerRef = useRef<number | null>(null);

  const ping = useCallback(async (): Promise<boolean> => {
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
      return res.ok || res.status === 401 || res.status === 404;
    } catch {
      return false;
    }
  }, []);

  const check = useCallback(async () => {
    const ok = await ping();
    setLastCheckedAt(new Date());
    setAttempts((a) => (ok ? 0 : a + 1));
    const next: BackendStatus = ok ? "online" : "offline";
    const was = statusRef.current;
    statusRef.current = next;
    setStatus(next);
    // paused → active হলে সব ডেটা আবার লোড করি
    if (ok && was === "offline") {
      queryClient.invalidateQueries();
      queryClient.refetchQueries({ type: "active" });
    }
    return ok;
  }, [ping, queryClient]);

  useEffect(() => {
    let cancelled = false;

    const schedule = (ms: number) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(run, ms);
    };

    const run = async () => {
      if (cancelled) return;
      const ok = await check();
      if (cancelled) return;
      schedule(ok ? healthyIntervalMs : intervalMs);
    };

    run();

    const onFocus = () => {
      if (statusRef.current === "offline") run();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [check, intervalMs, healthyIntervalMs]);

  return { status, lastCheckedAt, attempts, retryNow: check };
}
