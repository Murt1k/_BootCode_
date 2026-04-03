const items = [
  {
    title: "Protected Identity",
    copy: "Registration, login, access token delivery, and refresh token rotation in httpOnly cookies.",
    className: "bg-royal text-white"
  },
  {
    title: "Ownership by Design",
    copy: "Every history record is fetched only by the authenticated owner of the account.",
    className: "bg-powder text-royal"
  },
  {
    title: "Structured Persistence",
    copy: "PostgreSQL and Prisma keep the data model explicit, typed, and migration-friendly.",
    className: "bg-white/80 text-ink"
  },
  {
    title: "Editorial Calm",
    copy: "A premium React front with soft gradients, sculpted whitespace, and restrained motion.",
    className: "bg-bone text-royal border border-royal/10"
  }
];

export default function Features() {
  return (
    <section id="features" className="shell py-20 sm:py-24 lg:py-28">
      <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow mb-4">Feature Set</p>
          <h2 className="section-title max-w-[12ch]">Backend rigor, frontend softness.</h2>
        </div>
        <p className="section-copy">
          The system pairs secure account infrastructure with a visual surface that feels curated rather
          than assembled. Each card uses the palette differently to create rhythm without noise.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-4">
        {items.map((item, index) => (
          <article
            key={item.title}
            className={`${item.className} rounded-[2rem] p-7 shadow-float transition duration-300 hover:-translate-y-1 ${index === 0 ? "lg:col-span-2" : ""}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.26em] opacity-60">0{index + 1}</p>
            <h3 className="mt-6 text-2xl font-semibold leading-tight">{item.title}</h3>
            <p className="mt-5 text-sm leading-7 opacity-80">{item.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
