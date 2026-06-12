"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { translate, onLocaleChange } from "@/i18n/runtime";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
const Card = ({ children, className }: any) => (
  <div className={`rounded-2xl border bg-card shadow-sm border-border ${className || ""}`}>
    {children}
  </div>
);

const Button = ({ children, className, variant = "primary", loading, icon, ...props }: any) => {
  const baseStyle = "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    primary: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    outline: "border border-border bg-transparent shadow-sm hover:bg-surface",
  };
  return (
    <button className={`${baseStyle} ${variants[variant as keyof typeof variants] || variants.primary} ${className || ""}`} disabled={loading} {...props}>
      {loading && <span className="material-symbols-outlined animate-spin mr-2 text-[16px]">progress_activity</span>}
      {!loading && icon && <span className="material-symbols-outlined mr-2 text-[18px]">{icon}</span>}
      {children}
    </button>
  );
};

const Input = ({ label, inputClassName, ...props }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold text-text-muted">{label}</label>}
    <input className={`flex h-10 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${inputClassName || ""}`} {...props} />
  </div>
);

const Loading = () => (
  <div className="flex items-center justify-center p-8">
    <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
  </div>
);

function getSafeRedirect(value: string | null, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

function LoginContent() {
  const searchParams = useSearchParams();
  const redirect = getSafeRedirect(searchParams.get("redirect"), "/usage");
  const registerHref = `/register?redirect=${encodeURIComponent(redirect)}`;
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState(searchParams.get("error") || "");
  const [loading, setLoading] = useState(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return onLocaleChange(() => forceUpdate(n => n + 1));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      if (data.user?.role === "admin" && redirect === "/usage") {
        window.location.href = "/admin";
      } else {
        window.location.href = redirect;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative z-10 transition-all duration-300 animate-in fade-in slide-in-from-bottom-8">
      <div className="text-center mb-10">
        <div className="w-52 h-52  rounded-2xl flex items-center justify-center mx-auto  shadow-golden smooth-float">
          <img src="/icons/dragon-mascot.png" alt="Logo" width={48} height={48} className="w-full h-full object-contain" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2 text-gradient-gold">{translate("User Portal")}</h1>
        <p className="text-muted-foreground font-medium opacity-80">{translate("Login to manage your API Keys")}</p>
      </div>

      <Card className="p-8 shadow-2xl border-primary/10 bg-card/50 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl text-xs font-bold animate-bounce flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {translate(error)}
            </div>
          )}

          <Input
            label={translate("Email Address")}
            type="email"
            placeholder={translate("Enter your email")}
            inputClassName="h-12 uppercase font-bold text-[10px] tracking-widest"
            value={formData.email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
            required
            autoFocus
          />

          <Input
            label={translate("Security Password")}
            type="password"
            placeholder={translate("Enter password")}
            inputClassName="h-12 font-bold text-[10px] tracking-widest"
            value={formData.password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full h-12 text-lg font-bold shadow-golden mt-2"
            loading={loading}
            icon="login"
          >
            {translate("Sign In")}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border opacity-50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-medium">{translate("Or continue with")}</span>
            </div>
          </div>

          <Link href={`/api/auth/user/google?redirect=${encodeURIComponent(redirect)}`} className="w-full">
            <Button
              variant="outline"
              type="button"
              className="w-full h-12 text-sm font-bold flex items-center justify-center gap-3 border-primary/20 hover:border-primary/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
              {translate("Sign in with Google")}
            </Button>
          </Link>

          <div className="pt-2 text-center">
            <p className="text-xs text-muted-foreground font-medium">
              {translate("Don't have an account?")} <Link href={registerHref} className="text-primary font-bold hover:underline tracking-tight">{translate("Register for Access")}</Link>
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Language Toggle */}
      <div className="absolute top-8 right-8 z-50">
        <div className="bg-card/50 backdrop-blur-xl border border-primary/10 rounded-2xl p-1 shadow-2xl">
          <LanguageSwitcher />
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[20%] size-96 bg-primary/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[20%] right-[20%] size-96 bg-primary/5 blur-[150px] rounded-full" />
      </div>

      <Suspense fallback={<Loading />}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
