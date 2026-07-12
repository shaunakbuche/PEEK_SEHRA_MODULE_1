import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, CheckCircle2, Download, Eye, Loader2, Plus, RefreshCw,
  Search, Sparkles, Undo2, X,
} from "lucide-react";
import { api, type AssessmentPayload, type AssessmentStatus, type OrgRow } from "@/lib/api";
import type { ReportContent } from "@/lib/reportTypes";
import { INDICATOR_LEVELS } from "@/lib/reportTypes";
import { ASSESS, SCALE_KEY, type Question } from "@/data/sehra";
import { TopBar, StatusPill, STATUS_META } from "@/components/brand";
import { ReportView } from "@/components/ReportView";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Create organization                                                  */
/* ------------------------------------------------------------------ */

/** Stable input row, defined at module scope so it never remounts on keystroke. */
function OrgField({ label, value, onChange, type = "text", required = true, hint }: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      <input
        type={type} required={required} value={value} onChange={onChange}
        className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      {hint && <span className="mt-1 block text-[0.7rem] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function CreateOrgModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", country: "", region: "", email: "", password: "", fullName: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/api/admin/organizations", form);
      setForm({ name: "", country: "", region: "", email: "", password: "", fullName: "" });
      onCreated();
      onClose();
      toast.push("success", `${form.name} created. Share the login with ${form.email}.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.form
        initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-7 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <h3 className="font-serif text-2xl">New organization</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Creates the organization and the login you will share with them.</p>
        <div className="mt-5 grid gap-3.5 sm:grid-cols-2">
          <OrgField label="Organization / school" value={form.name} onChange={set("name")} />
          <OrgField label="Country" value={form.country} onChange={set("country")} />
          <OrgField label="Region / province" value={form.region} onChange={set("region")} required={false} />
          <OrgField label="Contact name" value={form.fullName} onChange={set("fullName")} required={false} />
          <OrgField label="Login email" type="email" value={form.email} onChange={set("email")} />
          <OrgField label="Temporary password" value={form.password} onChange={set("password")} hint="At least 8 characters. Share it with the school." />
        </div>
        {error && <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-600 disabled:opacity-60">
            {busy ? "Creating…" : "Create login"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Read-only answers                                                    */
/* ------------------------------------------------------------------ */

function answerLines(q: Question, a: Record<string, string>): { q: string; a: string }[] {
  const val = (k: string) => (a[k] ?? "").trim();
  switch (q.type) {
    case "yn": {
      const v = val(q.id + "__yn"); const rem = val(q.id + "__rem");
      return v || rem ? [{ q: q.text, a: [v, rem].filter(Boolean).join(" — ") }] : [];
    }
    case "text": case "field": {
      const v = val(q.id);
      return v ? [{ q: q.text, a: v }] : [];
    }
    case "group": {
      const parts = q.items.map((it, i) => ({ it, v: val(`${q.id}__${i}`) })).filter((x) => x.v)
        .map((x) => `${x.it}: ${x.v}`);
      const rem = val(q.id + "__rem");
      if (rem) parts.push(`Remarks: ${rem}`);
      return parts.length ? [{ q: q.text, a: parts.join(" · ") }] : [];
    }
    case "table": {
      const cells: string[] = [];
      q.rows.forEach((r, ri) => q.cols.forEach((c, ci) => {
        const v = val(`${q.id}__${ri}_${ci}`);
        if (v) cells.push(`${r}/${c}: ${v}`);
      }));
      return cells.length ? [{ q: q.text, a: cells.join(" · ") }] : [];
    }
    case "reflections": {
      const out: { q: string; a: string }[] = [];
      const ch = [0, 1, 2].map((i) => val(`${q.id}__challenge_${i}`)).filter(Boolean);
      const su = [0, 1, 2].map((i) => val(`${q.id}__support_${i}`)).filter(Boolean);
      if (ch.length) out.push({ q: "Challenges", a: ch.join(" · ") });
      if (su.length) out.push({ q: "Supporting factors", a: su.join(" · ") });
      return out;
    }
    default:
      return [];
  }
}

function ReadonlyAnswers({ answers }: { answers: Record<string, string> }) {
  return (
    <div className="space-y-8">
      {ASSESS.map((comp) => {
        const scaleV = Number(answers[`${comp.id}__scale`]) || 0;
        const scale = SCALE_KEY.find((s) => s.value === scaleV);
        const subs = comp.subsections
          .map((sub) => ({ sub, qa: sub.questions.flatMap((qq) => answerLines(qq, answers)) }))
          .filter((x) => x.qa.length);
        if (!subs.length && !scale) return null;
        return (
          <section key={comp.id}>
            <div className="mb-3 flex items-center gap-3">
              <h4 className="font-serif text-lg">
                {comp.id === "context" ? "Context" : `Component ${comp.number} · ${comp.title}`}
              </h4>
              {scale && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[0.7rem] font-bold text-primary">{scale.label}</span>
              )}
            </div>
            {subs.map(({ sub, qa }) => (
              <div key={sub.id} className="mb-4 rounded-lg border border-border bg-card p-4">
                <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-wide text-muted-foreground">{sub.id} {sub.title}</div>
                <dl className="space-y-2.5">
                  {qa.map((x, i) => (
                    <div key={i}>
                      <dt className="text-[0.8rem] font-medium text-foreground">{x.q}</dt>
                      <dd className="text-[0.82rem] text-muted-foreground">{x.a}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Return to school                                                     */
/* ------------------------------------------------------------------ */

function ReturnModal({ open, onClose, onConfirm, busy }: {
  open: boolean; onClose: () => void; onConfirm: (note: string) => void; busy: boolean;
}) {
  const [note, setNote] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <h3 className="font-serif text-2xl">Return to school</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          The assessment unlocks for editing again. Let them know what needs another look.
        </p>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Note (optional)</span>
          <textarea
            value={note} onChange={(e) => setNote(e.target.value)} rows={4} autoFocus
            placeholder="For example: a few tables in Component 4 look incomplete."
            className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary">Cancel</button>
          <button
            onClick={() => onConfirm(note)} disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
          >
            <Undo2 className="h-4 w-4" /> {busy ? "Sending back…" : "Return to school"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Report editor                                                        */
/* ------------------------------------------------------------------ */

function ListEditor({ items, onChange, placeholder }: {
  items: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex gap-1.5">
          <input
            value={it}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            placeholder={placeholder}
            className="w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-sm outline-none transition focus:border-primary"
          />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="rounded-md px-2 text-muted-foreground hover:bg-secondary hover:text-destructive">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])}
        className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
        <Plus className="h-3 w-3" /> Add point
      </button>
    </div>
  );
}

function Area({ label, value, onChange, rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      <textarea
        value={value} rows={rows} onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}

function ReportEditor({ reportId, initial, onPublished }: {
  reportId: string; initial: ReportContent; onPublished: (r: { pdfUrl: string | null; docxUrl: string | null }) => void;
}) {
  const toast = useToast();
  const [content, setContent] = useState<ReportContent>(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "approve">("");
  const [preview, setPreview] = useState(false);

  const up = (patch: Partial<ReportContent>) => {
    setContent((c) => ({ ...c, ...patch }));
    setDirty(true);
  };

  const save = async () => {
    setBusy("save");
    try {
      await api.put(`/api/admin/reports/${reportId}`, { content });
      setDirty(false);
      toast.push("success", "Report edits saved.");
    } catch (e: any) { toast.push("error", e.message); } finally { setBusy(""); }
  };

  const approve = async () => {
    setBusy("approve");
    try {
      if (dirty) await api.put(`/api/admin/reports/${reportId}`, { content });
      const { report } = await api.post<{ report: { pdfUrl: string | null; docxUrl: string | null } }>(
        `/api/admin/reports/${reportId}/approve`
      );
      setDirty(false);
      onPublished(report);
      toast.push("success", "Report published. The school can now see and download it.");
    } catch (e: any) { toast.push("error", e.message); } finally { setBusy(""); }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button onClick={() => setPreview(!preview)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary">
          <Eye className="h-4 w-4" /> {preview ? "Edit" : "Preview"}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={save} disabled={!!busy || !dirty}
            className="rounded-lg border border-border px-3.5 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary disabled:opacity-50">
            {busy === "save" ? "Saving…" : "Save edits"}
          </button>
          <button onClick={approve} disabled={!!busy}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-600 disabled:opacity-60">
            {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Approve & publish
          </button>
        </div>
      </div>

      {preview ? (
        <div className="rounded-2xl border border-border bg-card p-8">
          <ReportView content={content} />
        </div>
      ) : (
        <div className="space-y-5">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Title</span>
            <input value={content.title} onChange={(e) => up({ title: e.target.value })}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 font-serif text-lg outline-none transition focus:border-primary" />
          </label>
          <Area label="Executive summary" value={content.executiveSummary} onChange={(v) => up({ executiveSummary: v })} rows={6} />
          <Area label="Context" value={content.context} onChange={(v) => up({ context: v })} rows={5} />

          {content.components.map((c, i) => (
            <div key={i} className="rounded-xl border border-border bg-secondary/20 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="font-serif">Component {i + 1}: {c.name}</span>
                <select
                  value={c.indicatorLevel}
                  onChange={(e) => up({ components: content.components.map((x, j) => j === i ? { ...x, indicatorLevel: e.target.value } : x) })}
                  className="rounded-md border border-input bg-card px-2 py-1 text-xs font-semibold outline-none focus:border-primary"
                >
                  {INDICATOR_LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <Area label="Findings" value={c.findings} rows={3}
                onChange={(v) => up({ components: content.components.map((x, j) => j === i ? { ...x, findings: v } : x) })} />
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Challenges</span>
                  <ListEditor items={c.challenges}
                    onChange={(v) => up({ components: content.components.map((x, j) => j === i ? { ...x, challenges: v } : x) })} />
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Supporting factors</span>
                  <ListEditor items={c.supports}
                    onChange={(v) => up({ components: content.components.map((x, j) => j === i ? { ...x, supports: v } : x) })} />
                </div>
              </div>
            </div>
          ))}

          {content.themeAnalysis.map((t, i) => (
            <div key={i} className="rounded-xl border border-border bg-secondary/20 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">{t.theme}</span>
                <button onClick={() => up({ themeAnalysis: content.themeAnalysis.filter((_, j) => j !== i) })}
                  className="text-xs text-muted-foreground hover:text-destructive">Remove theme</button>
              </div>
              <Area label="Assessment" value={t.assessment} rows={3}
                onChange={(v) => up({ themeAnalysis: content.themeAnalysis.map((x, j) => j === i ? { ...x, assessment: v } : x) })} />
              <div className="mt-3">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Evidence</span>
                <ListEditor items={t.evidence}
                  onChange={(v) => up({ themeAnalysis: content.themeAnalysis.map((x, j) => j === i ? { ...x, evidence: v } : x) })} />
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Feasibility verdict</span>
              <input value={content.feasibility.verdict}
                onChange={(e) => up({ feasibility: { ...content.feasibility, verdict: e.target.value } })}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm font-semibold outline-none transition focus:border-primary" />
            </label>
            <Area label="Rationale" value={content.feasibility.rationale} rows={3}
              onChange={(v) => up({ feasibility: { ...content.feasibility, rationale: v } })} />
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Recommendations</span>
            <ListEditor items={content.recommendations} onChange={(v) => up({ recommendations: v })} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Org detail                                                           */
/* ------------------------------------------------------------------ */

function OrgDetail({ org, onBack, onChanged }: { org: OrgRow; onBack: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [payload, setPayload] = useState<AssessmentPayload | null>(null);
  const [tab, setTab] = useState<"answers" | "report">("answers");
  const [genBusy, setGenBusy] = useState(false);
  const [returnBusy, setReturnBusy] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const p = await api.get<AssessmentPayload>(`/api/assessment?orgId=${org.id}`);
      setPayload(p);
      if (p.report) setTab("report");
    } catch (e: any) {
      setError(e.message);
    }
  }, [org.id]);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    if (!payload) return;
    setGenBusy(true); setError("");
    try {
      await api.post("/api/admin/reports/generate", { assessmentId: payload.assessment.id });
      await load();
      setTab("report");
      onChanged();
      toast.push("success", "Report drafted. Review and edit before publishing.");
    } catch (e: any) { setError(e.message); toast.push("error", e.message); } finally { setGenBusy(false); }
  };

  const returnToSchool = async (note: string) => {
    if (!payload) return;
    setReturnBusy(true); setError("");
    try {
      await api.patch(`/api/admin/assessments/${payload.assessment.id}`, { action: "return", note });
      await load();
      onChanged();
      setReturnOpen(false);
      toast.push("success", "Sent back to the school for changes.");
    } catch (e: any) { setError(e.message); toast.push("error", e.message); } finally { setReturnBusy(false); }
  };

  const a = payload?.assessment;
  const answered = useMemo(
    () => (a ? Object.values(a.answers).filter((v) => v && v.trim()).length : 0),
    [a]
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> All organizations
      </button>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">{org.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[org.country, org.region].filter(Boolean).join(" · ")}
            {org.schoolEmail && <> · {org.schoolEmail}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {a && <StatusPill status={a.status} />}
          <span className="text-xs text-muted-foreground">{answered} answers</span>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}
      {!payload && !error && <div className="grid min-h-[30vh] place-items-center"><span className="loader" /></div>}

      {payload && a && (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border">
            {(["answers", "report"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn(
                  "-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition",
                  tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}>
                {t === "answers" ? "Assessment answers" : "Report"}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 pb-2">
              {["submitted", "in_review"].includes(a.status) && (
                <button onClick={() => setReturnOpen(true)} disabled={returnBusy}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition hover:border-amber-400 hover:text-amber-600 disabled:opacity-50">
                  <Undo2 className="h-3.5 w-3.5" /> Return to school
                </button>
              )}
              {a.status !== "draft" && (
                <button onClick={generate} disabled={genBusy}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary-600 disabled:opacity-60">
                  {genBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {payload.report ? "Regenerate with AI" : "Generate report with AI"}
                </button>
              )}
            </div>
          </div>

          {tab === "answers" && (
            a.status === "draft" && answered === 0
              ? <p className="py-16 text-center text-muted-foreground">The school has not started yet.</p>
              : <ReadonlyAnswers answers={a.answers} />
          )}

          {tab === "report" && (
            payload.report ? (
              <>
                {payload.report.status === "approved" && (
                  <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" /> Published to the school
                    {payload.report.pdfUrl && (
                      <a className="ml-auto flex items-center gap-1 font-semibold hover:underline" href={payload.report.pdfUrl} target="_blank" rel="noopener">
                        <Download className="h-3.5 w-3.5" /> PDF
                      </a>
                    )}
                    {payload.report.docxUrl && (
                      <a className="flex items-center gap-1 font-semibold hover:underline" href={payload.report.docxUrl} target="_blank" rel="noopener">
                        <Download className="h-3.5 w-3.5" /> Word
                      </a>
                    )}
                  </div>
                )}
                <ReportEditor
                  key={payload.report.id + payload.report.status}
                  reportId={payload.report.id}
                  initial={payload.report.content}
                  onPublished={() => { load(); onChanged(); }}
                />
              </>
            ) : (
              <div className="py-16 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-primary/40" />
                <p className="mt-3 text-muted-foreground">
                  {a.status === "draft"
                    ? "Waiting for the school to submit before a report can be generated."
                    : "No report yet. Generate a first draft with AI, then edit and approve it."}
                </p>
              </div>
            )
          )}
        </>
      )}
      <ReturnModal open={returnOpen} onClose={() => setReturnOpen(false)} onConfirm={returnToSchool} busy={returnBusy} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                            */
/* ------------------------------------------------------------------ */

const FILTERS: (AssessmentStatus | "all")[] = ["all", "draft", "submitted", "in_review", "approved", "returned"];
type SortKey = "updated" | "name" | "status";

function StatsStrip({ orgs, filter, onFilter }: {
  orgs: OrgRow[]; filter: AssessmentStatus | "all"; onFilter: (f: AssessmentStatus | "all") => void;
}) {
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orgs.length };
    for (const o of orgs) c[o.assessmentStatus] = (c[o.assessmentStatus] ?? 0) + 1;
    return c;
  }, [orgs]);

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {FILTERS.map((f) => {
        const n = counts[f] ?? 0;
        const active = filter === f;
        const label = f === "all" ? "All" : STATUS_META[f].label;
        return (
          <button
            key={f}
            onClick={() => onFilter(f)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
              active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
            )}
          >
            {label}
            <span className={cn("rounded-full px-1.5 py-0.5 text-[0.68rem] tabular-nums", active ? "bg-primary-foreground/20" : "bg-secondary")}>
              {n}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function Admin() {
  const [orgs, setOrgs] = useState<OrgRow[] | null>(null);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<OrgRow | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AssessmentStatus | "all">("all");
  const [sort, setSort] = useState<SortKey>("updated");

  const load = useCallback(async () => {
    setError("");
    try {
      const { organizations } = await api.get<{ organizations: OrgRow[] }>("/api/admin/organizations");
      setOrgs(organizations);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    if (!orgs) return [];
    const q = query.trim().toLowerCase();
    let rows = orgs.filter((o) => filter === "all" || o.assessmentStatus === filter);
    if (q) {
      rows = rows.filter((o) =>
        [o.name, o.country, o.region, o.schoolEmail].filter(Boolean).some((v) => v!.toLowerCase().includes(q))
      );
    }
    const byName = (a: OrgRow, b: OrgRow) => a.name.localeCompare(b.name);
    const byUpdated = (a: OrgRow, b: OrgRow) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime();
    const statusOrder: AssessmentStatus[] = ["submitted", "in_review", "returned", "draft", "approved"];
    const byStatus = (a: OrgRow, b: OrgRow) => statusOrder.indexOf(a.assessmentStatus) - statusOrder.indexOf(b.assessmentStatus);
    return [...rows].sort(sort === "name" ? byName : sort === "status" ? byStatus : byUpdated);
  }, [orgs, query, filter, sort]);

  return (
    <div className="min-h-screen bg-background">
      <TopBar context="Peek Vision · Admin" />

      {selected ? (
        <OrgDetail org={selected} onBack={() => { setSelected(null); load(); }} onChanged={load} />
      ) : (
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-primary">SEHRA · Module 1</p>
              <h1 className="mt-2 font-serif text-3xl sm:text-4xl">Scoping assessments</h1>
            </div>
            <div className="flex gap-2">
              <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2.5 text-sm font-semibold transition hover:border-primary hover:text-primary">
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
              <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-600">
                <Plus className="h-4 w-4" /> New organization
              </button>
            </div>
          </div>

          {error && <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}
          {!orgs && !error && <div className="grid min-h-[30vh] place-items-center"><span className="loader" /></div>}

          {orgs && orgs.length > 0 && (
            <>
              <StatsStrip orgs={orgs} filter={filter} onFilter={setFilter} />

              <div className="mb-5 flex flex-wrap gap-2.5">
                <div className="relative min-w-[220px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, country or email"
                    className="w-full rounded-lg border border-input bg-card py-2 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
                <select
                  value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
                  className="rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
                >
                  <option value="updated">Recently updated</option>
                  <option value="status">Needs attention first</option>
                  <option value="name">Name (A to Z)</option>
                </select>
              </div>
            </>
          )}

          {orgs && orgs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border py-20 text-center">
              <p className="text-muted-foreground">No organizations yet. Create the first login to share with a school.</p>
            </div>
          )}

          {orgs && orgs.length > 0 && visible.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center">
              <p className="text-muted-foreground">No organizations match your search or filter.</p>
            </div>
          )}

          {visible.length > 0 && (
            <>
              {/* table, sm and up */}
              <div className="hidden overflow-hidden rounded-2xl border border-border bg-card sm:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-3 font-semibold">Organization</th>
                      <th className="hidden px-5 py-3 font-semibold md:table-cell">Country</th>
                      <th className="px-5 py-3 font-semibold">Assessment</th>
                      <th className="hidden px-5 py-3 font-semibold sm:table-cell">Report</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((o) => (
                      <tr key={o.id} className="group cursor-pointer border-b border-border/60 transition last:border-0 hover:bg-secondary/30"
                        onClick={() => setSelected(o)}>
                        <td className="px-5 py-4">
                          <div className="font-medium">{o.name}</div>
                          <div className="text-xs text-muted-foreground">{o.schoolEmail}</div>
                        </td>
                        <td className="hidden px-5 py-4 text-muted-foreground md:table-cell">
                          {[o.country, o.region].filter(Boolean).join(" · ")}
                        </td>
                        <td className="px-5 py-4"><StatusPill status={o.assessmentStatus} /></td>
                        <td className="hidden px-5 py-4 sm:table-cell">
                          <StatusPill status={o.reportStatus === "approved" ? "approved_report" : o.reportStatus ?? "none"} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-xs font-semibold text-primary opacity-0 transition group-hover:opacity-100">Open →</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* cards, below sm */}
              <div className="space-y-2.5 sm:hidden">
                {visible.map((o) => (
                  <button
                    key={o.id} onClick={() => setSelected(o)}
                    className="block w-full rounded-xl border border-border bg-card p-4 text-left transition active:bg-secondary/40"
                  >
                    <div className="font-medium">{o.name}</div>
                    <div className="text-xs text-muted-foreground">{o.schoolEmail}</div>
                    {(o.country || o.region) && (
                      <div className="mt-0.5 text-xs text-muted-foreground">{[o.country, o.region].filter(Boolean).join(" · ")}</div>
                    )}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <StatusPill status={o.assessmentStatus} />
                      <StatusPill status={o.reportStatus === "approved" ? "approved_report" : o.reportStatus ?? "none"} />
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <CreateOrgModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
    </div>
  );
}
