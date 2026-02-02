"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [status, setStatus] = useState<"checking" | "logged_in" | "logged_out">("checking");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    async function check() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          setStatus("logged_out");
          setUserId("");
          return;
        }
        setStatus("logged_in");
        setUserId(data.user.id);
      } catch {
        setStatus("logged_out");
        setUserId("");
      }
    }

    check();
  }, []);

  return (
    <main style={{ padding: 24, display: "grid", gap: 14, maxWidth: 760 }}>
      <h1 style={{ margin: 0 }}>Pina Snow</h1>
      <p style={{ margin: 0 }}>
        Status:{" "}
        <strong>
          {status === "checking"
            ? "Checking session..."
            : status === "logged_in"
              ? "Logged in ✅"
              : "Not logged in ❌"}
        </strong>
        {status === "logged_in" && userId ? <span> — {userId}</span> : null}
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        <Link href="/login" style={btn()}>
          Login
        </Link>

        <Link href="/driver/jobs" style={btn()}>
          Driver: My Jobs
        </Link>

        <Link href="/admin" style={btn()}>
          Admin Dashboard
        </Link>
      </div>

      <div style={{ marginTop: 10, fontSize: 14, opacity: 0.8 }}>
        Tip: If Admin says “Auth session missing!”, go to <code>/login</code> first.
      </div>
    </main>
  );
}

function btn(): React.CSSProperties {
  return {
    display: "inline-block",
    padding: 14,
    border: "2px solid #000",
    textDecoration: "none",
    color: "#000",
    fontWeight: 700,
    borderRadius: 10,
  };
}