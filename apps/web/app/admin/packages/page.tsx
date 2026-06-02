"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((r) => r.json());

type PricingPackage = {
  id: string;
  name: string;
  description: string | null;
  priceUSD: number;
  credits: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type PackageFormState = {
  name: string;
  description: string;
  priceUSD: string;
  credits: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: PackageFormState = {
  name: "",
  description: "",
  priceUSD: "",
  credits: "",
  sortOrder: "0",
  isActive: true,
};

export default function AdminPackagesPage() {
  const { data, isLoading, mutate } = useSWR<{ packages: PricingPackage[] }>(
    "/api/admin/packages",
    fetcher,
  );
  const [form, setForm] = useState<PackageFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const packages = useMemo(() => data?.packages || [], [data?.packages]);

  function patchForm(patch: Partial<PackageFormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function startEdit(pkg: PricingPackage) {
    setEditingId(pkg.id);
    setError(null);
    setForm({
      name: pkg.name,
      description: pkg.description || "",
      priceUSD: String(pkg.priceUSD),
      credits: String(pkg.credits),
      sortOrder: String(pkg.sortOrder),
      isActive: pkg.isActive,
    });
  }

  function resetForm() {
    setEditingId(null);
    setError(null);
    setForm(emptyForm);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: form.name,
      description: form.description,
      priceUSD: Number(form.priceUSD),
      credits: Number(form.credits),
      sortOrder: Number(form.sortOrder),
      isActive: form.isActive,
    };

    const response = await fetch(
      editingId ? `/api/admin/packages/${editingId}` : "/api/admin/packages",
      {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const result = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      setError(result.error || "Failed to save package");
      return;
    }

    resetForm();
    mutate();
  }

  async function toggleActive(pkg: PricingPackage) {
    await fetch(`/api/admin/packages/${pkg.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !pkg.isActive }),
    });
    mutate();
  }

  async function deletePackage(pkg: PricingPackage) {
    if (!confirm(`Delete package "${pkg.name}"?`)) return;
    await fetch(`/api/admin/packages/${pkg.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (editingId === pkg.id) resetForm();
    mutate();
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-text-main flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-500">inventory_2</span>
          Billing Packages
        </h1>
        <p className="text-sm text-text-muted">
          Admin co the tao, sua, bat tat va sap xep cac goi hien thi trong Billing.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-6">
        <form
          onSubmit={submitForm}
          className="rounded-2xl border border-border bg-card p-5 space-y-4 h-fit"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-text-main">
                {editingId ? "Edit Package" : "Create Package"}
              </h2>
              <p className="text-xs text-text-muted mt-1">
                Cau hinh ten goi, gia USD, credits va trang thai hien thi.
              </p>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold text-text-muted hover:text-text-main"
              >
                Cancel
              </button>
            )}
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Name</span>
            <input
              value={form.name}
              onChange={(e) => patchForm({ name: e.target.value })}
              className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm outline-none focus:border-primary"
              placeholder="Growth Pack"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => patchForm({ description: e.target.value })}
              className="min-h-28 w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm outline-none focus:border-primary"
              placeholder={"Dong 1\nDong 2"}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Price USD</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.priceUSD}
                onChange={(e) => patchForm({ priceUSD: e.target.value })}
                className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Credits</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.credits}
                onChange={(e) => patchForm({ credits: e.target.value })}
                className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Sort Order</span>
              <input
                type="number"
                step="1"
                value={form.sortOrder}
                onChange={(e) => patchForm({ sortOrder: e.target.value })}
                className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="flex items-end gap-3 rounded-xl border border-border bg-bg px-4 py-3">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => patchForm({ isActive: e.target.checked })}
                className="size-4"
              />
              <span className="text-sm font-medium text-text-main">Active on billing</span>
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Saving..." : editingId ? "Update Package" : "Create Package"}
          </button>
        </form>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-text-main">Current Packages</h2>
              <p className="text-xs text-text-muted mt-1">
                {isLoading ? "Loading..." : `${packages.length} package(s)`}
              </p>
            </div>
          </div>

          <div className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="px-5 py-5 animate-pulse">
                  <div className="h-4 w-40 rounded bg-surface-hover mb-3" />
                  <div className="h-3 w-full rounded bg-surface-hover mb-2" />
                  <div className="h-3 w-2/3 rounded bg-surface-hover" />
                </div>
              ))
            ) : packages.length === 0 ? (
              <div className="px-5 py-10 text-sm text-text-muted italic">
                Chua co package nao.
              </div>
            ) : (
              packages.map((pkg) => (
                <div key={pkg.id} className="px-5 py-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-text-main">{pkg.name}</h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          pkg.isActive
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-border text-text-muted"
                        }`}
                      >
                        {pkg.isActive ? "Active" : "Hidden"}
                      </span>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                        Order {pkg.sortOrder}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted mt-1 whitespace-pre-line">
                      {pkg.description || "No description"}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm font-semibold">
                      <span className="text-text-main">${pkg.priceUSD.toFixed(2)}</span>
                      <span className="text-primary">${pkg.credits.toFixed(2)} credits</span>
                      <span className="text-text-muted">
                        Updated {new Date(pkg.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(pkg)}
                      className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-main hover:bg-bg"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(pkg)}
                      className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-main hover:bg-bg"
                    >
                      {pkg.isActive ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={() => deletePackage(pkg)}
                      className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
