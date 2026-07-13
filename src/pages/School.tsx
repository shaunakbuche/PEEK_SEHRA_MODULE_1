import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Download, FileText, MessageCircle, Printer, Send } from "lucide-react";
import { api, type AssessmentPayload } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { hydrate, enableServerSync, disableServerSync, flushNow, completionPct, useStoreVersion, getAll } from "@/lib/store";
import { TopBar, SaveBadge, StatusPill, ProgressRing } from "@/components/brand";
import { AssessmentWorkspace, type Section } from "@/components/AssessmentWorkspace";
import { ReportView } from "@/components/ReportView";
import { Dialog } from "@/components/Dialog";
import { MessageThread } from "@/components/MessageThread";
import { relativeTime } from "@/lib/utils";

type Payload = AssessmentPayload;

function SubmitModal({ open, onClose, onConfirm, busy }: {
  open: boolean; onClose: () => void; onConfirm: () => void; busy: boolean;
}) {
  useStoreVersion();
  const pct = completionPct();
  return (
    <Dialog open={open} onClose={onClose} labelledBy="submit-modal-title">
      <div className="flex items-start justify-between">
        <h3 id="submit-modal-title" className="font-serif text-2xl">Submit to Peek?</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Your assessment is <strong className="text-foreground">{pct}% complete</strong>. Once submitted it locks for
        editing while the Peek team reviews it and prepares your report. They can return it to you if anything
        needs another look.
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold transition hover:border-primary hover:text-primary">
          Keep editing
        </button>
        <button
          onClick={onConfirm}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-600 disabled:opacity-60"
        >
          <Send className="h-4 w-4" /> {busy ? "Submitting…" : "Submit assessment"}
        </button>
      </div>
    </Dialog>
  );
}

function WelcomeHeader({ orgName, updatedAt }: { orgName?: string; updatedAt?: string | null }) {
  useStoreVersion();
  const pct = completionPct();
  const lastSaved = relativeTime(updatedAt);
  return (
    <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-card p-6">
      <ProgressRing pct={pct} size={84} />
      <div className="min-w-[240px] flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-primary">SEHRA · Module 1</p>
          {lastSaved && (
            <span className="flex items-center gap-1.5 text-[0.72rem] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60" /> Last updated {lastSaved}
            </span>
          )}
        </div>
        <h1 className="mt-1 text-3xl sm:text-4xl">
          {pct === 0 ? "Welcome" : "Welcome back"}{orgName ? `, ${orgName}` : ""}
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          {pct === 0
            ? "Work through each area at your own pace, in any order. Most teams finish within a working week."
            : pct < 100
              ? "Pick up where you left off. Anyone signed in with this login sees the same progress, on any device."
              : "Every question has a response. Review the summary and submit when you are ready."}
        </p>
        <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-1.5 text-[0.8rem] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-primary" /> Saves automatically</span>
          <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-primary" /> Shared across devices</span>
          <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-primary" /> Complete in any order</span>
        </div>
      </div>
    </div>
  );
}

function ReviewTimeline({ status }: { status: "submitted" | "in_review" }) {
  const steps = [
    { label: "Submitted", done: true },
    { label: "Peek review", done: status === "in_review", active: true },
    { label: "Report published", done: false },
  ];
  return (
    <div className="mx-auto mt-10 flex max-w-md items-center">
      {steps.map((s, i) => (
        <div key={i} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-2">
            <span className={`grid h-9 w-9 place-items-center rounded-full border-2 ${s.done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
              {s.done ? <CheckCircle2 className="h-4.5 w-4.5" /> : <Clock className="h-4 w-4" />}
            </span>
            <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">{s.label}</span>
          </div>
          {i < steps.length - 1 && <div className={`mx-2 mb-6 h-px flex-1 ${s.done ? "bg-primary" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );
}

export default function School() {
  const { user } = useAuth();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [section, setSection] = useState<Section>("context");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await api.get<Payload>("/api/assessment");
      // one-time migration: old visitors may have answers only in this browser
      const local = getAll();
      const serverEmpty = Object.keys(p.assessment.answers).length === 0;
      const localFilled = Object.values(local).some((v) => v && v.trim());
      if (serverEmpty && localFilled && ["draft", "returned"].includes(p.assessment.status)) {
        await api.put("/api/assessment", { patch: local });
        p.assessment.answers = { ...local };
      }
      hydrate(p.assessment.answers);
      if (["draft", "returned"].includes(p.assessment.status)) enableServerSync();
      else disableServerSync();
      setPayload(p);
    } catch (e: any) {
      setError(e.message || "Could not load your assessment");
    }
  }, []);

  useEffect(() => {
    load();
    return () => disableServerSync();
  }, [load]);

  const doSubmit = async () => {
    setSubmitBusy(true);
    try {
      await flushNow();
      await api.post("/api/assessment/submit");
      setSubmitOpen(false);
      await load();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setError(e.message || "Submission failed");
    } finally {
      setSubmitBusy(false);
    }
  };

  const a = payload?.assessment;
  const report = payload?.report;
  const editable = a && ["draft", "returned"].includes(a.status);

  return (
    <div className="min-h-screen bg-background">
      <TopBar context={user?.org?.name || "School"}>
        {editable && <SaveBadge />}
        {a && <StatusPill status={a.status} />}
        <button
          onClick={() => setMessagesOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          <MessageCircle className="h-3.5 w-3.5" /> Ask Peek
        </button>
      </TopBar>

      <Dialog open={messagesOpen} onClose={() => setMessagesOpen(false)} labelledBy="messages-title" maxWidth="max-w-lg">
        <div className="mb-3">
          <h3 id="messages-title" className="text-xl">Questions for Peek</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask about the assessment, the module, or anything you are unsure how to answer.
          </p>
        </div>
        <div className="h-[420px]">
          <MessageThread viewerRole="school" emptyText="No messages yet. Ask Peek anything about the assessment." />
        </div>
      </Dialog>

      {error && (
        <div role="alert" className="mx-auto mt-6 max-w-3xl rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!payload && !error && (
        <div className="grid min-h-[60vh] place-items-center"><span className="loader" /></div>
      )}

      {/* editable: the workspace */}
      {a && editable && (
        <>
          {a.status === "returned" && (
            <div className="mx-auto mt-6 max-w-3xl rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
              <div className="text-sm font-semibold text-amber-800">Peek returned this assessment for changes</div>
              {a.returnNote && <p className="mt-1 text-sm text-amber-700">{a.returnNote}</p>}
            </div>
          )}
          <div className="mx-auto max-w-3xl px-6 pt-10">
            <WelcomeHeader orgName={user?.org?.name} updatedAt={a.updatedAt} />
          </div>
          <AssessmentWorkspace section={section} setSection={setSection} onSubmit={() => setSubmitOpen(true)} />
          <SubmitModal open={submitOpen} onClose={() => setSubmitOpen(false)} onConfirm={doSubmit} busy={submitBusy} />
        </>
      )}

      {/* waiting on Peek */}
      {a && (a.status === "submitted" || a.status === "in_review") && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl px-6 py-24 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10">
            <FileText className="h-7 w-7 text-primary" />
          </span>
          <h1 className="mt-6 font-serif text-3xl">With the Peek team</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Your assessment was submitted{a.submittedAt ? ` on ${new Date(a.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}` : ""}. Peek is reviewing your answers and preparing the report. You will
            find it here once it is approved.
          </p>
          <ReviewTimeline status={a.status} />
        </motion.div>
      )}

      {/* approved: the final report */}
      {a && a.status === "approved" && report && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl px-6 py-14">
          <div className="no-print mb-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <CheckCircle2 className="h-4 w-4" /> Approved by Peek Vision
                {report.approvedAt && (
                  <span className="font-normal text-muted-foreground">
                    · {new Date(report.approvedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Your final scoping report is ready.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {report.pdfUrl && (
                <a href={report.pdfUrl} target="_blank" rel="noopener" className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-600">
                  <Download className="h-4 w-4" /> PDF
                </a>
              )}
              {report.docxUrl && (
                <a href={report.docxUrl} target="_blank" rel="noopener" className="flex items-center gap-2 rounded-lg border border-primary/30 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5">
                  <Download className="h-4 w-4" /> Word
                </a>
              )}
              <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary">
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          </div>
          <div id="print-report">
            <ReportView content={report.content} />
          </div>
        </motion.div>
      )}

      {/* approved but report hidden (shouldn't happen, defensive) */}
      {a && a.status === "approved" && !report && (
        <div className="mx-auto max-w-xl px-6 py-24 text-center text-muted-foreground">
          Your report is being finalised. Check back shortly.
        </div>
      )}
    </div>
  );
}
