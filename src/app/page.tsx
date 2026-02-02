import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 24, display: "grid", gap: 12, maxWidth: 720 }}>
      <h1>Pina Snow</h1>
      <p>Choose a page:</p>

      <div style={{ display: "grid", gap: 8 }}>
        <Link href="/login" style={{ textDecoration: "underline" }}>
          Login
        </Link>
        <Link href="/driver/jobs" style={{ textDecoration: "underline" }}>
          Driver: My Jobs
        </Link>
        <Link href="/admin" style={{ textDecoration: "underline" }}>
          Admin Dashboard
        </Link>
      </div>
    </main>
  );
}