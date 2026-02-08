export default function Navbar() {
  return (
    <nav
      className="fixed top-4 left-4 right-4 md:left-8 md:right-8 z-50"
      aria-label="Main navigation"
    >
      <div className="max-w-container mx-auto bg-brutal-section border-[3px] border-brutal-border shadow-brutal-section px-4 md:px-6 py-3 flex items-center justify-between gap-4">
        <span className="text-xl md:text-2xl font-black tracking-tight text-brutal-text">
          LegalVision
        </span>
        <span className="text-sm md:text-base font-semibold uppercase tracking-wider text-brutal-text">
          Gemini Hackathon
        </span>
      </div>
    </nav>
  )
}
