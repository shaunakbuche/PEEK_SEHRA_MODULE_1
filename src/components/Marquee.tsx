import { motion } from "framer-motion";

/**
 * Seamless auto-scrolling marquee. Renders the item list twice back to back
 * and animates by exactly one copy's width, so the loop has no visible seam.
 * The animated copy is decorative (aria-hidden); a plain sr-only list carries
 * the same content for assistive tech.
 */
export function Marquee({ items, duration = 28, className }: { items: string[]; duration?: number; className?: string }) {
  return (
    <div className={className}>
      <span className="sr-only">{items.join(", ")}</span>
      <div aria-hidden className="group relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
        {[0, 1].map((copy) => (
          <motion.div
            key={copy}
            className="flex flex-none items-center gap-10 pr-10"
            animate={{ x: ["0%", "-100%"] }}
            transition={{ duration, repeat: Infinity, ease: "linear" }}
          >
            {items.map((item, i) => (
              <span key={i} className="flex-none whitespace-nowrap font-serif text-lg text-foreground/60">
                {item}
              </span>
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
