export default function Footer() {
  return (
    <footer className="py-8 px-4 md:px-8 border-t-[3px] border-brutal-border bg-brutal-section">
      <div className="max-w-container mx-auto">
        <p className="text-brutal-text text-lg font-medium text-center max-w-[65ch] mx-auto">
          © {new Date().getFullYear()} Legal Vision. Built to help you
          understand what you agree to.
        </p>
      </div>
    </footer>
  );
}
