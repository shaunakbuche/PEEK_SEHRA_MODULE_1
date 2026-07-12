import { SubSectionView } from "./Fields";
import { type Component } from "@/data/sehra";
import { subStatus, useStoreVersion } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function ComponentView({ comp, onPrev, onNext, prevLabel, nextLabel }: {
  comp: Component;
  onPrev?: () => void;
  onNext?: () => void;
  prevLabel?: string;
  nextLabel?: string;
}) {
  useStoreVersion();
  const isContext = comp.id === "context";
  const stats = comp.subsections.map((s) => subStatus(s.questions)).filter((s) => s.total > 0);
  const doneSections = stats.filter((s) => s.state === "complete").length;
  const answered = stats.reduce((a, s) => a + s.done, 0);
  const total = stats.reduce((a, s) => a + s.total, 0);

  return (
    <div>
      <div className="mb-7">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary">
            {isContext ? "Context" : `Component ${comp.number}`}
          </div>
          {total > 0 && (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[0.7rem] font-semibold tabular-nums text-muted-foreground">
              {answered}/{total} answered
            </span>
          )}
        </div>
        <h2 className="mt-2 font-serif text-3xl tracking-tight md:text-4xl">{comp.title}</h2>
        <p className="mt-3.5 max-w-2xl text-[1.02rem] leading-relaxed text-muted-foreground">{comp.purpose}</p>
        {stats.length > 1 && (
          <div className="mt-4 flex items-center gap-2">
            <div className="flex h-1.5 flex-1 gap-1 overflow-hidden">
              {stats.map((s, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-full"
                  style={{
                    background:
                      s.state === "complete"
                        ? "hsl(var(--primary))"
                        : s.state === "partial"
                          ? "hsl(var(--primary) / 0.35)"
                          : "hsl(var(--secondary))",
                  }}
                />
              ))}
            </div>
            <span className="flex-none text-[0.7rem] tabular-nums text-muted-foreground">
              {doneSections}/{stats.length} sections
            </span>
          </div>
        )}
      </div>

      {comp.subsections.map((s, i) => (
        <SubSectionView key={s.id} sub={s} compId={comp.id} defaultOpen={i === 0} />
      ))}

      <div className="mt-9 flex justify-between border-t border-border pt-5">
        {onPrev ? <Button variant="ghost" onClick={onPrev}>← {prevLabel}</Button> : <span />}
        {onNext ? <Button onClick={onNext}>{nextLabel} →</Button> : <span />}
      </div>
    </div>
  );
}
