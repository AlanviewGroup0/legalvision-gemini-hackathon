import Navbar from './components/Navbar'
import Hero from './components/Hero'
import HowToInstall from './components/HowToInstall'
import Footer from './components/Footer'

function App() {
  return (
    <div className="min-h-screen bg-brutal-body">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      {/* Spacer so hero content isn't hidden under fixed navbar */}
      <div className="h-16 md:h-20" aria-hidden />
      <Hero />
      <main id="main">
        <HowToInstall />
      </main>
      <Footer />
    </div>
  )
}

export default App
