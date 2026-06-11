"use client";
import { translate } from "@/i18n/runtime";
import { onLocaleChange } from "@/i18n/runtime";
import { useEffect, useState } from "react";

const featureDefs = [
  { icon: "link", key: "Unified Endpoint", descKey: "Access all providers via a single standard API URL." },
  { icon: "bolt", key: "Easy Setup", descKey: "Get up and running in minutes with npx command." },
  { icon: "shield_with_heart", key: "Model Fallback", descKey: "Automatically switch providers on failure or high latency." },
  { icon: "monitoring", key: "Usage Tracking", descKey: "Detailed analytics and cost monitoring across all models." },
  { icon: "key", key: "OAuth & API Keys", descKey: "Securely manage credentials in one vault." },
  { icon: "cloud_sync", key: "Cloud Sync", descKey: "Sync your configurations across devices instantly." },
  { icon: "terminal", key: "CLI Support", descKey: "Works with Claude Code, Codex, Cline, Cursor, and more." },
  { icon: "dashboard", key: "Dashboard", descKey: "Visual dashboard for real-time traffic analysis." },
];

export default function Features() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return onLocaleChange(() => forceUpdate(n => n + 1));
  }, []);

  return (
    <section className="py-24 px-6" id="features">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{translate("Powerful Features")}</h2>
          <p className="text-gray-400 max-w-xl text-lg">
            {translate("Everything you need to manage your AI infrastructure in one place, built for scale.")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featureDefs.map((f) => (
            <div
              key={f.key}
              className="group rounded-2xl border border-[#4a3324]/70 bg-[#211711]/70 p-8 shadow-[0_20px_60px_rgba(10,7,4,0.22)] backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:border-[#f97815]/45 hover:bg-[#261a12]"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-[#f97815]/20 bg-[#f97815]/10 text-[#f97815] transition-transform duration-500 group-hover:scale-110">
                <span className="material-symbols-outlined text-[28px]">{f.icon}</span>
              </div>
              <h3 className="mb-3 text-xl font-bold tracking-tight text-white transition-colors group-hover:text-[#f97815]">
                {translate(f.key)}
              </h3>
              <p className="text-base text-gray-400 leading-relaxed font-medium">{translate(f.descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
