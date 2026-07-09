import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Wordmark } from "@/components/brand";
import { IrisOrb } from "@/components/IrisOrb";

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/api/auth/login", { email, password });
      const user = await refresh();
      navigate(user?.role === "admin" ? "/admin" : "/app", { replace: true });
    } catch (err: any) {
      setError(err.message || "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
      {/* form side */}
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link to="/" className="w-fit transition-opacity hover:opacity-80">
          <Wordmark />
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center"
        >
          <h1 className="font-serif text-3xl tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use the login your Peek Vision contact shared with you.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-[0.95rem] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Password
              </span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-[0.95rem] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-600 disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
              {!busy && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>

          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
            No login yet? Access is provisioned by the Peek team. Write to{" "}
            <a className="font-medium text-primary hover:underline" href="mailto:sehra@peekvision.org">
              sehra@peekvision.org
            </a>{" "}
            to take part in a scoping assessment.
          </p>
        </motion.div>
      </div>

      {/* visual side */}
      <div className="relative hidden items-center justify-center overflow-hidden bg-[radial-gradient(120%_120%_at_20%_10%,#0d5f57_0%,#06403b_55%,#032a27_100%)] lg:flex">
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }} />
        <div className="relative z-10 max-w-md px-12 text-center">
          <IrisOrb className="mx-auto h-[300px] w-[300px]" />
          <motion.blockquote
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-6 font-serif text-2xl leading-snug text-white"
          >
            See whether a school eye health programme can work here.
          </motion.blockquote>
          <p className="mt-4 text-sm text-white/60">
            SEHRA Scoping Module · the Minto Method
          </p>
        </div>
      </div>
    </div>
  );
}
