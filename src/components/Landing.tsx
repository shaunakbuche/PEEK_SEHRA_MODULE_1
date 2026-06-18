import { Calendar, Scale, Building2, Users, Truck, ShieldAlert, Eye, MoveRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Spotlight } from "@/components/ui/spotlight";
import { SplineScene } from "@/components/ui/splite";
import { SparklesCore } from "@/components/ui/sparkles";
import { Hero as AnimatedHero } from "@/components/ui/animated-hero";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { HandWrittenTitle } from "@/components/ui/hand-writing-text";
import { Features } from "@/components/ui/features-8";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";

const timelineData = [
  { id: 1, title: "Context", date: "Step 0", content: "The implementation area and any existing school eye health programme.", category: "Context", icon: Eye, relatedIds: [2], status: "completed" as const, energy: 100 },
  { id: 2, title: "Legislation & Policy", date: "Component 1", content: "How conducive the policy and strategy environment is.", category: "Policy", icon: Scale, relatedIds: [1, 3], status: "in-progress" as const, energy: 85 },
  { id: 3, title: "Service Delivery", date: "Component 2", content: "The institutional and service delivery environment.", category: "Service", icon: Building2, relatedIds: [2, 4], status: "in-progress" as const, energy: 70 },
  { id: 4, title: "Human Resources", date: "Component 3", content: "The right people, skills and numbers to deliver.", category: "People", icon: Users, relatedIds: [3, 5], status: "pending" as const, energy: 55 },
  { id: 5, title: "Supply Chain", date: "Component 4", content: "Availability and flow of glasses, consumables and equipment.", category: "Supply", icon: Truck, relatedIds: [4, 6], status: "pending" as const, energy: 40 },
  { id: 6, title: "Barriers", date: "Component 5", content: "Cross-cutting barriers to delivering child eye health.", category: "Barriers", icon: ShieldAlert, relatedIds: [5], status: "pending" as const, energy: 25 },
];

export function Landing({ onBegin }: { onBegin: () => void }) {
  return (
    <div>
      {/* Hero */}
      <section id="home" className="px-4 pt-24 pb-10 max-w-6xl mx-auto">
        <Card className="w-full min-h-[520px] bg-black/[0.96] relative overflow-hidden border-0">
          <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
          <div className="absolute inset-0 w-full h-full">
            <SparklesCore background="transparent" minSize={0.4} maxSize={1} particleDensity={60} className="w-full h-full" particleColor="#16c2ad" />
          </div>
          <div className="flex flex-col md:flex-row h-full relative z-10">
            <div className="flex-1 p-8 md:p-12 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-teal-300 font-semibold mb-4">
                <span className="w-6 h-0.5 bg-accent" /> Peek Vision · SEHRA
              </div>
              <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 leading-[1.05]">
                The Minto Method
              </h1>
              <p className="mt-4 text-neutral-300 max-w-lg text-lg">
                An interactive Scoping Module for school eye health. Read the landscape, judge feasibility, and submit — all in one place, no PDF required.
              </p>
              <div className="mt-7">
                <LiquidButton size="xl" onClick={onBegin} className="text-white border border-white/20 bg-white/5">
                  Begin the assessment <MoveRight className="w-4 h-4 ml-1" />
                </LiquidButton>
              </div>
            </div>
            <div className="flex-1 relative min-h-[300px]">
              <SplineScene scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" className="w-full h-full" />
            </div>
          </div>
        </Card>
      </section>

      {/* About — animated hero on aurora */}
      <section id="about" className="relative">
        <AuroraBackground className="h-auto py-10">
          <div className="relative z-10 w-full">
            <AnimatedHero />
          </div>
        </AuroraBackground>
      </section>

      {/* The five components — interactive orbital timeline */}
      <section id="module" className="bg-background">
        <HandWrittenTitle title="The Module" subtitle="Context + five components" />
        <div className="-mt-10">
          <RadialOrbitalTimeline timelineData={timelineData} />
        </div>
      </section>

      {/* Why SEHRA */}
      <section id="why" className="bg-background">
        <div className="text-center pt-16">
          <div className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-accent">Why SEHRA</div>
          <h2 className="font-serif text-3xl md:text-4xl mt-2">Built to plan real programmes</h2>
        </div>
        <Features />
      </section>

      {/* Final CTA — background paths */}
      <section id="begin-cta" className="relative">
        <BackgroundPaths title="Start the Module">
          <div className="flex flex-col items-center gap-4">
            <p className="text-lg text-muted-foreground max-w-xl">
              Four to five days of desk review, interviews and judgement — captured in one place and emailed to the Peek SEHRA team on submit.
            </p>
            <button onClick={onBegin} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg hover:-translate-y-0.5 transition">
              <Calendar className="w-5 h-5" /> Begin the assessment
            </button>
          </div>
        </BackgroundPaths>
      </section>
    </div>
  );
}
