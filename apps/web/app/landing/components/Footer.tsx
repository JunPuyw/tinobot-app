"use client";

import { onLocaleChange, translate } from "@/i18n/runtime";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Footer() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return onLocaleChange(() => forceUpdate((n) => n + 1));
  }, []);

  return (
    <footer className="border-t border-[#3a2f27] bg-[#120f0d] px-6 pb-8 pt-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-2">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-linear-to-br from-[#f97815] to-orange-700 text-white shadow-lg">
                <Image
                  src="/icons/logo.jpg"
                  alt="Logo"
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              </div>
              <h3 className="text-lg font-bold text-white">Tinobot</h3>
            </div>

            <div className="mb-6 space-y-2 text-sm text-gray-500">
              <p className="font-medium text-white">
                CTY TNHH Tập Đoàn TinoTech
              </p>
              <p>
                <span className="text-gray-400">Hotline:</span>{" "}
                <a href="tel:0967380692" className="text-white hover:underline">
                  0967 380 692
                </a>
              </p>
              <p>
                <span className="text-gray-400">Email:</span>{" "}
                <a
                  href="mailto:dangtung.techcare@gmail.com"
                  className="break-all text-white hover:underline"
                >
                  dangtung.techcare@gmail.com
                </a>
              </p>
              <p>
                <a
                  href="/contact"
                  className="font-medium text-[#f97815] hover:underline"
                >
                  {translate("Contact us")} →
                </a>
              </p>
            </div>
          </div>

          <FooterColumn
            title={translate("Product")}
            links={[
              { label: translate("Features"), href: "/landing#features" },
              { label: translate("Dashboard"), href: "/login" },
              {
                label: translate("Changelog"),
                href: "https://github.com/decolua/tinobot",
              },
            ]}
          />
          <FooterColumn
            title={translate("Resources")}
            links={[
              { label: translate("Documentation"), href: "/docs" },
              { label: "GitHub", href: "https://github.com/decolua/tinobot" },
              { label: "NPM", href: "https://www.npmjs.com/package/tinobot" },
            ]}
          />
          <FooterColumn
            title={translate("Legal")}
            links={[
              {
                label: "MIT License",
                href: "https://github.com/decolua/tinobot/blob/main/LICENSE",
              },
            ]}
          />
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-[#3a2f27] pt-8 md:flex-row">
          <p className="text-sm text-gray-600">
            © 2026 Tinobot. {translate("All rights reserved.")}
          </p>
        </div>
      </div>
    </footer>
  );
}

type FooterColumnProps = {
  title: string;
  links: Array<{ label: string; href: string }>;
};

function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div className="flex flex-col gap-4">
      <h4 className="font-bold text-white">{title}</h4>
      {links.map((link) => (
        <a
          key={`${link.href}-${link.label}`}
          className="text-sm text-gray-400 transition-colors hover:text-[#f97815]"
          href={link.href}
          rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
          target={link.href.startsWith("http") ? "_blank" : undefined}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
