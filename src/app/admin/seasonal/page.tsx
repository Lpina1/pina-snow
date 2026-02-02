"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Property = {
  id: string;
  client_name: string;
  address: string | null;
  town: string | null;
  type: string | null;
  zone: string | null;
};
type Seasonal = {
  property_id: string;
  season_label: string;
  seasonal_price: number;
  bill_to_name: string | null;
  bill_to_email: string | null;
};

export default function SeasonalBilling() {
  const router = useRouter();
  const supabase = getSupabase();

  const [season, setSeason] = useState("2025-2026");
  const [properties, setProperties] = useState<Property[]>([]);
  const [seasonals, setSeasonals] = useState<Seasonal[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        router.replace("/login");
        return;
      }
      loadProperties();
      loadSeasonals(season);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSeasonals(season);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season]);

  async function loadProperties() {
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
    setBusy(true);

    try {
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

      if (error) throw new Error(error.message);

      const agg = new Map<string, { services: number; salt_lbs: number }>();

      (data || []).forEach((r: any) => {
        const prop = r.jobs?.properties;
        if (!prop?.id) return;

        const key = prop.id;
        const cur = agg.get(key) || { services: 0, salt_lbs: 0 };
        cur.services += 1;

        if (r.service_type === "salt" && r.salt_amount) {
          if (r.salt_unit === "lbs") cur.salt_lbs += Number(r.salt_amount) || 0;
        }

        agg.set(key, cur);
      });

      const rows = properties.map((p) => {
        const seasonal = seasonalMap.get(p.id);
        const a = agg.get(p.id) || { services: 0, salt_lbs: 0 };
        const seasonalPrice = seasonal?.seasonal_price ?? 0;

        return {
          season_label: season,
          client_name: p.client_name,
          address: p.address || "",
          town: p.town || "",
          zone: p.zone || "",
          property_type: p.type || "",
          seasonal_price: seasonalPrice,
          service_visits_count: a.services,
          salt_lbs_logged: a.salt_lbs,
          extras_total: 0,
          total_due: seasonalPrice,
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
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={ui.page}>
      <div style={ui.shell}>
        <header style={ui.header}>
          <div>
            <h1 style={ui.h1}>Seasonal Billing</h1>
            <p style={ui.sub}>Set seasonal totals and export a season summary CSV.</p>
          </div>
          <Link href="/admin" style={ui.link}>
            ← Back to Admin
          </Link>
        </header>

        {error ? <div style={ui.alert}>{error}</div> : null}

        <section style={ui.card}>
          <div style={ui.row}>
            <label style={ui.label}>
              Season label
              <input style={ui.input} value={season} onChange={(e) => setSeason(e.target.value)} />
            </label>

            <button onClick={exportSeasonCsv} style={ui.btnPrimary} disabled={busy}>
              {busy ? "Preparing…" : "Download Seasonal CSV"}
            </button>
          </div>

          <h2 style={{ ...ui.h2, marginTop: 14 }}>Seasonal price per account</h2>

          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {properties.map((p) => {
              const cur = seasonalMap.get(p.id);
              return (
                <div key={p.id} style={ui.item}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{p.client_name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{p.address || ""}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      {p.town || ""} • Zone {p.zone || ""}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Seasonal $</div>
                    <input
                      style={ui.input}
                      defaultValue={cur?.seasonal_price ?? ""}
                      placeholder="ex: 4500"
                      onBlur={(e) => {
                        const v = Number(e.target.value || "0");
                        if (!Number.isNaN(v)) upsertSeasonal(p.id, v);
                      }}
                    />
                    <div style={{ fontSize: 11, opacity: 0.6 }}>Click out of the box to save</div>
                  </div>
                </div>
              );
            })}
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
  h2: { margin: 0, fontSize: 14 } as React.CSSProperties,
  row: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" } as React.CSSProperties,
  label: { display: "grid", gap: 6, fontSize: 12, opacity: 0.9 } as React.CSSProperties,
  input: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#e9eefc",
    outline: "none",
    minWidth: 240,
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
  item: {
    display: "grid",
    gridTemplateColumns: "1fr 260px",
    gap: 12,
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
  } as React.CSSProperties,
  alert: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(239,68,68,0.25)",
    background: "rgba(239,68,68,0.12)",
    fontSize: 13,
  } as React.CSSProperties,
};