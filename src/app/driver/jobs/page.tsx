"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";

export default function DriverJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    setError("");

    const supabase = getSupabase();
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) return setError("AUTH ERROR: " + authErr.message);

    if (!auth.user) return setError("NOT LOGGED IN");

    setUserId(auth.user.id);

    const { data, error } = await supabase
      .from("jobs")
      .select(
        `
        id,
        status,
        priority,
        assigned_to,
        properties (
          client_name,
          address,
          zone
        )
      `
      )
      .eq("assigned_to", auth.user.id)
      .order("priority", { ascending: true });

    if (error) return setError("QUERY ERROR: " + error.message);

    console.log("LOGGED IN USER:", auth.user.id);
    console.log("JOBS RETURNED:", data);

    setJobs(data || []);
  }

  return (
    <main style={{ padding: 16 }}>
      <h1>My Jobs</h1>

      <p><strong>User ID:</strong> {userId}</p>
      <p><strong>Jobs found:</strong> {jobs.length}</p>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {jobs.map((job) => (
        <Link key={job.id} href={`/driver/job/${job.id}`}>
          <div style={{ border: "2px solid #000", marginBottom: 10, padding: 12 }}>
            <strong>{job.properties?.client_name}</strong>
            <div>{job.properties?.address}</div>
            <div>
              Zone: {job.properties?.zone} • Status: {job.status}
            </div>
          </div>
        </Link>
      ))}
    </main>
  );
}