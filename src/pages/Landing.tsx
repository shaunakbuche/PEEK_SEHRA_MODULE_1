import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ClipboardList, FileCheck2, Send, Sparkles } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Wordmark } from "@/components/brand";
import { useAuth } from "@/lib/auth";
import { ASSESS, THEMES } from "@/data/sehra";

const COUNTRIES = ["Ethiopia", "India", "Lao PDR", "Liberia", "Nigeria", "Pakistan", "Uganda"];

const STATS = [
  { value: `${ASSESS.length - 1}`, label: "Components assessed" },
  { value: `${THEMES.length}`, label: "Analysis themes" },
  { value: `${COUNTRIES.length}+`, label: "Countries already scoped" },
];

function fadeIn(delay = 0) {
  return {
    initial: { opacity: 0, y: 12 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.4, delay },
  } as const;
}

function Header() {
  const { user } = useAuth();
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-[64px] max-w-6xl items-center gap-6 px-6">
        <Wordmark />
        <nav className="ml-auto hidden items-center gap-7 md:flex">
          <button onClick={() => scrollTo("module")} className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
            What it covers
          </button>
          <button onClick={() => scrollTo("how")} className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
            How it works
          </button>
        </nav>
        <Link
          to={user ? (user.role === "admin" ? "/admin" : "/app") : "/login"}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-600"
        >
          {user ? "Open workspace" : "Sign in"}
        </Link>
      </div>
    </header>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const begin = () =>
    navigate(user ? (user.role === "admin" ? "/admin" : "/app") : "/login");

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Header />

      <Hero onBegin={begin} onExplore={() => scrollTo("module")} />

      {/* countries + stats */}
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-center text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Grounded in SEHRA scoping work across
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {COUNTRIES.map((c) => (
              <span key={c} className="text-base font-semibold text-foreground/70">{c}</span>
            ))}
          </div>

          <div className="mx-auto mt-8 grid max-w-3xl grid-cols-3 divide-x divide-border border-t border-border pt-8">
            {STATS.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-extrabold text-primary sm:text-4xl">{s.value}</div>
                <p className="mx-auto mt-1 max-w-[13ch] text-[0.78rem] leading-snug text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* why it matters */}
      <section className="border-b border-border">
        <motion.div {...fadeIn()} className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="text-2xl font-semibold leading-snug text-foreground sm:text-[1.7rem]">
            Most children who cannot see clearly at school are never picked up. Before anyone commits to
            a full survey, it helps to know the basics are in place. This assessment gives you that
            answer in about a working week.
          </p>
        </motion.div>
      </section>

      {/* what it covers */}
      <section id="module" className="scroll-mt-16 border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <motion.div {...fadeIn()} className="mb-10 max-w-2xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-primary">The module</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">Six areas, one clear picture.</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              The Scoping Module walks through the context of your area and five components of readiness.
              Together they show whether a school eye health programme can work.
            </p>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ASSESS.map((comp, i) => {
              const isContext = comp.id === "context";
              return (
                <motion.div
                  key={comp.id}
                  {...fadeIn(i * 0.04)}
                  className={`rounded-xl border p-6 transition-colors ${
                    isContext ? "border-primary/25 bg-primary/[0.04]" : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-extrabold text-primary/40">
                      {isContext ? "C" : comp.number}
                    </span>
                    <h3 className="text-lg font-bold leading-snug">{comp.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{comp.purpose}</p>
                </motion.div>
              );
            })}
          </div>

          <motion.div {...fadeIn(0.1)} className="mt-8 rounded-xl border border-border bg-secondary/30 p-6">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Your answers feed nine analysis themes
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <span key={t} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary-600">
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="scroll-mt-16 border-b border-border bg-secondary/20">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <motion.div {...fadeIn()} className="mb-10 max-w-2xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">From answers to an approved report.</h2>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              { icon: ClipboardList, title: "Work through the sections", text: "Sign in with the login Peek shares with you. Every answer saves as you type, so the team can fill it in over days, from any computer." },
              { icon: Send, title: "Submit to Peek", text: "One click sends the complete assessment to the Peek SEHRA team for review." },
              { icon: Sparkles, title: "Peek prepares your report", text: "A structured report is drafted from your answers, then reviewed, refined and approved by the Peek team." },
              { icon: FileCheck2, title: "Download and plan", text: "The approved report appears in your workspace as a polished PDF and Word document, ready to share." },
            ].map((s, i) => (
              <motion.div key={i} {...fadeIn(i * 0.05)} className="rounded-xl border border-border bg-card p-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <s.icon className="mt-4 h-5 w-5 text-primary" strokeWidth={1.6} aria-hidden />
                <h3 className="mt-3 font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* closing */}
      <section>
        <motion.div {...fadeIn()} className="mx-auto max-w-2xl px-6 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl">Ready when you are</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Logins are provisioned by the Peek team so every organization has its own private workspace.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={begin}
              className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-600"
            >
              {user ? "Open your workspace" : "Sign in to begin"}
            </button>
            <a
              href="mailto:sehra@peekvision.org"
              className="rounded-md border border-border px-6 py-3 text-sm font-semibold transition hover:border-primary hover:text-primary"
            >
              Request access
            </a>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        SEHRA Scoping Module · Built for{" "}
        <a className="font-medium text-primary hover:underline" href="https://www.peekvision.org" target="_blank" rel="noopener">
          Peek Vision
        </a>
      </footer>
    </div>
  );
}
