import { AlertTriangle, CheckCircle2, ClipboardCheck } from "lucide-react";
import type { CompletenessReview } from "@/lib/completenessTypes";

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("needs") || s.includes("substantial")) return "bg-[#c0392b]";
  if (s.includes("partial")) return "bg-[#d99a2b]";
  return "bg-[#2e7d5b]"; // complete / largely complete
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h4 className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-primary">{title}</h4>
      {children}
    </section>
  );
}

/** Renders Haroon's completeness & consistency review. */
export function CompletenessReport({ review }: { review: CompletenessReview }) {
  return (
    <div className="text-sm leading-relaxed text-foreground">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-secondary/30 p-4">
        <ClipboardCheck className="h-5 w-5 flex-none text-primary" />
        <div className="min-w-0">
          <span className={`inline-block rounded-full px-3 py-1 text-[0.72rem] font-bold text-white ${statusTone(review.overallFinding)}`}>
            {review.overallFinding}
          </span>
          <p className="mt-2 text-muted-foreground">{review.overallSummary}</p>
        </div>
      </div>

      {review.majorItems.length > 0 && (
        <Section title="Major items needing attention">
          <div className="space-y-2.5">
            {review.majorItems.map((m, i) => (
              <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-600" />
                  <div className="min-w-0">
                    <div className="text-[0.72rem] font-semibold uppercase tracking-wide text-amber-700">{m.location}</div>
                    <p className="font-medium text-foreground">{m.issue}</p>
                    <p className="mt-1 text-[0.85rem] text-muted-foreground"><span className="font-semibold">Why it matters: </span>{m.whyItMatters}</p>
                    <p className="mt-1 text-[0.85rem] text-muted-foreground"><span className="font-semibold">Suggested action: </span>{m.suggestedAction}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Numerical & internal consistency">
        <p className="text-muted-foreground">{review.consistencyChecks.summary}</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {review.consistencyChecks.reconciled.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-wide text-[#2e7d5b]"><CheckCircle2 className="h-3.5 w-3.5" /> Reconciles</div>
              <ul className="list-disc space-y-1 pl-4 text-[0.85rem] text-muted-foreground">{review.consistencyChecks.reconciled.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
          {review.consistencyChecks.notReconciled.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-wide text-[#c0392b]"><AlertTriangle className="h-3.5 w-3.5" /> Does not reconcile</div>
              <ul className="list-disc space-y-1 pl-4 text-[0.85rem] text-muted-foreground">{review.consistencyChecks.notReconciled.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
        </div>
      </Section>

      <Section title="Component-by-component status">
        <div className="space-y-1.5">
          {review.componentStatus.map((c, i) => (
            <div key={i} className="flex flex-wrap items-baseline gap-x-2 rounded-lg border border-border bg-card px-3.5 py-2.5">
              <span className="font-medium">{c.component}</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.68rem] font-semibold text-muted-foreground">{c.status}</span>
              {c.notes && <p className="mt-1 w-full text-[0.85rem] text-muted-foreground">{c.notes}</p>}
            </div>
          ))}
        </div>
      </Section>

      {review.minorIssues.length > 0 && (
        <Section title="Minor / editorial">
          <ul className="list-disc space-y-1 pl-5 text-[0.85rem] text-muted-foreground">{review.minorIssues.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </Section>
      )}

      <Section title="Bottom line">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-muted-foreground">{review.bottomLine.summary}</p>
          {review.bottomLine.priorityCorrections.length > 0 && (
            <>
              <div className="mt-3 text-[0.72rem] font-semibold uppercase tracking-wide text-primary">Fix first</div>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-[0.85rem] text-muted-foreground">
                {review.bottomLine.priorityCorrections.map((x, i) => <li key={i}>{x}</li>)}
              </ol>
            </>
          )}
        </div>
      </Section>
    </div>
  );
}
