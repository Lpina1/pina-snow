"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Job = {
  id: string;
  status: string;
  priority: number | null;
  storm_event_id: string;
  properties?: { client_name: string; address: string | null; town: string | null; zone: string | null } | null;
  storm_events?: { name: string | null } | null;
};

export default function DriverJobs() {
  const router = useRouter();
  const supabase = getSupabase();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        router.replace("/login");
        return;
      }
      load(u.user.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(userId: string) {
    setError("");
    const { data, error } = await supabase
      .from("jobs")
      .select(
        `
        id,status,priority,storm_event_id,
        properties ( client_name,address,town,zone ),
        storm_events ( name )
      `
      )
      .eq("assigned_to", userId)
      .order("status", { ascending: true })
      .order("priority", { ascending: true });

    if (error) setError(error.message);
    setJobs((data || []) as any);
  }

  return (
    <main style={ui.page}>
      <div style={ui.shell}>
        <header style={ui.header}>
          <div>
            <h1 style={ui.h1}>Driver</h1>
            <p style={ui.sub}>Your assigned jobs</p>
          </div>
          <Link href="/" style={ui.link}>
            ← Home
          </Link>
        </header>

        {error ? <div style={ui.alert}>{error}</div> : null}

        <section style={ui.card}>
          <div style={{ display: "grid", gap: 10 }}>
            {jobs.map((j) => (
              <Link key={j.id} href={`/driver/job/${j.id}`} style={ui.job}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{j.properties?.client_name || "Property"}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      {j.properties?.address || ""} • {j.properties?.town || ""} • Zone {j.properties?.zone || ""}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                      Storm: {j.storm_events?.name || j.storm_event_id}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={ui.pill(j.status)}>{j.status}</div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>priority: {j.priority ?? ""}</div>
                  </div>
                </div>
              </Link>
            ))}

            {!jobs.length ? (
              <div style={{ fontSize: 13, opacity: 0.75 }}>
                No jobs assigned yet. Ask admin to assign you.
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
  } as React.CSSProperties,
  job: {
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    textDecoration: "none",
    color: "#e9eefc",
  } as React.CSSProperties,
  pill: (status: string) =>
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
  alert: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(239,68,68,0.25)",
    background: "rgba(239,68,68,0.12)",
    fontSize: 13,
  } as React.CSSProperties,
};