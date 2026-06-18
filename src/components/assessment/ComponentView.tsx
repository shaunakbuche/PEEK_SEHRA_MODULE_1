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
        <div className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-accent">
          {isContext ? "Context" : `Component ${comp.number}`}
        </div>
        <h2 className="font-serif text-3xl md:text-4xl mt-2 tracking-tight">{comp.title}</h2>
        <p className="mt-3.5 text-[1.02rem] text-muted-foreground max-w-2xl border-l-[3px] border-primary pl-4">{comp.purpose}</p>
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
