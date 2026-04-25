import { Routes, Route, useNavigate } from 'react-router-dom'
import HeroSection from './components/HeroSection'
import StatsSection from './components/StatsSection'
import ProcessSection from './components/ProcessSection'
import NGOSection from './components/NGOSection'
import FAQSection from './components/FAQSection'
import Footer from './components/Footer'
import AppPage from './components/AppPage'

function Landing() {
  const navigate = useNavigate()
  const enterApp = () => {
    navigate('/app')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return (
    <main>
      <HeroSection onEnterApp={enterApp} />
      <StatsSection />
      <ProcessSection />
      <NGOSection />
      <FAQSection />
      <Footer />
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppPage />} />
    </Routes>
  )
}
