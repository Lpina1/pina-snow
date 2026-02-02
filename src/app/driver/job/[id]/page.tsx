"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function JobDetail() {
  const { id } = useParams();

  const [service, setService] = useState<"plow" | "salt" | "walks">("plow");
  const [saltAmount, setSaltAmount] = useState("");
  const [saltUnit, setSaltUnit] = useState<"lbs" | "application">("lbs");
  const [notes, setNotes] = useState("");

  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);

  async function uploadPhoto(file: File, serviceLogId: string, photoType: "before" | "after") {
    const supabase = await getSupabase();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new Error("Not logged in");

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${serviceLogId}/${photoType}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("snow-photos")
      .upload(path, file, { upsert: true });

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
    try {
      const supabase = await getSupabase();
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Not logged in");

      // Create service log
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

      // Upload photos (optional)
      if (beforeFile) await uploadPhoto(beforeFile, serviceLogId, "before");
      if (afterFile) await uploadPhoto(afterFile, serviceLogId, "after");

      // Mark job done
      const { error: jobErr } = await supabase
        .from("jobs")
        .update({ status: "done" })
        .eq("id", id);

      if (jobErr) throw new Error("Job update failed: " + jobErr.message);

      alert("Logged + saved");
    } catch (e: any) {
      alert(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 16, display: "grid", gap: 12 }}>
      <h1>Log Service</h1>

      <label>
        Service type
        <select value={service} onChange={(e) => setService(e.target.value as any)}>
          <option value="plow">Plow</option>
          <option value="salt">Salt</option>
          <option value="walks">Walks</option>
        </select>
      </label>

      {service === "salt" && (
        <div style={{ display: "grid", gap: 8 }}>
          <label>
            Salt amount
            <input
              inputMode="decimal"
              placeholder="e.g. 250"
              value={saltAmount}
              onChange={(e) => setSaltAmount(e.target.value)}
            />
          </label>

          <label>
            Salt unit
            <select value={saltUnit} onChange={(e) => setSaltUnit(e.target.value as any)}>
              <option value="lbs">Lbs</option>
              <option value="application">Application</option>
            </select>
          </label>
        </div>
      )}

      <label>
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      <label>
        Before photo (optional)
        <input type="file" accept="image/*" onChange={(e) => setBeforeFile(e.target.files?.[0] || null)} />
      </label>

      <label>
        After photo (optional)
        <input type="file" accept="image/*" onChange={(e) => setAfterFile(e.target.files?.[0] || null)} />
      </label>

      <button onClick={submit} disabled={busy} style={{ padding: 12, border: "2px solid #000" }}>
        {busy ? "Saving..." : "Complete Job"}
      </button>
    </main>
  );
}