import { useState } from "react";
import { Home, Info, LayoutGrid, Sparkles as SparkIcon, Eye } from "lucide-react";
import { NavBar } from "@/components/ui/tubelight-navbar";
import { Landing } from "@/components/Landing";
import { ComponentView } from "@/components/assessment/ComponentView";
import { SummaryView } from "@/components/SummaryView";
import { EmailModal } from "@/components/EmailModal";
import { ASSESS } from "@/data/sehra";
import { useField, setField, useStoreVersion, completionPct, componentDone } from "@/lib/store";
import { cn } from "@/lib/utils";

const SECTIONS = ["context", "c1", "c2", "c3", "c4", "c5", "summary"] as const;
type Section = (typeof SECTIONS)[number];

const NAV_LABEL: Record<string, string> = {
  context: "Context",
  c1: "Legislation & Policy",
  c2: "Service Delivery",
  c3: "Human Resources",
  c4: "Supply Chain",
  c5: "Barriers",
  summary: "Summary & submit",
};
const NAV_IDX: Record<string, string> = { context: "C", c1: "1", c2: "2", c3: "3", c4: "4", c5: "5", summary: "∑" };

function MetaBar() {
  const fields: [string, string][] = [
    ["meta_country", "Country"], ["meta_province", "Province / Governorate"],
    ["meta_district", "District / County"], ["meta_date", "Date"],
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
      {fields.map(([id, lab]) => <MetaField key={id} id={id} label={lab} />)}
    </div>
  );
}
function MetaField({ id, label }: { id: string; label: string }) {
  const v = useField(id);
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition">
      <label className="block text-[0.68rem] uppercase tracking-wider text-muted-foreground mb-1.5">{label}</label>
      <input value={v} onChange={(e) => setField(id, e.target.value)} placeholder="—" className="w-full bg-transparent font-serif text-lg outline-none" />
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const C = 2 * Math.PI * 24;
  return (
    <div className="relative w-14 h-14">
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        <defs>
          <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#16c2ad" /><stop offset="100%" stopColor="#eab64a" /></linearGradient>
        </defs>
        <circle cx="28" cy="28" r="24" fill="none" strokeWidth="6" className="stroke-white/15" />
        <circle cx="28" cy="28" r="24" fill="none" strokeWidth="6" strokeLinecap="round" stroke="url(#rg)" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} style={{ transition: "stroke-dashoffset .6s" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-[0.8rem] font-bold text-white">{pct}%</div>
    </div>
  );
}

function Sidebar({ section, go, onHome }: { section: Section; go: (s: Section) => void; onHome: () => void }) {
  useStoreVersion();
  const pct = completionPct();
  return (
    <aside className="hidden lg:flex flex-col sticky top-0 h-screen w-[290px] flex-none overflow-y-auto bg-primary-600 text-primary-foreground px-4 py-6">
      <button onClick={onHome} className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl grid place-items-center bg-white/15"><Eye className="w-5 h-5" /></div>
        <div className="text-left">
          <div className="font-serif font-semibold text-lg leading-none">SEHRA</div>
          <div className="text-[0.62rem] tracking-[0.18em] uppercase opacity-70">Scoping Module</div>
        </div>
      </button>
      <div className="flex items-center gap-3 my-4">
        <Ring pct={pct} />
        <div>
          <div className="text-sm font-semibold">Assessment progress</div>
          <div className="text-[0.7rem] opacity-70">{pct === 100 ? "Ready to submit" : "Autosaves locally"}</div>
        </div>
      </div>
      <nav className="flex flex-col gap-1 mt-2">
        {SECTIONS.map((s) => {
          const comp = ASSESS.find((c) => c.id === s);
          const done = s !== "summary" && comp ? componentDone(comp) : false;
          const active = section === s;
          return (
            <button key={s} onClick={() => go(s)} className={cn("flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition text-left", active ? "bg-primary/40 text-white" : "text-white/80 hover:bg-white/10")}>
              <span className={cn("w-5 h-5 rounded-md grid place-items-center text-[0.7rem] font-bold flex-none", active ? "bg-accent text-white" : "bg-white/10")}>{NAV_IDX[s]}</span>
              {NAV_LABEL[s]}
              <span className={cn("ml-auto w-1.5 h-1.5 rounded-full", done ? "bg-teal-300" : "bg-transparent")} />
            </button>
          );
        })}
      </nav>
      <button onClick={onHome} className="mt-auto text-[0.8rem] text-white/60 hover:text-white text-left px-3 pt-4">← Back to overview</button>
    </aside>
  );
}

export default function App() {
  const [mode, setMode] = useState<"landing" | "assess">("landing");
  const [section, setSection] = useState<Section>("context");
  const [emailOpen, setEmailOpen] = useState(false);

  const begin = () => { setMode("assess"); setSection("context"); window.scrollTo(0, 0); };
  const go = (s: Section) => { setSection(s); window.scrollTo(0, 0); };

  const navItems = [
    { name: "Home", url: "#home", icon: Home, onClick: () => document.getElementById("home")?.scrollIntoView({ behavior: "smooth" }) },
    { name: "About", url: "#about", icon: Info, onClick: () => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" }) },
    { name: "Module", url: "#module", icon: LayoutGrid, onClick: () => document.getElementById("module")?.scrollIntoView({ behavior: "smooth" }) },
    { name: "Begin", url: "#begin", icon: SparkIcon, onClick: begin },
  ];

  if (mode === "landing") {
    return (
      <>
        <NavBar items={navItems} />
        <Landing onBegin={begin} />
        <footer className="text-center py-10 text-sm text-muted-foreground border-t border-border">
          SEHRA Scoping Module · The Minto Method · <a className="text-primary font-medium" href="https://www.peekvision.org" target="_blank" rel="noopener">peekvision.org</a>
        </footer>
      </>
    );
  }

  const idx = SECTIONS.indexOf(section);
  const prev = SECTIONS[idx - 1];
  const next = SECTIONS[idx + 1];
  const comp = ASSESS.find((c) => c.id === section);

  return (
    <div className="flex min-h-screen">
      <Sidebar section={section} go={go} onHome={() => setMode("landing")} />
      <main className="flex-1 min-w-0">
        <div className="sticky top-0 z-20 flex items-center gap-3 px-6 py-3 bg-background/80 backdrop-blur border-b border-border">
          <button className="lg:hidden font-semibold text-primary" onClick={() => setMode("landing")}>SEHRA</button>
          <div className="text-sm text-muted-foreground">Assessment · <b className="text-foreground">{NAV_LABEL[section]}</b></div>
          <div className="ml-auto" />
          <button onClick={() => setEmailOpen(true)} className="rounded-lg bg-primary text-primary-foreground px-3.5 py-2 text-[0.82rem] font-semibold">✉ Submit</button>
        </div>
        <div className="max-w-3xl mx-auto px-5 md:px-9 py-10 pb-28">
          {section === "summary" ? (
            <SummaryView onSubmit={() => setEmailOpen(true)} />
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
        </div>
      </main>
      <EmailModal open={emailOpen} onClose={() => setEmailOpen(false)} />
    </div>
  );
}
