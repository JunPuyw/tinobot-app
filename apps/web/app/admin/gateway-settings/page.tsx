"use client";

import { useEffect, useState } from "react";

export default function GatewaySettingsPage() {
  const [markup, setMarkup] = useState("0");
  const [vndUsdRate, setVndUsdRate] = useState("25000");
  const [modelOriginalPriceMultiplier, setModelOriginalPriceMultiplier] = useState("1");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/gateway-settings")
      .then((response) => response.json())
      .then(({ settings }) => {
        setMarkup(String(settings?.platformMarkupPercent ?? 0));
        setVndUsdRate(String(settings?.vndUsdRate ?? 25000));
        setModelOriginalPriceMultiplier(String(settings?.modelOriginalPriceMultiplier ?? 1));
      });
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/gateway-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platformMarkupPercent: Number(markup),
        vndUsdRate: Number(vndUsdRate),
        modelOriginalPriceMultiplier: Number(modelOriginalPriceMultiplier),
      }),
    });
    const data = await response.json();
    setSaving(false);
    setMessage(response.ok ? "Saved gateway billing settings." : data.error || "Save failed.");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-text-main">Gateway Billing</h1>
        <p className="mt-2 text-sm text-text-muted">
          Configure additional credits charged after successful platform model requests.
        </p>
      </div>
      <form onSubmit={save} className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <label className="block">
          <span className="text-sm font-semibold text-text-main">Platform markup (%)</span>
          <p className="mt-1 text-xs text-text-muted">Example: base cost 100 credits with 20% markup charges 120 credits.</p>
          <input value={markup} onChange={(event) => setMarkup(event.target.value)} type="number" min="0" step="0.01" className="mt-3 h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-text-main">VND per USD credit</span>
          <p className="mt-1 text-xs text-text-muted">Used for REQUEST pricing models that return fixed_price_vnd.</p>
          <input value={vndUsdRate} onChange={(event) => setVndUsdRate(event.target.value)} type="number" min="1" step="1" className="mt-3 h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-text-main">Virtual original price multiplier</span>
          <p className="mt-1 text-xs text-text-muted">Shows a crossed original price on /models. Actual charged model prices stay unchanged.</p>
          <input value={modelOriginalPriceMultiplier} onChange={(event) => setModelOriginalPriceMultiplier(event.target.value)} type="number" min="1" step="0.01" className="mt-3 h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm" />
        </label>
        <button disabled={saving} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {message && <p className="text-sm text-text-muted">{message}</p>}
      </form>
    </div>
  );
}
