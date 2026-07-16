import { CheckCircle2 } from "lucide-react";
import { renderQuestion } from "./Fields";
import { ASSESS, COMPONENT_TITLES, type Question } from "@/data/sehra";
import { questionAnswered, useStoreVersion } from "@/lib/store";

/**
 * A focused worklist of every question still left blank, across the whole
 * assessment, rendered with the same inputs as the guided flow so answers can
 * be filled in place. Questions drop off the list as soon as they are answered.
 */
export function IncompleteView({ onGoToSummary }: { onGoToSummary?: () => void }) {
  useStoreVersion();

  const groups = ASSESS.map((comp) => {
    const subs = comp.subsections
      .map((sub) => ({
        sub,
        questions: sub.questions.filter((q) => q.type !== "note" && !questionAnswered(q)),
      }))
      .filter((s) => s.questions.length > 0);
    const count = subs.reduce((a, s) => a + s.questions.length, 0);
    return { comp, subs, count };
  }).filter((g) => g.count > 0);

  const total = groups.reduce((a, g) => a + g.count, 0);

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-6 py-14 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h3 className="mt-4 font-serif text-2xl">Nothing left unanswered</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Every question has a response. Head to the summary to review your answers and submit to Peek.
        </p>
        {onGoToSummary && (
          <button
            onClick={onGoToSummary}
            className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-600"
          >
            Go to summary
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary">Unanswered only</div>
        <h2 className="mt-2 font-serif text-3xl md:text-4xl">
          {total} question{total === 1 ? "" : "s"} left
        </h2>
        <p className="mt-3 max-w-2xl text-[1.02rem] leading-relaxed text-muted-foreground">
          Everything still blank, in one place. Answer what you can and leave the rest — each question disappears from
          this list as soon as you fill it in.
        </p>
      </div>

      {groups.map(({ comp, subs, count }) => (
        <div key={comp.id} className="mb-8">
          <div className="mb-3 flex items-baseline justify-between border-b border-border pb-2">
            <h3 className="font-serif text-xl">
              {comp.id === "context" ? "Context" : `Component ${comp.number}: ${COMPONENT_TITLES[comp.id] ?? comp.title}`}
            </h3>
            <span className="flex-none text-[0.72rem] tabular-nums text-muted-foreground">{count} left</span>
          </div>

          {subs.map(({ sub, questions }) => (
            <div key={sub.id} className="mb-4 overflow-hidden rounded-lg border border-border bg-card">
              <div className="border-b border-border bg-secondary/30 px-5 py-2.5">
                <span className="text-sm font-medium text-foreground">{sub.title}</span>
              </div>
              <div className="divide-y divide-border/70 px-5">
                {questions.map((q: Question, i) => renderQuestion(q, i))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
