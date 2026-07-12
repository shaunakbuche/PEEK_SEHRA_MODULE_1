import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Shared accessible modal shell: traps focus, closes on Escape, restores
 * focus to whatever triggered it on close, and exposes role="dialog" +
 * aria-modal to assistive tech. Every modal in the app renders through this
 * instead of duplicating backdrop/focus logic.
 */
export function Dialog({ open, onClose, labelledBy, children, maxWidth = "max-w-md" }: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;

    const panel = panelRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(FOCUSABLE);
    (focusables?.[0] ?? panel)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      (triggerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} rounded-2xl border border-border bg-card p-7 shadow-xl outline-none`}
      >
        {children}
      </motion.div>
    </div>
  );
}
