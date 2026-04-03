const footerLinks = ["Privacy", "Terms", "Architecture", "Support"];

export default function Footer() {
  return (
    <footer id="contact" className="shell pb-10 pt-8">
      <div className="flex flex-col gap-8 rounded-[2rem] border border-white/65 bg-white/60 px-6 py-8 shadow-float backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-royal/55">Atelier Ledger</p>
          <p className="mt-3 max-w-md text-sm leading-7 text-ink/70">
            Premium client architecture for secure conversations, elegant histories, and a modern trust-first presence.
          </p>
        </div>

        <div className="flex flex-col gap-5 md:items-end">
          <div className="flex flex-wrap gap-5">
            {footerLinks.map((link) => (
              <a key={link} href="#" className="text-sm font-medium text-ink/70 hover:text-royal">
                {link}
              </a>
            ))}
          </div>
          <div className="flex gap-3 text-sm text-royal/65">
            <a href="#" className="hover:text-royal">Instagram</a>
            <a href="#" className="hover:text-royal">Behance</a>
            <a href="#" className="hover:text-royal">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
