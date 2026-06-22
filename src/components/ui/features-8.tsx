import { ListChecks, PenLine, Send } from "lucide-react";

const STEPS = [
  {
    icon: ListChecks,
    title: "Work through the sections",
    body: "Answer plain questions about policy, services, staff and supplies. Your progress saves automatically as you type.",
  },
  {
    icon: PenLine,
    title: "Add your judgement",
    body: "At the end of each area, note what helps and what gets in the way, then set where it sits on the indicator scale.",
  },
  {
    icon: Send,
    title: "Send it to Peek",
    body: "Submit when you are ready. The completed assessment is emailed to the Peek team, who will arrange a time to talk it through.",
  },
];

export function Features() {
  return (
    <section className="relative border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-20 lg:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">How it works</p>
        <h2 className="mt-3 max-w-2xl font-serif text-3xl text-foreground sm:text-4xl">
          Built to be filled in, not printed
        </h2>

        <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex flex-col bg-card p-7">
              <div className="flex items-center gap-3">
                <s.icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="mt-5 font-serif text-xl text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
