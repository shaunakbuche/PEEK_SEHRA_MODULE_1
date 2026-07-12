import { useState } from "react";
import { X, UserCog } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Dialog } from "@/components/Dialog";

/** Stable at module scope so inputs never lose focus while typing. */
function Row({ label, value, onChange, type = "text", required = false, hint, autoComplete }: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  hint?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      <input
        type={type} required={required} value={value} onChange={onChange} autoComplete={autoComplete}
        className="w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-[0.95rem] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      {hint && <span className="mt-1 block text-[0.72rem] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function AccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, refresh } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await api.put("/api/account", {
        currentPassword,
        email: email.trim() || undefined,
        newPassword: newPassword || undefined,
        fullName,
      });
      await refresh();
      setSaved(true);
      setNewPassword("");
      setCurrentPassword("");
    } catch (err: any) {
      setError(err.message || "Could not update your account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} labelledBy="account-modal-title">
      <form onSubmit={submit}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10">
              <UserCog className="h-4.5 w-4.5 text-primary" />
            </span>
            <h3 id="account-modal-title" className="font-serif text-2xl">Your account</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Change the email or password used to sign in. Useful when handing this login over to someone else.
        </p>

        <div className="mt-5 space-y-4">
          <Row label="Display name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Row label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <Row
            label="New password" type="password" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            hint="Leave blank to keep your current password." autoComplete="new-password"
          />
          <div className="border-t border-dashed border-border pt-4">
            <Row
              label="Current password" type="password" value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)} required
              hint="Required to confirm any change." autoComplete="current-password"
            />
          </div>
        </div>

        <div role="status" aria-live="polite">
          {error && <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
          {saved && <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Saved. Use the new details next time you sign in.</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary">
            Close
          </button>
          <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-600 disabled:opacity-60">
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
