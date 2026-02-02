"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = getSupabase();

  const [service, setService] = useState<"plow" | "salt" | "walks">("plow");
  const [saltAmount, setSaltAmount] = useState("");
  const [saltUnit, setSaltUnit] = useState<"lbs" | "application">("lbs");
  const [notes, setNotes] = useState("");

  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadPhoto(file: File, serviceLogId: string, photoType: "before" | "after") {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new Error("Not logged in");

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${serviceLogId}/${photoType}.${ext}`;

    const { error: upErr } = await supabase.storage.from("snow-photos").upload(path, file, { upsert: true });
    if (upErr) throw new Error("Upload failed: " + upErr.message);

    const { data: pub } = supabase.storage.from("snow-photos").getPublicUrl(path);
    const url = pub.publicUrl;

    const { error: dbErr } = await supabase.from("photos").insert({
      service_log_id: serviceLogId,
      url,
      photo_type: photoType,
      uploaded_by: userId,
    });

    if (dbErr) throw new Error("Photo DB insert failed: " + dbErr.message);
    return url;
  }

  async function submit() {
    setBusy(true);
    setMsg("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Not logged in");

      const { data: logRow, error: logErr } = await supabase
        .from("service_logs")
        .insert({
          job_id: id,
          service_type: service,
          salt_amount: service === "salt" ? (saltAmount ? Number(saltAmount) : null) : null,
          salt_unit: service === "salt" ? saltUnit : null,
          notes: notes || null,
          created_by: userId,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (logErr) throw new Error("Service log insert failed: " + logErr.message);

      const serviceLogId = logRow.id as string;

      if (beforeFile) await uploadPhoto(beforeFile, serviceLogId, "before");
      if (afterFile) await uploadPhoto(afterFile, serviceLogId, "after");

      const { error: jobErr } = await supabase.from("jobs").update({ status: "done" }).eq("id", id);
      if (jobErr) throw new Error("Job update failed: " + jobErr.message);

      setMsg("Saved. Job marked done ✅");
      setNotes("");
      setBeforeFile(null);
      setAfterFile(null);
    } catch (e: any) {
      setMsg(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={ui.page}>
      <div style={ui.shell}>
        <header style={ui.header}>
          <div>
            <h1 style={ui.h1}>Log Service</h1>
            <p style={ui.sub}>Job ID: {id}</p>
          </div>
          <Link href="/driver/jobs" style={ui.link}>
            ← Back to Jobs
          </Link>
        </header>

        {msg ? <div style={ui.msg}>{msg}</div> : null}

        <section style={ui.card}>
          <label style={ui.label}>
            Service type
            <select style={ui.select} value={service} onChange={(e) => setService(e.target.value as any)}>
              <option value="plow">Plow</option>
              <option value="salt">Salt</option>
              <option value="walks">Walks</option>
            </select>
          </label>

          {service === "salt" ? (
            <div style={ui.grid2}>
              <label style={ui.label}>
                Salt amount
                <input
                  style={ui.input}
                  inputMode="decimal"
                  placeholder="e.g. 250"
                  value={saltAmount}
                  onChange={(e) => setSaltAmount(e.target.value)}
                />
              </label>

              <label style={ui.label}>
                Salt unit
                <select style={ui.select} value={saltUnit} onChange={(e) => setSaltUnit(e.target.value as any)}>
                  <option value="lbs">Lbs</option>
                  <option value="application">Application</option>
                </select>
              </label>
            </div>
          ) : null}

          <label style={ui.label}>
            Notes
            <textarea style={ui.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <div style={ui.grid2}>
            <label style={ui.label}>
              Before photo (optional)
              <input style={ui.file} type="file" accept="image/*" onChange={(e) => setBeforeFile(e.target.files?.[0] || null)} />
            </label>

            <label style={ui.label}>
              After photo (optional)
              <input style={ui.file} type="file" accept="image/*" onChange={(e) => setAfterFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          <button onClick={submit} disabled={busy} style={ui.btnPrimary}>
            {busy ? "Saving…" : "Complete Job"}
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
  grid2: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" } as React.CSSProperties,
  label: { display: "grid", gap: 6, fontSize: 12, opacity: 0.9 } as React.CSSProperties,
  input: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#e9eefc",
    outline: "none",
  } as React.CSSProperties,
  select: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#e9eefc",
    outline: "none",
  } as React.CSSProperties,
  textarea: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#e9eefc",
    outline: "none",
    minHeight: 110,
    resize: "vertical",
  } as React.CSSProperties,
  file: { color: "#e9eefc" } as React.CSSProperties,
  btnPrimary: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(59,130,246,0.22)",
    color: "#e9eefc",
    fontWeight: 900,
    cursor: "pointer",
  } as React.CSSProperties,
  msg: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    fontSize: 13,
  } as React.CSSProperties,
};