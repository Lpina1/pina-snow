"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { getMyProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "magic">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [checking, setChecking] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // If already logged in, bounce out
    (async () => {
      try {
        setError("");
        const sb = getSupabase();
        if (!sb) return;

        const { data } = await sb.auth.getUser();
        if (data.user) {
          await routeAfterLogin();
        }
      } catch {
        // ignore
      } finally {
        setChecking(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function routeAfterLogin() {
    // Decide where to send user based on profile role
    try {
      const profile = await getMyProfile(); // assumes this reads from profiles using current session
      const role = (profile?.role || "").toLowerCase();

      if (role === "admin" || role === "dispatcher") router.replace("/admin");
      else if (role === "driver") router.replace("/driver/jobs");
      else router.replace("/");
    } catch {
      router.replace("/");
    }
  }

  async function signInPassword() {
    setWorking(true);
    try {
      setError("");
      setMessage("");

      if (!email.trim()) return setError("Enter your email.");
      if (!password) return setError("Enter your password.");

      const sb = getSupabase();
      if (!sb) return;

      const { error } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw new Error(error.message);

      await routeAfterLogin();
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setWorking(false);
    }
  }

  async function sendMagicLink() {
    setWorking(true);
    try {
      setError("");
      setMessage("");

      if (!email.trim()) return setError("Enter your email.");

      const sb = getSupabase();
      if (!sb) return;

      // IMPORTANT:
      // For magic links to work reliably, set your Site URL in Supabase Auth settings
      // and set NEXT_PUBLIC_SITE_URL (optional). We use current origin as fallback.
      const redirectTo =
        (process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "")) + "/";

      const { error } = await sb.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });

      if (error) throw new Error(error.message);

      setMessage("Magic link sent — check your email.");
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setWorking(false);
    }
  }

  return (
    <main style={ui.page}>
      <div style={ui.shell}>
        <header style={ui.header}>
          <div>
            <h1 style={ui.h1}>Login</h1>
            <p style={ui.sub}>Sign in to access driver + admin tools.</p>
          </div>

          <Link href="/" style={ui.linkTop}>
            ← Home
          </Link>
        </header>

        {error ? <div style={ui.alert}>{error}</div> : null}
        {message ? <div style={ui.notice}>{message}</div> : null}

        <section style={ui.card}>
          <div style={ui.tabs}>
            <button
              onClick={() => setMode("signin")}
              style={ui.tabBtn(mode === "signin")}
              disabled={working || checking}
            >
              Password
            </button>
            <button
              onClick={() => setMode("magic")}
              style={ui.tabBtn(mode === "magic")}
              disabled={working || checking}
            >
              Magic Link
            </button>
          </div>

          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            <label style={ui.label}>
              Email
              <input
                style={ui.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                inputMode="email"
                autoComplete="email"
                disabled={working || checking}
              />
            </label>

            {mode === "signin" ? (
              <label style={ui.label}>
                Password
                <input
                  style={ui.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  autoComplete="current-password"
                  disabled={working || checking}
                />
              </label>
            ) : null}

            <div style={ui.btnRow}>
              {mode === "signin" ? (
                <button onClick={signInPassword} style={ui.btnPrimary} disabled={working || checking}>
                  {working ? "Signing in…" : "Sign in"}
                </button>
              ) : (
                <button onClick={sendMagicLink} style={ui.btnPrimary} disabled={working || checking}>
                  {working ? "Sending…" : "Send magic link"}
                </button>
              )}

              <button
                onClick={async () => {
                  try {
                    setError("");
                    setMessage("");
                    const sb = getSupabase();
                    if (!sb) return;
                    await sb.auth.signOut();
                    setMessage("Signed out.");
                  } catch (e: any) {
                    setError(e.message || String(e));
                  }
                }}
                style={ui.btnGhost}
                disabled={working || checking}
              >
                Sign out (test)
              </button>
            </div>

            <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.45 }}>
              {mode === "signin" ? (
                <>
                  Use your email + password from Supabase Auth.
                  <br />
                  If you don’t have one yet, create a user in Supabase Auth → Users.
                </>
              ) : (
                <>
                  We’ll email you a sign-in link.
                  <br />
                  Make sure your Supabase Auth “Site URL” and redirect URLs allow this domain.
                </>
              )}
            </div>
          </div>
        </section>
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
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
  } as React.CSSProperties,
  shell: { width: "100%", maxWidth: 560, display: "grid", gap: 14 } as React.CSSProperties,
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    background: "linear-gradient(180deg, #121a2b, #0e1422)",
    border: "1px solid rgba(255,255,255,0.08)",
  } as React.CSSProperties,
  h1: { margin: 0, fontSize: 22 } as React.CSSProperties,
  sub: { margin: "6px 0 0", opacity: 0.8, fontSize: 13 } as React.CSSProperties,
  linkTop: { color: "#93c5fd", textDecoration: "none", fontWeight: 900, fontSize: 13 } as React.CSSProperties,
  card: {
    padding: 16,
    borderRadius: 16,
    background: "#0e1422",
    border: "1px solid rgba(255,255,255,0.08)",
  } as React.CSSProperties,
  alert: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(239,68,68,0.25)",
    background: "rgba(239,68,68,0.12)",
    fontSize: 13,
  } as React.CSSProperties,
  notice: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(59,130,246,0.25)",
    background: "rgba(59,130,246,0.12)",
    fontSize: 13,
  } as React.CSSProperties,
  tabs: { display: "flex", gap: 8 } as React.CSSProperties,
  tabBtn: (active: boolean) =>
    ({
      padding: "8px 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.12)",
      background: active ? "rgba(59,130,246,0.22)" : "rgba(255,255,255,0.04)",
      color: "#e9eefc",
      fontSize: 12,
      fontWeight: 900,
      cursor: "pointer",
    }) as React.CSSProperties,
  label: { display: "grid", gap: 6, fontSize: 12, opacity: 0.92 } as React.CSSProperties,
  input: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#e9eefc",
    outline: "none",
  } as React.CSSProperties,
  btnRow: { display: "flex", gap: 10, flexWrap: "wrap" } as React.CSSProperties,
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
};