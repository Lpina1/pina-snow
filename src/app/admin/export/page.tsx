"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Storm = { id: string; name: string | null; created_at: string };

export default function AdminExport() {
  const router = useRouter();

  const [supabaseReady, setSupabaseReady] = useState(false);
  const [stormId, setStormId] = useState("");
  const [storms, setStorms] = useState<Storm[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;

    setSupabaseReady(true);

    (async () => {
      const { data: u } = await sb.auth.getUser();
      if (!u.user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await sb
        .from("storm_events")
        .select("id,name,created_at")
        .order("created_at", { ascending: false });

      if (error) setError(error.message);
      setStorms((data || []) as any);
      if ((data || []).length) setStormId((data as any)[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function exportCsv() {
    setError("");
    setBusy(true);

    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Supabase not ready");

      if (!stormId) throw new Error("Pick a storm first");

      const { data, error } = await sb
        .from("service_logs")
        .select(
          `
          id,
          service_type,
          depth_bracket,
          salt_amount,
          salt_unit,
          started_at,
          completed_at,
          notes,
          created_by,
          jobs!inner (
            id,
            storm_event_id,
            properties (
              client_name,
              address,
              town,
              zone,
              type
            )
          )
        `
        )
        .eq("jobs.storm_event_id", stormId);

      if (error) throw new Error(error.message);

      const rows =
        (data || []).map((r: any) => ({
          storm_id: stormId,
          client_name: r.jobs?.properties?.client_name || "",
          address: r.jobs?.properties?.address || "",
          town: r.jobs?.properties?.town || "",
          zone: r.jobs?.properties?.zone || "",
          property_type: r.jobs?.properties?.type || "",
          service_type: r.service_type || "",
          depth_bracket: r.depth_bracket || "",
          salt_amount: r.salt_amount ?? "",
          salt_unit: r.salt_unit ?? "",
          started_at: r.started_at || "",
          completed_at: r.completed_at || "",
          driver_user_id: r.created_by || "",
          notes: r.notes || "",
        })) || [];

      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `storm_export_${stormId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!supabaseReady) {
    return (
      <main style={ui.page}>
        <div style={ui.shell}>
          <div style={ui.card}>Loading…</div>
        </div>
      </main>
    );
  }

  return (
    <main style={ui.page}>
      <div style={ui.shell}>
        <header style={ui.header}>
          <div>
            <h1 style={ui.h1}>Storm Export</h1>
            <p style={ui.sub}>Download service log CSV for a storm.</p>
          </div>
          <Link href="/admin" style={ui.link}>
            ← Back to Admin
          </Link>
        </header>

        {error ? <div style={ui.alert}>{error}</div> : null}

        <section style={ui.card}>
          <label style={ui.label}>
            Storm
            <select style={ui.select} value={stormId} onChange={(e) => setStormId(e.target.value)}>
              {storms.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.id}
                </option>
              ))}
            </select>
          </label>

          <button onClick={exportCsv} disabled={busy} style={ui.btnPrimary}>
            {busy ? "Preparing…" : "Download CSV"}
          </button>
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
  shell: { width: "100%", maxWidth: 900, margin: "0 auto", display: "grid", gap: 14 } as React.CSSProperties,
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
  h1: { margin: 0, fontSize: 20 } as React.CSSProperties,
  sub: { margin: "6px 0 0", opacity: 0.8, fontSize: 13 } as React.CSSProperties,
  link: { color: "#93c5fd", textDecoration: "none", fontWeight: 900, fontSize: 13 } as React.CSSProperties,
  card: {
    padding: 16,
    borderRadius: 16,
    background: "#0e1422",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "grid",
    gap: 12,
  } as React.CSSProperties,
  label: { display: "grid", gap: 6, fontSize: 12, opacity: 0.9 } as React.CSSProperties,
  select: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#e9eefc",
    outline: "none",
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
  alert: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(239,68,68,0.25)",
    background: "rgba(239,68,68,0.12)",
    fontSize: 13,
  } as React.CSSProperties,
};