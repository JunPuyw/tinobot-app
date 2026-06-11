"use client";
import Link from "next/link";
import AnimatedBackground from "./components/AnimatedBackground";
import Navigation from "./components/Navigation";
import HeroSection from "./components/HeroSection";
import FlowAnimation from "./components/FlowAnimation";
import HowItWorks from "./components/HowItWorks";
import Features from "./components/Features";
import GetStarted from "./components/GetStarted";
import Footer from "./components/Footer";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#17120f] text-white antialiased selection:bg-[#f97815] selection:text-white">
      <AnimatedBackground />
      <div className="relative z-10">
        <Navigation />

        <main>
          {/* Hero with Flow Animation */}
          <div className="relative">
            <HeroSection />
            <div className="flex justify-center pb-20">
              <FlowAnimation />
            </div>
          </div>

          <GetStarted />
          <HowItWorks />
          <Features />

          {/* CTA Section */}
          <section className="relative overflow-hidden px-6 py-32 sm:py-40">
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#f97815]/35 to-transparent" />
            <div className="absolute inset-0 bg-[#1e1712]/70 pointer-events-none" />
            <div className="max-w-4xl mx-auto text-center relative z-10">
              <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight text-balance">Ready to Simplify Your <br /> AI Infrastructure?</h2>
              <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto font-medium">
                Join developers who are streamlining their AI integrations with <span className="text-[#f97815] font-bold">Tinobot</span>.
                Open source and free to start.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                <Link
                  href="/login"
                  className="flex items-center justify-center w-full sm:w-auto h-16 px-12 rounded-xl bg-[#f97815] hover:bg-[#e0650a] text-[#181411] text-xl font-bold transition-all shadow-[0_0_30px_rgba(249,120,21,0.5)] active:scale-95"
                >
                  Start Free
                </Link>
                <button
                  onClick={() => window.open("https://github.com/decolua/tinobot#readme", "_blank")}
                  className="w-full sm:w-auto h-16 px-12 rounded-xl border border-[#3a2f27] bg-[#23180f]/50 hover:bg-[#23180f] text-white text-xl font-bold transition-all backdrop-blur-sm active:scale-95"
                >
                  Documentation
                </button>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>

    </div>
  );
}

