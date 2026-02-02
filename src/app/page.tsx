"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default function Home() {
  const [status, setStatus] = useState<"checking" | "in" | "out">("checking");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setStatus("in");
        setEmail(data.user.email || "");
      } else {
        setStatus("out");
      }
    });
  }, []);

  return (
    <main style={ui.page}>
      <div style={ui.shell}>
        <header style={ui.header}>
          <div>
            <h1 style={ui.h1}>Pina Snow</h1>
            <p style={ui.sub}>
              Dispatch + job logging + exports (storm & seasonal)
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
            {status === "in" && email ? (
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>{email}</div>
            ) : null}
          </div>
        </header>

        <section style={ui.card}>
          <h2 style={ui.h2}>Quick Links</h2>
          <div style={ui.grid}>
            <Link href="/login" style={ui.linkCard}>
              <div style={ui.linkTitle}>Login</div>
              <div style={ui.linkDesc}>Sign in to access admin/driver tools.</div>
            </Link>

            <Link href="/driver/jobs" style={ui.linkCard}>
              <div style={ui.linkTitle}>Driver</div>
              <div style={ui.linkDesc}>View assigned jobs and log service.</div>
            </Link>

            <Link href="/admin" style={ui.linkCard}>
              <div style={ui.linkTitle}>Admin Dashboard</div>
              <div style={ui.linkDesc}>Create storms, assign jobs, export billing.</div>
            </Link>
          </div>
        </section>

        <footer style={ui.footer}>
          <span>Tip: If you get redirected, just login once and you’re set.</span>
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
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    background: "linear-gradient(180deg, #121a2b, #0e1422)",
    border: "1px solid rgba(255,255,255,0.08)",
  } as React.CSSProperties,
  h1: { margin: 0, fontSize: 28, letterSpacing: 0.2 } as React.CSSProperties,
  sub: { margin: "6px 0 0", opacity: 0.8, fontSize: 13 } as React.CSSProperties,
  badge: (status: "checking" | "in" | "out") =>
    ({
      display: "inline-block",
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      border: "1px solid rgba(255,255,255,0.12)",
      background:
        status === "in"
          ? "rgba(34,197,94,0.15)"
          : status === "out"
            ? "rgba(239,68,68,0.15)"
            : "rgba(148,163,184,0.15)",
    }) as React.CSSProperties,
  card: {
    padding: 16,
    borderRadius: 16,
    background: "#0e1422",
    border: "1px solid rgba(255,255,255,0.08)",
  } as React.CSSProperties,
  h2: { margin: 0, fontSize: 16 } as React.CSSProperties,
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
  footer: { fontSize: 12, opacity: 0.7, padding: "0 4px" } as React.CSSProperties,
};