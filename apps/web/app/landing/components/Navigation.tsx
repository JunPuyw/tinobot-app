"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
const LanguageSwitcher = ({ className }: any) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-400 ${className || ""}`}>
    <span className="material-symbols-outlined text-[16px]">language</span>
    EN / VI
  </div>
);
import { translate, onLocaleChange } from "@/i18n/runtime";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return onLocaleChange(() => forceUpdate(n => n + 1));
  }, []);

  return (
    <div className="fixed left-0 right-0 top-4 z-50 flex justify-center px-4 sm:top-6">
      <nav className="flex h-16 w-full max-w-7xl items-center justify-between rounded-2xl border border-white/10 bg-[#181411]/80 px-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-300 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 transition-transform hover:scale-105"
        >
          <div className="size-9 rounded-lg bg-linear-to-br from-[#f97815] to-orange-700 flex items-center justify-center text-white shadow-lg overflow-hidden border border-white/10">
            <Image
              src="/icons/logo.jpg"
              alt="Logo"
              width={36}
              height={36}
              className="w-full h-full object-cover"
            />
          </div>
        </Link>
        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-8">
          <Link className="text-gray-400 hover:text-white text-sm font-semibold transition-colors" href="/">{translate("Home")}</Link>
          <Link className="text-gray-400 hover:text-white text-sm font-semibold transition-colors" href="/pricing">{translate("Pricing")}</Link>
          <Link className="text-gray-400 hover:text-white text-sm font-semibold transition-colors" href="/docs">{translate("Docs")}</Link>
          <Link className="text-gray-400 hover:text-white text-sm font-semibold transition-colors" href="/contact">{translate("Contact")}</Link>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher className="hidden sm:block" />

          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 hover:bg-white/5 rounded-xl transition-all text-gray-300 hover:text-white text-sm font-bold"
            >
              {translate("Login")}
            </Link>
            <Link
              href="/login"
              className="px-5 py-2 bg-white hover:bg-gray-100 transition-all text-[#181411] rounded-xl text-sm font-bold shadow-lg"
            >
              {translate("Sign up")}
            </Link>
          </div>
          <button
            className="md:hidden text-white flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/5 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="material-symbols-outlined">{mobileMenuOpen ? "close" : "menu"}</span>
          </button>
        </div>
      </nav>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-4 top-24 md:hidden border border-white/10 bg-[#181411]/95 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex flex-col gap-6 p-8">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <span className="text-white font-bold">{translate("Menu")}</span>
              <LanguageSwitcher />
            </div>
            <div className="flex flex-col gap-4">
              <Link className="text-gray-300 hover:text-white text-lg font-bold transition-colors py-2 border-b border-white/5" href="/" onClick={() => setMobileMenuOpen(false)}>{translate("Home")}</Link>
              <Link className="text-gray-300 hover:text-white text-lg font-bold transition-colors py-2 border-b border-white/5" href="/pricing" onClick={() => setMobileMenuOpen(false)}>{translate("Pricing")}</Link>
              <Link className="text-gray-300 hover:text-white text-lg font-bold transition-colors py-2" href="/docs" onClick={() => setMobileMenuOpen(false)}>{translate("Docs")}</Link>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/login"
                  className="flex h-12 items-center justify-center rounded-2xl border border-white/10 text-white text-sm font-bold hover:bg-white/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {translate("Login")}
                </Link>
                <Link
                  href="/login"
                  className="flex h-12 items-center justify-center rounded-2xl bg-white text-[#181411] text-sm font-bold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {translate("Sign up")}
                </Link>
              </div>

              <Link
                href="/login"
                className="flex h-14 items-center justify-center rounded-2xl bg-[#f97815] text-[#181411] text-base font-bold shadow-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                {translate("Get Started")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
