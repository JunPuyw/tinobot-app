"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/context/WorkspaceContext";
import Link from "next/link";
const LanguageSwitcher = () => (
  <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-text-muted">
    <span className="material-symbols-outlined text-[16px]">language</span>
    EN / VI
  </div>
);

export default function InviteAcceptPage() {
    const { token } = useParams() as { token: string; };
    const router = useRouter();
    const { user, refreshAll } = useWorkspace();

    const [invite, setInvite] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!token) return;
        fetch(`/api/invites/${token}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) setError(data.error);
                else setInvite(data.invite);
            })
            .catch(() => setError("Không thể tải thông tin lời mời"))
            .finally(() => setLoading(false));
    }, [token]);

    const handleAccept = async () => {
        if (!user) {
            // Not logged in — redirect to register/login with return URL
            router.push(`/register?redirect=/invite/${token}`);
            return;
        }

        setAccepting(true);
        setError(null);
        try {
            const res = await fetch("/api/auth/user/invites/accept", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Không thể chấp nhận lời mời");

            await refreshAll();
            setDone(true);
            setTimeout(() => router.push("/"), 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setAccepting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (error && !invite) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg p-4">
                <div className="w-full max-w-md text-center">
                    <div className="size-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-3xl text-red-500">link_off</span>
                    </div>
                    <h1 className="text-2xl font-bold text-text-main mb-2">Lời mời không hợp lệ</h1>
                    <p className="text-text-muted mb-6">{error}</p>
                    <Link href="/" className="text-primary hover:underline text-sm">
                        Về trang chủ
                    </Link>
                </div>
            </div>
        );
    }

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg p-4">
                <div className="w-full max-w-md text-center">
                    <div className="size-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-3xl text-green-500">check_circle</span>
                    </div>
                    <h1 className="text-2xl font-bold text-text-main mb-2">Đã tham gia team!</h1>
                    <p className="text-text-muted">Đang chuyển hướng về dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-4 relative">
            {/* Language Toggle */}
            <div className="absolute top-6 right-6 z-50">
                <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-2xl p-1 shadow-lg">
                    <LanguageSwitcher />
                </div>
            </div>
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="bg-surface border border-border rounded-3xl p-8 shadow-2xl">
                    {/* Icon */}
                    <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20">
                        <span className="material-symbols-outlined text-3xl text-primary">group_add</span>
                    </div>

                    <h1 className="text-2xl font-bold text-text-main text-center mb-1">
                        Bạn được mời vào team
                    </h1>
                    <p className="text-text-muted text-center text-sm mb-6">
                        <span className="font-semibold text-text-main">{invite?.inviterName}</span> đã mời bạn tham gia
                    </p>

                    {/* Workspace info */}
                    <div className="bg-bg rounded-2xl border border-border p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-indigo-400">corporate_fare</span>
                            </div>
                            <div>
                                <p className="font-semibold text-text-main">{invite?.workspaceName}</p>
                                <p className="text-xs text-text-muted capitalize">
                                    {invite?.workspaceType === "team" ? "Team workspace" : "Personal workspace"} · Role: <span className="font-semibold">{invite?.role}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Email check */}
                    {invite?.email && (
                        <div className="flex items-center gap-2 text-xs text-text-muted mb-4 px-1">
                            <span className="material-symbols-outlined text-[14px]">mail</span>
                            Lời mời dành cho: <span className="font-semibold text-text-main">{invite.email}</span>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm mb-4">
                            <span className="material-symbols-outlined text-base">error</span>
                            {error}
                        </div>
                    )}

                    {/* Action buttons */}
                    {!user ? (
                        <div className="flex flex-col gap-3">
                            <p className="text-xs text-text-muted text-center mb-1">
                                Bạn cần đăng nhập hoặc đăng ký để chấp nhận lời mời
                            </p>
                            <button
                                onClick={() => router.push(`/login?redirect=/invite/${token}`)}
                                className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all"
                            >
                                Đăng nhập
                            </button>
                            <button
                                onClick={() => router.push(`/register?redirect=/invite/${token}`)}
                                className="w-full py-3 rounded-xl border border-border text-text-main font-semibold hover:bg-surface/50 transition-all"
                            >
                                Tạo tài khoản mới
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleAccept}
                            disabled={accepting}
                            className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[20px]">
                                {accepting ? "progress_activity" : "check"}
                            </span>
                            {accepting ? "Đang xử lý..." : "Chấp nhận lời mời"}
                        </button>
                    )}
                </div>

                <p className="text-center text-xs text-text-muted mt-4">
                    Lời mời hết hạn: {invite?.expiresAt ? new Date(invite.expiresAt).toLocaleDateString("vi-VN") : "—"}
                </p>
            </div>
        </div>
    );
}
