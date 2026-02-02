"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabase();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/admin");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn() {
    setBusy(true);
    setMsg("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });
      if (error) throw error;
      router.replace("/admin");
    } catch (e: any) {
      setMsg(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function signUp() {
    setBusy(true);
    setMsg("");
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
      });
      if (error) throw error;
      setMsg("Account created. Now sign in.");
    } catch (e: any) {
      setMsg(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={ui.page}>
      <div style={ui.card}>
        <h1 style={ui.h1}>Sign in</h1>
        <p style={ui.sub}>Use your Supabase Auth email/password.</p>

        <div style={ui.form}>
          <label style={ui.label}>
            Email
            <input
              style={ui.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
            />
          </label>

          <label style={ui.label}>
            Password
            <input
              style={ui.input}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
            />
          </label>

          <div style={ui.row}>
            <button onClick={signIn} disabled={busy || !email || !pass} style={ui.btnPrimary}>
              {busy ? "Working…" : "Sign In"}
            </button>
            <button onClick={signUp} disabled={busy || !email || !pass} style={ui.btnGhost}>
              Create Account
            </button>
          </div>

          {msg ? <div style={ui.msg}>{msg}</div> : null}
        </div>

        <div style={ui.hint}>
          Admin access is controlled by your <code>profiles.role</code> row.
        </div>
      </div>
    </main>
  );
}

const ui = {
  page: {
    minHeight: "100vh",
    background: "#0b0f19",
    padding: 18,
    display: "grid",
    placeItems: "center",
    color: "#e9eefc",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
  } as React.CSSProperties,
  card: {
    width: "100%",
    maxWidth: 520,
    padding: 18,
    borderRadius: 16,
    background: "#0e1422",
    border: "1px solid rgba(255,255,255,0.08)",
  } as React.CSSProperties,
  h1: { margin: 0, fontSize: 22 } as React.CSSProperties,
  sub: { margin: "6px 0 0", opacity: 0.8, fontSize: 13 } as React.CSSProperties,
  form: { display: "grid", gap: 12, marginTop: 14 } as React.CSSProperties,
  label: { display: "grid", gap: 6, fontSize: 12, opacity: 0.9 } as React.CSSProperties,
  input: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#e9eefc",
    outline: "none",
  } as React.CSSProperties,
  row: { display: "flex", gap: 10, flexWrap: "wrap" } as React.CSSProperties,
  btnPrimary: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(59,130,246,0.22)",
    color: "#e9eefc",
    fontWeight: 900,
    cursor: "pointer",
  } as React.CSSProperties,
  btnGhost: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "transparent",
    color: "#e9eefc",
    fontWeight: 900,
    cursor: "pointer",
  } as React.CSSProperties,
  msg: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    fontSize: 13,
  } as React.CSSProperties,
  hint: { marginTop: 12, fontSize: 12, opacity: 0.7 } as React.CSSProperties,
};