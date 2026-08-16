import { useState } from "react";
import { AlertTriangle, ClipboardCheck, ClipboardPaste, Loader2, RefreshCw, X } from "lucide-react";
import { Dialog } from "@/components/Dialog";
import { api, type CompletenessResponse } from "@/lib/api";
import type { CompletenessReview } from "@/lib/completenessTypes";
import { CompletenessReport } from "@/components/CompletenessReport";
import { useToast } from "@/lib/toast";

/**
 * "Check completeness" + "Paste review JSON" buttons and the shared results
 * dialog. Runs Haroon's step-1 completeness & consistency review two ways: on
 * the hosted AI, or by pasting back the JSON the SEHRA analysis skill produced
 * in Claude Enterprise, which is the only route that works with no
 * ANTHROPIC_API_KEY. Both render through the same CompletenessReport. Used by
 * schools (self-check, no orgId) and by admins (pass the org's id).
 */
export function CompletenessCheck({ orgId, className }: { orgId?: string; className?: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState<CompletenessReview | null>(null);
  const [source, setSource] = useState<"ai" | "import">("ai");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState("");

  const path = orgId ? `/api/assessment?orgId=${orgId}` : "/api/assessment";

  const run = async () => {
    setOpen(true);
    setSource("ai");
    setBusy(true);
    setError("");
    try {
      const res = await api.post<CompletenessResponse>(path, { action: "completeness" });
      setReview(res.review);
    } catch (e: any) {
      setError(e?.message || "Could not run the completeness review.");
    } finally {
      setBusy(false);
    }
  };

  const openPaste = () => {
    setPasteError("");
    setOpen(false);
    setPasteOpen(true);
  };

  /** Validated server-side, so the same rules apply here as to a generated review. */
  const importPasted = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setPasteError("");
    try {
      const res = await api.post<CompletenessResponse>(path, { action: "completeness-import", review: pasted });
      setReview(res.review);
      setSource("import");
      setError("");
      setPasted("");
      setPasteOpen(false);
      setOpen(true);
      toast.push("success", "Completeness review imported.");
    } catch (err: any) {
      setPasteError(err?.message || "That completeness review JSON could not be read.");
    } finally {
      setBusy(false);
    }
  };

  const runClass =
    className ??
    "flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10";
  const pasteClass =
    className ??
    "flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary";

  return (
    <>
      <button onClick={run} className={runClass}>
        <ClipboardCheck className="h-4 w-4" /> Check completeness
      </button>
      <button
        onClick={openPaste}
        title="Paste the completeness review JSON produced by the SEHRA analysis skill"
        className={pasteClass}
      >
        <ClipboardPaste className="h-4 w-4" /> Paste review JSON
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
            source === "import" ? (
              <button onClick={openPaste} className="flex flex-none items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:border-primary hover:text-primary">
                <ClipboardPaste className="h-3.5 w-3.5" /> Paste another
              </button>
            ) : (
              <button onClick={run} className="flex flex-none items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:border-primary hover:text-primary">
                <RefreshCw className="h-3.5 w-3.5" /> Re-run
              </button>
            )
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
            <>
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" /> {error}
              </div>
              <button onClick={openPaste} className="mt-3 flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition hover:border-primary hover:text-primary">
                <ClipboardPaste className="h-3.5 w-3.5" /> Paste review JSON instead
              </button>
            </>
          )}
          {!busy && !error && review && (
            <>
              {source === "import" && (
                <p className="mb-4 rounded-lg border border-border bg-secondary/30 px-3.5 py-2 text-xs text-muted-foreground">
                  Imported from the SEHRA analysis skill.
                </p>
              )}
              <CompletenessReport review={review} />
            </>
          )}
        </div>
      </Dialog>

      <Dialog open={pasteOpen} onClose={() => setPasteOpen(false)} labelledBy="paste-completeness-title" maxWidth="max-w-2xl">
        <form onSubmit={importPasted}>
          <div className="flex items-start justify-between">
            <h3 id="paste-completeness-title" className="font-serif text-2xl">Paste completeness review JSON</h3>
            <button type="button" onClick={() => setPasteOpen(false)} aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Run the completeness review in the SEHRA analysis skill, ask it for the JSON, and paste the whole object
            here. It is shown as a review straight away and is not saved to the assessment.
          </p>
          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Completeness review JSON</span>
            <textarea
              value={pasted} onChange={(e) => setPasted(e.target.value)} rows={14} spellCheck={false}
              placeholder={'{\n  "overallFinding": "Partially complete",\n  "overallSummary": "...",\n  "majorItems": [ ... ],\n  "consistencyChecks": { ... },\n  "componentStatus": [ ... ],\n  "minorIssues": [ ... ],\n  "bottomLine": { ... }\n}'}
              className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2 font-mono text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <div role="status" aria-live="polite">
            {pasteError && <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{pasteError}</p>}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setPasteOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary">Cancel</button>
            <button type="submit" disabled={busy || !pasted.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-600 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardPaste className="h-4 w-4" />}
              {busy ? "Checking…" : "Show review"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
