import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compileReport, sendOnline, sendMailto, downloadReport, exportJSON, DEFAULT_RECIPIENTS } from "@/lib/report";

type Status = { kind: "ok" | "err" | "info"; msg: string } | null;

export function EmailModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [to, setTo] = useState(DEFAULT_RECIPIENTS);
  const [from, setFrom] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [showPreview, setShowPreview] = useState(false);

  if (!open) return null;
  const preview = compileReport().text;

  async function handleSend() {
    if (!to.trim()) { setStatus({ kind: "err", msg: "Enter at least one email address." }); return; }
    setSending(true); setStatus(null);
    try {
      const res = await sendOnline(to, from);
      if (res.ok) setStatus({ kind: "ok", msg: `Sent to ${res.primary}. ${to.split(/[,;\s]+/).filter(Boolean).length > 1 ? "Other recipients are listed inside the report — or use 'Open in my email app'." : ""}` });
      else throw new Error(res.message || "error");
    } catch {
      setStatus({ kind: "info", msg: "Couldn't send automatically (the inbox may need a one-time FormSubmit activation, or you're offline). Use 'Open in my email app' or 'Download report' — both contain the full module." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-5 bg-[rgba(5,30,28,0.55)] backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-[20px] max-w-[560px] w-full max-h-[90vh] overflow-auto shadow-2xl">
        <div className="px-6 pt-6 pb-4 border-b border-border sticky top-0 bg-card z-10">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary grid place-items-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"><X className="w-4 h-4" /></button>
          <h3 className="font-serif text-2xl m-0">Submit the completed module</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">Delivers your full Scoping Module — every answer, table, indicator and reflection — by email.</p>
        </div>
        <div className="px-6 py-5">
          <div className="mb-4">
            <label className="block text-[0.74rem] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Send to</label>
            <input value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border border-input px-3 py-2.5 text-sm bg-card outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="mb-4">
            <label className="block text-[0.74rem] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Your name / organisation (optional)</label>
            <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="e.g. Jane Doe, National Eye Health Programme" className="w-full rounded-lg border border-input px-3 py-2.5 text-sm bg-card outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="flex flex-col gap-2.5 mt-1">
            <Button onClick={handleSend} disabled={sending} className="justify-center py-3">
              {sending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending…</> : "Send report now"}
            </Button>
            <div className="text-center text-[0.74rem] uppercase tracking-wider text-muted-foreground/60 my-1">or</div>
            <Button variant="outline" onClick={() => sendMailto(to)} className="justify-center">Open in my email app</Button>
            <Button variant="outline" onClick={() => downloadReport()} className="justify-center">Download report (.html)</Button>
            <Button variant="ghost" onClick={exportJSON} className="justify-center">Export raw data (.json)</Button>
          </div>
          {status && (
            <div className={
              "text-[0.86rem] p-2.5 rounded-lg mt-3 " +
              (status.kind === "ok" ? "bg-primary/15 text-primary" : status.kind === "err" ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground")
            }>{status.msg}</div>
          )}
          <button onClick={() => setShowPreview(!showPreview)} className="mt-3.5 text-[0.82rem] text-muted-foreground underline">{showPreview ? "Hide" : "Preview"} what will be sent</button>
          {showPreview && <div className="bg-secondary/60 rounded-lg p-3 text-[0.78rem] text-muted-foreground max-h-[180px] overflow-auto whitespace-pre-wrap font-mono mt-2">{preview}</div>}
        </div>
      </div>
    </div>
  );
}
