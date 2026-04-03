const statCards = [
  {
    tone: "bg-white/80",
    title: "Client Vault",
    copy: "Secure access, refresh sessions, and a carefully designed journal of every client request."
  },
  {
    tone: "bg-powder",
    title: "Calm Interface",
    copy: "Architectural spacing, editorial contrast, and a premium palette built for clarity."
  },
  {
    tone: "bg-royal text-white",
    title: "Structured Trust",
    copy: "Every screen is designed to feel measured, reliable, and quietly luxurious."
  }
];

export default function Hero() {
  return (
    <section className="shell pb-20 pt-12 sm:pb-24 lg:pb-32 lg:pt-16">
      <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <div className="max-w-3xl">
          <p className="eyebrow mb-5">Premium Minimal Client Portal</p>
          <h1 className="font-display text-5xl leading-[0.94] text-royal sm:text-6xl lg:text-[6.4rem]">
            Secure architecture for modern client conversations.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-ink/72">
            A calm digital experience built around trust, elegant motion, and refined structure. The
            interface feels more like a design publication than a template, while the backend protects
            every session, token, and saved request.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="#cta"
              className="rounded-full bg-royal px-7 py-4 text-center text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-soft transition hover:-translate-y-1 hover:bg-[#1a307a]"
            >
              Launch Preview
            </a>
            <a
              href="#showcase"
              className="rounded-full border border-royal/15 bg-white/70 px-7 py-4 text-center text-sm font-semibold uppercase tracking-[0.18em] text-royal transition hover:-translate-y-1 hover:border-royal/30 hover:bg-white"
            >
              Explore Composition
            </a>
          </div>

          <div className="mt-12 grid max-w-2xl gap-4 sm:grid-cols-3">
            {[
              ["JWT + Cookies", "Dual-token auth with elegant session handling."],
              ["PostgreSQL + Prisma", "Reliable data models, migrations, and ownership boundaries."],
              ["React Editorial UI", "A curated visual language with soft luxury restraint."]
            ].map(([title, copy]) => (
              <div key={title} className="rounded-3xl border border-white/60 bg-white/55 p-5 shadow-float backdrop-blur">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-royal/50">{title}</p>
                <p className="mt-3 text-sm leading-6 text-ink/70">{copy}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 top-8 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-powder/80 blur-3xl" />
          <div className="rounded-[2rem] border border-white/65 bg-white/45 p-5 shadow-soft backdrop-blur-xl sm:p-7">
            <div className="grid min-h-[540px] gap-5 rounded-[1.75rem] bg-[linear-gradient(145deg,rgba(241,228,209,0.72),rgba(255,255,255,0.92))] p-5 sm:p-6">
              <div className="rounded-[1.5rem] border border-white/70 bg-[linear-gradient(160deg,rgba(22,38,96,0.94),rgba(34,55,126,0.86))] p-6 text-white shadow-soft">
                <p className="text-xs uppercase tracking-[0.28em] text-white/60">Architectural View</p>
                <h2 className="mt-4 max-w-[12ch] font-display text-4xl leading-none">
                  Precision, silence, and visible trust.
                </h2>
                <div className="mt-10 flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-semibold">98%</p>
                    <p className="mt-1 text-sm text-white/70">client retention touchpoint</p>
                  </div>
                  <div className="h-24 w-24 rounded-[1.5rem] border border-white/15 bg-white/8" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-[1.5rem] bg-powder p-5 shadow-float">
                  <p className="text-xs uppercase tracking-[0.28em] text-royal/50">Spatial Notes</p>
                  <p className="mt-5 text-2xl font-semibold leading-tight text-royal">
                    Soft hierarchy and calm surfaces shape every block.
                  </p>
                </div>

                <div className="grid gap-4">
                  {statCards.map((card) => (
                    <article key={card.title} className={`${card.tone} rounded-[1.5rem] p-5 shadow-float`}>
                      <p className="text-xs uppercase tracking-[0.24em] opacity-60">{card.title}</p>
                      <p className="mt-4 text-sm leading-6 opacity-85">{card.copy}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
