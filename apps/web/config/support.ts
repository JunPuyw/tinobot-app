export interface SupportPlatform {
  id: string;
  name: { en: string; vi: string };
  description: { en: string; vi: string };
  url: string;
  icon: 'zalo' | 'messenger' | 'telegram' | 'phone' | 'email' | 'custom';
  color: string;
  isActive: boolean;
}

export const supportConfig = {
  title: { en: "Contact Support", vi: "Liên hệ Hỗ trợ" },
  subtitle: {
    en: "Tinobot supports you 24/7 through the channels below",
    vi: "Tinobot hỗ trợ bạn 24/7 qua các kênh dưới đây",
  },
  platforms: [
    {
      id: "zalo",
      name: { en: "Zalo Chat", vi: "Zalo Chat" },
      description: { en: "Quick support & technical Q&A", vi: "Hỗ trợ nhanh, giải đáp kỹ thuật" },
      url: "https://zalo.me/0999999999", // Thay bằng số điện thoại Zalo hoặc link Zalo OA thực tế
      icon: "zalo",
      color: "#0068FF",
      isActive: true,
    },
    {
      id: "messenger",
      name: { en: "Facebook Messenger", vi: "Facebook Messenger" },
      description: { en: "Consulting on services & pricing", vi: "Tư vấn dịch vụ & bảng giá" },
      url: "https://m.me/tinobot", // Thay bằng link Fanpage hoặc link cá nhân thực tế
      icon: "messenger",
      color: "#0084FF",
      isActive: true,
    },
    {
      id: "telegram",
      name: { en: "Telegram Support", vi: "Telegram Support" },
      description: { en: "Secure support & API channel", vi: "Kênh hỗ trợ bảo mật & API" },
      url: "https://t.me/tinobot_support", // Thay bằng username Telegram hỗ trợ thực tế
      icon: "telegram",
      color: "#229ED9",
      isActive: true,
    },
    {
      id: "phone",
      name: { en: "Call Hotline", vi: "Hotline Gọi ngay" },
      description: { en: "Emergency support 24/7", vi: "Hỗ trợ khẩn cấp 24/7" },
      url: "tel:0999999999", // Thay bằng số hotline thực tế
      icon: "phone",
      color: "#10B981",
      isActive: true,
    },
    {
      id: "email",
      name: { en: "Send Email", vi: "Gửi Email" },
      description: { en: "Reply within 24 hours", vi: "Phản hồi trong vòng 24 giờ" },
      url: "mailto:support@tinobot.vn", // Thay bằng email hỗ trợ thực tế
      icon: "email",
      color: "#EF4444",
      isActive: true,
    },
  ] as SupportPlatform[],
};
