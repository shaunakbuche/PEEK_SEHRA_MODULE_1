import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useSaveState } from "@/lib/store";
import { CloudUpload, Check, LogOut, WifiOff, UserCog } from "lucide-react";
import type { AssessmentStatus } from "@/lib/api";
import { AccountModal } from "@/components/AccountModal";
import { PeekLogo } from "@/components/PeekLogo";

/** Peek Vision's real logo (already reads "peek vision") paired with the SEHRA sub-brand label. */
export function Wordmark({ context }: { context?: string }) {
  return (
    <span className="flex items-center gap-3">
      <PeekLogo className="h-[22px] w-auto text-foreground" />
      <span className="h-5 w-px bg-border" aria-hidden />
      <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        SEHRA{context ? ` · ${context}` : ""}
      </span>
    </span>
  );
}

/** Autosave indicator for the school workspace. */
export function SaveBadge() {
  const state = useSaveState();
  if (state === "idle") return null;
  const map = {
    saving: { icon: CloudUpload, label: "Saving", cls: "text-muted-foreground" },
    saved: { icon: Check, label: "Saved", cls: "text-primary" },
    error: { icon: WifiOff, label: "Offline, retrying", cls: "text-accent" },
  } as const;
  const m = map[state];
  const Icon = m.icon;
  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-medium transition-colors", m.cls)}>
      <Icon className="h-3.5 w-3.5" /> {m.label}
    </span>
  );
}

export const STATUS_META: Record<
  AssessmentStatus | "generated" | "edited" | "approved_report" | "none",
  { label: string; dot: string; pill: string }
> = {
  draft: { label: "In progress", dot: "bg-slate-400", pill: "bg-slate-100 text-slate-600" },
  returned: { label: "Returned", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700" },
  submitted: { label: "Submitted", dot: "bg-sky-500", pill: "bg-sky-50 text-sky-700" },
  in_review: { label: "In review", dot: "bg-violet-500", pill: "bg-violet-50 text-violet-700" },
  approved: { label: "Approved", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700" },
  generated: { label: "AI draft", dot: "bg-violet-500", pill: "bg-violet-50 text-violet-700" },
  edited: { label: "Edited", dot: "bg-sky-500", pill: "bg-sky-50 text-sky-700" },
  approved_report: { label: "Published", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700" },
  none: { label: "No report", dot: "bg-slate-300", pill: "bg-slate-50 text-slate-500" },
};

export function StatusPill({ status }: { status: keyof typeof STATUS_META }) {
  const m = STATUS_META[status] ?? STATUS_META.none;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-semibold", m.pill)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

/** Signed-in application top bar. */
export function TopBar({ context, children }: { context?: string; children?: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-[57px] max-w-6xl items-center gap-4 px-6">
        <Link to="/" className="transition-opacity hover:opacity-80">
          <Wordmark context={context} />
        </Link>
        <div className="ml-auto flex items-center gap-3">
          {children}
          {user && (
            <>
              <button
                onClick={() => setAccountOpen(true)}
                aria-label="Account settings"
                className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground sm:flex"
              >
                <UserCog className="h-3.5 w-3.5" aria-hidden />
                {user.fullName || user.email}
              </button>
              <button
                onClick={() => setAccountOpen(true)}
                aria-label="Account settings"
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground sm:hidden"
              >
                <UserCog className="h-4 w-4" aria-hidden />
              </button>
              <button
                onClick={() => logout().then(() => (window.location.href = "/"))}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </>
          )}
        </div>
      </div>
      {user && <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />}
    </header>
  );
}

/** Small circular completion indicator. */
export function ProgressRing({ pct, size = 76 }: { pct: number; size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={`${pct} percent complete`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="hsl(var(--primary))" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
        className="transition-all duration-500"
      />
      <text
        x="50%" y="50%"
        className="rotate-90 fill-foreground font-sans text-[0.85rem] font-bold"
        style={{ transformOrigin: "center" }}
        textAnchor="middle" dominantBaseline="central"
      >
        {pct}%
      </text>
    </svg>
  );
}
