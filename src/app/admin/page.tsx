"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { getMyProfile, type Profile } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Storm = { id: string; name: string | null; created_at: string };
type Property = {
  id: string;
  client_name: string;
  address: string | null;
  town: string | null;
  zone: string | null;
  type: string | null;
  active: boolean | null;
};
type Job = {
  id: string;
  status: string;
  priority: number | null;
  assigned_to: string | null;
  storm_event_id: string;
  property_id: string;
  properties?: { client_name: string; address: string | null; zone: string | null; town: string | null } | null;
};

export default function AdminHome() {
  const router = useRouter();

  const [me, setMe] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [storms, setStorms] = useState<Storm[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [newStormName, setNewStormName] = useState("");
  const [selectedStormId, setSelectedStormId] = useState<string>("");

  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [priority, setPriority] = useState("10");

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
      if (!sb) return; // if you ever make getSupabase nullable, this prevents crashes

      // auth guard
      const { data: u } = await sb.auth.getUser();
      if (!u.user) {
        router.replace("/login");
        return;
      }

      const profile = await getMyProfile();
      setMe(profile);

      const [{ data: s, error: sErr }, { data: d, error: dErr }, { data: p, error: pErr }] =
        await Promise.all([
          sb.from("storm_events").select("id,name,created_at").order("created_at", { ascending: false }),
          sb.from("profiles").select("id,name,role").order("name", { ascending: true }),
          sb.from("properties")
            .select("id,client_name,address,town,zone,type,active")
            .order("client_name", { ascending: true }),
        ]);

      if (sErr) throw new Error(sErr.message);
      if (dErr) throw new Error(dErr.message);
      if (pErr) throw new Error(pErr.message);

      const stormsList = (s || []) as any as Storm[];
      const driversList = ((d || []) as any as Profile[]).filter((x) => x.role === "driver");
      const propsList = ((p || []) as any as Property[]).filter((x) => x.active !== false);

      setStorms(stormsList);
      setDrivers(driversList);
      setProperties(propsList);

      if (stormsList.length) {
        setSelectedStormId(stormsList[0].id);
        await loadJobs(stormsList[0].id);
      } else {
        setJobs([]);
      }
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadJobs(stormId: string) {
    try {
      setError("");
      const sb = getSupabase();
      if (!sb) return;

      const { data, error } = await sb
        .from("jobs")
        .select(
          `
          id,status,priority,assigned_to,storm_event_id,property_id,
          properties ( client_name,address,zone,town )
        `
        )
        .eq("storm_event_id", stormId)
        .order("priority", { ascending: true });

      if (error) throw new Error(error.message);
      setJobs((data || []) as any);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  async function createStorm() {
    try {
      setError("");
      if (!newStormName.trim()) return setError("Enter a storm name.");

      const sb = getSupabase();
      if (!sb) return;

      const { data, error } = await sb
        .from("storm_events")
        .insert({ name: newStormName.trim() })
        .select("id,name,created_at")
        .single();

      if (error) throw new Error(error.message);

      const next = [data as any, ...storms];
      setStorms(next);
      setSelectedStormId((data as any).id);
      setNewStormName("");
      await loadJobs((data as any).id);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  async function createJob() {
    try {
      setError("");
      if (!selectedStormId) return setError("Pick a storm.");
      if (!selectedPropertyId) return setError("Pick a property.");
      if (!selectedDriverId) return setError("Pick a driver.");

      const pri = Number(priority || "10");
      if (Number.isNaN(pri)) return setError("Priority must be a number.");

      const sb = getSupabase();
      if (!sb) return;

      const { error } = await sb.from("jobs").insert({
        storm_event_id: selectedStormId,
        property_id: selectedPropertyId,
        assigned_to: selectedDriverId,
        status: "queued",
        priority: pri,
      });

      if (error) throw new Error(error.message);

      setSelectedPropertyId("");
      setSelectedDriverId("");
      setPriority("10");
      await loadJobs(selectedStormId);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  async function setJobStatus(jobId: string, status: string) {
    try {
      setError("");
      const sb = getSupabase();
      if (!sb) return;

      const { error } = await sb.from("jobs").update({ status }).eq("id", jobId);
      if (error) throw new Error(error.message);

      await loadJobs(selectedStormId);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  function countByStatus(status: string) {
    return jobs.filter((j) => j.status === status).length;
  }

  async function signOut() {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
    router.replace("/login");
  }

  return (
    <main style={ui.page}>
      <div style={ui.shell}>
        <header style={ui.header}>
          <div>
            <h1 style={ui.h1}>Admin Dashboard</h1>
            <p style={ui.sub}>Storm creation, dispatch assignments, and billing exports.</p>
          </div>

          <div style={{ textAlign: "right" }}>
            {me ? (
              <>
                <div style={{ fontWeight: 900 }}>{me.name || me.id}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>role: {me.role || "unknown"}</div>
              </>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.75 }}>loading profile…</div>
            )}
            <button onClick={signOut} style={ui.btnGhostSmall}>
              Sign out
            </button>
          </div>
        </header>

        {error ? <div style={ui.alert}>{error}</div> : null}

        <section style={ui.card}>
          <div style={ui.cardHeader}>
            <h2 style={ui.h2}>Storms</h2>
            <div style={ui.actions}>
              <Link href="/admin/export" style={ui.link}>
                Storm CSV Export
              </Link>
              <Link href="/admin/seasonal" style={ui.link}>
                Seasonal Billing Export
              </Link>
            </div>
          </div>

          <div style={ui.row}>
            <input
              style={ui.input}
              placeholder="New storm name (ex: Feb 3 Blizzard)"
              value={newStormName}
              onChange={(e) => setNewStormName(e.target.value)}
              disabled={loading}
            />
            <button onClick={createStorm} style={ui.btnPrimary} disabled={loading}>
              Create Storm
            </button>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label style={ui.labelInline}>
              Active storm:
              <select
                style={ui.select}
                value={selectedStormId}
                onChange={async (e) => {
                  const id = e.target.value;
                  setSelectedStormId(id);
                  if (id) await loadJobs(id);
                }}
                disabled={loading}
              >
                <option value="">-- Select storm --</option>
                {storms.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.id}
                  </option>
                ))}
              </select>
            </label>

            {selectedStorm ? (
              <div style={ui.kpis}>
                <span style={ui.kpi}>Queued: {countByStatus("queued")}</span>
                <span style={ui.kpi}>In progress: {countByStatus("in_progress")}</span>
                <span style={ui.kpi}>Done: {countByStatus("done")}</span>
              </div>
            ) : null}
          </div>
        </section>

        <section style={ui.card}>
          <h2 style={ui.h2}>Create / Assign Job</h2>

          <div style={ui.grid2}>
            <label style={ui.label}>
              Property
              <select
                style={ui.select}
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Select property --</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.client_name} ({p.zone}) - {p.town || ""}
                  </option>
                ))}
              </select>
            </label>

            <label style={ui.label}>
              Driver
              <select
                style={ui.select}
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Select driver --</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name || d.id}
                  </option>
                ))}
              </select>
            </label>

            <label style={ui.label}>
              Priority (lower = earlier)
              <input style={ui.input} value={priority} onChange={(e) => setPriority(e.target.value)} disabled={loading} />
            </label>

            <div style={{ display: "grid", alignContent: "end" }}>
              <button onClick={createJob} style={ui.btnPrimary} disabled={loading}>
                Create Job
              </button>
            </div>
          </div>
        </section>

        <section style={ui.card}>
          <div style={ui.cardHeader}>
            <h2 style={ui.h2}>Jobs for this storm</h2>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {selectedStorm ? selectedStorm.name || selectedStorm.id : "No storm selected"}
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {jobs.map((j) => (
              <div key={j.id} style={ui.jobCard}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{j.properties?.client_name || j.property_id}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{j.properties?.address || ""}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      Zone: {j.properties?.zone} • Town: {j.properties?.town}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={ui.statusPill(j.status)}>{j.status}</div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>priority: {j.priority ?? ""}</div>
                  </div>
                </div>

                <div style={ui.btnRow}>
                  <button onClick={() => setJobStatus(j.id, "queued")} style={ui.btnGhost} disabled={loading}>
                    Queued
                  </button>
                  <button onClick={() => setJobStatus(j.id, "in_progress")} style={ui.btnGhost} disabled={loading}>
                    In Progress
                  </button>
                  <button onClick={() => setJobStatus(j.id, "done")} style={ui.btnGhost} disabled={loading}>
                    Done
                  </button>
                </div>
              </div>
            ))}

            {loading ? <div style={{ fontSize: 13, opacity: 0.75 }}>Loading…</div> : null}
            {!loading && !jobs.length ? <div style={{ fontSize: 13, opacity: 0.75 }}>No jobs yet. Create one above.</div> : null}
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
  card: {
    padding: 16,
    borderRadius: 16,
    background: "#0e1422",
    border: "1px solid rgba(255,255,255,0.08)",
  } as React.CSSProperties,
  cardHeader: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" } as React.CSSProperties,
  h2: { margin: 0, fontSize: 15 } as React.CSSProperties,
  actions: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" } as React.CSSProperties,
  link: { color: "#93c5fd", textDecoration: "none", fontWeight: 800, fontSize: 13 } as React.CSSProperties,
  alert: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(239,68,68,0.25)",
    background: "rgba(239,68,68,0.12)",
    fontSize: 13,
  } as React.CSSProperties,
  row: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 } as React.CSSProperties,
  grid2: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: 12 } as React.CSSProperties,
  label: { display: "grid", gap: 6, fontSize: 12, opacity: 0.9 } as React.CSSProperties,
  labelInline: { display: "flex", gap: 10, alignItems: "center", fontSize: 12, opacity: 0.9 } as React.CSSProperties,
  input: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#e9eefc",
    outline: "none",
    minWidth: 260,
  } as React.CSSProperties,
  select: {
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
  btnGhost: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "transparent",
    color: "#e9eefc",
    fontWeight: 900,
    cursor: "pointer",
  } as React.CSSProperties,
  btnGhostSmall: {
    marginTop: 8,
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "transparent",
    color: "#e9eefc",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 12,
  } as React.CSSProperties,
  kpis: { display: "flex", gap: 8, flexWrap: "wrap" } as React.CSSProperties,
  kpi: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    fontSize: 12,
    fontWeight: 800,
  } as React.CSSProperties,
  jobCard: {
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
  } as React.CSSProperties,
  btnRow: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 } as React.CSSProperties,
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