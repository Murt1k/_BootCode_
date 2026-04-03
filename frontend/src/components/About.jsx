export default function About() {
  return (
    <section id="about" className="shell py-20 sm:py-24 lg:py-28">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="rounded-[2rem] bg-white/70 p-6 shadow-soft backdrop-blur md:p-8">
          <p className="eyebrow mb-4">Story</p>
          <h2 className="section-title max-w-[9ch]">An interface shaped like confidence.</h2>
        </div>

        <div className="grid gap-6">
          <div className="grid gap-6 rounded-[2rem] bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(208,230,253,0.56))] p-7 shadow-float sm:grid-cols-2">
            <p className="text-base leading-8 text-ink/75">
              The visual direction borrows from architecture journals, hospitality branding, and modern
              design-tech products. Instead of loud gradients or generic startup tropes, the page uses
              compositional balance, large curves, and measured contrast.
            </p>
            <p className="text-base leading-8 text-ink/75">
              Royal Blue brings authority. Powder Blue softens the system with air and clarity. Bone adds
              warmth so the experience feels elegant rather than clinical.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] bg-royal p-7 text-white shadow-soft">
              <p className="text-xs uppercase tracking-[0.28em] text-white/55">Platform Shape</p>
              <p className="mt-5 text-3xl font-semibold leading-tight">
                A secure client platform can still feel emotionally light.
              </p>
            </div>
            <div className="rounded-[2rem] border border-white/70 bg-white/70 p-7 shadow-float">
              <p className="text-xs uppercase tracking-[0.28em] text-royal/50">Built For</p>
              <ul className="mt-5 space-y-4 text-sm leading-7 text-ink/75">
                <li>Private client dashboards</li>
                <li>Luxury service platforms</li>
                <li>Trusted AI conversation archives</li>
                <li>High-end fintech presentation layers</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
