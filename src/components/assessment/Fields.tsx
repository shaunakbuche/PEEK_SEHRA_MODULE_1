import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useField, setField, subStatus, useStoreVersion } from "@/lib/store";
import { SCALE_KEY, type Question, type SubSection } from "@/data/sehra";

function Note({ id, placeholder = "Add a note (optional)", lg }: { id: string; placeholder?: string; lg?: boolean }) {
  const v = useField(id);
  return (
    <textarea
      value={v}
      onChange={(e) => setField(id, e.target.value)}
      placeholder={placeholder}
      className={cn(
        "mt-2.5 w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground/50 focus:border-primary",
        lg ? "min-h-[88px]" : "min-h-[44px]"
      )}
    />
  );
}

function Lines({ lines }: { lines: string[] }) {
  return (
    <ul className="mt-3 space-y-1 border-l-2 border-border pl-4">
      {lines.map((l, i) => (
        <li key={i} className="text-[0.82rem] leading-relaxed text-muted-foreground">{l}</li>
      ))}
    </ul>
  );
}

function QuestionShell({ children }: { children: React.ReactNode }) {
  return <div className="py-5">{children}</div>;
}

function YN({ q }: { q: Extract<Question, { type: "yn" }> }) {
  const v = useField(q.id + "__yn");
  const opts: [string, string][] = [["Yes", "yes"], ["No", "no"]];
  if (q.thirdOption) opts.push([q.thirdOption, "na"]);
  if (q.noOption) opts.push([q.noOption, "na"]);
  return (
    <QuestionShell>
      <div className="mb-3 text-[0.95rem] leading-relaxed text-foreground">{q.text}</div>
      <div className="flex flex-wrap gap-2">
        {opts.map(([lab, kind]) => {
          const active = v === lab;
          return (
            <button
              key={lab}
              onClick={() => setField(q.id + "__yn", active ? "" : lab)}
              className={cn(
                "rounded-md border px-4 py-1.5 text-[0.82rem] font-medium transition",
                active && kind === "yes" && "border-primary bg-primary text-primary-foreground",
                active && kind === "no" && "border-foreground bg-foreground text-background",
                active && kind === "na" && "border-muted-foreground bg-muted text-foreground",
                !active && "border-input text-muted-foreground hover:border-primary hover:text-foreground"
              )}
            >
              {lab}
            </button>
          );
        })}
      </div>
      {q.lines && <Lines lines={q.lines} />}
      <Note id={q.id + "__rem"} />
    </QuestionShell>
  );
}

function TextQ({ q }: { q: Extract<Question, { type: "text" }> }) {
  return (
    <QuestionShell>
      <div className="mb-1 text-[0.95rem] leading-relaxed text-foreground">{q.text}</div>
      <Note id={q.id} placeholder="Type your answer" lg />
    </QuestionShell>
  );
}

function FieldQ({ q }: { q: Extract<Question, { type: "field" }> }) {
  const v = useField(q.id);
  return (
    <QuestionShell>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-[0.95rem] text-foreground">{q.text}</label>
        <input
          value={v}
          onChange={(e) => setField(q.id, e.target.value)}
          className="min-w-[200px] flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
        />
      </div>
    </QuestionShell>
  );
}

function GroupItem({ id, label }: { id: string; label: string }) {
  const v = useField(id);
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
      <div className="text-[0.85rem] text-foreground">{label}</div>
      <div className="flex flex-none gap-1.5">
        {(["Yes", "No"] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => setField(id, v === opt ? "" : opt)}
            className={cn(
              "rounded px-3 py-1 text-[0.72rem] font-medium transition",
              v === opt && opt === "Yes" && "bg-primary text-primary-foreground",
              v === opt && opt === "No" && "bg-foreground text-background",
              v !== opt && "text-muted-foreground hover:bg-secondary"
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
    <QuestionShell>
      <div className="mb-3 text-[0.95rem] leading-relaxed text-foreground">{q.text}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {q.items.map((it, i) => <GroupItem key={i} id={`${q.id}__${i}`} label={it} />)}
      </div>
      {q.lines && <Lines lines={q.lines} />}
      <Note id={q.id + "__rem"} />
    </QuestionShell>
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
    <QuestionShell>
      <div className="mb-2.5 text-[0.95rem] leading-relaxed text-foreground">{q.text}</div>
      <div className="tbl-scroll overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr>
              <th className="bg-secondary p-2.5 text-left text-[0.72rem] font-semibold text-muted-foreground"></th>
              {q.cols.map((c, i) => (
                <th key={i} className="bg-secondary p-2.5 text-left text-[0.72rem] font-semibold text-foreground">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.rows.map((r, ri) => (
              <tr key={ri}>
                <th className="border-t border-border bg-secondary/40 p-2.5 text-left align-top text-[0.8rem] font-medium text-foreground">{r}</th>
                {q.cols.map((_, ci) => (
                  <td key={ci} className="border-l border-t border-border p-0 align-top"><Cell id={`${q.id}__${ri}_${ci}`} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </QuestionShell>
  );
}

function ScaleBlock({ compId }: { compId: string }) {
  const v = Number(useField(`${compId}__scale`)) || 0;
  const pos = v ? (v - 0.5) * 25 : 0;
  return (
    <div className="mb-6 rounded-lg border border-border bg-secondary/30 p-5">
      <h4 className="font-serif text-lg text-foreground">Where does this area sit?</h4>
      <p className="mb-4 mt-1 text-[0.85rem] text-muted-foreground">
        After working through this area, set the pointer to your overall read of how ready it is.
      </p>
      <div
        className="relative my-1.5 mb-4 h-2 rounded-full"
        style={{ background: "linear-gradient(90deg,#d8593f,#e6a23c,#4fb07f,#0aa18f)", opacity: v ? 1 : 0.3 }}
      >
        <span
          className="absolute top-1/2 h-5 w-5 rounded-full border-[3px] border-primary bg-white shadow transition-all"
          style={{ left: `${pos}%`, transform: `translate(-50%,-50%) scale(${v ? 1 : 0})` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {SCALE_KEY.map((s) => {
          const active = v === s.value;
          return (
            <button key={s.value} onClick={() => setField(`${compId}__scale`, active ? "" : String(s.value))} className="group text-left">
              <div className={cn("mb-2 h-1.5 rounded-full transition-all", active ? "scale-y-150" : "opacity-40 group-hover:opacity-80")}
                style={{ background: ["#d8593f", "#e6a23c", "#4fb07f", "#0aa18f"][s.value - 1] }} />
              <div className={cn("text-[0.78rem] font-semibold", active ? "text-foreground" : "text-muted-foreground")}>{s.label}</div>
              <div className="mt-0.5 text-[0.7rem] leading-snug text-muted-foreground">{s.desc}</div>
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
      className="mb-2 min-h-[44px] w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground/50 focus:border-primary" />
  );
}

function ReflectionsQ({ q }: { q: Extract<Question, { type: "reflections" }> }) {
  return (
    <QuestionShell>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-2.5 text-[0.9rem] font-semibold text-foreground">What might make this difficult</h4>
          {[0, 1, 2].map((i) => <ReflectionCell key={i} id={`${q.id}__challenge_${i}`} placeholder={`Point ${i + 1}`} />)}
        </div>
        <div>
          <h4 className="mb-2.5 text-[0.9rem] font-semibold text-foreground">What is already working in your favour</h4>
          {[0, 1, 2].map((i) => <ReflectionCell key={i} id={`${q.id}__support_${i}`} placeholder={`Point ${i + 1}`} />)}
        </div>
      </div>
    </QuestionShell>
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
    case "note": return <p key={key} className="pt-4 text-[0.9rem] italic text-muted-foreground">{q.text}</p>;
    default: return null;
  }
}

export function SubSectionView({ sub, compId, defaultOpen }: { sub: SubSection; compId: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  useStoreVersion();
  const st = subStatus(sub.questions);
  const isReflection = sub.questions.some((q) => q.type === "reflections");
  return (
    <div className={cn("mb-3 overflow-hidden rounded-lg border bg-card transition", st.state === "complete" ? "border-primary/40" : "border-border")}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
        <span className={cn("grid h-5 w-5 flex-none place-items-center rounded-full border transition",
          st.state === "complete" && "border-primary bg-primary text-primary-foreground",
          st.state === "partial" && "border-primary/50",
          st.state === "" && "border-input")}>
          {st.state === "complete" && <Check className="h-3 w-3" />}
          {st.state === "partial" && <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />}
        </span>
        <span className="font-medium text-foreground">{sub.title}</span>
        <span className="ml-auto flex items-center gap-3">
          {st.total > 0 && <span className="text-[0.72rem] tabular-nums text-muted-foreground">{st.done}/{st.total}</span>}
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <div className="border-t border-border px-5 pb-5">
          {isReflection && <div className="pt-5"><ScaleBlock compId={compId} /></div>}
          <div className="divide-y divide-border/70">
            {sub.questions.map((q, i) => renderQuestion(q, i))}
          </div>
        </div>
      )}
    </div>
  );
}
