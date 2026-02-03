"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Job = {
  id: string;
  status: string;
  priority: number | null;
  assigned_to: string | null;
  storm_event_id: string;
  property_id: string;
  notes: string | null;
  created_at: string;
  properties?: {
    client_name: string;
    address: string | null;
    town: string | null;
    zone: string | null;
    type: string | null;
  } | null;
  storm_events?: {
    name: string | null;
    created_at: string;
  } | null;
};

export default function DriverJobDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const jobId = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function boot() {
    setLoading(true);
    try {
      setError("");

      if (!jobId) throw new Error("Missing job id.");

      const sb = getSupabase();
      if (!sb) return;

      // auth guard
      const { data: u } = await sb.auth.getUser();
      if (!u.user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await sb
        .from("jobs")
        .select(
          `
          id,status,priority,assigned_to,storm_event_id,property_id,notes,created_at,
          properties ( client_name,address,town,zone,type ),
          storm_events ( name,created_at )
        `
        )
        .eq("id", jobId)
        .single();

      if (error) throw new Error(error.message);

      setJob((data as any) as Job);
    } catch (e: any) {
      setError(e.message || String(e));
      setJob(null);
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(status: "queued" | "in_progress" | "done") {
    try {
      setError("");
      setSaving(true);

      if (!jobId) throw new Error("Missing job id.");

      const sb = getSupabase();
      if (!sb) return;

      const { error } = await sb.from("jobs").update({ status }).eq("id", jobId);
      if (error) throw new Error(error.message);

      // refresh
      await boot();
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={ui.page}>
      <div style={ui.shell}>
        <header style={ui.header}>
          <div>
            <h1 style={ui.h1}>Driver Job</h1>
            <p style={ui.sub}>View job details and update status.</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/driver/jobs" style={ui.linkTop}>
              ← Back to Jobs
            </Link>
            <button onClick={boot} style={ui.btnGhostSmall} disabled={loading || saving}>
              Refresh
            </button>
          </div>
        </header>

        {error ? <div style={ui.alert}>{error}</div> : null}

        <section style={ui.card}>
          {loading ? (
            <div style={{ fontSize: 13, opacity: 0.75 }}>Loading…</div>
          ) : !job ? (
            <div style={{ fontSize: 13, opacity: 0.75 }}>Job not found.</div>
          ) : (
            <>
              <div style={ui.topRow}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>
                    {job.properties?.client_name || job.property_id}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.82 }}>{job.properties?.address || ""}</div>
                  <div style={{ fontSize: 12, opacity: 0.82 }}>
                    {job.properties?.town ? `Town: ${job.properties.town}` : ""}
                    {job.properties?.zone ? ` • Zone: ${job.properties.zone}` : ""}
                    {job.properties?.type ? ` • Type: ${job.properties.type}` : ""}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
                    Storm: {job.storm_events?.name || job.storm_event_id} • Priority: {job.priority ?? "—"}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={ui.statusPill(job.status)}>{job.status}</div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                    Job ID: {job.id}
                  </div>
                </div>
              </div>

              {job.notes ? (
                <div style={ui.noteBox}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Notes</div>
                  <div style={{ fontSize: 13, opacity: 0.85, whiteSpace: "pre-wrap" }}>{job.notes}</div>
                </div>
              ) : null}

              <div style={ui.btnRow}>
                <button
                  onClick={() => setStatus("queued")}
                  style={ui.btnGhost}
                  disabled={saving}
                >
                  Queued
                </button>
                <button
                  onClick={() => setStatus("in_progress")}
                  style={ui.btnGhost}
                  disabled={saving}
                >
                  In Progress
                </button>
                <button
                  onClick={() => setStatus("done")}
                  style={ui.btnPrimary}
                  disabled={saving}
                >
                  Done
                </button>
              </div>
            </>
          )}
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
    color: "#e9eefc",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
  } as React.CSSProperties,
  shell: { width: "100%", maxWidth: 980, margin: "0 auto", display: "grid", gap: 14 } as React.CSSProperties,
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
  alert: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(239,68,68,0.25)",
    background: "rgba(239,68,68,0.12)",
    fontSize: 13,
  } as React.CSSProperties,
  card: {
    padding: 16,
    borderRadius: 16,
    background: "#0e1422",
    border: "1px solid rgba(255,255,255,0.08)",
  } as React.CSSProperties,
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  } as React.CSSProperties,
  noteBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
  } as React.CSSProperties,
  btnRow: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 } as React.CSSProperties,
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
  btnGhostSmall: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "transparent",
    color: "#e9eefc",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 12,
  } as React.CSSProperties,
  statusPill: (status: string) =>
    ({
      display: "inline-block",
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 900,
      border: "1px solid rgba(255,255,255,0.12)",
      background:
        status === "done"
          ? "rgba(34,197,94,0.18)"
          : status === "in_progress"
          ? "rgba(59,130,246,0.18)"
          : "rgba(148,163,184,0.18)",
    }) as React.CSSProperties,
};