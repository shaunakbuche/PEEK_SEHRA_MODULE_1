import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { ComponentView } from "@/components/assessment/ComponentView";
import { IncompleteView } from "@/components/assessment/IncompleteView";
import { DocumentImport } from "@/components/assessment/DocumentImport";
import { SummaryView } from "@/components/SummaryView";
import { ASSESS } from "@/data/sehra";
import { useField, setField, useStoreVersion, completionPct, componentDone, unansweredCount } from "@/lib/store";
import { cn } from "@/lib/utils";

export const SECTIONS = ["context", "c1", "c2", "c3", "c4", "c5", "summary"] as const;
export type Section = (typeof SECTIONS)[number];

export const NAV_LABEL: Record<Section, string> = {
  context: "Context",
  c1: "Legislation and policy",
  c2: "Service delivery",
  c3: "People and skills",
  c4: "Supply chain",
  c5: "Barriers",
  summary: "Summary and submit",
};
const SHORT: Record<Section, string> = {
  context: "Context", c1: "Policy", c2: "Services", c3: "People", c4: "Supply", c5: "Barriers", summary: "Summary",
};

function MetaBar() {
  const fields: [string, string][] = [
    ["meta_country", "Country"], ["meta_province", "Province or governorate"],
    ["meta_district", "District or county"], ["meta_date", "Date"],
  ];
  return (
    <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
      {fields.map(([id, lab]) => <MetaField key={id} id={id} label={lab} />)}
    </div>
  );
}
function MetaField({ id, label }: { id: string; label: string }) {
  const v = useField(id);
  return (
    <div className="rounded-md border border-input bg-card px-3.5 py-2.5 transition focus-within:border-primary">
      <label className="mb-1 block text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">{label}</label>
      <input value={v} onChange={(e) => setField(id, e.target.value)}
        className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/40" />
    </div>
  );
}

export function AssessmentWorkspace({
  section, setSection, onSubmit,
}: {
  section: Section;
  setSection: (s: Section) => void;
  onSubmit: () => void;
}) {
  useStoreVersion();
  const [mode, setMode] = useState<"all" | "incomplete">("all");
  const [importOpen, setImportOpen] = useState(false);
  const pct = completionPct();
  const unanswered = unansweredCount();
  const idx = SECTIONS.indexOf(section);
  const prev = SECTIONS[idx - 1];
  const next = SECTIONS[idx + 1];
  const comp = ASSESS.find((c) => c.id === section);

  const go = (s: Section) => {
    setMode("all");
    setSection(s);
    document.getElementById("assessment")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section id="assessment" className="relative scroll-mt-16 border-t border-border">
      {/* sticky stepper */}
      <div className="sticky top-[57px] z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex items-center gap-1 overflow-x-auto py-2.5">
            {SECTIONS.map((s, i) => {
              const c = ASSESS.find((x) => x.id === s);
              const done = s !== "summary" && c ? componentDone(c) : false;
              const active = mode === "all" && section === s;
              return (
                <button
                  key={s}
                  onClick={() => go(s)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex flex-none items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-[0.8rem] font-medium transition",
                    active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-5 w-5 flex-none place-items-center rounded-full text-[0.68rem] font-bold tabular-nums",
                      active
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : done
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {done && !active ? <Check className="h-3 w-3" /> : i === 0 ? "C" : i > 5 ? "✓" : i}
                  </span>
                  {SHORT[s]}
                </button>
              );
            })}
            <div className="ml-auto flex flex-none items-center gap-2 pl-3">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* toolbar: view mode + document import */}
      <div className="mx-auto max-w-3xl px-6 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-sm font-medium">
            <button
              onClick={() => setMode("all")}
              className={cn(
                "rounded-md px-3 py-1.5 transition",
                mode === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Full assessment
            </button>
            <button
              onClick={() => setMode("incomplete")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition",
                mode === "incomplete" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Unanswered only
              {unanswered > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[0.65rem] tabular-nums",
                  mode === "incomplete" ? "bg-primary-foreground/20" : "bg-secondary text-muted-foreground"
                )}>
                  {unanswered}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
          >
            <Sparkles className="h-4 w-4" /> Fill in from a document
          </button>
        </div>
      </div>

      {/* active section */}
      <div className="mx-auto max-w-3xl px-6 pb-12 pt-6">
        <motion.div
          key={mode === "incomplete" ? "incomplete" : section}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {mode === "incomplete" ? (
            <IncompleteView onGoToSummary={() => go("summary")} />
          ) : section === "summary" ? (
            <SummaryView onSubmit={onSubmit} />
          ) : comp ? (
            <>
              {section === "context" && <MetaBar />}
              <ComponentView
                comp={comp}
                onPrev={prev ? () => go(prev) : undefined}
                onNext={next ? () => go(next) : undefined}
                prevLabel={prev ? NAV_LABEL[prev] : ""}
                nextLabel={next ? NAV_LABEL[next] : ""}
              />
            </>
          ) : null}
        </motion.div>
      </div>

      <DocumentImport
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onApplied={() => setMode("incomplete")}
      />
    </section>
  );
}
