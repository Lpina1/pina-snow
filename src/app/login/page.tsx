"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { getMyProfile, type Profile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function AppHomePage() {
  const [status, setStatus] = useState<"checking" | "in" | "out">("checking");
  const [me, setMe] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setError("");

        const sb = getSupabase();
        if (!sb) return;

        const { data } = await sb.auth.getUser();
        if (!data.user) {
          setStatus("out");
          return;
        }

        setStatus("in");
        setEmail(data.user.email || "");

        try {
          const profile = await getMyProfile();
          setMe(profile);
        } catch {
          setMe(null);
        }
      } catch (e: any) {
        setError(e.message || String(e));
        setStatus("out");
      }
    })();
  }, []);

  return (
    <main style={ui.page}>
      <div style={ui.shell}>
        <header style={ui.header}>
          <div>
            <h1 style={ui.h1}>Pina Snow</h1>
            <p style={ui.sub}>
              Snow dispatch, job tracking, and billing exports
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={ui.badge(status)}>
              {status === "checking"
                ? "Checking session…"
                : status === "in"
                  ? "Signed in"
                  : "Signed out"}
            </div>

            {status === "in" ? (
              <div style={{ marginTop: 6 }}>
                {email && <div style={ui.small}>{email}</div>}
                {me && <div style={ui.small}>role: {me.role || "user"}</div>}
              </div>
            ) : null}
          </div>
        </header>

        {error && <div style={ui.alert}>{error}</div>}

        <section style={ui.card}>
          <h2 style={ui.h2}>Quick Access</h2>

          <div style={ui.grid}>
            <Link href="/login" style={ui.linkCard}>
              <div style={ui.linkTitle}>Login</div>
              <div style={ui.linkDesc}>Sign in to your account</div>
            </Link>

            <Link href="/driver/jobs" style={ui.linkCard}>
              <div style={ui.linkTitle}>Driver Jobs</div>
              <div style={ui.linkDesc}>View and update assigned jobs</div>
            </Link>

            <Link href="/admin" style={ui.linkCard}>
              <div style={ui.linkTitle}>Admin Dashboard</div>
              <div style={ui.linkDesc}>
                Storms, dispatch, and exports
              </div>
            </Link>
          </div>
        </section>

        <footer style={ui.footer}>
          Built for real-world plow & dispatch operations.
        </footer>
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

  shell: {
    width: "100%",
    maxWidth: 920,
    display: "grid",
    gap: 14,
  } as React.CSSProperties,

  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    background: "linear-gradient(180deg, #121a2b, #0e1422)",
    border: "1px solid rgba(255,255,255,0.08)",
  } as React.CSSProperties,

  h1: { margin: 0, fontSize: 28 } as React.CSSProperties,
  h2: { margin: 0, fontSize: 16 } as React.CSSProperties,

  sub: { margin: "6px 0 0", fontSize: 13, opacity: 0.8 } as React.CSSProperties,
  small: { fontSize: 12, opacity: 0.75 } as React.CSSProperties,

  badge: (status: string) =>
    ({
      display: "inline-block",
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 800,
      border: "1px solid rgba(255,255,255,0.12)",
      background:
        status === "in"
          ? "rgba(34,197,94,0.18)"
          : status === "out"
            ? "rgba(239,68,68,0.18)"
            : "rgba(148,163,184,0.18)",
    }) as React.CSSProperties,

  alert: {
    padding: 12,
    borderRadius: 14,
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.25)",
    fontSize: 13,
  } as React.CSSProperties,

  card: {
    padding: 16,
    borderRadius: 16,
    background: "#0e1422",
    border: "1px solid rgba(255,255,255,0.08)",
  } as React.CSSProperties,

  grid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    marginTop: 12,
  } as React.CSSProperties,

  linkCard: {
    padding: 14,
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    textDecoration: "none",
    color: "#e9eefc",
    display: "grid",
    gap: 6,
  } as React.CSSProperties,

  linkTitle: { fontWeight: 900, fontSize: 14 } as React.CSSProperties,
  linkDesc: { fontSize: 12, opacity: 0.8 } as React.CSSProperties,

  footer: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: "center",
  } as React.CSSProperties,
};