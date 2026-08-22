import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  HelpCircle,
  LifeBuoy,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { useBackendWatchdog } from "@/hooks/useBackendWatchdog";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function fmtLeft(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} সেকেন্ড`;
  return `${Math.floor(s / 60)} মিনিট ${s % 60} সেকেন্ড`;
}

/**
 * ডেটাবেস paused/অফলাইন হলে লাইভ স্ট্যাটাস ড্যাশবোর্ড দেখায়:
 * স্ট্যাটাস, রিট্রাই কাউন্ট, পরবর্তী চেষ্টা, ত্রুটি রিপোর্ট ও হেল্প গাইড।
 */
export default function BackendStatusWatchdog() {
  const {
    status,
    lastCheckedAt,
    attempts,
    nextRetryInMs,
    lastError,
    lastRequestId,
    lastHttpStatus,
    latencyMs,
    retryNow,
  } = useBackendWatchdog();
  const [dismissed, setDismissed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const down = status === "offline" || status === "paused";

  const report = useMemo(
    () =>
      [
        "Galachipa Blog — Backend Failure Report",
        `Time: ${new Date().toISOString()}`,
        `Status: ${status}`,
        `Retry attempts: ${attempts}`,
        `HTTP status: ${lastHttpStatus ?? "n/a"}`,
        `Request ID: ${lastRequestId ?? "n/a"}`,
        `Error: ${lastError ?? "n/a"}`,
        `Latency: ${latencyMs ?? "n/a"} ms`,
        `Last checked: ${lastCheckedAt?.toISOString() ?? "n/a"}`,
        `URL: ${typeof window !== "undefined" ? window.location.href : ""}`,
        `User agent: ${typeof navigator !== "undefined" ? navigator.userAgent : ""}`,
      ].join("\n"),
    [status, attempts, lastHttpStatus, lastRequestId, lastError, latencyMs, lastCheckedAt]
  );

  if (!down || dismissed) return null;

  const handleRetry = async () => {
    setRetrying(true);
    const ok = await retryNow();
    setRetrying(false);
    toast({
      title: ok ? "সংযোগ ফিরে এসেছে" : "এখনও সংযোগ নেই",
      description: ok ? "ডেটা রিফ্রেশ হচ্ছে…" : lastError ?? "আবার চেষ্টা চলবে।",
    });
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
      toast({ title: "ত্রুটি সারাংশ কপি হয়েছে", description: "সাপোর্টে পেস্ট করে পাঠান।" });
    } catch {
      toast({ title: "কপি করা যায়নি", variant: "destructive" });
    }
  };

  const mailtoHref = `mailto:support@lovable.dev?subject=${encodeURIComponent(
    "Backend paused/unreachable — galachipablog"
  )}&body=${encodeURIComponent(report)}`;

  return (
    <>
      <div
        role="status"
        className="fixed bottom-3 left-1/2 z-[100] w-[min(94vw,34rem)] -translate-x-1/2 rounded-xl border border-destructive/30 bg-card/95 p-3 shadow-lg backdrop-blur"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-semibold">
              {status === "paused"
                ? "ডেটাবেস paused অবস্থায় আছে"
                : "ডেটাবেস সংযোগ পাওয়া যাচ্ছে না"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              এক্সপোনেনশিয়াল ব্যাকঅফে অটো-রিট্রাই চলছে • চেষ্টা {attempts} • পরবর্তী চেষ্টা{" "}
              {fmtLeft(nextRetryInMs)}
            </p>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-label="বিস্তারিত"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="বন্ধ করুন"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {expanded && (
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <dt className="text-muted-foreground">স্ট্যাটাস</dt>
              <dd className="font-medium">{status}</dd>
              <dt className="text-muted-foreground">রিট্রাই সংখ্যা</dt>
              <dd className="font-medium">{attempts}</dd>
              <dt className="text-muted-foreground">HTTP</dt>
              <dd className="font-medium">{lastHttpStatus ?? "—"}</dd>
              <dt className="text-muted-foreground">Request ID</dt>
              <dd className="truncate font-mono">{lastRequestId ?? "—"}</dd>
              <dt className="text-muted-foreground">ত্রুটি</dt>
              <dd className="truncate font-medium">{lastError ?? "—"}</dd>
              <dt className="text-muted-foreground">শেষ চেক</dt>
              <dd className="font-medium">
                {lastCheckedAt ? lastCheckedAt.toLocaleTimeString("bn-BD") : "—"}
              </dd>
            </dl>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" /> সংরক্ষিত (ক্যাশড) পোস্ট দেখানো হচ্ছে, যদি থাকে।
            </p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
          >
            {retrying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            এখনই চেষ্টা
          </button>
          <button
            onClick={copyReport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <Copy className="h-3.5 w-3.5" /> ত্রুটি সারাংশ কপি
          </button>
          <a
            href={mailtoHref}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <LifeBuoy className="h-3.5 w-3.5" /> সাপোর্টে পাঠান
          </a>
          <button
            onClick={() => setHelpOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <HelpCircle className="h-3.5 w-3.5" /> কীভাবে resume করব?
          </button>
        </div>
      </div>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>ব্যাকএন্ড resume / restore করার ধাপ</DialogTitle>
            <DialogDescription>
              Cloud প্যানেলে resume অপশন না দেখলে নিচের ধাপগুলো অনুসরণ করুন।
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>প্রজেক্টের উপরের ডানদিকের <b>Cloud</b> (ব্যাকএন্ড) বাটনে ক্লিক করুন।</li>
            <li>
              <b>Overview / Usage</b> ট্যাবে গিয়ে প্রজেক্ট স্ট্যাটাস দেখুন — <i>Paused</i> লেখা থাকলে
              পাশে <b>Resume</b> বা <b>Restore project</b> বাটন থাকে।
            </li>
            <li>
              বাটন না থাকলে সাধারণত ক্রেডিট/কোটা শেষ। <b>Settings → Plans &amp; Billing</b> থেকে
              ক্রেডিট যোগ করুন; ক্রেডিট যোগ হওয়ার কয়েক মিনিটের মধ্যে resume অপশন ফিরে আসে।
            </li>
            <li>ক্রেডিট যোগের পর ব্রাউজার রিফ্রেশ করে আবার Cloud প্যানেল খুলুন এবং <b>Resume</b> চাপুন।</li>
            <li>
              তবুও না হলে উপরের <b>ত্রুটি সারাংশ কপি</b> চেপে টেক্সটটি Lovable Support-এ পাঠান
              (Request ID সহ) — “project recovery / unpause request” লিখে।
            </li>
            <li>
              Resume হলে এই ব্যানার নিজেই মিলিয়ে যাবে এবং সব পোস্ট স্বয়ংক্রিয়ভাবে রিফ্রেশ হবে —
              কোনো ডেটা হারায় না।
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
