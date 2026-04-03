const panels = [
  {
    title: "Authentication Layer",
    copy: "Minimal credentials, refresh token rotation, and trust built into the session lifecycle.",
    className: "bg-white/75 lg:col-span-2"
  },
  {
    title: "History Archive",
    copy: "Each saved request lives in a protected, owner-only stream with clear pagination.",
    className: "bg-powder"
  },
  {
    title: "Token Intelligence",
    copy: "Hashing, expiration logic, cookie isolation, and middleware boundaries.",
    className: "bg-bone border border-royal/10"
  },
  {
    title: "Editorial Surface",
    copy: "Soft blocks, wide margins, and layered cards show how the palette behaves across the UI.",
    className: "bg-royal text-white lg:col-span-2"
  }
];

export default function Showcase() {
  return (
    <section id="showcase" className="shell py-20 sm:py-24 lg:py-28">
      <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow mb-4">Showcase</p>
          <h2 className="section-title max-w-[10ch]">A gallery of quiet contrasts.</h2>
        </div>
        <p className="section-copy">
          The interface language scales across blocks of different weights without losing cohesion. The
          composition depends on air, tone, and radius rather than visual noise.
        </p>
      </div>

      <div className="grid auto-rows-[220px] gap-5 lg:grid-cols-3">
        {panels.map((panel) => (
          <article
            key={panel.title}
            className={`${panel.className} relative overflow-hidden rounded-[2rem] p-7 shadow-float transition duration-300 hover:-translate-y-1`}
          >
            <div className="absolute right-5 top-5 h-20 w-20 rounded-full border border-current/10 bg-white/10" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.26em] opacity-55">Curated Block</p>
                <h3 className="mt-5 max-w-[14ch] text-2xl font-semibold leading-tight">{panel.title}</h3>
              </div>
              <p className="max-w-[32ch] text-sm leading-7 opacity-80">{panel.copy}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
