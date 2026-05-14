"use client";
import { translate } from "@/i18n/runtime";
import { onLocaleChange } from "@/i18n/runtime";
import { useEffect, useState } from "react";

const featureDefs = [
  { icon: "link", key: "Unified Endpoint", descKey: "Access all providers via a single standard API URL.", colors: { border: "hover:border-blue-500/50", bg: "hover:bg-blue-500/5", iconBg: "bg-blue-500/10", iconText: "text-blue-500", titleHover: "group-hover:text-blue-400" } },
  { icon: "bolt", key: "Easy Setup", descKey: "Get up and running in minutes with npx command.", colors: { border: "hover:border-orange-500/50", bg: "hover:bg-orange-500/5", iconBg: "bg-orange-500/10", iconText: "text-orange-500", titleHover: "group-hover:text-orange-400" } },
  { icon: "shield_with_heart", key: "Model Fallback", descKey: "Automatically switch providers on failure or high latency.", colors: { border: "hover:border-rose-500/50", bg: "hover:bg-rose-500/5", iconBg: "bg-rose-500/10", iconText: "text-rose-500", titleHover: "group-hover:text-rose-400" } },
  { icon: "monitoring", key: "Usage Tracking", descKey: "Detailed analytics and cost monitoring across all models.", colors: { border: "hover:border-purple-500/50", bg: "hover:bg-purple-500/5", iconBg: "bg-purple-500/10", iconText: "text-purple-500", titleHover: "group-hover:text-purple-400" } },
  { icon: "key", key: "OAuth & API Keys", descKey: "Securely manage credentials in one vault.", colors: { border: "hover:border-amber-500/50", bg: "hover:bg-amber-500/5", iconBg: "bg-amber-500/10", iconText: "text-amber-500", titleHover: "group-hover:text-amber-400" } },
  { icon: "cloud_sync", key: "Cloud Sync", descKey: "Sync your configurations across devices instantly.", colors: { border: "hover:border-sky-500/50", bg: "hover:bg-sky-500/5", iconBg: "bg-sky-500/10", iconText: "text-sky-500", titleHover: "group-hover:text-sky-400" } },
  { icon: "terminal", key: "CLI Support", descKey: "Works with Claude Code, Codex, Cline, Cursor, and more.", colors: { border: "hover:border-emerald-500/50", bg: "hover:bg-emerald-500/5", iconBg: "bg-emerald-500/10", iconText: "text-emerald-500", titleHover: "group-hover:text-emerald-400" } },
  { icon: "dashboard", key: "Dashboard", descKey: "Visual dashboard for real-time traffic analysis.", colors: { border: "hover:border-fuchsia-500/50", bg: "hover:bg-fuchsia-500/5", iconBg: "bg-fuchsia-500/10", iconText: "text-fuchsia-500", titleHover: "group-hover:text-fuchsia-400" } },
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
              className={`p-8 rounded-2xl bg-[#23180f]/40 border border-white/[0.05] ${f.colors.border} ${f.colors.bg} transition-all duration-500 group hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] backdrop-blur-sm`}
            >
              <div className={`w-12 h-12 rounded-xl ${f.colors.iconBg} flex items-center justify-center mb-6 ${f.colors.iconText} group-hover:scale-110 transition-transform duration-500`}>
                <span className="material-symbols-outlined text-[28px]">{f.icon}</span>
              </div>
              <h3 className={`text-xl font-bold mb-3 ${f.colors.titleHover} transition-colors tracking-tight`}>
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
