import { SubSectionView } from "./Fields";
import { type Component } from "@/data/sehra";
import { Button } from "@/components/ui/button";

export function ComponentView({ comp, onPrev, onNext, prevLabel, nextLabel }: {
  comp: Component;
  onPrev?: () => void;
  onNext?: () => void;
  prevLabel?: string;
  nextLabel?: string;
}) {
  const isContext = comp.id === "context";
  return (
    <div>
      <div className="mb-7">
        <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary">
          {isContext ? "Context" : `Component ${comp.number}`}
        </div>
        <h2 className="mt-2 font-serif text-3xl tracking-tight md:text-4xl">{comp.title}</h2>
        <p className="mt-3.5 max-w-2xl text-[1.02rem] leading-relaxed text-muted-foreground">{comp.purpose}</p>
      </div>

      {comp.subsections.map((s, i) => (
        <SubSectionView key={s.id} sub={s} compId={comp.id} defaultOpen={i === 0} />
      ))}

      <div className="flex justify-between mt-9 pt-5 border-t border-border">
        {onPrev ? <Button variant="ghost" onClick={onPrev}>← {prevLabel}</Button> : <span />}
        {onNext ? <Button onClick={onNext}>{nextLabel} →</Button> : <span />}
      </div>
    </div>
  );
}
