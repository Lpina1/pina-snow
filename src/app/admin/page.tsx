"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";
import { getMyProfile } from "@/lib/auth";

type Storm = { id: string; name: string | null; created_at: string };
type Profile = { id: string; name: string | null; role: string | null };
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
  const [me, setMe] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  const [storms, setStorms] = useState<Storm[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [newStormName, setNewStormName] = useState("");
  const [selectedStormId, setSelectedStormId] = useState<string>("");

  // quick assign form
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [priority, setPriority] = useState("10");

  const selectedStorm = useMemo(
    () => storms.find((s) => s.id === selectedStormId),
    [storms, selectedStormId]
  );

  useEffect(() => {
    boot();
  }, []);

  async function boot() {
    try {
      setError("");

      const supabase = getSupabase();
      const profile = await getMyProfile();
      setMe(profile);

      const [{ data: s, error: sErr }, { data: d, error: dErr }, { data: p, error: pErr }] = await Promise.all([
        supabase.from("storm_events").select("id,name,created_at").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id,name,role").order("name", { ascending: true }),
        supabase.from("properties").select("id,client_name,address,town,zone,type,active").order("client_name", { ascending: true }),
      ]);

      if (sErr) throw new Error(sErr.message);
      if (dErr) throw new Error(dErr.message);
      if (pErr) throw new Error(pErr.message);

      setStorms((s || []) as any);
      setDrivers(((d || []) as any).filter((x: any) => x.role === "driver"));
      setProperties(((p || []) as any).filter((x: any) => x.active !== false));

      if ((s || []).length) setSelectedStormId((s as any)[0].id);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  useEffect(() => {
    if (!selectedStormId) return;
    loadJobs(selectedStormId);
  }, [selectedStormId]);

  async function loadJobs(stormId: string) {
    setError("");
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("jobs")
      .select(
        `
        id,status,priority,assigned_to,storm_event_id,property_id,
        properties ( client_name,address,zone,town )
      `
      )
      .eq("storm_event_id", stormId)
      .order("priority", { ascending: true });

    if (error) setError(error.message);
    setJobs((data || []) as any);
  }

  async function createStorm() {
    try {
      setError("");
      if (!newStormName.trim()) return setError("Enter a storm name");

      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("storm_events")
        .insert({ name: newStormName.trim() })
        .select("id,name,created_at")
        .single();

      if (error) throw new Error(error.message);

      const next = [data as any, ...storms];
      setStorms(next);
      setSelectedStormId((data as any).id);
      setNewStormName("");
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  async function createJob() {
    try {
      setError("");
      if (!selectedStormId) return setError("Pick a storm");
      if (!selectedPropertyId) return setError("Pick a property");
      if (!selectedDriverId) return setError("Pick a driver");

      const pri = Number(priority || "10");
      if (Number.isNaN(pri)) return setError("Priority must be a number");

      const supabase = getSupabase();
      const { error } = await supabase.from("jobs").insert({
        storm_event_id: selectedStormId,
        property_id: selectedPropertyId,
        assigned_to: selectedDriverId,
        status: "queued",
        priority: pri,
      });

      if (error) throw new Error(error.message);

      setSelectedPropertyId("");
      setPriority("10");
      await loadJobs(selectedStormId);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  async function setJobStatus(jobId: string, status: string) {
    const supabase = getSupabase();
    const { error } = await supabase.from("jobs").update({ status }).eq("id", jobId);
    if (error) setError(error.message);
    else loadJobs(selectedStormId);
  }

  function countByStatus(status: string) {
    return jobs.filter((j) => j.status === status).length;
  }

  return (
    <main style={{ padding: 16, display: "grid", gap: 16, maxWidth: 900 }}>
      <h1>Admin Dashboard</h1>

      {me && (
        <div style={{ border: "2px solid #000", padding: 12 }}>
          <div>
            <strong>Logged in as:</strong> {me.name || me.id}
          </div>
          <div>
            <strong>Role:</strong> {me.role || "unknown"}
          </div>
        </div>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      <section style={{ border: "2px solid #000", padding: 12 }}>
        <h2>Storms</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            placeholder="New storm name (ex: Feb 3 Blizzard)"
            value={newStormName}
            onChange={(e) => setNewStormName(e.target.value)}
          />
          <button onClick={createStorm}>Create Storm</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>
            Active storm:{" "}
            <select value={selectedStormId} onChange={(e) => setSelectedStormId(e.target.value)}>
              <option value="">-- Select storm --</option>
              {storms.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.id}
                </option>
              ))}
            </select>
          </label>

          {selectedStorm && (
            <div style={{ marginTop: 8 }}>
              <strong>Progress:</strong> queued {countByStatus("queued")} • in_progress {countByStatus("in_progress")} • done{" "}
              {countByStatus("done")}
              {"  "}
              <Link href="/admin/export" style={{ marginLeft: 12, textDecoration: "underline" }}>
                Storm CSV Export
              </Link>
              {"  "}
              <Link href="/admin/seasonal" style={{ marginLeft: 12, textDecoration: "underline" }}>
                Seasonal Billing Export
              </Link>
            </div>
          )}
        </div>
      </section>

      <section style={{ border: "2px solid #000", padding: 12 }}>
        <h2>Create / Assign Job</h2>

        <div style={{ display: "grid", gap: 10 }}>
          <label>
            Property:
            <select value={selectedPropertyId} onChange={(e) => setSelectedPropertyId(e.target.value)}>
              <option value="">-- Select property --</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.client_name} ({p.zone}) - {p.town || ""}
                </option>
              ))}
            </select>
          </label>

          <label>
            Driver:
            <select value={selectedDriverId} onChange={(e) => setSelectedDriverId(e.target.value)}>
              <option value="">-- Select driver --</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name || d.id}
                </option>
              ))}
            </select>
          </label>

          <label>
            Priority (lower = earlier):
            <input value={priority} onChange={(e) => setPriority(e.target.value)} />
          </label>

          <button onClick={createJob}>Create Job</button>
        </div>
      </section>

      <section style={{ border: "2px solid #000", padding: 12 }}>
        <h2>Jobs for this storm</h2>

        {jobs.map((j) => (
          <div key={j.id} style={{ border: "1px solid #000", padding: 10, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div>
                <strong>{j.properties?.client_name || j.property_id}</strong>
                <div>{j.properties?.address || ""}</div>
                <div>
                  Zone: {j.properties?.zone} • Town: {j.properties?.town}
                </div>
              </div>
              <div>
                <div>
                  <strong>Status:</strong> {j.status}
                </div>
                <div>
                  <strong>Priority:</strong> {j.priority ?? ""}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setJobStatus(j.id, "queued")}>Queued</button>
              <button onClick={() => setJobStatus(j.id, "in_progress")}>In Progress</button>
              <button onClick={() => setJobStatus(j.id, "done")}>Done</button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}