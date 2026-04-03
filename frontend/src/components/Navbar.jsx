const links = [
  { label: "Concept", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "Showcase", href: "#showcase" },
  { label: "Contact", href: "#contact" }
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 pt-4">
      <div className="shell">
        <nav className="glass-panel flex items-center justify-between rounded-full px-5 py-3 shadow-soft sm:px-7">
          <a href="#" className="flex items-center gap-3 text-royal">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-royal text-sm font-semibold text-bone">
              AL
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-royal/55">Atelier</p>
              <p className="-mt-0.5 text-lg font-semibold">Ledger</p>
            </div>
          </a>

          <div className="hidden items-center gap-8 lg:flex">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-ink/70 hover:text-royal"
              >
                {link.label}
              </a>
            ))}
          </div>

          <a
            href="#cta"
            className="rounded-full bg-royal px-5 py-3 text-sm font-semibold text-white shadow-float transition hover:-translate-y-0.5 hover:bg-[#1b2f77]"
          >
            Book a Preview
          </a>
        </nav>
      </div>
    </header>
  );
}
