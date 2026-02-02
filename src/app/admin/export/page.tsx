"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Storm = { id: string; name: string | null; created_at: string };

type ExportRow = {
  storm_name: string;
  storm_id: string;
  job_id: string;
  status: string;
  priority: number | null;
  client_name: string | null;
  address: string | null;
  town: string | null;
  zone: string | null;
  assigned_to: string | null;
};

export default function AdminExportPage() {
  const router = useRouter();

  const [storms, setStorms] = useState<Storm[]>([]);
  const [selectedStormId, setSelectedStormId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const selectedStorm = useMemo(
    () => storms.find((s) => s.id === selectedStormId) || null,
    [storms, selectedStormId]
  );

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

      const { data, error } = await sb
        .from("storm_events")
        .select("id,name,created_at")
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      const list = (data || []) as any as Storm[];
      setStorms(list);
      if (list.length) setSelectedStormId(list[0].id);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function downloadCsv() {
    try {
      setError("");
      if (!selectedStormId) return setError("Select a storm first.");

      setWorking(true);

      const sb = getSupabase();
      if (!sb) return;

      // jobs + property join
      const { data: jobs, error: jErr } = await sb
        .from("jobs")
        .select(
          `
          id,status,priority,assigned_to,storm_event_id,property_id,
          properties ( client_name,address,town,zone )
        `
        )
        .eq("storm_event_id", selectedStormId)
        .order("priority", { ascending: true });

      if (jErr) throw new Error(jErr.message);

      const rows: ExportRow[] = (jobs || []).map((j: any) => ({
        storm_name: selectedStorm?.name || selectedStormId,
        storm_id: selectedStormId,
        job_id: j.id,
        status: j.status,
        priority: j.priority ?? null,
        client_name: j.properties?.client_name ?? null,
        address: j.properties?.address ?? null,
        town: j.properties?.town ?? null,
        zone: j.properties?.zone ?? null,
        assigned_to: j.assigned_to ?? null,
      }));

      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;

      const safeStormName = (selectedStorm?.name || "storm")
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase();

      a.download = `storm_export_${safeStormName}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
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
            <h1 style={ui.h1}>Storm CSV Export</h1>
            <p style={ui.sub}>Download all jobs for a storm (for invoicing / records).</p>
          </div>
          <Link href="/admin" style={ui.linkTop}>
            ← Back to Admin
          </Link>
        </header>

        {error ? <div style={ui.alert}>{error}</div> : null}

        <section style={ui.card}>
          <h2 style={ui.h2}>Select storm</h2>

          <div style={ui.row}>
            <select
              style={ui.select}
              value={selectedStormId}
              onChange={(e) => setSelectedStormId(e.target.value)}
              disabled={loading || working}
            >
              <option value="">-- Select storm --</option>
              {storms.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.id}
                </option>
              ))}
            </select>

            <button onClick={downloadCsv} style={ui.btnPrimary} disabled={loading || working || !selectedStormId}>
              {working ? "Building CSV…" : "Download CSV"}
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            Includes: job status, priority, property client/address, zone/town, assigned driver id.
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
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
  } as React.CSSProperties,
  shell: { width: "100%", maxWidth: 920, margin: "0 auto", display: "grid", gap: 14 } as React.CSSProperties,
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
  h2: { margin: 0, fontSize: 15 } as React.CSSProperties,
  row: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" } as React.CSSProperties,
  select: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#e9eefc",
    outline: "none",
    minWidth: 280,
  } as React.CSSProperties,
  btnPrimary: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(59,130,246,0.22)",
    color: "#e9eefc",
    fontWeight: 900,
    cursor: "pointer",
  } as React.CSSProperties,
};