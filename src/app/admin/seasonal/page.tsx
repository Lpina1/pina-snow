"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Papa from "papaparse";

type Property = { id: string; client_name: string; address: string | null; town: string | null; type: string | null; zone: string | null };
type Seasonal = { property_id: string; season_label: string; seasonal_price: number; bill_to_name: string | null; bill_to_email: string | null };

export default function SeasonalBilling() {
  const [season, setSeason] = useState("2025-2026");
  const [properties, setProperties] = useState<Property[]>([]);
  const [seasonals, setSeasonals] = useState<Seasonal[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadSeasonals(season);
  }, [season]);

  async function load() {
    const { data, error } = await supabase
      .from("properties")
      .select("id,client_name,address,town,type,zone")
      .order("client_name", { ascending: true });

    if (error) setError(error.message);
    setProperties((data || []) as any);
  }

  async function loadSeasonals(seasonLabel: string) {
    setError("");
    const { data, error } = await supabase
      .from("seasonal_accounts")
      .select("property_id,season_label,seasonal_price,bill_to_name,bill_to_email")
      .eq("season_label", seasonLabel);

    if (error) setError(error.message);
    setSeasonals((data || []) as any);
  }

  const seasonalMap = useMemo(() => {
    const m = new Map<string, Seasonal>();
    seasonals.forEach((s) => m.set(s.property_id, s));
    return m;
  }, [seasonals]);

  async function upsertSeasonal(propertyId: string, price: number) {
    setError("");
    const { error } = await supabase.from("seasonal_accounts").upsert({
      property_id: propertyId,
      season_label: season,
      seasonal_price: price,
    });
    if (error) setError(error.message);
    else loadSeasonals(season);
  }

  async function exportSeasonCsv() {
    setError("");

    // Pull ALL service logs and aggregate by property for this season label.
    // MVP: season filter is manual (you choose "2025-2026"); we’ll add date ranges next.
    const { data, error } = await supabase
      .from("service_logs")
      .select(
        `
        id,
        service_type,
        salt_amount,
        salt_unit,
        completed_at,
        jobs!inner (
          id,
          properties ( id, client_name, address, town, zone, type )
        )
      `
      );

    if (error) return setError(error.message);

    const agg = new Map<string, { services: number; salt_lbs: number }>();

    (data || []).forEach((r: any) => {
      const prop = r.jobs?.properties;
      if (!prop?.id) return;

      const key = prop.id;
      const cur = agg.get(key) || { services: 0, salt_lbs: 0 };
      cur.services += 1;

      if (r.service_type === "salt" && r.salt_amount) {
        // if they logged "application" we can't convert; treat as 0 lbs
        if (r.salt_unit === "lbs") cur.salt_lbs += Number(r.salt_amount) || 0;
      }

      agg.set(key, cur);
    });

    const rows = properties.map((p) => {
      const seasonal = seasonalMap.get(p.id);
      const a = agg.get(p.id) || { services: 0, salt_lbs: 0 };

      return {
        season_label: season,
        client_name: p.client_name,
        address: p.address || "",
        town: p.town || "",
        zone: p.zone || "",
        property_type: p.type || "",
        seasonal_price: seasonal?.seasonal_price ?? 0,
        service_visits_count: a.services,
        salt_lbs_logged: a.salt_lbs,
        extras_total: 0, // placeholder: add per-push/per-salt pricing later
        total_due: (seasonal?.seasonal_price ?? 0) + 0,
      };
    });

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `seasonal_billing_${season}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main style={{ padding: 16, maxWidth: 900 }}>
      <h1>Seasonal Billing</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label>
          Season label:
          <input value={season} onChange={(e) => setSeason(e.target.value)} />
        </label>

        <button onClick={exportSeasonCsv} style={{ padding: 12, border: "2px solid #000" }}>
          Download Seasonal CSV
        </button>
      </div>

      <h2 style={{ marginTop: 16 }}>Set seasonal price per account</h2>

      {properties.map((p) => {
        const cur = seasonalMap.get(p.id);
        return (
          <div key={p.id} style={{ border: "1px solid #000", padding: 10, marginTop: 8 }}>
            <strong>{p.client_name}</strong>
            <div>{p.address || ""}</div>
            <div>{p.town || ""} • Zone {p.zone}</div>

            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span>Seasonal $</span>
              <input
                defaultValue={cur?.seasonal_price ?? ""}
                placeholder="ex: 4500"
                onBlur={(e) => {
                  const v = Number(e.target.value || "0");
                  if (!Number.isNaN(v)) upsertSeasonal(p.id, v);
                }}
              />
              <small>(click out of the box to save)</small>
            </div>
          </div>
        );
      })}
    </main>
  );
}