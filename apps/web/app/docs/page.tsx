"use client";

import Navigation from "@/app/landing/components/Navigation";
import { onLocaleChange, translate } from "@/i18n/runtime";
import Image from "next/image";
import { useEffect, useState } from "react";

const sections = [
  { id: "intro", title: "Introduction", icon: "info" },
  { id: "quickstart", title: "Quick Start", icon: "bolt" },
  { id: "providers", title: "Provider Configuration", icon: "api" },
  { id: "keys", title: "API Key Management", icon: "key" },
  { id: "integration", title: "Tool Integration", icon: "hub" },
  { id: "budget", title: "Budget & Quota", icon: "equalizer" },
];

const quickStart = [
  {
    step: 1,
    title: "Register for access",
    desc: "Tạo tài khoản Tinobot và mở dashboard để bắt đầu cấu hình workspace.",
  },
  {
    step: 2,
    title: "Add AI providers",
    desc: "Thêm API key của OpenAI, Anthropic, OpenRouter, Gemini hoặc provider bạn đang dùng.",
  },
  {
    step: 3,
    title: "Create a Tinobot API key",
    desc: "Dùng key này với các công cụ hỗ trợ OpenAI-compatible endpoint.",
    code: `curl https://api.tinobot.com/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_TINOBOT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hello!"}]}'`,
  },
];

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState("intro");
  const [copied, setCopied] = useState("");
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return onLocaleChange(() => forceUpdate((n) => n + 1));
  }, []);

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
  };

  const jumpToSection = (id: string) => {
    setActiveTab(id);
    const el = document.getElementById(id);
    if (!el) return;

    const offset = window.innerWidth < 1024 ? 140 : 110;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-300 selection:bg-[#f97815]/30">
      <Navigation />

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 sm:pt-36">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
          <aside className="lg:w-72 lg:flex-shrink-0">
            <div className="sticky top-20 z-30 -mx-4 mb-8 overflow-x-auto border-b border-white/5 bg-[#0a0a0a]/90 px-4 py-4 backdrop-blur-xl scrollbar-hide lg:top-32 lg:mx-0 lg:mb-0 lg:block lg:overflow-visible lg:border-b-0 lg:bg-transparent lg:px-0 lg:py-0">
              <p className="mb-4 hidden px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 lg:block">
                {translate("Table of Contents")}
              </p>
              <div className="flex w-max gap-2 lg:w-auto lg:flex-col">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => jumpToSection(section.id)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-semibold transition lg:gap-3 lg:border-transparent lg:py-3 ${
                      activeTab === section.id
                        ? "border-[#f97815]/20 bg-[#f97815]/10 text-[#f97815]"
                        : "border-transparent bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200 lg:bg-transparent"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {section.icon}
                    </span>
                    {translate(section.title)}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <main className="mx-auto w-full max-w-3xl">
              <section id="intro" className="mb-20 scroll-mt-36">
                <h1 className="mb-6 text-4xl font-bold tracking-tight text-white md:text-5xl">
                  {translate("Documentation")}{" "}
                  <span className="text-gradient-gold">Tinobot</span>
                </h1>
                <p className="mb-6 text-lg leading-8 text-gray-400">
                  Tinobot là AI router giúp hợp nhất nhiều provider như OpenAI,
                  Anthropic, Gemini và OpenRouter vào một endpoint duy nhất.
                </p>
                <div className="rounded-2xl border border-[#f97815]/20 bg-[#f97815]/5 p-6 text-[#f97815]">
                  <div className="flex gap-3">
                    <span className="material-symbols-outlined">lightbulb</span>
                    <p className="text-sm font-medium leading-7">
                      <strong>Zero installation:</strong> Tinobot chạy như một
                      web dashboard. Bạn chỉ cần đăng ký, thêm provider key và
                      phát hành Tinobot API key.
                    </p>
                  </div>
                </div>
              </section>

              <section id="quickstart" className="mb-20 scroll-mt-36">
                <SectionTitle icon="bolt" color="yellow" title="Quick Start in 3 Steps" />
                <div className="space-y-8">
                  {quickStart.map((item) => (
                    <div
                      key={item.step}
                      className="grid grid-cols-[40px_1fr] gap-4 sm:grid-cols-[48px_1fr] sm:gap-6"
                    >
                      <div className="flex justify-center">
                        <div className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 font-bold text-white sm:size-12">
                          {item.step}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h4 className="mb-2 font-bold text-white">
                          {translate(item.title)}
                        </h4>
                        <p className="mb-4 text-sm leading-6 text-gray-400">
                          {item.desc}
                        </p>
                        {item.code ? (
                          <CodeBlock
                            code={item.code}
                            id={`code-${item.step}`}
                            onCopy={handleCopy}
                            copied={copied === `code-${item.step}`}
                          />
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section id="providers" className="mb-20 scroll-mt-36">
                <SectionTitle icon="api" color="blue" title="Provider Configuration" />
                <p className="mb-6 leading-7 text-gray-400">
                  Tinobot hỗ trợ nhiều nhà cung cấp AI. Bạn có thể dùng API key
                  cá nhân hoặc provider miễn phí tùy nhu cầu.
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InfoCard
                    icon="key"
                    title="Key cá nhân"
                    desc="Dùng token riêng từ OpenAI, Anthropic, OpenRouter, Zhipu hoặc provider khác."
                  />
                  <InfoCard
                    icon="auto_awesome"
                    title="Provider miễn phí"
                    desc="Cấu hình iFlow AI, Qwen, Kiro hoặc Gemini CLI khi muốn thử nghiệm chi phí thấp."
                  />
                </div>
              </section>

              <section id="keys" className="mb-20 scroll-mt-36">
                <SectionTitle icon="key" color="green" title="API Key Management" />
                <p className="mb-4 leading-7 text-gray-400">
                  API key tạo trên Tinobot có thể dùng ngay với các công cụ
                  OpenAI-compatible.
                </p>
                <ul className="list-inside list-disc space-y-2 text-sm leading-6 text-gray-400">
                  <li>Đặt tên key để phân loại ứng dụng.</li>
                  <li>Sao chép và sử dụng ngay trong CLI hoặc IDE.</li>
                  <li>Theo dõi token usage cho từng key.</li>
                  <li>Thu hồi key khi không còn sử dụng.</li>
                </ul>
              </section>

              <section id="integration" className="mb-20 scroll-mt-36">
                <SectionTitle icon="hub" color="purple" title="Tool Integration" />
                <div className="space-y-10">
                  <IntegrationBlock
                    image="/providers/claude.png"
                    title="Claude Code"
                    desc="Dùng base URL và Tinobot API key khi chạy CLI."
                    code="claude --api-base https://api.tinobot.com/v1 --api-key YOUR_TINOBOT_KEY"
                    id="claude-config"
                    copied={copied}
                    onCopy={handleCopy}
                  />
                  <IntegrationBlock
                    image="/providers/cursor.png"
                    title="Cursor"
                    desc="Vào Settings → Models → OpenAI API, dán key Tinobot và override base URL."
                    code="https://api.tinobot.com/v1"
                    id="cursor-config"
                    copied={copied}
                    onCopy={handleCopy}
                  />
                  <IntegrationBlock
                    image="/providers/cline.png"
                    title="Cline / RooCode"
                    desc='Chọn provider "OpenAI Compatible", sau đó nhập base URL, API key và model ID.'
                    code={`Base URL: https://api.tinobot.com/v1
API Key: YOUR_TINOBOT_KEY
Model ID: gpt-4o`}
                    id="cline-config"
                    copied={copied}
                    onCopy={handleCopy}
                  />
                </div>
              </section>

              <section id="budget" className="mb-20 scroll-mt-36">
                <SectionTitle icon="equalizer" color="orange" title="Budget & Quota" />
                <p className="mb-6 leading-7 text-gray-400">
                  Mỗi workspace có thể đặt budget limit. Khi chi phí ước tính
                  chạm ngưỡng này, Tinobot sẽ chặn request mới để tránh phát sinh
                  chi phí ngoài ý muốn.
                </p>
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
                  <span className="material-symbols-outlined mb-4 text-4xl text-gray-600">
                    shield_check
                  </span>
                  <p className="text-sm font-medium leading-6 text-gray-500">
                    Budget dùng để giám sát chi phí trên tài khoản AI cá nhân của
                    bạn. Tinobot không tự động thanh toán thay provider.
                  </p>
                </div>
              </section>

              <footer className="border-t border-white/5 pt-10 text-center text-xs text-gray-600">
                © 2026 Tinobot AI Infrastructure. {translate("All rights reserved.")}
              </footer>
            </main>
          </div>
        </div>
      </div>
    </main>
  );
}

type SectionTitleProps = {
  icon: string;
  color: "yellow" | "blue" | "green" | "purple" | "orange";
  title: string;
};

const titleColors: Record<SectionTitleProps["color"], string> = {
  yellow: "bg-yellow-500/20 text-yellow-500",
  blue: "bg-blue-500/20 text-blue-500",
  green: "bg-green-500/20 text-green-500",
  purple: "bg-purple-500/20 text-purple-500",
  orange: "bg-orange-500/20 text-orange-500",
};

function SectionTitle({ icon, color, title }: SectionTitleProps) {
  return (
    <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-white">
      <span
        className={`flex size-8 items-center justify-center rounded-lg ${titleColors[color]}`}
      >
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </span>
      {translate(title)}
    </h2>
  );
}

function InfoCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h4 className="mb-2 flex items-center gap-2 font-bold text-white">
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
        {title}
      </h4>
      <p className="text-xs leading-6 text-gray-400">{desc}</p>
    </div>
  );
}

type IntegrationBlockProps = {
  image: string;
  title: string;
  desc: string;
  code: string;
  id: string;
  copied: string;
  onCopy: (text: string, id: string) => void | Promise<void>;
};

function IntegrationBlock({
  image,
  title,
  desc,
  code,
  id,
  copied,
  onCopy,
}: IntegrationBlockProps) {
  return (
    <div>
      <h4 className="mb-4 flex items-center gap-2 font-bold text-white">
        <Image
          src={image}
          width={20}
          height={20}
          className="size-5 rounded object-contain"
          alt={title}
        />
        {title}
      </h4>
      <p className="mb-4 text-sm leading-6 text-gray-400">{desc}</p>
      <CodeBlock
        code={code}
        id={id}
        onCopy={onCopy}
        copied={copied === id}
      />
    </div>
  );
}

type CodeBlockProps = {
  code: string;
  id: string;
  copied: boolean;
  onCopy: (text: string, id: string) => void | Promise<void>;
};

function CodeBlock({ code, id, onCopy, copied }: CodeBlockProps) {
  return (
    <div className="group relative w-full max-w-full">
      <div className="absolute right-2 top-2 z-10 opacity-100 transition-opacity sm:right-4 sm:top-4 lg:opacity-0 lg:group-hover:opacity-100">
        <button
          onClick={() => void onCopy(code, id)}
          className="rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          aria-label="Copy code"
        >
          <span className="material-symbols-outlined text-[18px]">
            {copied ? "check" : "content_copy"}
          </span>
        </button>
      </div>

      <div className="w-full overflow-x-auto rounded-2xl">
        <pre className="min-w-max border border-white/10 bg-black p-4 pr-14 font-mono text-[11px] leading-relaxed text-orange-200 sm:p-6 sm:pr-16 sm:text-xs">
          <code className="whitespace-pre">{code}</code>
        </pre>
      </div>
    </div>
  );
}
