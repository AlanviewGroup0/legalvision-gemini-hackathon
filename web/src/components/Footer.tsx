export default function Footer() {
  return (
    <footer className="py-12 px-4 border-t border-gray-200">
      <div className="max-w-[720px] mx-auto">
        <p className="text-gray-500 text-sm text-center">
          © {new Date().getFullYear()} Legal Vision . Built to help you understand what you agree to.
        </p>
      </div>
    </footer>
  )
}
