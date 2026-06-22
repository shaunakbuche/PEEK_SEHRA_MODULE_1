import { ArrowRight } from "lucide-react";
import { ASSESS } from "@/data/sehra";
import { useStoreVersion, subStatus } from "@/lib/store";
import type { Section } from "@/components/AssessmentWorkspace";

const ITEMS: { id: Section; label: string; blurb: string }[] = [
  { id: "context", label: "Context", blurb: "Background on the area and any school eye health work already happening." },
  { id: "c1", label: "Legislation and policy", blurb: "Whether national laws, policies and budgets back school eye health." },
  { id: "c2", label: "Service delivery", blurb: "How health and education services are set up to deliver it." },
  { id: "c3", label: "People and skills", blurb: "Whether enough trained staff are in place to run it." },
  { id: "c4", label: "Supply chain", blurb: "Whether glasses, supplies and equipment can reach children." },
  { id: "c5", label: "Barriers", blurb: "What could get in the way, from cost to local beliefs." },
];

function progress(id: Section) {
  const comp = ASSESS.find((c) => c.id === id);
  if (!comp) return { done: 0, total: 0 };
  let done = 0, total = 0;
  comp.subsections.forEach((s) => {
    const st = subStatus(s.questions);
    done += st.done;
    total += st.total;
  });
  return { done, total };
}

export function ComponentOverview({ onOpen }: { onOpen: (s: Section) => void }) {
  useStoreVersion();
  return (
    <section id="module" className="relative scroll-mt-24 border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-3xl px-6 py-20 lg:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">What it covers</p>
        <h2 className="mt-3 font-serif text-3xl text-foreground sm:text-4xl">
          Six short sections, one working week
        </h2>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Start with the local context, then work through five areas. Each one builds a picture of
          whether the ground is ready. You can jump to any section and your answers save as you go.
        </p>

        <ul className="mt-10 divide-y divide-border border-y border-border">
          {ITEMS.map((it, i) => {
            const { done, total } = progress(it.id);
            const complete = total > 0 && done === total;
            return (
              <li key={it.id}>
                <button
                  onClick={() => onOpen(it.id)}
                  className="group flex w-full items-center gap-5 py-5 text-left transition hover:bg-background"
                >
                  <span className="w-8 flex-none font-serif text-2xl text-muted-foreground/70">
                    {i === 0 ? "0" : i}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{it.label}</span>
                      {complete && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-primary">
                          Done
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{it.blurb}</span>
                  </span>
                  <span className="hidden flex-none text-xs tabular-nums text-muted-foreground sm:block">
                    {total > 0 ? `${done} of ${total}` : ""}
                  </span>
                  <ArrowRight className="h-4 w-4 flex-none text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
