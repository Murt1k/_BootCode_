import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import About from "./components/About";
import Showcase from "./components/Showcase";
import CTA from "./components/CTA";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(circle_at_18%_18%,rgba(208,230,253,0.92),transparent_32%),radial-gradient(circle_at_82%_10%,rgba(22,38,96,0.12),transparent_24%)]" />
      <Navbar />
      <Hero />
      <Features />
      <About />
      <Showcase />
      <CTA />
      <Footer />
    </div>
  );
}
