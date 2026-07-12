import { motion } from "framer-motion";
import { ArrowRight, FileCheck2, ShieldCheck, Sparkles } from "lucide-react";
import { IrisOrb } from "@/components/IrisOrb";

/** Flowing line field, hero only. Each line scrolls left by exactly one
 *  wavelength on a loop, so the waves appear to flow continuously. */
const TWO_PI = Math.PI * 2;
const LINES = Array.from({ length: 16 }, (_, i) => {
  const period = 240 + i * 10;
  const W = TWO_PI * period; // one wavelength
  const baseY = 150 + i * 19;
  const amp = 22 + (i % 5) * 7;
  const phase = i * 0.55;
  let d = "";
  for (let x = -W; x <= 1200 + W; x += 28) {
    const y = baseY + amp * Math.sin(x / period + phase);
    d += (x === -W ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " ";
  }
  return { d, W, o: 0.09 + (i % 4) * 0.03, dur: 18 + (i % 6) * 4 };
});

function HeroLines() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        maskImage: "radial-gradient(60% 72% at 70% 50%, black 0%, transparent 80%)",
        WebkitMaskImage: "radial-gradient(60% 72% at 70% 50%, black 0%, transparent 80%)",
      }}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill="none" stroke="hsl(var(--primary))" strokeWidth="1.1">
          {LINES.map((l, i) => (
            <motion.path
              key={i}
              d={l.d}
              strokeOpacity={l.o}
              animate={{ x: [0, -l.W] }}
              transition={{ duration: l.dur, repeat: Infinity, ease: "linear" }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

/** Soft brand-teal gradient blobs, purely decorative, tuned to sit quietly behind a white hero. */
function GradientMesh() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -left-24 -top-32 h-[32rem] w-[32rem] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.14) 0%, transparent 70%)" }}
      />
      <div
        className="absolute -right-20 top-10 h-[26rem] w-[26rem] rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(12 64% 52% / 0.10) 0%, transparent 70%)" }}
      />
    </div>
  );
}

const BADGES = [
  { icon: Sparkles, label: "AI-drafted reports" },
  { icon: ShieldCheck, label: "Private per-school login" },
  { icon: FileCheck2, label: "Autosaves as you go" },
];

function FloatingBadge({ icon: Icon, label, className, delay }: {
  icon: typeof Sparkles; label: string; className: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.94 }}
      animate={{ opacity: 1, y: [0, -8, 0], scale: 1 }}
      transition={{
        opacity: { duration: 0.6, delay },
        scale: { duration: 0.6, delay },
        y: { duration: 5 + delay, repeat: Infinity, ease: "easeInOut", delay },
      }}
      className={`absolute hidden items-center gap-2 rounded-full border border-border/80 bg-card/90 px-3.5 py-2 text-xs font-semibold text-foreground shadow-[0_8px_24px_-8px_rgba(15,118,107,0.25)] backdrop-blur-md lg:flex ${className}`}
    >
      <Icon className="h-3.5 w-3.5 text-primary" />
      {label}
    </motion.div>
  );
}

export function Hero({ onBegin, onExplore }: { onBegin: () => void; onExplore: () => void }) {
  return (
    <section id="overview" className="relative flex min-h-[92vh] items-center overflow-hidden">
      <GradientMesh />
      <HeroLines />
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 pb-16 pt-32 md:grid-cols-[1.1fr_0.9fr] md:pt-24">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Peek Vision · School Eye Health
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-6 font-serif text-[2.75rem] leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl"
          >
            See whether a school eye health programme{" "}
            <span className="bg-gradient-to-r from-primary via-primary-500 to-primary bg-clip-text text-transparent">
              can work here.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
          >
            This is a short scoping assessment. It looks at the policies, services, people and
            supplies already in place, so you can judge whether a full school survey is worth running.
            Fill it in online, submit it to the Peek team, and receive your approved report right here.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <button
              onClick={onBegin}
              className="group inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_-10px_hsl(178_66%_26%/0.55)] transition hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-[0_16px_32px_-8px_hsl(178_66%_26%/0.55)]"
            >
              Start the assessment
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={onExplore}
              className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-primary hover:text-primary"
            >
              See what it covers
            </button>
          </motion.div>
        </div>

        <div className="relative flex justify-center">
          <IrisOrb className="h-[260px] w-[260px] sm:h-[320px] sm:w-[320px] lg:h-[400px] lg:w-[400px]" />
          <FloatingBadge icon={BADGES[0].icon} label={BADGES[0].label} className="-left-6 top-4" delay={0.6} />
          <FloatingBadge icon={BADGES[1].icon} label={BADGES[1].label} className="-right-4 top-1/2" delay={0.9} />
          <FloatingBadge icon={BADGES[2].icon} label={BADGES[2].label} className="bottom-2 left-8" delay={1.2} />
        </div>
      </div>
    </section>
  );
}
