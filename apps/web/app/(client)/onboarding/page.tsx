"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
const Card = ({ children, className }: any) => (
  <div className={`rounded-2xl border border-border bg-card shadow-sm ${className || "p-6"}`}>
    {children}
  </div>
);

const Button = ({ children, className, variant = "primary", size = "md", loading, fullWidth, disabled, icon, ...props }: any) => {
  const baseStyle = "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    primary: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    secondary: "border border-border bg-transparent shadow-sm hover:bg-surface",
    ghost: "bg-transparent hover:bg-surface text-text-muted hover:text-text-main",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 py-2",
    lg: "h-11 px-8 py-3",
  };
  return (
    <button className={`${baseStyle} ${variants[variant as keyof typeof variants] || variants.primary} ${sizes[size as keyof typeof sizes] || sizes.md} ${fullWidth ? "w-full" : ""} ${className || ""}`} disabled={loading || disabled} {...props}>
      {loading && <span className="material-symbols-outlined animate-spin mr-2 text-[16px]">progress_activity</span>}
      {!loading && icon && <span className="material-symbols-outlined mr-1.5 text-[16px]">{icon}</span>}
      {children}
    </button>
  );
};

const Input = ({ className, label, error, ...props }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold text-text-muted">{label}</label>}
    <input className={`flex h-10 w-full rounded-xl border bg-transparent px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${error ? "border-red-500" : "border-border"} ${className || ""}`} {...props} />
    {error && <span className="text-[10px] text-red-500">{error}</span>}
  </div>
);
import { useWorkspace } from "@/context/WorkspaceContext";
import { translate, onLocaleChange } from "@/i18n/runtime";

export default function OnboardingPage() {
    const router = useRouter();
    const { user, isLoading, refreshAll, applyOptimisticUpdate } = useWorkspace();
    const [step, setStep] = useState("persona_selection");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState<string | false>(false);
    const [error, setError] = useState("");
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        return onLocaleChange(() => forceUpdate(n => n + 1));
    }, []);

    // If user already has persona, redirect to portal — onboarding is done
    useEffect(() => {
        if (!isLoading && user?.persona) {
            router.replace("/portal");
        }
    }, [isLoading, user?.persona, router]);

    const handleSelectPersona = async (persona: "individual" | "business") => {
        if (loading) return;

        if (persona === "business") {
            setStep("team_input");
            return;
        }

        // Individual: optimistic update + redirect IMMEDIATELY, API runs in background
        setLoading(persona);
        applyOptimisticUpdate({ user: { persona: "individual" } });
        router.replace("/portal");

        // Background API calls
        try {
            await fetch("/api/auth/user/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ persona: "individual" }),
            });
            const wsRes = await fetch("/api/auth/user/workspaces", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "My Space", type: "personal" }),
            });
            const wsData = await wsRes.json();
            if (wsRes.ok && wsData.workspace) {
                applyOptimisticUpdate({ workspace: wsData.workspace });
            }
            refreshAll().catch(() => { });
        } catch {
            // Silent — background sync will fix state
        }
    };

    const handleCreate = async (customName = null, type = "team") => {
        const finalName = customName || name.trim();
        if (!finalName) return;

        setLoading("business");
        setError("");

        try {
            const [, wsRes] = await Promise.all([
                fetch("/api/auth/user/me", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ persona: "business" }),
                }),
                fetch("/api/auth/user/workspaces", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: finalName, type }),
                }),
            ]);

            const data = await wsRes.json();
            if (!wsRes.ok) throw new Error(data.error || "Failed to create workspace");

            applyOptimisticUpdate({
                user: { persona: "business" },
                workspace: data.workspace,
            });

            router.replace("/portal");
            refreshAll().catch(() => { });
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    if (isLoading) return null;

    const UI_PERSONA_SELECTION = (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button
                onClick={() => !loading && handleSelectPersona("individual")}
                disabled={!!loading}
                className={`group relative flex flex-col items-center p-10 border rounded-[2.5rem] transition-all duration-300 ${loading === "individual"
                    ? "bg-primary/10 border-primary/60 shadow-golden scale-[0.98] cursor-wait"
                    : loading
                        ? "bg-card/30 border-primary/5 opacity-40 cursor-not-allowed"
                        : "bg-card/60 hover:bg-card/80 border-primary/10 hover:border-primary/40 hover:shadow-golden hover:-translate-y-2 cursor-pointer"
                    }`}
            >
                <div className={`size-20 rounded-2xl flex items-center justify-center mb-8 transition-all duration-300 ${loading === "individual" ? "bg-primary/20 shadow-golden scale-110" : "bg-primary/10 group-hover:scale-110 group-hover:shadow-golden"
                    }`}>
                    {loading === "individual" ? (
                        <span className="material-symbols-outlined text-4xl text-primary font-bold animate-spin">progress_activity</span>
                    ) : (
                        <span className="material-symbols-outlined text-4xl text-primary font-bold">person</span>
                    )}
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">{translate("Individual Use")}</h3>
                <p className="text-sm text-muted-foreground text-center leading-relaxed font-medium">
                    {translate("Ideal for developers and freelancers.")} <br /> {translate("Fast testing, no team configuration needed.")}
                </p>
                <div className={`mt-8 flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-[0.2em] transition-all ${loading === "individual" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
                    }`}>
                    {loading === "individual" ? translate("Setting up...") : translate("Start Now")}
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </div>
            </button>

            <button
                onClick={() => !loading && handleSelectPersona("business")}
                disabled={!!loading}
                className={`group relative flex flex-col items-center p-10 border rounded-[2.5rem] transition-all duration-300 ${loading === "business"
                    ? "bg-primary/10 border-primary/60 shadow-golden scale-[0.98] cursor-wait"
                    : loading
                        ? "bg-card/30 border-primary/5 opacity-40 cursor-not-allowed"
                        : "bg-card/60 hover:bg-card/80 border-primary/10 hover:border-primary/40 hover:shadow-golden hover:-translate-y-2 cursor-pointer"
                    }`}
            >
                <div className={`size-20 rounded-2xl flex items-center justify-center mb-8 transition-all duration-300 ${loading === "business" ? "bg-primary/20 shadow-golden scale-110" : "bg-primary/20 group-hover:scale-110 group-hover:shadow-golden"
                    }`}>
                    {loading === "business" ? (
                        <span className="material-symbols-outlined text-4xl text-primary font-bold animate-spin">progress_activity</span>
                    ) : (
                        <span className="material-symbols-outlined text-4xl text-primary font-bold">corporate_fare</span>
                    )}
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">{translate("Business / Reseller")}</h3>
                <p className="text-sm text-muted-foreground text-center leading-relaxed font-medium">
                    {translate("Centralized management for companies or teams.")} <br /> {translate("Issue keys to users, advanced quota allocation.")}
                </p>
                <div className={`mt-8 flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-[0.2em] transition-all ${loading === "business" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
                    }`}>
                    {loading === "business" ? translate("Setting up...") : translate("Set Up")}
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </div>
            </button>
        </div>
    );

    const UI_TEAM_INPUT = (
        <form onSubmit={(e: any) => { e.preventDefault(); handleCreate(); }} className="flex flex-col gap-6 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-widest text-text-muted px-1">{translate("Company Name / Business")}</label>
                <Input
                    placeholder={translate("e.g., Acme Studio or Project X")}
                    className="h-14 text-lg bg-surface/30 border-border/50 focus:border-primary/30"
                    value={name}
                    onChange={(e: any) => setName(e.target.value)}
                    autoFocus
                    required
                />
            </div>
            <div className="flex gap-3 mt-2">
                <Button type="button" variant="ghost" size="lg" className="flex-1 h-14 font-bold" onClick={() => setStep("persona_selection")} disabled={!!loading}>
                    {translate("Go Back")}
                </Button>
                <Button type="submit" variant="primary" size="lg" className="flex-[2] h-14 text-lg font-bold shadow-lg shadow-primary/20" loading={!!loading} icon="check_circle">
                    {translate("Create Business")}
                </Button>
            </div>
        </form>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background animate-in fade-in duration-300">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[10%] left-[10%] size-96 bg-primary/10 blur-[150px] rounded-full animate-pulse" />
                <div className="absolute bottom-[10%] right-[10%] size-96 bg-primary/5 blur-[150px] rounded-full" />
            </div>

            <div className="w-full max-w-4xl relative z-10">
                <div className="text-center mb-16">
                    <div className="size-24 bg-golden-gradient rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-golden-lg smooth-float">
                        <span className="material-symbols-outlined text-5xl text-primary-foreground font-bold">hub</span>
                    </div>
                    <h1 className="text-6xl font-bold tracking-tight mb-6 text-gradient-gold">
                        {translate("Scale your focus")}
                    </h1>
                    <p className="text-2xl text-muted-foreground max-w-xl mx-auto font-medium opacity-80">
                        {step === "persona_selection" ? translate("How do you plan to use Tinobot?") : translate("Set up your team")}
                    </p>
                </div>

                {error && (
                    <div className="mb-8 bg-red-500/10 border border-red-500/20 text-red-500 p-5 rounded-2xl text-sm flex items-center gap-3">
                        <span className="material-symbols-outlined">error</span>
                        <span className="font-medium">{translate(error)}</span>
                    </div>
                )}

                {step === "persona_selection" ? UI_PERSONA_SELECTION : (
                    <Card className="p-8 shadow-2xl border-primary/10 bg-surface/50 backdrop-blur-md max-w-md mx-auto">
                        {UI_TEAM_INPUT}
                    </Card>
                )}

                <div className="mt-16 flex flex-col items-center gap-4 animate-in fade-in duration-300 delay-200">
                    <p className="text-sm text-text-muted font-medium">{translate("This choice shapes your administration experience.")}</p>
                    <div className="flex gap-8 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
                        <span className="material-symbols-outlined text-3xl">terminal</span>
                        <span className="material-symbols-outlined text-3xl">deployed_code</span>
                        <span className="material-symbols-outlined text-3xl">developer_board</span>
                        <span className="material-symbols-outlined text-3xl">cloud_done</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
