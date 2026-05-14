"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PortalClient() {
  const router = useRouter();

  useEffect(() => {
    router.push("/usage");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        <p className="text-sm text-text-muted">Loading your portal...</p>
      </div>
    </div>
  );
}
