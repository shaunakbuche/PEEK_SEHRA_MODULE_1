import type { ReportContent, ThemeGroup } from "@/lib/reportTypes";
import { RAG_LEGEND, toRag, normalizeReportContent } from "@/lib/reportTypes";
import { cn } from "@/lib/utils";

const RAG_COLOR: Record<string, string> = {
  Green: "#2e7d5b",
  "Amber/Green": "#6ba368",
  Amber: "#d99a2b",
  "Red/Amber": "#d9722b",
  Red: "#c0392b",
};

function RagBadge({ level }: { level: string }) {
  const l = toRag(level);
  return (
    <span
      className="inline-block rounded-full px-3 py-1 text-[0.72rem] font-bold text-white"
      style={{ backgroundColor: RAG_COLOR[l] }}
    >
      {l}
    </span>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 mt-10 font-serif text-2xl text-foreground first:mt-0">{children}</h3>;
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="whitespace-pre-wrap text-muted-foreground">{children}</p>;
}

/** Enablers / barriers / action points, grouped under their themes. */
function ThemeGroups({ groups, tone }: { groups: ThemeGroup[]; tone: "enabler" | "barrier" | "action" }) {
  if (!groups.length) return null;
  const label = tone === "enabler" ? "Enablers" : tone === "barrier" ? "Barriers" : "Action points";
  const accent = tone === "barrier" ? "text-[#c0392b]" : tone === "action" ? "text-foreground" : "text-primary";
  return (
    <div className="mt-4">
      <div className={cn("mb-2 text-[0.72rem] font-bold uppercase tracking-wide", accent)}>{label}</div>
      <div className="space-y-3">
        {groups.map((g, i) => (
          <div key={i}>
            <div className="text-[0.82rem] font-semibold text-foreground">{g.theme}</div>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {g.points.map((p, j) => <li key={j}>{p}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/** On-screen rendering of a SEHRA analysis: the themed synthesis report, then the RAG dashboard. */
export function ReportView({ content: raw, compact }: { content: ReportContent; compact?: boolean }) {
  const content = normalizeReportContent(raw);
  return (
    <article className={cn("text-[0.95rem] leading-relaxed text-foreground", compact && "text-sm")}>
      <header className="mb-8 border-b border-border pb-6">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-primary">
          SEHRA Scoping Module · Synthesis &amp; feasibility analysis
        </p>
        <h2 className="mt-2 font-serif text-3xl leading-tight">{content.title}</h2>
      </header>

      <H>Executive summary</H>
      <Para>{content.executiveSummary}</Para>

      <H>Background and method</H>
      <Para>{content.background}</Para>

      <H>Context snapshot</H>
      <Para>{content.contextSnapshot}</Para>

      {content.dataQualityNote?.trim() && (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">Data-quality note. </span>
          <span className="whitespace-pre-wrap">{content.dataQualityNote}</span>
        </div>
      )}

      <H>Component-by-component analysis</H>
      <div className="space-y-8">
        {content.components.map((c, i) => (
          <section key={i}>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h4 className="font-serif text-lg">Component {i + 1}: {c.name}</h4>
              <RagBadge level={c.rag} />
            </div>
            <Para>{c.summary}</Para>
            <ThemeGroups groups={c.enablers} tone="enabler" />
            <ThemeGroups groups={c.barriers} tone="barrier" />
            {c.crossCutting?.trim() && (
              <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-4">
                <div className="mb-1 text-[0.72rem] font-bold uppercase tracking-wide text-muted-foreground">Cross-cutting summary</div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{c.crossCutting}</p>
              </div>
            )}
            <ThemeGroups groups={c.actionPoints} tone="action" />
          </section>
        ))}
      </div>

      <H>Overall feasibility and implications</H>
      <div className="space-y-4">
        {([
          ["Feasibility considerations", content.overall.feasibility],
          ["Programme strategy implications", content.overall.strategyImplications],
          ["Policy advocacy priorities", content.overall.policyAdvocacy],
          ["Recommended next steps", content.overall.nextSteps],
        ] as const).map(([label, body]) =>
          body?.trim() ? (
            <div key={label} className="border-l-[3px] border-primary pl-4">
              <div className="font-semibold">{label}</div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{body}</p>
            </div>
          ) : null
        )}
      </div>

      {/* ---- RAG feasibility dashboard ---- */}
      <div className="mt-12 rounded-2xl border border-border bg-secondary/20 p-6">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-primary">RAG feasibility dashboard</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
          <span className="font-serif text-lg">Overall</span>
          <RagBadge level={content.overall.rag} />
          <p className="w-full text-sm text-muted-foreground">{content.overall.ragInterpretation}</p>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {content.components.map((c, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">C{i + 1} · {c.name}</span>
                <RagBadge level={c.rag} />
              </div>
              {c.ragSummary?.trim() && <p className="mt-1.5 text-[0.82rem] text-muted-foreground">{c.ragSummary}</p>}
            </div>
          ))}
        </div>

        {content.topActions.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 font-serif text-lg">Top priority actions</div>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              {content.topActions.map((a, i) => <li key={i}>{a}</li>)}
            </ol>
          </div>
        )}

        <div className="mt-5">
          <div className="mb-2 font-serif text-lg">RAG legend</div>
          <div className="space-y-1.5">
            {RAG_LEGEND.map((r) => (
              <div key={r.level} className="flex items-start gap-2.5 text-[0.82rem] text-muted-foreground">
                <span className="mt-0.5 flex-none"><RagBadge level={r.level} /></span>
                <span>{r.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
