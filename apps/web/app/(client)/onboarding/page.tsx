"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/context/WorkspaceContext";
import { translate, onLocaleChange } from "@/i18n/runtime";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading, applyOptimisticUpdate } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return onLocaleChange(() => forceUpdate((n) => n + 1));
  }, []);

  // Already completed onboarding → go straight to portal
  useEffect(() => {
    if (!isLoading && user?.persona) {
      router.replace("/usage");
    }
  }, [isLoading, user?.persona, router]);

  const handleStart = async () => {
    if (loading) return;
    setLoading(true);

    // Optimistic: mark persona so layout doesn't bounce back
    applyOptimisticUpdate({ user: { persona: "individual" } });
    router.replace("/usage");

    // Background API sync (fire-and-forget)
    fetch("/api/auth/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona: "individual" }),
    }).catch(() => {});
  };

  if (isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background animate-in fade-in duration-300">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[15%] size-96 bg-primary/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[10%] right-[15%] size-96 bg-primary/5 blur-[150px] rounded-full" />
      </div>

      <div className="w-full max-w-lg relative z-10 text-center animate-in fade-in slide-in-from-bottom-6 duration-500">
        {/* Logo */}
        <div className="size-24 bg-golden-gradient rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-golden-lg smooth-float">
          <span className="material-symbols-outlined text-5xl text-primary-foreground font-bold">bolt</span>
        </div>

        <h1 className="text-5xl font-bold tracking-tight mb-4 text-gradient-gold">
          {translate("Welcome to Tinobot")}
        </h1>
        <p className="text-lg text-muted-foreground mb-12 font-medium opacity-80 max-w-sm mx-auto">
          {translate("Your AI gateway is ready. Start managing your API keys and providers.")}
        </p>

        <button
          onClick={handleStart}
          disabled={loading}
          className="inline-flex items-center justify-center gap-3 h-14 px-10 rounded-2xl bg-primary text-primary-foreground text-lg font-bold shadow-golden hover:bg-primary/90 hover:-translate-y-1 transition-all duration-200 disabled:opacity-60 disabled:cursor-wait"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              {translate("Setting up...")}
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
              {translate("Get Started")}
            </>
          )}
        </button>

        <div className="mt-12 flex justify-center gap-8 opacity-25 hover:opacity-50 transition-opacity duration-500">
          <span className="material-symbols-outlined text-3xl">terminal</span>
          <span className="material-symbols-outlined text-3xl">deployed_code</span>
          <span className="material-symbols-outlined text-3xl">developer_board</span>
          <span className="material-symbols-outlined text-3xl">cloud_done</span>
        </div>
      </div>
    </div>
  );
}
