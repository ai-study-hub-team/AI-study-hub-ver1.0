import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CircleOff,
  Eye,
  Loader2,
  PackagePlus,
  Pencil,
  RefreshCcw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  adminPlanApi,
  type AdminPlanPayload,
  type PlanResponse,
} from "../../services/adminPlanApi";
import { PaginationControls } from "../../components/ui/PaginationControls";

type DialogMode = "create" | "edit" | "view" | null;
type PlanStatusTab = "active" | "inactive";

const EMPTY_FORM: AdminPlanPayload = {
  code: "",
  name: "",
  storageLimitMb: 0,
  maxUploadSizePerFileMb: 0,
  dailyTokenLimit: 0,
  price: 0,
  durationDays: 0,
  description: "",
  allowImageUpload: true,
  allowDocumentUpload: true,
  allowVideoUpload: false,
  allowAudioUpload: false,
  isActive: true,
};

const formatNumber = (value: number | null | undefined) =>
  new Intl.NumberFormat("en-US").format(Number(value ?? 0));

const formatPrice = (value: number | null | undefined) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (error as {
      response?: { data?: { message?: string; error?: string } | string };
    }).response;
    const data = response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object") {
      return data.message || data.error || fallback;
    }
  }
  return fallback;
};

export function PlanManagement() {
  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<PlanResponse | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<PlanStatusTab>("active");
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<AdminPlanPayload>(EMPTY_FORM);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminPlanApi.getPlans();
      setPlans(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Cannot load subscription plans."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const filteredPlans = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const plansForTab = plans.filter((plan) =>
      statusTab === "active" ? plan.isActive : !plan.isActive,
    );
    const matchingPlans = !keyword ? plansForTab : plansForTab.filter(
      (plan) =>
        plan.code.toLowerCase().includes(keyword) ||
        plan.name.toLowerCase().includes(keyword) ||
        plan.description?.toLowerCase().includes(keyword),
    );
    return [...matchingPlans].sort(
      (firstPlan, secondPlan) =>
        firstPlan.code.localeCompare(secondPlan.code) ||
        secondPlan.version - firstPlan.version,
    );
  }, [plans, search, statusTab]);

  const activePlanCount = plans.filter((plan) => plan.isActive).length;
  const inactivePlanCount = plans.length - activePlanCount;

  const paginatedPlans = filteredPlans.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => setCurrentPage(1), [search, statusTab]);

  const closeDialog = (force = false) => {
    if (saving && !force) return;
    setDialogMode(null);
    setSelectedId(null);
    setForm(EMPTY_FORM);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setSelectedId(null);
    setDialogMode("create");
  };

  const openPlan = async (id: number, mode: "view" | "edit") => {
    setSelectedId(id);
    setDialogMode(mode);
    setSaving(true);
    try {
      const response = await adminPlanApi.getPlan(id);
      const plan = response.data;
      setForm({
        code: plan.code,
        name: plan.name,
        storageLimitMb: Number(plan.storageLimitMb),
        maxUploadSizePerFileMb: Number(plan.maxUploadSizePerFileMb),
        dailyTokenLimit: Number(plan.dailyTokenLimit),
        price: Number(plan.price),
        durationDays: Number(plan.durationDays ?? 0),
        description: plan.description ?? "",
        allowImageUpload: plan.allowImageUpload,
        allowDocumentUpload: plan.allowDocumentUpload,
        allowVideoUpload: plan.allowVideoUpload,
        allowAudioUpload: plan.allowAudioUpload,
        isActive: plan.isActive,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Cannot load plan details."));
      setDialogMode(null);
      setSelectedId(null);
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof AdminPlanPayload>(
    key: K,
    value: AdminPlanPayload[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const validateForm = () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Plan code and name are required.");
      return false;
    }
    const numericFields = [
      form.storageLimitMb,
      form.maxUploadSizePerFileMb,
      form.dailyTokenLimit,
      form.price,
      form.durationDays ?? 0,
    ];
    if (numericFields.some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)) {
      toast.error("Limits, price, and duration cannot be negative.");
      return false;
    }
    if (Number(form.price) > 0 && Number(form.durationDays ?? 0) <= 0) {
      toast.error("Paid plans must have a duration greater than 0 days.");
      return false;
    }
    return true;
  };

  const submitPlan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    const payload: AdminPlanPayload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description?.trim() || "",
      storageLimitMb: Number(form.storageLimitMb),
      maxUploadSizePerFileMb: Number(form.maxUploadSizePerFileMb),
      dailyTokenLimit: Number(form.dailyTokenLimit),
      price: Number(form.price),
      durationDays: Number(form.durationDays ?? 0),
    };

    setSaving(true);
    try {
      if (dialogMode === "create") {
        await adminPlanApi.createPlan(payload);
        toast.success("Subscription plan created successfully.");
      } else if (dialogMode === "edit" && selectedId !== null) {
        await adminPlanApi.updatePlan(selectedId, payload);
        toast.success("Subscription plan updated successfully.");
      }
      closeDialog(true);
      await loadPlans();
    } catch (error) {
      toast.error(getErrorMessage(error, "Cannot save subscription plan."));
    } finally {
      setSaving(false);
    }
  };

  const deactivatePlan = async (plan: PlanResponse) => {
    setDeletingId(plan.id);
    try {
      await adminPlanApi.deletePlan(plan.id);
      toast.success("Subscription plan deactivated successfully.");
      setDeactivateTarget(null);
      await loadPlans();
    } catch (error) {
      toast.error(getErrorMessage(error, "Cannot deactivate subscription plan."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Plan Management
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Create and maintain storage, AI token, upload, and pricing limits.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
        >
          <PackagePlus className="h-4 w-4" /> Create plan
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by plan name or code"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <button
            type="button"
            onClick={() => void loadPlans()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex gap-2 border-b border-slate-200 px-5 pt-4 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setStatusTab("active")}
            className={`border-b-2 px-3 pb-3 text-sm font-bold transition-colors ${
              statusTab === "active"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Active Plans ({activePlanCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab("inactive")}
            className={`border-b-2 px-3 pb-3 text-sm font-bold transition-colors ${
              statusTab === "inactive"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Inactive Plans ({inactivePlanCount})
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800/70">
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-5 py-4">Plan</th>
                <th className="px-5 py-4">Version</th>
                <th className="px-5 py-4">Price</th>
                <th className="px-5 py-4">Storage</th>
                <th className="px-5 py-4">Daily tokens</th>
                <th className="px-5 py-4">Duration</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" /></td></tr>
              ) : filteredPlans.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-16 text-center text-slate-500">No {statusTab} subscription plans found.</td></tr>
              ) : (
                paginatedPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900 dark:text-white">{plan.name}</p>
                      <p className="text-xs font-semibold text-blue-600">{plan.code}</p>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">
                      Version {plan.version}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-200">{formatPrice(plan.price)}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{formatNumber(plan.storageLimitMb)} MB</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{formatNumber(plan.dailyTokenLimit)}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{plan.durationDays ? `${plan.durationDays} days` : "Unlimited"}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${plan.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                        {plan.isActive ? "On sale" : "Previous version"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button title="View" onClick={() => void openPlan(plan.id, "view")} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"><Eye className="h-4 w-4" /></button>
                        {plan.isActive && (
                          <button title="Edit" onClick={() => void openPlan(plan.id, "edit")} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-amber-600 dark:hover:bg-slate-800"><Pencil className="h-4 w-4" /></button>
                        )}
                        {plan.isActive && plan.code.toUpperCase() !== "FREE" && (
                          <button title="Deactivate plan" aria-label={`Deactivate ${plan.name} plan`} disabled={deletingId === plan.id} onClick={() => setDeactivateTarget(plan)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40">
                            {deletingId === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleOff className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 pb-5">
          <PaginationControls currentPage={currentPage} totalItems={filteredPlans.length} pageSize={pageSize} onPageChange={setCurrentPage} />
        </div>
      </div>

      {dialogMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {dialogMode === "create" ? "Create subscription plan" : dialogMode === "edit" ? "Edit subscription plan" : "Plan details"}
                </h2>
                <p className="text-sm text-slate-500">{dialogMode === "view" ? "Information returned by GET /api/admin/plans/{id}." : "Configure plan limits and upload permissions."}</p>
              </div>
              <button type="button" onClick={() => closeDialog()} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>

            {saving && dialogMode === "view" ? (
              <div className="p-16 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-600" /></div>
            ) : (
              <form onSubmit={submitPlan} className="space-y-6 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Plan code">
                    <input
                      disabled={dialogMode !== "create"}
                      value={form.code}
                      onChange={(e) => updateField("code", e.target.value)}
                      className="form-input"
                      placeholder="PREMIUM"
                    />
                    {dialogMode === "edit" && (
                      <span className="mt-1.5 block text-xs text-slate-500 dark:text-slate-400">
                        Plan codes cannot be changed after creation because
                        subscriptions and pending payments reference them.
                      </span>
                    )}
                  </Field>
                  <Field label="Plan name"><input disabled={dialogMode === "view"} value={form.name} onChange={(e) => updateField("name", e.target.value)} className="form-input" placeholder="Premium Plan" /></Field>
                  <NumberField label="Storage limit (MB)" value={form.storageLimitMb} disabled={dialogMode === "view"} onChange={(value) => updateField("storageLimitMb", value)} />
                  <NumberField label="Maximum upload per file (MB)" value={form.maxUploadSizePerFileMb} disabled={dialogMode === "view"} onChange={(value) => updateField("maxUploadSizePerFileMb", value)} />
                  <NumberField label="Daily token limit" value={form.dailyTokenLimit} disabled={dialogMode === "view"} onChange={(value) => updateField("dailyTokenLimit", value)} />
                  <NumberField label="Price (VND)" value={form.price} disabled={dialogMode === "view"} onChange={(value) => updateField("price", value)} />
                  <NumberField label="Duration (days)" value={form.durationDays ?? 0} disabled={dialogMode === "view"} onChange={(value) => updateField("durationDays", value)} />
                  <Field label="Status">
                    {dialogMode === "create" ? (
                      <select value={form.isActive ? "active" : "inactive"} onChange={(e) => updateField("isActive", e.target.value === "active")} className="form-input">
                        <option value="active">Active</option><option value="inactive">Inactive</option>
                      </select>
                    ) : (
                      <div className="flex h-[42px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${form.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
                          {form.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    )}
                  </Field>
                </div>

                <Field label="Description"><textarea disabled={dialogMode === "view"} value={form.description ?? ""} onChange={(e) => updateField("description", e.target.value)} rows={3} className="form-input resize-none" /></Field>

                {dialogMode === "edit" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    Changes to storage, token limits, upload size, and upload
                    permissions apply to new purchases or renewals. Existing
                    subscriptions keep their current snapshotted benefits until
                    the user renews or changes plan.
                  </div>
                )}

                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Allowed uploads</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PermissionToggle label="Documents" checked={form.allowDocumentUpload} disabled={dialogMode === "view"} onChange={(value) => updateField("allowDocumentUpload", value)} />
                    <PermissionToggle label="Images" checked={form.allowImageUpload} disabled={dialogMode === "view"} onChange={(value) => updateField("allowImageUpload", value)} />
                    <PermissionToggle label="Videos" checked={form.allowVideoUpload} disabled={dialogMode === "view"} onChange={(value) => updateField("allowVideoUpload", value)} />
                    <PermissionToggle label="Audio" checked={form.allowAudioUpload} disabled={dialogMode === "view"} onChange={(value) => updateField("allowAudioUpload", value)} />
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-700">
                  <button type="button" onClick={() => closeDialog()} className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{dialogMode === "view" ? "Close" : "Cancel"}</button>
                  {dialogMode !== "view" && (
                    <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {dialogMode === "create" ? "Create plan" : "Save changes"}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              Deactivate Plan?
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to deactivate the{" "}
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {deactivateTarget.name}
              </span>{" "}
              plan? It will no longer be available for new purchases. Existing
              subscribers will keep their current benefits until their
              subscription expires.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => setDeactivateTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => void deactivatePlan(deactivateTarget)}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingId === deactivateTarget.id && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {deletingId === deactivateTarget.id
                  ? "Deactivating..."
                  : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.form-input{width:100%;border-radius:.75rem;border:1px solid rgb(226 232 240);background:white;padding:.625rem .75rem;font-size:.875rem;outline:none}.form-input:focus{border-color:rgb(59 130 246)}.form-input:disabled{cursor:not-allowed;background:rgb(248 250 252);opacity:.8}.dark .form-input{border-color:rgb(51 65 85);background:rgb(2 6 23);color:white}.dark .form-input:disabled{background:rgb(30 41 59)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>{children}</label>;
}

function NumberField({ label, value, disabled, onChange }: { label: string; value: number; disabled: boolean; onChange: (value: number) => void }) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={0}
        disabled={disabled}
        value={value}
        onChange={(event) => {
          const normalizedText = event.currentTarget.value.replace(
            /^0+(?=\d)/,
            "",
          );
          event.currentTarget.value = normalizedText;
          onChange(Number(normalizedText));
        }}
        onBlur={(event) => {
          const normalizedValue = Math.max(0, Number(event.currentTarget.value) || 0);
          event.currentTarget.value = String(normalizedValue);
          onChange(normalizedValue);
        }}
        className="form-input"
      />
    </Field>
  );
}

function PermissionToggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className={`flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-700 ${disabled ? "cursor-default" : "cursor-pointer"}`}>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
    </label>
  );
}
