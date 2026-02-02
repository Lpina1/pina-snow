"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Papa from "papaparse";

export default function AdminExport() {
  const [stormId, setStormId] = useState("");
  const [storms, setStorms] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStorms();
  }, []);

  async function loadStorms() {
    const { data, error } = await supabase
      .from("storm_events")
      .select("id,name,created_at")
      .order("created_at", { ascending: false });

    if (error) setError(error.message);
    setStorms(data || []);
  }

  async function exportCsv() {
    setError("");

    if (!stormId) return setError("Pick a storm first");

    const { data, error } = await supabase
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

    if (error) return setError(error.message);

    const rows =
      (data || []).map((r: any) => ({
        storm_id: stormId,
        client_name: r.jobs?.properties?.client_name,
        address: r.jobs?.properties?.address,
        town: r.jobs?.properties?.town,
        zone: r.jobs?.properties?.zone,
        property_type: r.jobs?.properties?.type,
        service_type: r.service_type,
        depth_bracket: r.depth_bracket,
        salt_amount: r.salt_amount,
        salt_unit: r.salt_unit,
        started_at: r.started_at,
        completed_at: r.completed_at,
        driver_user_id: r.created_by,
        notes: r.notes,
      })) || [];

    const csv = Papa.unparse(rows);

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `storm_export_${stormId}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main style={{ padding: 16 }}>
      <h1>Admin Export CSV</h1>

      <label>
        Storm
        <select value={stormId} onChange={(e) => setStormId(e.target.value)}>
          <option value="">-- Select storm --</option>
          {storms.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name || s.id}
            </option>
          ))}
        </select>
      </label>

      <div style={{ marginTop: 12 }}>
        <button onClick={exportCsv} style={{ padding: 12, border: "2px solid #000" }}>
          Download CSV
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </main>
  );
}