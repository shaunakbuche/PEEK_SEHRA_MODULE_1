import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
interface Toast { id: number; kind: ToastKind; message: string; }

interface ToastState {
  push: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastState>({ push: () => {} });
export const useToast = () => useContext(ToastContext);

const ICONS: Record<ToastKind, typeof CheckCircle2> = { success: CheckCircle2, error: XCircle, info: Info };
const STYLES: Record<ToastKind, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-destructive/30 bg-destructive/5 text-destructive",
  info: "border-border bg-card text-foreground",
};

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId++;
      setToasts((t) => [...t, { id, kind, message }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:pr-6"
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.kind];
            return (
              <motion.div
                key={t.id}
                role={t.kind === "error" ? "alert" : "status"}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                className={cn(
                  "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border px-4 py-3 text-sm shadow-lg",
                  STYLES[t.kind]
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
                <span className="flex-1">{t.message}</span>
                <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="flex-none opacity-60 transition hover:opacity-100">
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
