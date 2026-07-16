import { useMemo, useRef, useState } from "react";
import { FileUp, Sparkles, Loader2, AlertTriangle, Check } from "lucide-react";
import { Dialog } from "@/components/Dialog";
import { api, type ExtractResponse, type ExtractSuggestion } from "@/lib/api";
import { getField, setField } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const MAX_BYTES = 3 * 1024 * 1024; // 3MB, safely under Vercel's request-body limit
const TEXT_EXT = /\.(txt|md|markdown|csv|json)$/i;
const OK_EXT = /\.(pdf|png|jpe?g|webp|gif|txt|md|markdown|csv|json)$/i;

type Stage = "pick" | "reading" | "review";

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("Could not read that file"));
    r.readAsText(file);
  });
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      resolve(s.slice(s.indexOf(",") + 1)); // strip the data: URL prefix
    };
    r.onerror = () => reject(new Error("Could not read that file"));
    r.readAsDataURL(file);
  });
}

export function DocumentImport({
  open,
  onClose,
  onApplied,
}: {
  open: boolean;
  onClose: () => void;
  onApplied: (count: number) => void;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("pick");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [suggestions, setSuggestions] = useState<ExtractSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const reset = () => {
    setStage("pick");
    setError("");
    setFileName("");
    setSuggestions([]);
    setSelected(new Set());
    if (inputRef.current) inputRef.current.value = "";
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    setError("");
    if (!OK_EXT.test(file.name) && !file.type) {
      setError("Please choose a PDF, an image (JPG or PNG), or a text file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. Please upload a file under 3MB.`);
      return;
    }

    setFileName(file.name);
    setStage("reading");
    try {
      const isText = TEXT_EXT.test(file.name) || file.type.startsWith("text/") || file.type === "application/json";
      const document = isText
        ? { name: file.name, text: await readAsText(file) }
        : { name: file.name, mediaType: file.type || "application/octet-stream", dataBase64: await readAsBase64(file) };

      const res = await api.post<ExtractResponse>("/api/assessment", { document });
      const found = res.suggestions || [];
      setSuggestions(found);
      // Default-select answers to empty fields; leave anything that would
      // overwrite an existing answer unticked so nothing is lost silently.
      setSelected(new Set(found.filter((s) => !getField(s.key).trim()).map((s) => s.key)));
      setStage("review");
    } catch (e: any) {
      setStage("pick");
      setError(e?.message || "The document could not be read. Please try again.");
    }
  };

  const grouped = useMemo(() => {
    const m = new Map<string, ExtractSuggestion[]>();
    for (const s of suggestions) {
      const arr = m.get(s.section) ?? [];
      arr.push(s);
      m.set(s.section, arr);
    }
    return Array.from(m.entries());
  }, [suggestions]);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const allSelected = suggestions.length > 0 && selected.size === suggestions.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(suggestions.map((s) => s.key)));

  const apply = () => {
    const picked = suggestions.filter((s) => selected.has(s.key));
    picked.forEach((s) => setField(s.key, s.value));
    toast.push("success", `Filled in ${picked.length} answer${picked.length === 1 ? "" : "s"} from your document.`);
    onApplied(picked.length);
    close();
  };

  return (
    <Dialog open={open} onClose={close} labelledBy="doc-import-title" maxWidth="max-w-2xl">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 id="doc-import-title" className="font-serif text-2xl leading-tight">Fill in from a document</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload something you already have — a school report, situational analysis or policy PDF — and we will
            suggest answers from it. You review everything before anything is saved. Anything not in the document is
            left blank for you to complete.
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" /> {error}
        </div>
      )}

      {/* PICK */}
      {stage === "pick" && (
        <div className="mt-5">
          <button
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-6 py-10 text-center transition hover:border-primary hover:bg-primary/5"
          >
            <FileUp className="h-7 w-7 text-primary" />
            <span className="text-sm font-semibold text-foreground">Choose a file to scan</span>
            <span className="text-xs text-muted-foreground">PDF, JPG, PNG, or a text file · up to 3MB</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.markdown,.csv,.json,application/pdf,image/*,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <p className="mt-3 text-center text-[0.72rem] text-muted-foreground">
            Your document is sent securely to be read and is not stored.
          </p>
        </div>
      )}

      {/* READING */}
      {stage === "reading" && (
        <div className="mt-8 flex flex-col items-center gap-3 py-8 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">Reading {fileName}…</p>
          <p className="text-xs text-muted-foreground">This can take up to a minute for longer documents.</p>
        </div>
      )}

      {/* REVIEW */}
      {stage === "review" && (
        <div className="mt-5">
          {suggestions.length === 0 ? (
            <div className="rounded-xl border border-border bg-secondary/30 px-5 py-8 text-center">
              <p className="text-sm font-medium text-foreground">No answers matched this document.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                It may not contain the details this assessment asks for. You can try another file or fill things in
                by hand.
              </p>
              <button onClick={reset} className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary">
                Try another document
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Found <strong className="text-foreground">{suggestions.length}</strong> possible answer{suggestions.length === 1 ? "" : "s"} in {fileName}.
                  Untick anything that looks wrong.
                </p>
                <button onClick={toggleAll} className="text-xs font-semibold text-primary hover:underline">
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              </div>

              <div className="mt-3 max-h-[46vh] space-y-4 overflow-y-auto pr-1">
                {grouped.map(([section, items]) => (
                  <div key={section}>
                    <div className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-primary">{section}</div>
                    <div className="space-y-1.5">
                      {items.map((s) => {
                        const current = getField(s.key).trim();
                        const on = selected.has(s.key);
                        return (
                          <label
                            key={s.key}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-2.5 transition",
                              on ? "border-primary/40 bg-primary/[0.04]" : "border-border hover:border-primary/30"
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 grid h-4.5 w-4.5 flex-none place-items-center rounded border transition",
                                on ? "border-primary bg-primary text-primary-foreground" : "border-input"
                              )}
                            >
                              {on && <Check className="h-3 w-3" />}
                            </span>
                            <input type="checkbox" checked={on} onChange={() => toggle(s.key)} className="sr-only" />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[0.82rem] leading-snug text-muted-foreground">{s.label}</span>
                              <span className="mt-0.5 block text-sm font-medium text-foreground">{s.value}</span>
                              {current && (
                                <span className="mt-0.5 block text-[0.72rem] text-amber-700">
                                  Replaces your current answer: “{current.length > 80 ? current.slice(0, 80) + "…" : current}”
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-2 border-t border-border pt-4">
                <button onClick={reset} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold transition hover:border-primary hover:text-primary">
                  Scan another
                </button>
                <button
                  onClick={apply}
                  disabled={selected.size === 0}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-600 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> Fill in {selected.size} answer{selected.size === 1 ? "" : "s"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}
