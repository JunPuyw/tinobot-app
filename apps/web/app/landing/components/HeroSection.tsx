"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { translate, onLocaleChange } from "@/i18n/runtime";

export default function HeroSection() {
  const [, forceUpdate] = useState(0);
  useEffect(() => { return onLocaleChange(() => forceUpdate(n => n + 1)); }, []);

  return (
    <section className="relative pt-32 pb-20 px-6 min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#f97815]/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl w-full text-center flex flex-col items-center gap-10">
        {/* Version badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#f97815]/30 bg-[#f97815]/10 px-4 py-1.5 text-xs font-bold text-[#f97815] animate-in fade-in slide-in-from-top-4 duration-1000">
          <span className="flex h-2 w-2 rounded-full bg-[#f97815] animate-pulse"></span>
          {translate("V1.0 IS NOW LIVE")}
        </div>

        {/* Main heading */}
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          <h1 className="text-6xl md:text-8xl font-bold leading-[0.95] tracking-tighter">
            {translate("One Endpoint for")} <br />
            <span className="bg-linear-to-r from-amber-100 via-[#f97815] to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(249,120,21,0.3)]">
              {translate("All AI Models")}
            </span>
          </h1>
        </div>

        {/* Description */}
        <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto font-medium leading-relaxed opacity-90 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
          {translate("AI endpoint proxy with a beautiful web dashboard. A high-performance JavaScript port of CLIProxyAPI.")}{" "}
          {translate("Built for Claude Code, OpenAI Codex, Cline, and RooCode.")}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-5 w-full mt-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-600">
          <Link
            href="/login"
            className="h-14 px-10 rounded-xl bg-[#f97815] hover:bg-[#e0650a] text-[#181411] text-lg font-bold transition-all shadow-[0_0_30px_rgba(249,120,21,0.5)] flex items-center gap-3 group active:scale-95"
          >
            <span className="material-symbols-outlined fill-1 group-hover:rotate-12 transition-transform">rocket_launch</span>
            {translate("Get Started Free")}
          </Link>
         
        </div>
      </div>
    </section>
  );
}
