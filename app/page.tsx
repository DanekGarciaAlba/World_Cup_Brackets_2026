import { getSystemStatus } from "@/lib/system/status";

export default async function DashboardPage() {
  const status = await getSystemStatus();

  return (
    <section className="grid">
      {status.slice(0, 6).map((item) => (
        <article className="card" key={`${item.service}-${item.check}`}>
          <span className={`status ${item.status === "PASS" ? "pass" : item.status === "FAIL" ? "fail" : "warn"}`}>
            {item.status}
          </span>
          <h2>{item.check}</h2>
          <p className="muted">{item.service}</p>
          <p>{item.notes}</p>
        </article>
      ))}
    </section>
  );
}
