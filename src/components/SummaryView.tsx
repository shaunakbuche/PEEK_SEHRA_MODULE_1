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
              <span className="italic text-muted-foreground/60">Add your notes at the end of Component {c.number} and they will show here.</span>
            )}
          </td>
        </tr>
      );
    });

  return (
    <div>
      <div className="mb-6">
        <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary">Summary</div>
        <h2 className="mt-2 font-serif text-3xl md:text-4xl">Your answers, brought together</h2>
        <p className="mt-3.5 max-w-2xl text-[1.02rem] leading-relaxed text-muted-foreground">
          This page pulls together the notes you added at the end of each area, plus the indicator you set
          for each one. Add the few remaining items below, then submit.
        </p>
      </div>

      <div className="mb-7 flex items-center gap-5 rounded-lg border border-border bg-secondary/30 p-6">
        <div className="font-serif text-4xl leading-none text-primary">{pct}%</div>
        <div>
          <strong className="text-foreground">Progress</strong>
          <p className="m-0 text-sm text-muted-foreground">{pct === 100 ? "Every section has a response. You are ready to submit." : "Your answers save to this browser as you go."}</p>
        </div>
      </div>

      <h3 className="mb-3 font-serif text-xl">How ready each area looks</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mb-7">
        {COMPONENTS.map((c) => {
          const v = Number(getField(`${c.id}__scale`)) || 0;
          const s = SCALE_KEY.find((x) => x.value === v);
          const color = v ? SCALE_COLORS[v - 1] : "hsl(var(--border))";
          return (
            <div key={c.id} className="rounded-xl border border-border bg-card p-3.5 text-center">
              <div className="text-[0.72rem] text-muted-foreground min-h-[30px]">C{c.number} · {COMPONENT_TITLES[c.id].split(" ").slice(0, 2).join(" ")}</div>
              <div className="h-2 rounded-full bg-secondary my-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${v * 25}%`, background: color }} /></div>
              <div className="text-[0.95rem] font-bold" style={{ color: v ? color : "hsl(var(--muted-foreground))" }}>{s ? s.label : "Not set"}</div>
            </div>
          );
        })}
      </div>

      <h3 className="mb-3 font-serif text-xl">What might make this difficult</h3>
      <table className="mb-7 w-full border-collapse overflow-hidden rounded-lg border border-border bg-card">
        <thead><tr><th className="bg-secondary p-3 text-left text-[0.72rem] uppercase tracking-wide text-muted-foreground">Area</th><th className="bg-secondary p-3 text-left text-[0.72rem] uppercase tracking-wide text-muted-foreground">Points raised</th></tr></thead>
        <tbody>{reflRows("challenge")}</tbody>
      </table>

      <h3 className="mb-3 font-serif text-xl">What is already working in your favour</h3>
      <table className="mb-7 w-full border-collapse overflow-hidden rounded-lg border border-border bg-card">
        <thead><tr><th className="bg-secondary p-3 text-left text-[0.72rem] uppercase tracking-wide text-muted-foreground">Area</th><th className="bg-secondary p-3 text-left text-[0.72rem] uppercase tracking-wide text-muted-foreground">Points raised</th></tr></thead>
        <tbody>{reflRows("support")}</tbody>
      </table>

      <h3 className="mb-3 font-serif text-xl">A few last things</h3>
      <div className="mb-7 rounded-lg border border-border bg-card px-5">
        <Extra id="sum_gaps" q="Were there any gaps in the evidence, or questions you still want to look into?" />
        <Extra id="sum_groups" q="Anything to add about parent and teacher associations, or child and community groups such as guides and scouts?" />
        <Extra id="sum_unserved" q="Are there groups with no eye screening service, such as street children? Roughly how many?" />
      </div>

      <div className="rounded-lg border border-border bg-secondary/30 p-6">
        <strong className="text-foreground">That is the whole assessment.</strong>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">Submit it and it goes to the Peek team by email. They will get in touch to arrange a time to go through your answers together.</p>
        <Button size="lg" onClick={onSubmit}>Submit the assessment</Button>
      </div>
    </div>
  );
}
