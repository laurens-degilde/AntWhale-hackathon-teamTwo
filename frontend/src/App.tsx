import heroImg from './assets/hero.png'
import { DonationForm } from './components/DonationForm'
import './App.css'

function App() {
  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
        </div>
        <div>
          <h1>Wildlife corridors, faster</h1>
          <p>
            Open data, ranked interventions, and the paperwork to ship them.
          </p>
        </div>
        <DonationForm />
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
