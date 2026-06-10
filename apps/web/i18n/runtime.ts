import { useSyncExternalStore } from "react";

export type Locale = "en" | "vi";

type LocaleChangeListener = () => void;

const STORAGE_KEY = "tinobot.locale";
const listeners = new Set<LocaleChangeListener>();

const translations: Record<Locale, Record<string, string>> = {
  en: {},
  vi: {
    "Home": "Trang chủ",
    "Pricing": "Bảng giá",
    "Docs": "Tài liệu",
    "Contact": "Liên hệ",
    "Menu": "Menu",
    "Login": "Đăng nhập",
    "Sign up": "Đăng ký",
    "Create Account": "Tạo tài khoản",
    "Already have an account?": "Đã có tài khoản?",
    "Login Instead": "Đăng nhập",
    "Login to manage your API Keys": "Đăng nhập để quản lý API key",
    "Dashboard": "Tổng quan",
    "Providers": "Nhà cung cấp",
    "Combos": "Combo",
    "Models": "Mô hình",
    "Playground": "Thử nghiệm",
    "Billing": "Thanh toán",
    "Settings": "Cài đặt",
    "Admin CMS": "Quản trị CMS",
    "Portal": "Cổng làm việc",
    "User": "Người dùng",
    "Logout": "Đăng xuất",
    "Expand": "Mở rộng",
    "Collapse": "Thu gọn",
    "Overview": "Tổng quan",
    "Users": "Người dùng",
    "Packages": "Gói dịch vụ",
    "Gateway Billing": "Tính phí Gateway",
    "API Keys": "API key",
    "Router Log": "Nhật ký router",
    "Back to App": "Về ứng dụng",
    "Admin Panel": "Bảng quản trị",
    "User Portal": "Cổng người dùng",
    "Language": "Ngôn ngữ",
    "English": "Tiếng Anh",
    "Vietnamese": "Tiếng Việt",
    "Available Models": "Mô hình khả dụng",
    "Total Models": "Tổng mô hình",
    "Search by model name, id, or provider": "Tìm theo tên, mã mô hình hoặc nhà cung cấp",
    "Billing & Credits": "Thanh toán & Credits",
    "Save": "Lưu",
    "Saving...": "Đang lưu...",
    "Cancel": "Hủy",
    "Delete": "Xóa",
    "Create": "Tạo",
    "Update": "Cập nhật",
    "Search": "Tìm kiếm",
  },
};

function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "vi";
}

export function getLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isLocale(stored) ? stored : "en";
}

export function setLocale(locale: Locale): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }
  notifyLocaleChange();
}

export function translate(key: string): string {
  return translations[getLocale()][key] || key;
}

export function onLocaleChange(listener: LocaleChangeListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function notifyLocaleChange(): void {
  listeners.forEach((listener) => listener());
}

export function useTranslation() {
  const locale = useSyncExternalStore<Locale>(onLocaleChange, getLocale, () => "en");

  return {
    locale,
    setLocale,
    t: (key: string) => translations[locale][key] || key,
  };
}
