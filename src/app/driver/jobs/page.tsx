"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Job = {
  id: string;
  status: string;
  priority: number | null;
  assigned_to: string | null;
  storm_event_id: string;
  property_id: string;
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

export default function DriverJobsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "queued" | "in_progress" | "done">("all");

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function boot() {
    setLoading(true);
    try {
      setError("");

      const sb = getSupabase();
      if (!sb) return;

      // auth guard
      const { data: u } = await sb.auth.getUser();
      if (!u.user) {
        router.replace("/login");
        return;
      }

      // NOTE: We pull only jobs assigned to the logged-in user
      const myId = u.user.id;

      const { data, error } = await sb
        .from("jobs")
        .select(
          `
          id,status,priority,assigned_to,storm_event_id,property_id,created_at,
          properties ( client_name,address,town,zone,type ),
          storm_events ( name,created_at )
        `
        )
        .eq("assigned_to", myId)
        .order("status", { ascending: true })
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      setJobs((data || []) as any);
    } catch (e: any) {
      setError(e.message || String(e));
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let list = jobs;

    if (statusFilter !== "all") {
      list = list.filter((j) => j.status === statusFilter);
    }

    const q = query.trim().toLowerCase();
    if (!q) return list;

    return list.filter((j) => {
      const blob = [
        j.properties?.client_name || "",
        j.properties?.address || "",
        j.properties?.town || "",
        j.properties?.zone || "",
        j.properties?.type || "",
        j.storm_events?.name || "",
        j.status || "",
        String(j.priority ?? ""),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [jobs, query, statusFilter]);

  function count(status: "queued" | "in_progress" | "done") {
    return jobs.filter((j) => j.status === status).length;
  }

  return (
    <main style={ui.page}>
      <div style={ui.shell}>
        <header style={ui.header}>
          <div>
            <h1 style={ui.h1}>Driver Jobs</h1>
            <p style={ui.sub}>Your assigned jobs — tap one to open details.</p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/" style={ui.linkTop}>
              ← Home
            </Link>
            <button onClick={boot} style={ui.btnGhostSmall} disabled={loading}>
              Refresh
            </button>
          </div>
        </header>

        {error ? <div style={ui.alert}>{error}</div> : null}

        <section style={ui.card}>
          <div style={ui.cardHeader}>
            <h2 style={ui.h2}>Overview</h2>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {loading ? "Loading…" : `${filtered.length} shown / ${jobs.length} total`}
            </div>
          </div>

          <div style={ui.kpis}>
            <button
              style={ui.kpiBtn(statusFilter === "all")}
              onClick={() => setStatusFilter("all")}
              disabled={loading}
            >
              All: {jobs.length}
            </button>
            <button
              style={ui.kpiBtn(statusFilter === "queued")}
              onClick={() => setStatusFilter("queued")}
              disabled={loading}
            >
              Queued: {count("queued")}
            </button>
            <button
              style={ui.kpiBtn(statusFilter === "in_progress")}
              onClick={() => setStatusFilter("in_progress")}
              disabled={loading}
            >
              In Progress: {count("in_progress")}
            </button>
            <button
              style={ui.kpiBtn(statusFilter === "done")}
              onClick={() => setStatusFilter("done")}
              disabled={loading}
            >
              Done: {count("done")}
            </button>
          </div>

          <div style={ui.row}>
            <input
              style={ui.input}
              placeholder="Search client, address, town, zone, storm…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
          </div>
        </section>

        <section style={ui.card}>
          <div style={ui.cardHeader}>
            <h2 style={ui.h2}>Jobs</h2>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Sorted by status → priority → newest
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {loading ? (
              <div style={{ fontSize: 13, opacity: 0.75 }}>Loading…</div>
            ) : !filtered.length ? (
              <div style={{ fontSize: 13, opacity: 0.75 }}>No jobs match your filters.</div>
            ) : (
              filtered.map((j) => (
                <Link key={j.id} href={`/driver/job/${j.id}`} style={ui.jobLink}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>
                        {j.properties?.client_name || j.property_id}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.82 }}>
                        {j.properties?.address || ""}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.82 }}>
                        {j.properties?.town ? `Town: ${j.properties.town}` : ""}
                        {j.properties?.zone ? ` • Zone: ${j.properties.zone}` : ""}
                        {j.properties?.type ? ` • Type: ${j.properties.type}` : ""}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                        Storm: {j.storm_events?.name || j.storm_event_id} • Priority: {j.priority ?? "—"}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={ui.statusPill(j.status)}>{j.status}</div>
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                        id: {j.id}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
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
  cardHeader: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" } as React.CSSProperties,
  h2: { margin: 0, fontSize: 15 } as React.CSSProperties,
  row: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" } as React.CSSProperties,
  input: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#e9eefc",
    outline: "none",
    minWidth: 320,
    flex: 1,
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
  kpis: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 } as React.CSSProperties,
  kpiBtn: (active: boolean) =>
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
  jobLink: {
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    textDecoration: "none",
    color: "#e9eefc",
    display: "block",
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