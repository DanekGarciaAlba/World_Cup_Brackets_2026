import { getSystemStatus } from "@/lib/system/status";

export default async function AdminSystemCheckPage() {
  const status = await getSystemStatus();

  return (
    <section className="card">
      <h2>System Check</h2>
      <div className="grid">
        {status.map((item) => (
          <article className="card" key={`${item.service}-${item.check}`}>
            <span className={`status ${item.status === "PASS" ? "pass" : item.status === "FAIL" ? "fail" : "warn"}`}>
              {item.status}
            </span>
            <h3>{item.check}</h3>
            <p className="muted">{item.service}</p>
            <p>{item.notes}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
