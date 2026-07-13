import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, ClipboardList, FileCheck2, Send, Sparkles, Users } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Wordmark } from "@/components/brand";
import { CountUp } from "@/components/CountUp";
import { Marquee } from "@/components/Marquee";
import { useAuth } from "@/lib/auth";
import { ASSESS, THEMES } from "@/data/sehra";

const COUNTRIES = ["Ethiopia", "India", "Lao PDR", "Liberia", "Nigeria", "Pakistan", "Uganda"];

const STATS = [
  { value: ASSESS.length - 1, suffix: "", label: "Components assessed" },
  { value: THEMES.length, suffix: "", label: "Analysis themes" },
  { value: COUNTRIES.length, suffix: "+", label: "Countries already scoped" },
];

function fadeIn(delay = 0) {
  return {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.5, delay },
  } as const;
}

function Header() {
  const { user } = useAuth();
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-[57px] max-w-6xl items-center gap-6 px-6">
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

      {/* countries marquee */}
      <section className="border-t border-border bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="text-center text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Grounded in SEHRA scoping work across
          </p>
          <div className="mt-3.5">
            <Marquee items={COUNTRIES} duration={26} />
          </div>
        </div>
      </section>

      {/* why it matters + stats */}
      <section className="relative border-t border-border pb-20">
        <motion.div {...fadeIn()} className="mx-auto max-w-3xl px-6 pt-20 text-center">
          <p className="font-serif text-2xl leading-snug text-foreground sm:text-[1.7rem]">
            Most children who cannot see clearly at school are never picked up. Before anyone commits to
            a full survey, it helps to know the basics are in place. This assessment gives you that
            answer in about a working week.
          </p>
        </motion.div>

        <motion.div {...fadeIn(0.1)} className="mx-auto mt-16 max-w-5xl px-6 sm:px-6 lg:px-0">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
            {STATS.map((s, i) => (
              <div key={i} className="bg-background px-5 py-8 text-center">
                <div className="font-serif text-4xl text-primary sm:text-5xl">
                  <CountUp value={s.value} suffix={s.suffix} />
                </div>
                <p className="mx-auto mt-2 max-w-[14ch] text-[0.8rem] leading-snug text-muted-foreground">{s.label}</p>
              </div>
            ))}
            <div className="flex flex-col items-center justify-center gap-2 bg-background px-5 py-8 text-center">
              <Users className="h-6 w-6 text-primary" strokeWidth={1.6} aria-hidden />
              <p className="mx-auto max-w-[16ch] text-[0.8rem] leading-snug text-muted-foreground">
                One login, shared across any number of devices and people
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* what it covers */}
      <section id="module" className="scroll-mt-16 border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <motion.div {...fadeIn()} className="mb-12 max-w-2xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-primary">The module</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl">Six areas, one clear picture.</h2>
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
                  {...fadeIn(i * 0.05)}
                  className={`group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 ${
                    isContext
                      ? "border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent hover:border-primary/40 hover:shadow-[0_18px_44px_-18px_hsl(189_66%_26%/0.35)]"
                      : "border-border bg-card hover:border-primary/40 hover:shadow-[0_14px_40px_-16px_rgba(23,97,110,0.25)]"
                  }`}
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex items-baseline gap-3">
                      <span className="font-serif text-3xl text-primary/30 transition-colors group-hover:text-primary/60">
                        {isContext ? "C" : comp.number}
                      </span>
                      <h3 className="font-serif text-xl leading-snug">{comp.title}</h3>
                    </div>
                    <ArrowUpRight className="mt-1 h-4 w-4 flex-none text-primary/0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary/60" />
                  </div>
                  <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">{comp.purpose}</p>
                </motion.div>
              );
            })}
          </div>

          <motion.div {...fadeIn(0.1)} className="mt-10 rounded-2xl border border-border bg-secondary/30 p-6">
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
      <section id="how" className="scroll-mt-16 border-t border-border bg-secondary/20">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <motion.div {...fadeIn()} className="mb-12 max-w-2xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl">From answers to an approved report.</h2>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              { icon: ClipboardList, title: "Work through the sections", text: "Sign in with the login Peek shares with you. Every answer saves as you type, so the team can fill it in over days, from any computer." },
              { icon: Send, title: "Submit to Peek", text: "One click sends the complete assessment to the Peek SEHRA team for review." },
              { icon: Sparkles, title: "Peek prepares your report", text: "A structured report is drafted from your answers, then reviewed, refined and approved by the Peek team." },
              { icon: FileCheck2, title: "Download and plan", text: "The approved report appears in your workspace as a polished PDF and Word document, ready to share." },
            ].map((s, i) => (
              <motion.div
                key={i}
                {...fadeIn(i * 0.07)}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card/80 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-600 text-sm font-bold text-primary-foreground shadow-[0_6px_16px_-4px_hsl(189_66%_26%/0.5)]">
                  {i + 1}
                </div>
                <s.icon className="mt-4 h-5 w-5 text-primary" strokeWidth={1.6} aria-hidden />
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* closing */}
      <section className="border-t border-border">
        <motion.div {...fadeIn()} className="mx-auto max-w-2xl px-6 py-24 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl">Ready when you are</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Logins are provisioned by the Peek team so every organization has its own private workspace.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={begin}
              className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_-10px_hsl(189_66%_26%/0.55)] transition hover:-translate-y-0.5 hover:bg-primary-600"
            >
              {user ? "Open your workspace" : "Sign in to begin"}
            </button>
            <a
              href="mailto:sehra@peekvision.org"
              className="rounded-md border border-border px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:border-primary hover:text-primary"
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
