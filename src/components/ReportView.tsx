import type { ReportContent } from "@/lib/reportTypes";
import { cn } from "@/lib/utils";

const INDICATOR_STYLE: Record<string, string> = {
  "Low Potential": "bg-[#d8593f]",
  "Some Possibilities": "bg-[#e6a23c]",
  "Good Possibilities": "bg-[#4fb07f]",
  "High Potential": "bg-[#0aa18f]",
};

function Chip({ level }: { level: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-3 py-1 text-[0.72rem] font-bold text-white",
        INDICATOR_STYLE[level] || "bg-primary"
      )}
    >
      {level || "Not set"}
    </span>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 mt-10 font-serif text-2xl text-foreground first:mt-0">{children}</h3>;
}

/** On-screen rendering of a SEHRA report, shared by the admin preview and the school's final view. */
export function ReportView({ content, compact }: { content: ReportContent; compact?: boolean }) {
  return (
    <article className={cn("text-[0.95rem] leading-relaxed text-foreground", compact && "text-sm")}>
      <header className="mb-8 border-b border-border pb-6">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-primary">
          SEHRA Scoping Module · Report
        </p>
        <h2 className="mt-2 font-serif text-3xl leading-tight">{content.title}</h2>
      </header>

      <H>Executive summary</H>
      <p className="whitespace-pre-wrap text-muted-foreground">{content.executiveSummary}</p>

      <H>Context</H>
      <p className="whitespace-pre-wrap text-muted-foreground">{content.context}</p>

      <H>Readiness at a glance</H>
      <div className="grid gap-2 sm:grid-cols-2">
        {content.components.map((c, i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <span className="text-sm font-medium">C{i + 1} · {c.name}</span>
            <Chip level={c.indicatorLevel} />
          </div>
        ))}
      </div>

      <H>Component findings</H>
      <div className="space-y-8">
        {content.components.map((c, i) => (
          <section key={i}>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h4 className="font-serif text-lg">Component {i + 1}: {c.name}</h4>
              <Chip level={c.indicatorLevel} />
            </div>
            <p className="whitespace-pre-wrap text-muted-foreground">{c.findings}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {c.challenges.length > 0 && (
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-wide text-accent">Challenges</div>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                    {c.challenges.map((x, j) => <li key={j}>{x}</li>)}
                  </ul>
                </div>
              )}
              {c.supports.length > 0 && (
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-wide text-primary">Supporting factors</div>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                    {c.supports.map((x, j) => <li key={j}>{x}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      {content.themeAnalysis.length > 0 && (
        <>
          <H>Thematic analysis</H>
          <div className="space-y-4">
            {content.themeAnalysis.map((t, i) => (
              <div key={i} className="border-l-[3px] border-primary pl-4">
                <div className="font-semibold">{t.theme}</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{t.assessment}</p>
                {t.evidence.map((e, j) => (
                  <p key={j} className="mt-1 text-xs text-muted-foreground/70">Evidence: {e}</p>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <H>Feasibility</H>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="font-serif text-xl text-primary-600">{content.feasibility.verdict}</div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{content.feasibility.rationale}</p>
      </div>

      <H>Recommendations</H>
      <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
        {content.recommendations.map((r, i) => <li key={i}>{r}</li>)}
      </ol>
    </article>
  );
}
