import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
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

export function Hero({ onBegin, onExplore }: { onBegin: () => void; onExplore: () => void }) {
  return (
    <section id="overview" className="relative flex min-h-[88vh] items-center overflow-hidden">
      <HeroLines />
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 pb-16 pt-32 md:grid-cols-[1.1fr_0.9fr] md:pt-24">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-xs font-semibold uppercase tracking-[0.22em] text-primary"
          >
            Peek Vision · School Eye Health
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-5 font-serif text-4xl leading-[1.08] text-foreground sm:text-5xl lg:text-6xl"
          >
            See whether a school eye health programme can work here.
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
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-600"
            >
              Start the assessment <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onExplore}
              className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
            >
              See what it covers
            </button>
          </motion.div>
        </div>

        <div className="flex justify-center">
          <IrisOrb className="h-[260px] w-[260px] sm:h-[320px] sm:w-[320px] lg:h-[400px] lg:w-[400px]" />
        </div>
      </div>
    </section>
  );
}
