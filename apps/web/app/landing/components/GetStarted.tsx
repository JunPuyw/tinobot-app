"use client";
import { useState, useEffect } from "react";
import { translate, onLocaleChange } from "@/i18n/runtime";

export default function GetStarted() {
  const [copied, setCopied] = useState(false);
  const [, forceUpdate] = useState(0);
  useEffect(() => { return onLocaleChange(() => forceUpdate(n => n + 1)); }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-24 px-6 bg-[#120f0d]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-16 items-start">

          {/* Left: Steps */}
          <div className="flex-1">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {translate("Start Routing AI in 30 Seconds")}
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              {translate("No installation needed. Just sign up, get your API key, and start sending requests.")}
            </p>

            <div className="flex flex-col gap-6">

              <div className="flex gap-4">
                <div className="flex-none w-8 h-8 rounded-full bg-[#f97815]/20 text-[#f97815] flex items-center justify-center font-bold">1</div>
                <div>
                  <h4 className="font-bold text-lg">{translate("Create Account")}</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {translate("Sign up at tinobot.com and access your dashboard")}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-none w-8 h-8 rounded-full bg-[#f97815]/20 text-[#f97815] flex items-center justify-center font-bold">2</div>
                <div>
                  <h4 className="font-bold text-lg">{translate("Generate API Key")}</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {translate("Add your providers and create a secure API key")}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-none w-8 h-8 rounded-full bg-[#f97815]/20 text-[#f97815] flex items-center justify-center font-bold">3</div>
                <div>
                  <h4 className="font-bold text-lg">{translate("Send Requests")}</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {translate("Use Tinobot endpoint to route AI calls instantly")}
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Right: Code block */}
          <div className="flex-1 w-full">
            <div className="rounded-xl overflow-hidden bg-[#1e1e1e] border border-[#3a2f27] shadow-2xl">

              {/* Terminal header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#252526] border-b border-gray-700">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div className="ml-2 text-xs text-gray-500 font-mono">request</div>
              </div>

              {/* Code content */}
              <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto">

                <div
                  className="flex items-center gap-2 mb-4 group cursor-pointer"
                  onClick={() => handleCopy(`curl https://api.tinobot.com/v1/chat \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -d '{"model":"gpt-4","prompt":"Hello"}'`)}
                >
                  <span className="text-green-400">$</span>
                  <span className="text-white">curl https://api.tinobot.com/v1/chat</span>
                  <span className="ml-auto text-gray-500 text-xs opacity-0 group-hover:opacity-100">
                    {copied ? "✓ Copied" : "Copy"}
                  </span>
                </div>

                <div className="text-gray-400 mb-6">
                  <span className="text-[#f97815]">&gt;</span> {translate("Authenticating request...")}<br />
                  <span className="text-[#f97815]">&gt;</span> {translate("Routing to best provider...")}<br />
                  <span className="text-green-400">&gt;</span> {translate("Response received ✓")}
                </div>

                <div className="text-xs text-gray-500 mb-2 border-t border-gray-700 pt-4">
                  🔐 {translate("Your API key is securely managed via dashboard")}
                </div>

                <div className="text-gray-400 text-xs">
                  <span className="text-purple-400">Base URL:</span><br />
                  https://api.tinobot.com
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
