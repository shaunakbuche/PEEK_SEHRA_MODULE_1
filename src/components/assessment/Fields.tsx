import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useField, setField, subStatus, useStoreVersion } from "@/lib/store";
import { SCALE_KEY, type Question, type SubSection } from "@/data/sehra";

function Remarks({ id, placeholder = "Remarks…", lg }: { id: string; placeholder?: string; lg?: boolean }) {
  const v = useField(id);
  return (
    <textarea
      value={v}
      onChange={(e) => setField(id, e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full mt-2 rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 resize-y",
        lg ? "min-h-[90px]" : "min-h-[46px]"
      )}
    />
  );
}

function Lines({ lines }: { lines: string[] }) {
  return (
    <div className="my-3 rounded-xl bg-secondary/60 px-4 py-3">
      <div className="text-[0.65rem] font-bold uppercase tracking-wider text-primary mb-2">Lines of enquiry</div>
      <ul className="list-disc pl-5 space-y-1">
        {lines.map((l, i) => <li key={i} className="text-[0.82rem] text-muted-foreground">{l}</li>)}
      </ul>
    </div>
  );
}

function YN({ q }: { q: Extract<Question, { type: "yn" }> }) {
  const v = useField(q.id + "__yn");
  const opts: [string, string][] = [["Yes", "yes"], ["No", "no"]];
  if (q.thirdOption) opts.push([q.thirdOption, "na"]);
  if (q.noOption) opts.push([q.noOption, "na"]);
  return (
    <div className="py-4 border-b border-dashed border-border last:border-0">
      <div className="text-[0.95rem] font-medium mb-2.5">{q.text}</div>
      <div className="flex flex-wrap gap-2">
        {opts.map(([lab, kind]) => {
          const active = v === lab;
          return (
            <button
              key={lab}
              onClick={() => setField(q.id + "__yn", active ? "" : lab)}
              className={cn(
                "px-4 py-1.5 rounded-lg border text-[0.82rem] font-semibold transition",
                active && kind === "yes" && "bg-primary text-primary-foreground border-primary",
                active && kind === "no" && "bg-accent text-accent-foreground border-accent",
                active && kind === "na" && "bg-muted-foreground text-background border-muted-foreground",
                !active && "bg-card text-muted-foreground border-input hover:border-primary"
              )}
            >
              {lab}
            </button>
          );
        })}
      </div>
      {q.lines && <Lines lines={q.lines} />}
      <Remarks id={q.id + "__rem"} />
    </div>
  );
}

function TextQ({ q }: { q: Extract<Question, { type: "text" }> }) {
  return (
    <div className="py-4 border-b border-dashed border-border last:border-0">
      <div className="text-[0.95rem] font-medium mb-1">{q.text}</div>
      <Remarks id={q.id} placeholder="Type your response…" lg />
    </div>
  );
}

function FieldQ({ q }: { q: Extract<Question, { type: "field" }> }) {
  const v = useField(q.id);
  return (
    <div className="py-4 border-b border-dashed border-border last:border-0">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-[0.95rem] font-medium">{q.text}</label>
        <input
          value={v}
          onChange={(e) => setField(q.id, e.target.value)}
          placeholder="…"
          className="flex-1 min-w-[220px] rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
    </div>
  );
}

function GroupItem({ id, label }: { id: string; label: string }) {
  const v = useField(id);
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg bg-secondary/60 px-3 py-2">
      <div className="text-[0.88rem]">{label}</div>
      <div className="flex gap-1.5">
        {(["Yes", "No"] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => setField(id, v === opt ? "" : opt)}
            className={cn(
              "px-3 py-1 rounded-md border text-[0.72rem] font-semibold transition",
              v === opt && opt === "Yes" && "bg-primary text-primary-foreground border-primary",
              v === opt && opt === "No" && "bg-accent text-accent-foreground border-accent",
              v !== opt && "bg-card text-muted-foreground border-input hover:border-primary"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function GroupQ({ q }: { q: Extract<Question, { type: "group" }> }) {
  return (
    <div className="py-4 border-b border-dashed border-border last:border-0">
      <div className="text-[0.95rem] font-medium mb-2.5">{q.text}</div>
      <div className="grid gap-1.5">
        {q.items.map((it, i) => <GroupItem key={i} id={`${q.id}__${i}`} label={it} />)}
      </div>
      {q.lines && <Lines lines={q.lines} />}
      <Remarks id={q.id + "__rem"} />
    </div>
  );
}

function Cell({ id }: { id: string }) {
  const v = useField(id);
  return (
    <input
      value={v}
      onChange={(e) => setField(id, e.target.value)}
      className="w-full min-w-[90px] bg-transparent px-2.5 py-2 text-[0.85rem] outline-none focus:bg-primary/5"
    />
  );
}

function TableQ({ q }: { q: Extract<Question, { type: "table" }> }) {
  return (
    <div className="py-4 border-b border-dashed border-border last:border-0">
      <div className="text-[0.95rem] font-medium mb-2">{q.text}</div>
      <div className="tbl-scroll overflow-x-auto rounded-xl border border-border">
        <table className="border-collapse w-full min-w-[520px]">
          <thead>
            <tr>
              <th className="bg-primary-600 text-primary-foreground text-[0.72rem] font-semibold p-2.5 text-left"></th>
              {q.cols.map((c, i) => (
                <th key={i} className="bg-primary-600 text-[0.72rem] font-semibold p-2.5 text-left" style={{ color: "hsl(var(--primary-foreground))", background: "hsl(var(--primary-600))" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.rows.map((r, ri) => (
              <tr key={ri}>
                <th className="bg-secondary/70 text-foreground font-semibold text-[0.8rem] p-2.5 text-left align-top min-w-[150px] border border-border">{r}</th>
                {q.cols.map((_, ci) => (
                  <td key={ci} className="border border-border align-top p-0"><Cell id={`${q.id}__${ri}_${ci}`} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScaleBlock({ compId }: { compId: string }) {
  const v = Number(useField(`${compId}__scale`)) || 0;
  const pos = v ? (v - 0.5) * 25 : 0;
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-b from-secondary/40 to-card p-5 my-4">
      <h4 className="font-serif text-lg m-0">Indicator analysis</h4>
      <p className="text-[0.85rem] text-muted-foreground mb-4">Use your judgement, after assessment, to position the pointer — an overall read of this component's potential.</p>
      <div className="relative h-2.5 rounded-full my-1.5 mb-4" style={{ background: "linear-gradient(90deg,#d8593f,#e6a23c,#4fb07f,#0aa18f)", opacity: v ? 1 : 0.35 }}>
        <span
          className="absolute top-1/2 w-5 h-5 rounded-full bg-white border-[3px] border-primary-600 shadow transition-all"
          style={{ left: `${pos}%`, transform: `translate(-50%,-50%) scale(${v ? 1 : 0})` }}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {SCALE_KEY.map((s) => {
          const active = v === s.value;
          return (
            <button key={s.value} onClick={() => setField(`${compId}__scale`, active ? "" : String(s.value))} className="text-center group">
              <div className={cn("h-2 rounded-full mb-2.5 transition-all", active ? "scale-y-[1.6]" : "opacity-40 group-hover:opacity-80")}
                style={{ background: ["#d8593f", "#e6a23c", "#4fb07f", "#0aa18f"][s.value - 1] }} />
              <div className={cn("text-[0.8rem] font-bold", active ? "text-foreground" : "text-muted-foreground")}>{s.label}</div>
              <div className="text-[0.7rem] text-muted-foreground mt-1 leading-snug">{s.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReflectionCell({ id, placeholder }: { id: string; placeholder: string }) {
  const v = useField(id);
  return (
    <textarea value={v} onChange={(e) => setField(id, e.target.value)} placeholder={placeholder}
      className="w-full mb-2 rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[46px] resize-y" />
  );
}

function ReflectionsQ({ q }: { q: Extract<Question, { type: "reflections" }> }) {
  return (
    <div className="py-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-[0.92rem] font-semibold text-accent mb-2.5 flex items-center gap-2">
            <span className="text-[0.68rem] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-bold">Challenges</span>
            Points that may make implementation challenging
          </h4>
          {[0, 1, 2].map((i) => <ReflectionCell key={i} id={`${q.id}__challenge_${i}`} placeholder={`${i + 1}.`} />)}
        </div>
        <div>
          <h4 className="text-[0.92rem] font-semibold text-primary mb-2.5 flex items-center gap-2">
            <span className="text-[0.68rem] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">Supports</span>
            Points that support implementation
          </h4>
          {[0, 1, 2].map((i) => <ReflectionCell key={i} id={`${q.id}__support_${i}`} placeholder={`${i + 1}.`} />)}
        </div>
      </div>
    </div>
  );
}

function renderQuestion(q: Question, key: number) {
  switch (q.type) {
    case "yn": return <YN key={key} q={q} />;
    case "text": return <TextQ key={key} q={q} />;
    case "field": return <FieldQ key={key} q={q} />;
    case "group": return <GroupQ key={key} q={q} />;
    case "table": return <TableQ key={key} q={q} />;
    case "reflections": return <ReflectionsQ key={key} q={q} />;
    case "note": return <div key={key} className="text-[0.9rem] italic text-muted-foreground py-2">{q.text}</div>;
    default: return null;
  }
}

export function SubSectionView({ sub, compId, defaultOpen }: { sub: SubSection; compId: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  useStoreVersion();
  const st = subStatus(sub.questions);
  const isReflection = sub.questions.some((q) => q.type === "reflections");
  return (
    <div className={cn("mb-3.5 rounded-2xl border bg-card shadow-sm overflow-hidden transition", st.state === "complete" ? "border-primary/50" : "border-border")}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3.5 px-5 py-4 text-left">
        <span className={cn("w-6 h-6 rounded-full grid place-items-center border-2 transition flex-none",
          st.state === "complete" && "bg-primary border-primary text-primary-foreground",
          st.state === "partial" && "border-accent",
          st.state === "" && "border-input")}>
          {st.state === "complete" && <Check className="w-3.5 h-3.5" />}
          {st.state === "partial" && <span className="w-2 h-2 rounded-full bg-accent" />}
        </span>
        <span className="font-serif font-bold text-accent min-w-[40px]">{sub.id}</span>
        <span className="font-semibold text-[1.02rem]">{sub.title}</span>
        <span className="ml-auto flex items-center gap-3">
          {st.total > 0 && <span className="text-[0.72rem] text-muted-foreground bg-secondary/70 px-2.5 py-0.5 rounded-full">{st.done}/{st.total}</span>}
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-border">
          {isReflection && <ScaleBlock compId={compId} />}
          {sub.questions.map((q, i) => renderQuestion(q, i))}
        </div>
      )}
    </div>
  );
}
