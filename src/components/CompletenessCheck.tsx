import { useState } from "react";
import { AlertTriangle, ClipboardCheck, Loader2, RefreshCw } from "lucide-react";
import { Dialog } from "@/components/Dialog";
import { api, type CompletenessResponse } from "@/lib/api";
import type { CompletenessReview } from "@/lib/completenessTypes";
import { CompletenessReport } from "@/components/CompletenessReport";

/**
 * "Check completeness" button + results dialog. Runs Haroon's step-1
 * completeness & consistency review. Used by schools (self-check, no orgId)
 * and by admins (pass the org's id).
 */
export function CompletenessCheck({ orgId, className }: { orgId?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState<CompletenessReview | null>(null);

  const run = async () => {
    setOpen(true);
    setBusy(true);
    setError("");
    try {
      const path = orgId ? `/api/assessment?orgId=${orgId}` : "/api/assessment";
      const res = await api.post<CompletenessResponse>(path, { action: "completeness" });
      setReview(res.review);
    } catch (e: any) {
      setError(e?.message || "Could not run the completeness review.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={run}
        className={
          className ??
          "flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
        }
      >
        <ClipboardCheck className="h-4 w-4" /> Check completeness
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} labelledBy="completeness-title" maxWidth="max-w-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="completeness-title" className="font-serif text-2xl leading-tight">Completeness &amp; consistency review</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              An automated first-pass check for blanks, inconsistencies and arithmetic before the module goes forward. It is not a feasibility analysis or RAG rating.
            </p>
          </div>
          {review && !busy && (
            <button onClick={run} className="flex flex-none items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:border-primary hover:text-primary">
              <RefreshCw className="h-3.5 w-3.5" /> Re-run
            </button>
          )}
        </div>

        <div className="mt-5 max-h-[68vh] overflow-y-auto pr-1">
          {busy && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Reviewing the module…</p>
            </div>
          )}
          {!busy && error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" /> {error}
            </div>
          )}
          {!busy && !error && review && <CompletenessReport review={review} />}
        </div>
      </Dialog>
    </>
  );
}
