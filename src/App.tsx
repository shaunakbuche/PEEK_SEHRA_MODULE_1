import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { Hero } from "@/components/Hero";
import { ComponentOverview } from "@/components/ComponentOverview";
import { Features } from "@/components/ui/features-8";
import { EmailModal } from "@/components/EmailModal";
import { AssessmentWorkspace, type Section } from "@/components/AssessmentWorkspace";

function EyeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 22" className={className} fill="none" aria-hidden>
      <path
        d="M2 11C7 3.5 14 1.5 18 1.5C22 1.5 29 3.5 34 11C29 18.5 22 20.5 18 20.5C14 20.5 7 18.5 2 11Z"
        stroke="hsl(var(--primary))"
        strokeWidth="1.6"
      />
      <circle cx="18" cy="11" r="5" fill="hsl(var(--primary))" />
      <circle cx="18" cy="11" r="1.8" fill="hsl(var(--background))" />
      <circle cx="16.2" cy="9.2" r="0.9" fill="hsl(var(--background))" opacity="0.7" />
    </svg>
  );
}

function Header({ onStart, onSubmit }: { onStart: () => void; onSubmit: () => void }) {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const links: [string, string][] = [
    ["What it covers", "module"],
    ["How it works", "why"],
    ["The assessment", "assessment"],
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3.5">
        <button onClick={() => scrollTo("overview")} className="flex items-center gap-2.5">
          <EyeMark className="h-6 w-9" />
          <span className="text-left leading-none">
            <span className="block font-serif text-base tracking-tight text-foreground">SEHRA</span>
            <span className="block text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
              Peek Vision
            </span>
          </span>
        </button>
        <nav className="ml-auto hidden items-center gap-7 md:flex">
          {links.map(([label, id]) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              {label}
            </button>
          ))}
        </nav>
        <button
          onClick={onSubmit}
          className="hidden text-sm font-medium text-muted-foreground transition hover:text-foreground sm:block md:ml-0"
        >
          Submit
        </button>
        <button
          onClick={onStart}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-600"
        >
          Start
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const [section, setSection] = useState<Section>("context");
  const [emailOpen, setEmailOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const openSection = (s: Section) => {
    setSection(s);
    requestAnimationFrame(() => scrollTo("assessment"));
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Header onStart={() => openSection("context")} onSubmit={() => setEmailOpen(true)} />

      <Hero onBegin={() => openSection("context")} onExplore={() => scrollTo("module")} />

      {/* why it matters */}
      <section className="relative border-t border-border">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl px-6 py-16 text-center"
        >
          <p className="font-serif text-2xl leading-snug text-foreground sm:text-[1.7rem]">
            Most children who cannot see clearly at school are never picked up. Before anyone commits to
            a full survey, it helps to know the basics are in place. This assessment gives you that
            answer in about a working week.
          </p>
        </motion.div>
      </section>

      <ComponentOverview onOpen={openSection} />

      <Features />

      <AssessmentWorkspace section={section} setSection={setSection} onSubmit={() => setEmailOpen(true)} />

      {/* closing */}
      <section id="submit" className="relative border-t border-border bg-secondary/30">
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <h2 className="font-serif text-3xl text-foreground sm:text-4xl">Ready when you are</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Once every section has a response, send the completed assessment. It goes straight to the
            Peek team, who will set up a time to walk through your answers.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => openSection("summary")}
              className="rounded-md border border-border bg-card px-6 py-3 text-sm font-semibold transition hover:border-primary hover:text-primary"
            >
              Review the summary
            </button>
            <button
              onClick={() => setEmailOpen(true)}
              className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-600"
            >
              Submit the assessment
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        SEHRA Scoping Module · Built for{" "}
        <a className="font-medium text-primary hover:underline" href="https://www.peekvision.org" target="_blank" rel="noopener">
          Peek Vision
        </a>
      </footer>

      <EmailModal open={emailOpen} onClose={() => setEmailOpen(false)} />
    </div>
  );
}
