import { useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, X } from "lucide-react";
import { useBackendWatchdog } from "@/hooks/useBackendWatchdog";

/**
 * ডেটাবেস paused/অফলাইন হলে একটি ব্যানার দেখায় এবং
 * ব্যাকগ্রাউন্ডে নির্দিষ্ট ইন্টারভ্যালে অটো-রিট্রাই চালায়।
 */
export default function BackendStatusWatchdog() {
  const { status, lastCheckedAt, attempts, retryNow } = useBackendWatchdog();
  const [dismissed, setDismissed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  if (status !== "offline" || dismissed) return null;

  const handleRetry = async () => {
    setRetrying(true);
    await retryNow();
    setRetrying(false);
  };

  return (
    <div
      role="status"
      className="fixed bottom-3 left-1/2 z-[100] w-[min(94vw,32rem)] -translate-x-1/2 rounded-xl border border-destructive/30 bg-card/95 p-3 shadow-lg backdrop-blur"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-semibold">
            ডেটাবেস সংযোগ পাওয়া যাচ্ছে না
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            সার্ভার ঘুমিয়ে থাকতে পারে। অটোমেটিক আবার চেষ্টা চলছে (চেষ্টা {attempts})
            {lastCheckedAt ? ` • শেষ চেক ${lastCheckedAt.toLocaleTimeString("bn-BD")}` : ""}
          </p>
        </div>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
        >
          {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          এখনই চেষ্টা
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="বন্ধ করুন"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
