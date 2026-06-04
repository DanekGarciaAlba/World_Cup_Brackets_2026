export function StadiumBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="arena-line absolute inset-x-0 top-0 h-[70vh] opacity-30" />
      <div className="stadium-spotlight absolute left-1/2 top-0 h-96 w-[70rem] -translate-x-1/2 opacity-70" />
      <div className="absolute left-[28%] top-0 h-px w-[42rem] bg-white/25 shadow-[0_0_80px_22px_rgba(255,255,255,.22)]" />
      <div className="absolute -left-24 top-24 h-80 w-80 rounded-full bg-electric/10 blur-3xl" />
      <div className="absolute -right-20 top-56 h-72 w-72 rounded-full bg-trophy-gold/10 blur-3xl" />
    </div>
  );
}
