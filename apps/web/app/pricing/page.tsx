"use client";

import Footer from "@/app/landing/components/Footer";
import Navigation from "@/app/landing/components/Navigation";
import Link from "next/link";
import { useState } from "react";

const PRICING_PLANS = [
  {
    name: "Hobby",
    price: "0",
    description: "Dành cho cá nhân và các dự án nhỏ.",
    features: [
      "1 workspace",
      "5 API keys hoạt động",
      "Theo dõi quota thời gian thực",
      "Hỗ trợ 10+ providers miễn phí",
      "Hỗ trợ cộng đồng",
    ],
    cta: "Bắt đầu miễn phí",
    popular: false,
  },
  {
    name: "Professional",
    price: "19",
    description: "Dành cho nhà phát triển chuyên nghiệp.",
    features: [
      "Không giới hạn workspace",
      "Không giới hạn API keys",
      "Phân tích usage chuyên sâu",
      "Ưu tiên routing cao hơn",
      "Hỗ trợ qua email",
      "Cloud sync",
    ],
    cta: "Nâng cấp ngay",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Giải pháp cho doanh nghiệp và đội ngũ lớn.",
    features: [
      "Tất cả tính năng Pro",
      "Dedicated infrastructure",
      "SLA 99.9%",
      "Tùy chỉnh routing",
      "Quản lý phân quyền nâng cao",
    ],
    cta: "Liên hệ",
    popular: false,
  },
];

const FAQS = [
  {
    q: "Tinobot có thu phí API của OpenAI không?",
    a: "Không. Tinobot là nền tảng quản lý và routing. Bạn vẫn thanh toán trực tiếp cho nhà cung cấp bằng API key của mình.",
  },
  {
    q: "Gói Pro khác gì gói Free?",
    a: "Pro mở khóa workspace và API key không giới hạn, kèm báo cáo chi phí chuyên sâu để tối ưu ngân sách.",
  },
  {
    q: "Tôi có thể hủy gói Pro bất cứ lúc nào không?",
    a: "Có. Bạn có thể hủy hoặc thay đổi gói ngay trong phần cài đặt portal.",
  },
  {
    q: "Làm sao để dùng Tinobot miễn phí?",
    a: "Bạn có thể dùng gói Hobby và cấu hình các provider miễn phí như iFlow, Gemini CLI hoặc Qwen.",
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white selection:bg-[#f97815]/30">
      <Navigation />

      <section className="px-6 pb-16 pt-36 text-center sm:pt-44">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Giá cả minh bạch, <br />
            <span className="text-gradient-gold">không phí ẩn.</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-base leading-7 text-gray-400 sm:text-xl">
            Chọn gói phù hợp để tối ưu hạ tầng AI. Tinobot giúp bạn quản lý
            provider, API key và chi phí trong một giao diện thống nhất.
          </p>

          <div className="mb-10 flex flex-wrap items-center justify-center gap-4">
            <span
              className={`text-sm font-semibold ${billingCycle === "monthly" ? "text-white" : "text-gray-500"}`}
            >
              Hàng tháng
            </span>
            <button
              aria-label="Toggle billing cycle"
              onClick={() =>
                setBillingCycle((value) =>
                  value === "monthly" ? "yearly" : "monthly",
                )
              }
              className="relative h-8 w-14 rounded-full border border-white/10 bg-white/5 p-1 transition-colors hover:border-white/20"
            >
              <span
                className={`absolute top-1 size-6 rounded-full bg-[#f97815] shadow-[0_0_10px_rgba(249,120,21,0.5)] transition-transform ${billingCycle === "yearly" ? "translate-x-6" : "translate-x-0"}`}
              />
            </button>
            <span
              className={`text-sm font-semibold ${billingCycle === "yearly" ? "text-white" : "text-gray-500"}`}
            >
              Hàng năm{" "}
              <span className="ml-1 text-[10px] uppercase tracking-wider text-[#f97815]">
                Giảm 20%
              </span>
            </span>
          </div>
        </div>
      </section>

      <section className="px-6 pb-28">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-3">
          {PRICING_PLANS.map((plan) => {
            const price =
              billingCycle === "yearly" &&
              plan.price !== "0" &&
              plan.price !== "Custom"
                ? String(Math.floor(Number(plan.price) * 0.8))
                : plan.price;

            return (
              <article
                key={plan.name}
                className={`relative flex min-h-[520px] flex-col rounded-3xl border bg-[#1a1a1a]/50 p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${
                  plan.popular
                    ? "border-[#f97815]/40 shadow-[0_20px_40px_rgba(249,120,21,0.12)]"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                {plan.popular ? (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#f97815] px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-[#0a0a0a] shadow-lg">
                    Phổ biến nhất
                  </div>
                ) : null}

                <div className="mb-8">
                  <h3 className="mb-2 text-xl font-bold">{plan.name}</h3>
                  <p className="min-h-12 text-sm leading-6 text-gray-500">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-8 flex items-baseline gap-1">
                  {price !== "Custom" ? (
                    <span className="text-4xl font-bold">$</span>
                  ) : null}
                  <span className="text-5xl font-bold tracking-tight sm:text-6xl">
                    {price}
                  </span>
                  {price !== "0" && price !== "Custom" ? (
                    <span className="font-medium text-gray-500">/tháng</span>
                  ) : null}
                </div>

                <div className="mb-10 flex-1 space-y-4">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <span className="material-symbols-outlined mt-0.5 text-[18px] text-[#f97815]">
                        check_circle
                      </span>
                      <span className="text-sm leading-6 text-gray-300">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <Link
                  href={plan.name === "Enterprise" ? "/contact" : "/login"}
                  className={`flex h-14 w-full items-center justify-center rounded-2xl font-bold transition-all active:scale-95 ${
                    plan.popular
                      ? "bg-[#f97815] text-[#0a0a0a] shadow-[0_10px_20px_rgba(249,120,21,0.2)] hover:bg-[#ff8c33]"
                      : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  {plan.cta}
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-t border-white/5 px-6 py-28">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-14 text-center text-3xl font-bold tracking-tight sm:text-5xl">
            Câu hỏi thường gặp
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {FAQS.map((faq) => (
              <article
                key={faq.q}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/20"
              >
                <h4 className="mb-4 flex items-start gap-3 text-lg font-bold text-white">
                  <span className="mt-2 size-2 rounded-full bg-[#f97815]" />
                  {faq.q}
                </h4>
                <p className="text-sm font-medium leading-6 text-gray-500">
                  {faq.a}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-28">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 overflow-hidden rounded-3xl border border-[#f97815]/20 bg-linear-to-r from-[#f97815]/20 via-[#f97815]/5 to-transparent p-8 text-center md:flex-row md:p-14 md:text-left">
          <div className="flex-1">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Sẵn sàng bắt đầu cùng Tinobot?
            </h2>
            <p className="text-base leading-7 text-gray-400">
              Đăng ký ngay hôm nay để quản lý AI endpoint và chi phí dễ hơn.
            </p>
          </div>
          <Link
            href="/login"
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#f97815] px-8 font-bold text-[#0a0a0a] shadow-2xl transition-all hover:bg-white active:scale-95 sm:w-auto"
          >
            Bắt đầu miễn phí
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
