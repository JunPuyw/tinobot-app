"use client";

import Footer from "@/app/landing/components/Footer";
import Navigation from "@/app/landing/components/Navigation";
import { type FormEvent, useState } from "react";

export default function ContactClient() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");

    setTimeout(() => {
      setStatus("success");
      e.currentTarget.reset();
    }, 1000);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white selection:bg-[#f97815]/30">
      <Navigation />

      <section className="px-6 pb-16 pt-36 text-center sm:pt-44">
        <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          Kết nối với <span className="text-gradient-gold">TinoTech</span>
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-7 text-gray-400 sm:text-xl">
          Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn. Gửi tin nhắn hoặc
          liên hệ trực tiếp qua hotline.
        </p>
      </section>

      <section className="px-6 pb-28">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="space-y-10">
            <div>
              <h3 className="mb-8 flex items-center gap-3 text-2xl font-bold">
                <span className="size-2 rounded-full bg-[#f97815]" />
                Thông tin liên hệ
              </h3>

              <div className="space-y-8">
                <ContactInfoItem
                  icon="business"
                  title="Tên công ty"
                  desc="CTY TNHH Tập Đoàn TinoTech"
                />
                <ContactInfoItem
                  icon="call"
                  title="Hotline hỗ trợ"
                  desc="0967 380 692"
                  link="tel:0967380692"
                />
                <ContactInfoItem
                  icon="mail"
                  title="Email"
                  desc="dangtung.techcare@gmail.com"
                  link="mailto:dangtung.techcare@gmail.com"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-[#f97815]/20 bg-[#f97815]/5 p-8">
              <h4 className="mb-4 font-bold text-[#f97815]">
                Thời gian làm việc
              </h4>
              <p className="text-sm leading-7 text-gray-400">
                Thứ 2 - Thứ 6: 08:30 - 18:00 <br />
                Thứ 7: 09:00 - 12:00 <br />
                Hỗ trợ kỹ thuật: 24/7 qua ticket và hotline.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#1a1a1a]/50 p-6 backdrop-blur-sm transition-all duration-300 md:p-10">
            {status === "success" ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-green-500/20 text-green-500">
                  <span className="material-symbols-outlined text-4xl">
                    check_circle
                  </span>
                </div>
                <h3 className="mb-4 text-2xl font-bold">Gửi thành công!</h3>
                <p className="mb-8 max-w-sm text-gray-400">
                  Cảm ơn bạn đã liên hệ. Đội ngũ TinoTech sẽ phản hồi trong
                  vòng 24 giờ.
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  className="h-12 rounded-xl border border-white/10 bg-white/5 px-8 text-sm font-bold transition-all hover:bg-white/10"
                >
                  Gửi tin nhắn khác
                </button>
              </div>
            ) : (
              <>
                <h3 className="mb-8 text-2xl font-bold">
                  Gửi tin nhắn cho chúng tôi
                </h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <InputGroup
                      label="Họ và tên"
                      placeholder="Nguyễn Văn A"
                      required
                    />
                    <InputGroup
                      label="Email"
                      type="email"
                      placeholder="example@gmail.com"
                      required
                    />
                  </div>
                  <InputGroup
                    label="Chủ đề"
                    placeholder="Hợp tác kinh doanh / Hỗ trợ kỹ thuật"
                    required
                  />
                  <div className="flex flex-col gap-2">
                    <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      Nội dung
                    </label>
                    <textarea
                      required
                      placeholder="Bạn cần chúng tôi giúp gì?"
                      rows={5}
                      className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none transition-all placeholder:text-gray-600 focus:border-[#f97815]/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[#f97815] text-lg font-bold text-[#0a0a0a] shadow-[0_10px_20px_rgba(249,120,21,0.2)] transition-all hover:bg-[#ff8c33] active:scale-95 disabled:opacity-50"
                  >
                    {status === "loading" ? (
                      <>
                        <span className="size-5 rounded-full border-2 border-[#0a0a0a]/30 border-t-[#0a0a0a] animate-spin" />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        Gửi yêu cầu
                        <span className="material-symbols-outlined text-[20px]">
                          send
                        </span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

type ContactInfoItemProps = {
  icon: string;
  title: string;
  desc: string;
  link?: string;
};

function ContactInfoItem({ icon, title, desc, link }: ContactInfoItemProps) {
  const content = (
    <div className="group flex gap-5">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-gray-400 transition-all duration-300 group-hover:border-[#f97815]/30 group-hover:bg-[#f97815]/10 group-hover:text-[#f97815]">
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </div>
      <div className="min-w-0">
        <h4 className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-500">
          {title}
        </h4>
        <p className="break-words font-medium text-white transition-colors group-hover:text-[#f97815]">
          {desc}
        </p>
      </div>
    </div>
  );

  return link ? (
    <a href={link} className="block">
      {content}
    </a>
  ) : (
    content
  );
}

type InputGroupProps = {
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
};

function InputGroup({
  label,
  placeholder,
  type = "text",
  required = false,
}: InputGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
        {label}
      </label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        className="h-14 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm text-white outline-none transition-all placeholder:text-gray-600 focus:border-[#f97815]/50"
      />
    </div>
  );
}
