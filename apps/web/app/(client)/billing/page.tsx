"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
const Card = ({ children, className }: any) => (
  <div className={`rounded-2xl p-4 border bg-card shadow-sm ${className || "border-border"}`}>
    {children}
  </div>
);

const Button = ({ children, className, variant = "primary", size = "md", loading, fullWidth, disabled, ...props }: any) => {
  const baseStyle = "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    primary: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    secondary: "border border-border bg-transparent shadow-sm hover:bg-surface",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 py-2",
    lg: "h-11 px-8 py-3",
  };
  return (
    <button className={`${baseStyle} ${variants[variant as keyof typeof variants] || variants.primary} ${sizes[size as keyof typeof sizes] || sizes.md} ${fullWidth ? "w-full" : ""} ${className || ""}`} disabled={loading || disabled} {...props}>
      {loading && <span className="material-symbols-outlined animate-spin mr-2 text-[16px]">progress_activity</span>}
      {children}
    </button>
  );
};

const Badge = ({ children, className, variant = "primary" }: any) => {
  const variants = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-500",
    neutral: "bg-secondary/10 text-text-muted",
    error: "bg-red-500/10 text-red-500",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant as keyof typeof variants] || variants.primary} ${className || ""}`}>
      {children}
    </span>
  );
};

const Spinner = ({ size = "md", className }: any) => (
  <span className={`material-symbols-outlined animate-spin ${size === "sm" || size === "xs" ? "text-[16px]" : size === "lg" ? "text-[32px]" : "text-[24px]"} ${className || ""}`}>progress_activity</span>
);

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-surface text-text-muted transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="app-scrollbar max-h-[calc(92dvh-64px)] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
};

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-muted rounded-md animate-pulse ${className}`} />
);

const CardSkeleton = () => (
  <div className="rounded-2xl border border-border bg-card p-6 animate-pulse">
    <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
    <div className="h-4 bg-muted rounded w-full mb-2"></div>
    <div className="h-4 bg-muted rounded w-2/3"></div>
  </div>
);
import { useWorkspace } from "@/context/WorkspaceContext";

type PaymentMethod = "polar" | "sepay";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtUSD = (n: number) => "$" + (n || 0).toFixed(2);
const fmtCredits = (n: number) =>
  "$" +
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(n || 0);
const fmtPct = (used: number, limit: number) =>
  limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

// ─── Credit Overview Panel ────────────────────────────────────────────────────

function CreditOverview({
  budgetLimit,
  usedUSD,
  reservedUSD,
  credits,
}: {
  budgetLimit: number;
  usedUSD: number;
  reservedUSD: number;
  credits: number;
}) {
  const availableBudget = Math.max(0, budgetLimit - usedUSD - reservedUSD);
  const usedPct = fmtPct(usedUSD, budgetLimit);
  const reservedPct = Math.min(100 - usedPct, fmtPct(reservedUSD, budgetLimit));
  const safeUsedPct = Math.max(0, Math.min(usedPct, 100));
  const safeReservedPct = Math.max(0, Math.min(reservedPct, 100 - safeUsedPct));

  return (
    <Card className="p-6 space-y-5 border-border/50">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-primary text-[20px]">account_balance_wallet</span>
        <h2 className="text-lg font-bold text-text-main">Credit Overview</h2>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="relative w-full bg-border/30 rounded-full h-3 overflow-hidden">
          {/* Used (spent) */}
          <div
            className="absolute left-0 top-0 h-full bg-primary/80 rounded-l-full transition-all duration-700"
            style={{ width: `${safeUsedPct}%` }}
          />
          {/* Reserved (in-flight) */}
          {safeReservedPct > 0 && (
            <div
              className="absolute top-0 h-full bg-amber-400/70 transition-all duration-700"
              style={{ left: `${safeUsedPct}%`, width: `${safeReservedPct}%` }}
            />
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] font-semibold text-text-muted">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-primary/80 inline-block" /> Spent {safeUsedPct.toFixed(1)}%
          </span>
          {safeReservedPct > 0 && (
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-amber-400/70 inline-block" /> Reserved {safeReservedPct.toFixed(1)}%
            </span>
          )}
          <span className="ml-auto">
            {(100 - safeUsedPct - safeReservedPct).toFixed(1)}% available
          </span>
        </div>
      </div>

      {/* Dual Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* System Credits Card */}
        <div className="col-span-1 p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-[18px]">payments</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">System Credits</span>
          </div>
          <div className="text-2xl font-bold text-text-main">{fmtCredits(credits)}</div>
          <p className="text-[10px] text-text-muted">For system models & provider API</p>
        </div>

        {/* Monthly Quota Card */}
        <div className="col-span-1 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
          <div className="flex items-center gap-2 text-amber-500">
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">Monthly Quota</span>
          </div>
          <div className="text-2xl font-bold text-text-main">{fmtUSD(availableBudget)}</div>
          <p className="text-[10px] text-text-muted">Resets every month (BYOK)</p>
        </div>
      </div>

      {/* Usage Detail */}
      <div className="pt-2">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="text-text-muted font-medium">Monthly Quota Consumption</span>
          <span className="text-text-main font-bold">{usedPct.toFixed(1)}% used</span>
        </div>
        <div className="relative w-full bg-border/30 rounded-full h-2 overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-amber-500 transition-all duration-700"
            style={{ width: `${safeUsedPct}%` }}
          />
        </div>
      </div>
    </Card>
  );
}

function StatPair({
  label,
  value,
  icon,
  color,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
  highlight?: boolean;
}) {
  const colorMap: Record<string, string> = {
    indigo: "text-indigo-500 bg-indigo-500/10",
    emerald: "text-emerald-500 bg-emerald-500/10",
    primary: "text-primary bg-primary/10",
    amber: "text-amber-500 bg-amber-500/10",
    neutral: "text-text-muted bg-border/30",
  };

  return (
    <div
      className={`rounded-xl px-4 py-3 border ${highlight
        ? "border-emerald-500/20 bg-emerald-500/5"
        : "border-border/50 bg-surface/30"
        }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className={`material-symbols-outlined text-[14px] p-1 rounded-md ${colorMap[color] ?? colorMap.neutral}`}
        >
          {icon}
        </span>
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider truncate">
          {label}
        </span>
      </div>
      <p
        className={`text-base font-bold tabular-nums ${highlight ? "text-emerald-500" : "text-text-main"
          }`}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { activeWorkspace, user, isLoading: isWsLoading, refreshWorkspaces } = useWorkspace();
  const searchParams = useSearchParams();

  const [packages, setPackages] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [globalRate, setGlobalRate] = useState(1.0);
  const [vndUsdRate, setVndUsdRate] = useState(25000);
  const [customAmount, setCustomAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("sepay");
  const [sepayOrder, setSepayOrder] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);



  const fetchData = useCallback(
    async (page = 1) => {
      if (!activeWorkspace?.id) return;
      try {
        const [pkgRes, setRes, ordRes] = await Promise.all([
          fetch("/api/admin/packages"),
          fetch("/api/settings"),
          // ✅ Pass workspaceId as query param so orders are always scoped to active workspace
          fetch(`/api/payments/orders?workspaceId=${activeWorkspace.id}&page=${page}&limit=5`),
        ]);

        const pkgData = await pkgRes.json();
        const setData = await setRes.json();
        const ordData = await ordRes.json();

        if (pkgData.packages) {
          setPackages(pkgData.packages.filter((p: any) => p.isActive));
        }
        if (setData.topupExchangeRate) {
          setGlobalRate(setData.topupExchangeRate);
        }
        if (setData.vndUsdRate) {
          setVndUsdRate(setData.vndUsdRate);
        }
        if (ordData.orders) {
          setOrders(ordData.orders);
          setTotalPages(ordData.totalPages || 1);
        }
      } catch (err) {
        console.error("[Billing] Error fetching data:", err);
      } finally {
        setLoadingData(false);
      }
    },
    [activeWorkspace?.id]
  );

  // Poll for SePay order status
  useEffect(() => {
    let interval: any;
    if (isPolling && sepayOrder?.id) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/payments/orders?id=${sepayOrder.id}`);
          const data = await res.json();
          if (data.order?.status === "completed") {
            setIsPolling(false);
            setSepayOrder(null);
            setShowSuccessMsg(true);
            refreshWorkspaces();
            fetchData(1);
          }
        } catch (err: any) {
          console.error("Polling error:", err);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isPolling, sepayOrder?.id, refreshWorkspaces, fetchData]);

  useEffect(() => {
    if (activeWorkspace?.id) {
      fetchData(currentPage);
    }
  }, [fetchData, currentPage, activeWorkspace?.id]);

  // Handle payment success redirect
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setShowSuccessMsg(true);
      refreshWorkspaces();
      fetchData(1);

      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      window.history.replaceState({}, "", url.toString());

      const timer = setTimeout(() => setShowSuccessMsg(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, refreshWorkspaces, fetchData]);

  const handleCheckout = async (packageId: string | null, amount: string | null) => {
    if (!activeWorkspace?.id) {
      alert("No active workspace found. Please refresh.");
      return;
    }

    if (paymentMethod === "polar") {
      setIsProcessing(packageId || "custom");
      try {
        const res = await fetch("/api/payments/polar/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: activeWorkspace.id,
            packageId,
            customAmount: amount,
          }),
        });

        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert(data.error || "Failed to start checkout");
        }
      } catch (err: any) {
        console.error(err);
        alert("Checkout failed. Check your connection.");
      } finally {
        setIsProcessing(null);
      }
    } else {
      // SePay Checkout
      setIsProcessing(packageId || "custom");
      try {
        const res = await fetch("/api/payments/create-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Workspace-Id": activeWorkspace.id
          },
          body: JSON.stringify({
            provider: "sepay",
            packageId,
            customAmountUSD: null,
            customAmountVND: amount,
          }),
        });

        const data = await res.json();
        if (data.order) {
          setSepayOrder(data.order);
          setIsPolling(true);
        } else {
          alert(data.error || "Failed to create SePay order");
        }
      } catch (err: any) {
        console.error(err);
        alert("Failed to create transfer order.");
      } finally {
        setIsProcessing(null);
      }
    }
  };

  // ✅ Include reservedUSD in balance calculation
  const budgetLimit = activeWorkspace?.budgetLimitUSD ?? 0;
  const usedUSD = activeWorkspace?.usedUSD ?? 0;
  const reservedUSD = activeWorkspace?.reservedUSD ?? 0;
  const available = Math.max(0, budgetLimit - usedUSD - reservedUSD);
  const systemCredits = user?.credits ?? 0;

  const calculatedCredits = customAmount
    ? (paymentMethod === "sepay"
      ? (parseFloat(customAmount) / (vndUsdRate || 25000)) * globalRate
      : parseFloat(customAmount) * globalRate
    ).toFixed(2)
    : "0.00";

  if (isWsLoading) return <CardSkeleton />;

  return (
    <div className="flex min-w-0 flex-col gap-6 pb-20 animate-in fade-in duration-500 sm:gap-8">
      {/* Payment success alert */}
      {showSuccessMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-4">
          <div className="size-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div>
            <h4 className="font-bold text-emerald-600 dark:text-emerald-400">Payment Successful!</h4>
            <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70">
              Your balance has been updated. New credits are now available.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-text-main">Billing &amp; Credits</h1>
          <p className="text-text-muted mt-2">
            Manage your credit balance for{" "}
            <b>{activeWorkspace?.name ?? "..."}</b>
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:w-auto">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3">
            <span className="material-symbols-outlined text-primary">payments</span>
            <div>
              <div className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Total Credits</div>
              <div className="text-xl font-bold text-primary tabular-nums">{fmtCredits(systemCredits)}</div>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-surface/50 px-5 py-3">
            <span className="material-symbols-outlined text-text-muted">schedule</span>
            <div>
              <div className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Next Reset</div>
              <div className="text-sm font-bold text-text-main">{new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Overview Panel */}
      {/* Payment Method Selector */}
      <div className="grid w-full grid-cols-1 gap-2 rounded-2xl border border-border/50 bg-surface/50 p-1 sm:w-fit sm:grid-cols-2">
        <button
          onClick={() => setPaymentMethod("sepay")}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all active:scale-[0.98] sm:px-6 ${paymentMethod === "sepay"
            ? "bg-primary text-white shadow-lg shadow-primary/20"
            : "text-text-muted hover:bg-surface"
            }`}
        >
          <span className="material-symbols-outlined">account_balance</span>
          Bank Transfer (VND)
        </button>
        {/* <button
          onClick={() => setPaymentMethod("polar")}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all active:scale-[0.98] sm:px-6 ${paymentMethod === "polar"
            ? "bg-primary text-white shadow-lg shadow-primary/20"
            : "text-text-muted hover:bg-surface"
            }`}
        >
          <span className="material-symbols-outlined">credit_card</span>
          International Card (USD)
        </button> */}
      </div>

      <CreditOverview
        budgetLimit={budgetLimit}
        usedUSD={usedUSD}
        reservedUSD={reservedUSD}
        credits={systemCredits}
      />

      {/* SePay QR Modal */}
      <Modal
        isOpen={!!sepayOrder}
        onClose={() => { setSepayOrder(null); setIsPolling(false); }}
        title="Thanh toán chuyển khoản"
      >
        <div className="flex flex-col items-center gap-6 p-2 text-center">
          <p className="text-sm text-text-muted">
            Vui lòng quét mã QR dưới đây để thực hiện thanh toán.<br />
            Hệ thống sẽ tự động cộng Credits sau khi nhận được tiền.
          </p>

          <div className="relative group">
            <div className="absolute -inset-2 bg-linear-to-r from-primary to-indigo-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-white p-4 rounded-2xl shadow-xl">
              {sepayOrder?.qrUrl ? (
                <img src={sepayOrder.qrUrl} alt="SePay QR" className="w-64 h-64" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center bg-surface">
                  <Spinner className="" size="lg" />
                </div>
              )}
            </div>
          </div>

          <div className="w-full space-y-3 bg-surface/50 p-4 rounded-2xl border border-border/50 text-left">
            <div className="flex justify-between">
              <span className="text-xs text-text-muted font-bold uppercase">Số tiền</span>
              <span className="font-bold text-primary">{sepayOrder?.amountVND?.toLocaleString()} VND</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-text-muted font-bold uppercase">Nội dung</span>
              <span className="font-bold text-amber-500 select-all cursor-pointer" title="Click to copy">{sepayOrder?.transferContent}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border/30">
              <span className="text-xs text-text-muted font-bold uppercase">Trạng thái</span>
              <span className="flex items-center gap-2 text-primary font-bold animate-pulse">
                <Spinner className="" size="xs" /> Đang chờ...
              </span>
            </div>
          </div>

          <div className="text-[10px] text-text-muted flex items-start gap-2 max-w-sm">
            <span className="material-symbols-outlined text-sm mt-0.5">info</span>
            <span>Lưu ý: Bạn phải chuyển đúng <b>Chính xác số tiền</b> và <b>Nội dung chuyển khoản</b> để được cộng tiền tự động.</span>
          </div>
        </div>
      </Modal>

      {/* Main grid */}
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        {/* Left col: Packages & Top-up */}
        <div className="lg:col-span-2 space-y-8">
          <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">add_shopping_cart</span>
            Choose a Top-up Pack
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {loadingData ? (
              Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            ) : packages.length === 0 ? (
              <div className="p-10 text-center border-2 border-dashed border-border/50 rounded-2xl text-text-muted sm:col-span-2">
                <span className="material-symbols-outlined text-4xl opacity-20 mb-2 block">inventory_2</span>
                <p className="text-sm italic">No packages available at the moment.</p>
              </div>
            ) : (
              packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className="flex flex-col border-border/50 hover:border-primary/40 transition-all hover:shadow-lg"
                >
                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-text-main text-lg">{pkg.name}</h3>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-bold text-text-main">${pkg.priceUSD}</span>
                          <span className="text-xs text-text-muted font-medium">/ pack</span>
                        </div>
                      </div>
                      {pkg.credits > pkg.priceUSD && (
                        <Badge variant="success" className="animate-pulse">Best Value</Badge>
                      )}
                    </div>

                    {/* Feature list */}
                    <div className="space-y-2 py-2">
                      {pkg.description
                        ?.split("\n")
                        .filter((l: string) => l.trim())
                        .map((feature: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-sm text-text-muted">
                            <span className="material-symbols-outlined text-emerald-500 text-[18px] shrink-0 mt-0.5">
                              check_circle
                            </span>
                            <span className="leading-tight">{feature}</span>
                          </div>
                        ))}
                      {!pkg.description && (
                        <p className="text-xs text-text-muted italic">
                          No specific features listed for this pack.
                        </p>
                      )}
                    </div>

                    <div className="bg-primary/5 p-3 rounded-xl border border-primary/5 flex justify-between items-center mt-auto">
                      <span className="text-xs text-text-muted font-bold uppercase tracking-wider">
                        Credits Received
                      </span>
                      <span className="text-lg font-bold text-primary">${pkg.credits}</span>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Button
                      variant="primary"
                      fullWidth
                      loading={isProcessing === pkg.id}
                      onClick={() => handleCheckout(pkg.id, null)}
                    >
                      Buy Now
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Custom Amount */}
          <Card className="bg-surface/50 border-2 border-dashed border-border/50">
            <div className="flex flex-col gap-6 md:flex-row md:items-end">
              <div className="flex-1 space-y-4">
                <h3 className="font-bold text-text-main">
                  {paymentMethod === "sepay" ? "Custom Amount (VND)" : "Custom Amount (USD)"}
                </h3>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold">
                    {paymentMethod === "sepay" ? "₫" : "$"}
                  </span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e: any) => setCustomAmount(e.target.value)}
                    placeholder={paymentMethod === "sepay" ? "e.g. 50000" : "e.g. 10.00"}
                    min="0"
                    step={paymentMethod === "sepay" ? "1000" : "0.01"}
                    className="w-full pl-10 pr-4 py-3 bg-card border border-border/50 rounded-2xl text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <p className="text-xs text-text-muted italic">
                  {paymentMethod === "sepay"
                    ? `Credits = (VND / ${vndUsdRate}) × ${globalRate} ratio. Estimated: `
                    : `Credits = Amount × ${globalRate} ratio. Estimated: `}
                  <b>${calculatedCredits} credits</b>.
                </p>
              </div>
              <Button
                variant="secondary"
                size="lg"
                className="md:w-48"
                disabled={!customAmount || parseFloat(customAmount) <= 0}
                loading={isProcessing === "custom"}
                onClick={() => handleCheckout(null, customAmount)}
              >
                Process {paymentMethod === "sepay" ? "VND" : "USD"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right col: Transaction History */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">history</span>
            Transaction History
          </h2>

          <div className="space-y-3">
            {loadingData ? (
              <Skeleton className="h-64 w-full rounded-2xl" />
            ) : orders.length === 0 ? (
              <div className="p-10 text-center border border-dashed border-border/50 rounded-2xl">
                <span className="material-symbols-outlined text-3xl opacity-20 mb-2 block">receipt_long</span>
                <p className="text-text-muted text-sm italic">No transaction history yet.</p>
              </div>
            ) : (
              <>
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-border/50 bg-card p-4 transition-colors hover:border-primary/20 sm:items-center"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-text-muted shrink-0">
                          {order.provider === "sepay" ? "qr_code" : "credit_card"}
                        </span>
                        <span className="text-sm font-bold text-text-main tabular-nums">
                          {fmtUSD(order.amountUSD)}
                        </span>
                        {order.amountVND && (
                          <span className="text-[10px] text-text-muted">
                            ({order.amountVND.toLocaleString("vi-VN")}₫)
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-text-muted flex items-center gap-1">
                        <span className="capitalize font-medium">{order.provider}</span>
                        <span>·</span>
                        <span>
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(order.createdAt))}
                        </span>
                      </div>
                      {order.transferContent && (
                        <span className="text-[9px] font-mono text-text-muted/70">
                          {order.transferContent}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                      <Badge
                        variant={
                          order.status === "completed"
                            ? "success"
                            : order.status === "pending"
                              ? "neutral"
                              : "error"
                        }
                        className="text-[9px]"
                      >
                        {order.status}
                      </Badge>
                      {order.creditsEarned != null && order.creditsEarned > 0 && (
                        <div className="text-[10px] font-bold text-emerald-500">
                          +{fmtCredits(order.creditsEarned)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {totalPages > 1 && (
                  <div className="flex justify-between items-center pt-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="text-xs text-primary disabled:opacity-30 font-bold"
                    >
                      Previous
                    </button>
                    <span className="text-[10px] text-text-muted font-bold">
                      Page {currentPage} / {totalPages}
                    </span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="text-xs text-primary disabled:opacity-30 font-bold"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
