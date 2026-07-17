import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/**
 * A bespoke, on-brand 3D-feeling iris/eye for the hero.
 * Pure CSS/SVG + framer-motion — always loads, no external scene needed.
 * Reacts to the cursor: the whole eye tilts in 3D and the pupil tracks the pointer.
 *
 * (The <SplineScene> wrapper still exists — if the team later exports a real
 * eye scene from Spline, it can be dropped back into the hero in one line.)
 */
export function IrisOrb({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  // Pointer position, normalised to [-1, 1] around the orb centre.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 120, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 120, damping: 18, mass: 0.6 });

  // 3D tilt of the whole eye.
  const rotateY = useTransform(sx, [-1, 1], [18, -18]);
  const rotateX = useTransform(sy, [-1, 1], [-16, 16]);
  // Pupil / iris parallax — moves further than the eye for depth.
  const pupilX = useTransform(sx, [-1, 1], [26, -26]);
  const pupilY = useTransform(sy, [-1, 1], [26, -26]);
  const irisX = useTransform(sx, [-1, 1], [14, -14]);
  const irisY = useTransform(sy, [-1, 1], [14, -14]);
  const glareX = useTransform(sx, [-1, 1], [-34, 34]);
  const glareY = useTransform(sy, [-1, 1], [-34, 34]);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    px.set(((e.clientX - r.left) / r.width) * 2 - 1);
    py.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const onLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`relative grid place-items-center ${className ?? ""}`}
      style={{ perspective: 1100 }}
    >
      {/* ambient glow — soft, subtle on white */}
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          width: "72%",
          height: "72%",
          background:
            "radial-gradient(circle, rgba(131,202,198,0.30) 0%, rgba(131,202,198,0.10) 45%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.06, 1], opacity: [0.55, 0.8, 0.55] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* the eye — tilts in 3D */}
      <motion.div
        className="relative aspect-square w-[64%] rounded-full"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      >
        {/* sclera / lens body */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, #194E55 0%, #0c3a40 55%, #002730 100%)",
            boxShadow:
              "0 30px 80px -20px rgba(0,0,0,0.8), inset 0 0 60px rgba(0,0,0,0.6)",
          }}
        />

        {/* one calm outer ring */}
        <div className="absolute rounded-full border border-primary/10" style={{ inset: "-6%" }} />

        {/* iris */}
        <motion.div
          className="absolute rounded-full"
          style={{ inset: "16%", x: irisX, y: irisY, z: 30 }}
        >
          {/* iris base colour */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, #c7ebe8 0%, #83CAC6 26%, #3f8f8a 52%, #194E55 80%, #002730 100%)",
              boxShadow: "inset 0 0 40px rgba(0,0,0,0.55)",
            }}
          />
          {/* iris fibres — striations */}
          <motion.div
            className="absolute inset-0 rounded-full mix-blend-overlay opacity-70"
            style={{
              background:
                "repeating-conic-gradient(from 0deg, rgba(255,255,255,0.5) 0deg 2deg, transparent 2deg 6deg)",
              maskImage:
                "radial-gradient(circle, transparent 28%, black 34%, black 88%, transparent 96%)",
              WebkitMaskImage:
                "radial-gradient(circle, transparent 28%, black 34%, black 88%, transparent 96%)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
          />
          {/* limbal ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: "inset 0 0 0 3px rgba(2,24,23,0.85)" }}
          />

          {/* pupil */}
          <motion.div
            className="absolute grid place-items-center rounded-full"
            style={{ inset: "33%", x: pupilX, y: pupilY }}
          >
            <motion.div
              className="h-full w-full rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 50% 45%, #002730 0%, #000 70%)",
                boxShadow:
                  "0 0 22px rgba(0,0,0,0.9), inset 0 0 12px rgba(0,0,0,0.9)",
              }}
              animate={{ scale: [1, 0.86, 1.05, 1] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>


        {/* glass specular highlight */}
        <motion.div
          className="absolute rounded-full blur-md"
          style={{
            width: "26%",
            height: "20%",
            top: "16%",
            left: "20%",
            x: glareX,
            y: glareY,
            z: 60,
            background:
              "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.1) 60%, transparent 70%)",
          }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: "8%",
            height: "8%",
            bottom: "26%",
            right: "28%",
            x: glareX,
            y: glareY,
            z: 60,
            background:
              "radial-gradient(circle, rgba(131,202,198,0.9) 0%, transparent 70%)",
          }}
        />
      </motion.div>

      {/* drifting particles */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-primary/40"
          style={{ width: p.s, height: p.s, top: p.t, left: p.l }}
          animate={{ y: [0, p.dy, 0], opacity: [0, 1, 0] }}
          transition={{ duration: p.d, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
        />
      ))}
    </div>
  );
}

const PARTICLES = [
  { s: 4, t: "18%", l: "30%", dy: -22, d: 5, delay: 0 },
  { s: 3, t: "70%", l: "22%", dy: 18, d: 6, delay: 1.2 },
  { s: 5, t: "30%", l: "78%", dy: -16, d: 7, delay: 0.6 },
  { s: 3, t: "78%", l: "72%", dy: 20, d: 5.5, delay: 2 },
  { s: 4, t: "12%", l: "60%", dy: -24, d: 6.5, delay: 1.6 },
  { s: 2, t: "55%", l: "12%", dy: 14, d: 4.8, delay: 0.3 },
];
