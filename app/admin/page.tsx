import Link from "next/link";

export default function AdminPage() {
  return (
    <section className="card">
      <h2>Admin</h2>
      <p className="muted">Sync and readiness tools for pool admins.</p>
      <Link className="button" href="/admin/system-check">
        Open System Check
      </Link>
    </section>
  );
}
