export default function CTA() {
  return (
    <section id="cta" className="shell py-20 sm:py-24 lg:py-28">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-royal px-6 py-14 text-white shadow-soft sm:px-10 lg:px-14">
        <div className="absolute -right-16 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-powder/20 blur-3xl" />
        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="eyebrow mb-4 text-white/60">Final Call</p>
            <h2 className="font-display text-4xl leading-none sm:text-5xl lg:text-6xl">
              Build the calmest secure experience in your category.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/75 sm:text-lg">
              The project includes Docker Compose, Prisma migrations, secure auth flows, and a polished
              React front ready to launch, extend, and brand.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row lg:justify-end">
            <a
              href="#contact"
              className="rounded-full bg-bone px-7 py-4 text-center text-sm font-semibold uppercase tracking-[0.18em] text-royal transition hover:-translate-y-1 hover:bg-[#f7ecde]"
            >
              Contact Studio
            </a>
            <a
              href="#features"
              className="rounded-full border border-white/20 px-7 py-4 text-center text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:-translate-y-1 hover:bg-white/8"
            >
              Review Stack
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
