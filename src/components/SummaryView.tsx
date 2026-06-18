import { COMPONENTS, COMPONENT_TITLES, SCALE_KEY } from "@/data/sehra";
import { useField, useStoreVersion, completionPct, getField, setField } from "@/lib/store";
import { Button } from "@/components/ui/button";

const SCALE_COLORS = ["#d8593f", "#e6a23c", "#4fb07f", "#0aa18f"];

function Extra({ id, q }: { id: string; q: string }) {
  const v = useField(id);
  return (
    <div className="py-4 border-b border-dashed border-border last:border-0">
      <div className="text-[0.95rem] font-medium mb-1">{q}</div>
      <textarea value={v} onChange={(e) => setField(id, e.target.value)} placeholder="Remarks…"
        className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[80px] resize-y" />
    </div>
  );
}

export function SummaryView({ onSubmit }: { onSubmit: () => void }) {
  useStoreVersion();
  const pct = completionPct();

  const reflRows = (type: "challenge" | "support") =>
    COMPONENTS.map((c) => {
      const items = [0, 1, 2].map((i) => getField(`${c.id}__${type}_${i}`)).filter((x) => x && x.trim());
      return (
        <tr key={c.id}>
          <td className="p-3.5 border-t border-border font-semibold text-primary-600 w-[230px] align-top">
            Component {c.number}: {COMPONENT_TITLES[c.id]}
          </td>
          <td className="p-3.5 border-t border-border align-top text-[0.92rem]">
            {items.length ? (
              <ul className="list-disc pl-4 space-y-1">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
            ) : (
              <span className="text-muted-foreground/60 italic">Complete the Reflections of Component {c.number} to populate this row.</span>
            )}
          </td>
        </tr>
      );
    });

  return (
    <div>
      <div className="mb-6">
        <div className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-accent">Output</div>
        <h2 className="font-serif text-3xl md:text-4xl mt-2">Summary &amp; Submission</h2>
        <p className="mt-3.5 text-[1.02rem] text-muted-foreground max-w-2xl border-l-[3px] border-primary pl-4">
          This chapter self-generates from the Reflections you entered at the end of each component — exactly like the printed module. The final items are completed manually.
        </p>
      </div>

      <div className="flex gap-5 items-center rounded-2xl p-6 mb-7 text-primary-foreground" style={{ background: "linear-gradient(135deg,hsl(var(--primary-600)),hsl(var(--primary)))" }}>
        <div className="font-serif text-4xl leading-none">{pct}%</div>
        <div>
          <strong>Assessment progress</strong>
          <p className="m-0 text-sm opacity-90">{pct === 100 ? "Every section has a response. Ready to submit." : "Fields autosave to this browser as you complete them."}</p>
        </div>
      </div>

      <h3 className="font-serif text-xl mb-3">Indicator scorecard</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mb-7">
        {COMPONENTS.map((c) => {
          const v = Number(getField(`${c.id}__scale`)) || 0;
          const s = SCALE_KEY.find((x) => x.value === v);
          const color = v ? SCALE_COLORS[v - 1] : "hsl(var(--border))";
          return (
            <div key={c.id} className="rounded-xl border border-border bg-card p-3.5 text-center">
              <div className="text-[0.72rem] text-muted-foreground min-h-[30px]">C{c.number} · {COMPONENT_TITLES[c.id].split(" ").slice(0, 2).join(" ")}</div>
              <div className="h-2 rounded-full bg-secondary my-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${v * 25}%`, background: color }} /></div>
              <div className="font-serif font-bold text-[0.95rem]" style={{ color }}>{s ? s.label : "—"}</div>
            </div>
          );
        })}
      </div>

      <h3 className="font-serif text-xl mb-3">Key points that may make implementation challenging</h3>
      <table className="w-full border-collapse rounded-2xl overflow-hidden border border-border bg-card mb-7">
        <thead><tr><th className="text-left text-[0.78rem] uppercase tracking-wide p-3 bg-accent/10 text-accent">Component</th><th className="text-left text-[0.78rem] uppercase tracking-wide p-3 bg-accent/10 text-accent">Challenges</th></tr></thead>
        <tbody>{reflRows("challenge")}</tbody>
      </table>

      <h3 className="font-serif text-xl mb-3">Key points that support implementation</h3>
      <table className="w-full border-collapse rounded-2xl overflow-hidden border border-border bg-card mb-7">
        <thead><tr><th className="text-left text-[0.78rem] uppercase tracking-wide p-3 bg-primary/10 text-primary">Component</th><th className="text-left text-[0.78rem] uppercase tracking-wide p-3 bg-primary/10 text-primary">Supports</th></tr></thead>
        <tbody>{reflRows("support")}</tbody>
      </table>

      <h3 className="font-serif text-xl mb-3">Additional items (completed manually)</h3>
      <div className="rounded-2xl border border-border bg-card px-5 mb-7">
        <Extra id="sum_gaps" q="Were there any evidence gaps / research questions noted during the scoping exercise?" />
        <Extra id="sum_groups" q="Additional information on parent-teacher associations, child-to-child / child-to-community groups (girl guides, scouts, etc.)?" />
        <Extra id="sum_unserved" q="Groups with no eye-health screening service (e.g. street children)? Can you estimate their numbers?" />
      </div>

      <div className="rounded-2xl border border-dashed border-input bg-card p-6">
        <strong>End of environmental assessment.</strong>
        <p className="mt-2 mb-4 text-sm text-muted-foreground">When complete, submit your report and it will be emailed straight to the Peek SEHRA team. A time will then be arranged to go through the data from this module.</p>
        <Button size="lg" onClick={onSubmit}>✉ Submit &amp; email the completed module</Button>
      </div>
    </div>
  );
}
