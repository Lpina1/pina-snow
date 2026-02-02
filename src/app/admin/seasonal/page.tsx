"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Assumptions (adjust if your schema differs):
 * - properties table has: id, client_name, address, town, zone, type, active, seasonal_price (optional), seasonal_notes (optional)
 * If you don't have seasonal fields yet, we still export a clean list and you can invoice from it.
 */

type Property = {
  id: string;
  client_name: string;
  address: string | null;
  town: string | null;
  zone: string | null;
  type: string | null;
  active: boolean | null;

  // optional fields (won't break if missing in DB select if you remove them from select)
  seasonal_price?: number | null;
  seasonal_notes?: string | null;
};

type SeasonalRow = {
  client_name: string;
  address: string | null;
  town: string | null;
  zone: string | null;
  type: string | null;
  seasonal_price: number | null;
  seasonal_notes: string | null;
  property_id: string;
};

export default function SeasonalExportPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const [properties, setProperties] = useState<Property[]>([]);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter((p) => {
      const blob = [
        p.client_name,
        p.address || "",
        p.town || "",
        p.zone || "",
        p.type || "",
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [properties, query]);

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

      // IMPORTANT:
      // If you do NOT have seasonal_price/seasonal_notes columns, remove them from the select below.
      const { data, error } = await sb
        .from("properties")
        .select("id,client_name,address,town,zone,type,active,seasonal_price,seasonal_notes")
        .order("client_name", { ascending: true });

      if (error) throw new Error(error.message);

      const list = ((data || []) as any as Property[]).filter((p) => p.active !== false);
      setProperties(list);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function downloadCsv() {
    try {
      setError("");
      setWorking(true);

      // Build export rows from what we already loaded
      const rows: SeasonalRow[] = filtered.map((p) => ({
        client_name: p.client_name,
        address: p.address ?? null,
        town: p.town ?? null,
        zone: p.zone ?? null,
        type: p.type ?? null,
        seasonal_price: (p.seasonal_price ?? null) as any,
        seasonal_notes: (p.seasonal_notes ?? null) as any,
        property_id: p.id,
      }));

      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;

      const stamp = new Date();
      const yyyy = stamp.getFullYear();
      const mm = String(stamp.getMonth() + 1).padStart(2, "0");
      const dd = String(stamp.getDate()).padStart(2, "0");

      a.download = `seasonal_billing_${yyyy}-${mm}-${dd}.csv`;
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
            <h1 style={ui.h1}>Seasonal Billing Export</h1>
            <p style={ui.sub}>
              Export a clean seasonal customer list for billing (CSV).
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/admin" style={ui.linkTop}>
              ← Back to Admin
            </Link>
            <button onClick={downloadCsv} style={ui.btnPrimary} disabled={loading || working}>
              {working ? "Building CSV…" : "Download CSV"}
            </button>
          </div>
        </header>

        {error ? <div style={ui.alert}>{error}</div> : null}

        <section style={ui.card}>
          <div style={ui.cardHeader}>
            <h2 style={ui.h2}>Accounts</h2>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {loading ? "Loading…" : `${filtered.length} shown / ${properties.length} total`}
            </div>
          </div>

          <div style={ui.row}>
            <input
              style={ui.input}
              placeholder="Search client, address, town, zone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading || working}
            />
            <button onClick={boot} style={ui.btnGhost} disabled={loading || working}>
              Refresh
            </button>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {filtered.slice(0, 40).map((p) => (
              <div key={p.id} style={ui.rowCard}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{p.client_name}</div>
                    <div style={{ fontSize: 12, opacity: 0.82 }}>{p.address || ""}</div>
                    <div style={{ fontSize: 12, opacity: 0.82 }}>
                      {p.town ? `Town: ${p.town}` : ""} {p.zone ? ` • Zone: ${p.zone}` : ""}{" "}
                      {p.type ? ` • Type: ${p.type}` : ""}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={ui.pill}>
                      Seasonal:{" "}
                      {typeof p.seasonal_price === "number"
                        ? `$${p.seasonal_price.toFixed(2)}`
                        : "—"}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                      id: {p.id}
                    </div>
                  </div>
                </div>

                {p.seasonal_notes ? (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                    Notes: {p.seasonal_notes}
                  </div>
                ) : null}
              </div>
            ))}

            {!loading && filtered.length > 40 ? (
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Showing first 40 results — download CSV for full list.
              </div>
            ) : null}

            {!loading && !filtered.length ? (
              <div style={{ fontSize: 13, opacity: 0.75 }}>
                No accounts match your search.
              </div>
            ) : null}
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
  rowCard: {
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
  } as React.CSSProperties,
  pill: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(148,163,184,0.18)",
  } as React.CSSProperties,
};