"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  BadgePercent,
  ClipboardList,
  Gift,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/hooks/useToast";
import { getTokenClient } from "@/lib/getTokenClient";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000";

const OFFER_BASE_PATH = "/api/passprive-offers";
const NESTED_DETAIL_KEYS = new Set([
  "store_targets",
  "storeTargets",
  "plan_targets",
  "planTargets",
  "conditions",
  "usage_limit",
  "usageLimit",
  "redemptions",
]);

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function prettify(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function parseJson<T = unknown>(value: string, label: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    showToast({
      title: `Invalid ${label} JSON`,
      description: error instanceof Error ? error.message : "Please fix the JSON and try again.",
      type: "error",
    });
    return null;
  }
}

function getId(value: unknown): string {
  if (!isRecord(value)) return "";
  const candidate = value.id ?? value.offer_id ?? value.target_id ?? value.condition_id;
  return candidate === undefined || candidate === null ? "" : String(candidate);
}

function getLabel(value: unknown) {
  if (!isRecord(value)) return "Untitled item";
  const candidate =
    value.title ??
    value.name ??
    value.code ??
    value.slug ??
    value.label ??
    value.type ??
    value.status;
  return typeof candidate === "string" && candidate.trim() ? candidate : `Item ${getId(value) || "-"}`;
}

function normalizeArray(payload: unknown): JsonRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) return [];

  const keys = [
    "offers",
    "offer",
    "items",
    "results",
    "data",
    "records",
    "store_targets",
    "plan_targets",
    "conditions",
    "redemptions",
    "subscriptions",
    "store_subscriptions",
  ];

  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  return [];
}

function normalizeObject(payload: unknown): JsonRecord | null {
  if (isRecord(payload)) {
    const keys = ["offer", "data", "item", "result", "usage_limit", "subscription"];
    for (const key of keys) {
      if (isRecord(payload[key])) return payload[key] as JsonRecord;
    }
    return payload;
  }

  return null;
}

function stripNestedOfferData(offer: JsonRecord | null) {
  if (!offer) return {};
  return Object.fromEntries(
    Object.entries(offer).filter(([key]) => !NESTED_DETAIL_KEYS.has(key))
  );
}

function inferStatus(offer: JsonRecord) {
  if (typeof offer.status === "string" && offer.status.trim()) return offer.status;
  if (typeof offer.is_active === "boolean") return offer.is_active ? "ACTIVE" : "INACTIVE";
  if (typeof offer.active === "boolean") return offer.active ? "ACTIVE" : "INACTIVE";
  return "Unknown";
}

function formatError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message =
      (isRecord(error.response?.data) && typeof error.response?.data?.message === "string"
        ? error.response?.data?.message
        : undefined) || error.message;
    return message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

async function getAdminHeaders(contentType?: string) {
  const token = await getTokenClient();
  if (!token) {
    throw new Error("Not logged in. Please login again as admin or superadmin.");
  }

  return {
    ...(contentType ? { "Content-Type": contentType } : {}),
    Authorization: `Bearer ${token}`,
  };
}

async function apiGet(url: string) {
  return axios.get(url, {
    headers: await getAdminHeaders(),
  });
}

async function apiPost(url: string, payload: unknown) {
  return axios.post(url, payload, {
    headers: await getAdminHeaders("application/json"),
  });
}

async function apiPut(url: string, payload: unknown) {
  return axios.put(url, payload, {
    headers: await getAdminHeaders("application/json"),
  });
}

async function apiDelete(url: string) {
  return axios.delete(url, {
    headers: await getAdminHeaders(),
  });
}

function StatusBadge({ label }: { label: string }) {
  const active =
    label.toLowerCase() === "active" ||
    label.toLowerCase() === "live" ||
    label.toLowerCase() === "enabled";

  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
        active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function SummaryCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {title}
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{hint}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </div>
    </div>
  );
}

function JsonPreview({ value }: { value: unknown }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
      {prettify(value)}
    </pre>
  );
}

export default function PasspriveOffersPage() {
  const searchParams = useSearchParams();
  const [offers, setOffers] = useState<JsonRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<JsonRecord[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [selectedOffer, setSelectedOffer] = useState<JsonRecord | null>(null);
  const [storeTargets, setStoreTargets] = useState<JsonRecord[]>([]);
  const [planTargets, setPlanTargets] = useState<JsonRecord[]>([]);
  const [conditions, setConditions] = useState<JsonRecord[]>([]);
  const [redemptions, setRedemptions] = useState<JsonRecord[]>([]);
  const [usageLimit, setUsageLimit] = useState<JsonRecord | null>(null);
  const [offerDraft, setOfferDraft] = useState("{}");
  const [search, setSearch] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [savingOffer, setSavingOffer] = useState(false);
  const [storeTargetDraft, setStoreTargetDraft] = useState("{\n  \n}");
  const [planTargetDraft, setPlanTargetDraft] = useState("{\n  \n}");
  const [conditionDraft, setConditionDraft] = useState("{\n  \n}");
  const [conditionEditingId, setConditionEditingId] = useState<string | null>(null);
  const [usageLimitDraft, setUsageLimitDraft] = useState("{\n  \n}");
  const [redemptionDraft, setRedemptionDraft] = useState("{\n  \n}");
  const [redemptionEditingId, setRedemptionEditingId] = useState<string | null>(null);
  const [subscriptionDraft, setSubscriptionDraft] = useState("{\n  \n}");
  const [subscriptionEditingId, setSubscriptionEditingId] = useState<string | null>(null);

  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return offers;

    return offers.filter((offer) =>
      prettify(offer).toLowerCase().includes(query)
    );
  }, [offers, search]);

  async function loadOffers(preferredId?: string) {
    try {
      setLoadingOffers(true);
      const endpoint = showActiveOnly ? `${OFFER_BASE_PATH}/active` : OFFER_BASE_PATH;
      const response = await apiGet(`${backendUrl}${endpoint}`);
      const nextOffers = normalizeArray(response.data);
      setOffers(nextOffers);

      const selectedId =
        preferredId && nextOffers.some((offer) => getId(offer) === preferredId)
          ? preferredId
          : selectedOfferId && nextOffers.some((offer) => getId(offer) === selectedOfferId)
          ? selectedOfferId
          : getId(nextOffers[0]);

      setSelectedOfferId(selectedId || "");
    } catch (error) {
      showToast({
        title: "Failed to load PassPrive offers",
        description: formatError(error, "Please try again."),
        type: "error",
      });
      setOffers([]);
      setSelectedOfferId("");
    } finally {
      setLoadingOffers(false);
    }
  }

  async function loadOfferDetail(offerId: string) {
    if (!offerId) {
      setSelectedOffer(null);
      setOfferDraft("{}");
      setStoreTargets([]);
      setPlanTargets([]);
      setConditions([]);
      setRedemptions([]);
      setUsageLimit(null);
      setUsageLimitDraft("{\n  \n}");
      return;
    }

    try {
      setLoadingDetail(true);

      const [
        detailResponse,
        storeTargetsResponse,
        planTargetsResponse,
        conditionsResponse,
        usageLimitResponse,
        redemptionsResponse,
      ] = await Promise.all([
        apiGet(`${backendUrl}${OFFER_BASE_PATH}/${offerId}`),
        apiGet(`${backendUrl}${OFFER_BASE_PATH}/${offerId}/store-targets`),
        apiGet(`${backendUrl}${OFFER_BASE_PATH}/${offerId}/plan-targets`),
        apiGet(`${backendUrl}${OFFER_BASE_PATH}/${offerId}/conditions`),
        apiGet(`${backendUrl}${OFFER_BASE_PATH}/${offerId}/usage-limit`),
        apiGet(`${backendUrl}${OFFER_BASE_PATH}/${offerId}/redemptions`),
      ]);

      const detail = normalizeObject(detailResponse.data) || {};
      const nextStoreTargets =
        normalizeArray(storeTargetsResponse.data).length > 0
          ? normalizeArray(storeTargetsResponse.data)
          : normalizeArray(detail.store_targets);
      const nextPlanTargets =
        normalizeArray(planTargetsResponse.data).length > 0
          ? normalizeArray(planTargetsResponse.data)
          : normalizeArray(detail.plan_targets);
      const nextConditions =
        normalizeArray(conditionsResponse.data).length > 0
          ? normalizeArray(conditionsResponse.data)
          : normalizeArray(detail.conditions);
      const nextRedemptions =
        normalizeArray(redemptionsResponse.data).length > 0
          ? normalizeArray(redemptionsResponse.data)
          : normalizeArray(detail.redemptions);
      const nextUsageLimit =
        normalizeObject(usageLimitResponse.data) ||
        normalizeObject(detail.usage_limit) ||
        normalizeObject(detail.usageLimit);

      setSelectedOffer(detail);
      setOfferDraft(prettify(stripNestedOfferData(detail)));
      setStoreTargets(nextStoreTargets);
      setPlanTargets(nextPlanTargets);
      setConditions(nextConditions);
      setRedemptions(nextRedemptions);
      setUsageLimit(nextUsageLimit);
      setUsageLimitDraft(prettify(nextUsageLimit || {}));
      setConditionEditingId(null);
      setConditionDraft("{\n  \n}");
      setRedemptionEditingId(null);
      setRedemptionDraft("{\n  \n}");
    } catch (error) {
      showToast({
        title: "Failed to load offer detail",
        description: formatError(error, "Please refresh and try again."),
        type: "error",
      });
    } finally {
      setLoadingDetail(false);
    }
  }

  async function loadSubscriptions() {
    try {
      setLoadingSubscriptions(true);
      const response = await apiGet(`${backendUrl}${OFFER_BASE_PATH}/store-subscriptions`);
      setSubscriptions(normalizeArray(response.data));
    } catch (error) {
      showToast({
        title: "Failed to load store subscriptions",
        description: formatError(error, "Please try again."),
        type: "error",
      });
      setSubscriptions([]);
    } finally {
      setLoadingSubscriptions(false);
    }
  }

  useEffect(() => {
    // This refreshes from the list endpoint whenever the active filter changes.
    const preferredId = searchParams.get("offerId") || undefined;
    void loadOffers(preferredId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showActiveOnly, searchParams]);

  useEffect(() => {
    void loadSubscriptions();
  }, []);

  useEffect(() => {
    if (selectedOfferId) {
      void loadOfferDetail(selectedOfferId);
    }
  }, [selectedOfferId]);

  async function handleUpdateOffer() {
    if (!selectedOfferId) return;
    const payload = parseJson<JsonRecord>(offerDraft, "offer");
    if (!payload) return;

    try {
      setSavingOffer(true);
      await apiPut(`${backendUrl}${OFFER_BASE_PATH}/${selectedOfferId}`, payload);
      showToast({ title: "Offer updated successfully" });
      await loadOffers(selectedOfferId);
      await loadOfferDetail(selectedOfferId);
    } catch (error) {
      showToast({
        title: "Failed to update offer",
        description: formatError(error, "Please review the payload and try again."),
        type: "error",
      });
    } finally {
      setSavingOffer(false);
    }
  }

  async function handleDeleteOffer() {
    if (!selectedOfferId) return;
    if (!window.confirm("Delete this PassPrive offer? This cannot be undone.")) return;

    try {
      await apiDelete(`${backendUrl}${OFFER_BASE_PATH}/${selectedOfferId}`);
      showToast({ title: "Offer deleted successfully" });
      const deletedId = selectedOfferId;
      setSelectedOfferId("");
      await loadOffers();
      if (deletedId === selectedOfferId) {
        setSelectedOffer(null);
      }
    } catch (error) {
      showToast({
        title: "Failed to delete offer",
        description: formatError(error, "Please try again."),
        type: "error",
      });
    }
  }

  async function createNestedResource(
    endpoint: string,
    draft: string,
    label: string,
    onDone: () => Promise<void>,
    reset: () => void
  ) {
    const payload = parseJson<JsonRecord>(draft, label);
    if (!payload) return;

    try {
      await apiPost(`${backendUrl}${endpoint}`, payload);
      showToast({ title: `${label} added successfully` });
      reset();
      await onDone();
    } catch (error) {
      showToast({
        title: `Failed to add ${label.toLowerCase()}`,
        description: formatError(error, "Please review the payload and try again."),
        type: "error",
      });
    }
  }

  async function updateNestedResource(
    endpoint: string,
    draft: string,
    label: string,
    onDone: () => Promise<void>,
    reset: () => void
  ) {
    const payload = parseJson<JsonRecord>(draft, label);
    if (!payload) return;

    try {
      await apiPut(`${backendUrl}${endpoint}`, payload);
      showToast({ title: `${label} updated successfully` });
      reset();
      await onDone();
    } catch (error) {
      showToast({
        title: `Failed to update ${label.toLowerCase()}`,
        description: formatError(error, "Please review the payload and try again."),
        type: "error",
      });
    }
  }

  async function deleteNestedResource(
    endpoint: string,
    label: string,
    onDone: () => Promise<void>
  ) {
    if (!window.confirm(`Delete this ${label.toLowerCase()}?`)) return;

    try {
      await apiDelete(`${backendUrl}${endpoint}`);
      showToast({ title: `${label} deleted successfully` });
      await onDone();
    } catch (error) {
      showToast({
        title: `Failed to delete ${label.toLowerCase()}`,
        description: formatError(error, "Please try again."),
        type: "error",
      });
    }
  }

  const selectedOfferLabel = selectedOffer ? getLabel(selectedOffer) : "Select an offer";
  const activeCount = offers.filter((offer) => inferStatus(offer).toLowerCase() === "active").length;

  return (
    <div className="min-h-full bg-[linear-gradient(135deg,_#FFF7ED_0%,_#EFF6FF_100%)] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600">
                Offers Platform
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">
                PassPrive Offers
              </h1>
              <p className="mt-3 text-sm text-slate-500">
                Dedicated admin for product offers, targeting, conditions, usage limits,
                redemptions, and store subscriptions. This is kept separate from banner
                creatives so both systems can evolve independently.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/passprive-offers/new"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-700"
              >
                <Plus className="h-4 w-4" />
                Add Offer
              </Link>
              <Link
                href="/dashboard/offers"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Banner Management
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard/bank-offers"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Bank Offers
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            title="Total Offers"
            value={offers.length}
            hint="All PassPrive offers from the backend list endpoint."
            icon={Gift}
          />
          <SummaryCard
            title="Active Offers"
            value={activeCount}
            hint="Detected from offer status or active flags."
            icon={ShieldCheck}
          />
          <SummaryCard
            title="Subscriptions"
            value={subscriptions.length}
            hint="Store subscriptions attached to the PassPrive offers engine."
            icon={Layers3}
          />
        </section>

        <Tabs defaultValue="offers" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-white p-1 shadow-sm md:w-[420px]">
            <TabsTrigger value="offers" className="rounded-xl">
              PassPrive Offers
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="rounded-xl">
              Store Subscriptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="offers">
            <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              <section className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Offer Registry</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Browse all configured PassPrive offers.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void loadOffers(selectedOfferId)}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </Button>
                  </div>

                  <div className="mt-5 space-y-3">
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by title, code, or payload"
                    />
                    <label className="flex items-center gap-3 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={showActiveOnly}
                        onChange={(event) => setShowActiveOnly(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Show only `/active` offers
                    </label>
                  </div>

                  <div className="mt-5 space-y-3">
                    {loadingOffers ? (
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading offers...
                      </div>
                    ) : filteredOffers.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        No offers found for the current filter.
                      </div>
                    ) : (
                      filteredOffers.map((offer) => {
                        const offerId = getId(offer);
                        const active = offerId === selectedOfferId;
                        return (
                          <button
                            key={offerId || prettify(offer)}
                            onClick={() => setSelectedOfferId(offerId)}
                            className={[
                              "w-full rounded-2xl border p-4 text-left transition",
                              active
                                ? "border-amber-300 bg-amber-50"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                            ].join(" ")}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {getLabel(offer)}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  ID: {offerId || "Unavailable"}
                                </p>
                              </div>
                              <StatusBadge label={inferStatus(offer)} />
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-900">
                        {selectedOfferLabel}
                      </h2>
                      <p className="mt-2 text-sm text-slate-500">
                        Offer detail combines the base offer payload with store targets, plan
                        targets, conditions, and usage limits, while each nested section can
                        still be managed independently below.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        onClick={() => selectedOfferId && void loadOfferDetail(selectedOfferId)}
                        disabled={!selectedOfferId || loadingDetail}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh detail
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => void handleDeleteOffer()}
                        disabled={!selectedOfferId}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete offer
                      </Button>
                    </div>
                  </div>

                  {!selectedOfferId ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                      Select an offer from the left to manage its payload and nested resources.
                    </div>
                  ) : loadingDetail ? (
                    <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading offer detail...
                    </div>
                  ) : (
                    <div className="mt-6 space-y-6">
                      <div className="rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">Base Offer Payload</h3>
                            <p className="mt-1 text-sm text-slate-500">
                              Edit the main offer object only. Nested collections are handled in
                              their own sections below.
                            </p>
                          </div>
                          <Button onClick={() => void handleUpdateOffer()} disabled={savingOffer}>
                            {savingOffer ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                Save offer
                              </>
                            )}
                          </Button>
                        </div>
                        <Textarea
                          value={offerDraft}
                          onChange={(event) => setOfferDraft(event.target.value)}
                          className="mt-4 min-h-[260px] font-mono text-xs"
                        />
                      </div>

                      <div className="grid gap-6 2xl:grid-cols-2">
                        <ResourceSection
                          title="Store Targets"
                          description="Manage store-level targeting for the selected offer."
                          items={storeTargets}
                          createDraft={storeTargetDraft}
                          setCreateDraft={setStoreTargetDraft}
                          createLabel="Add store target"
                          emptyLabel="No store targets configured."
                          onCreate={() =>
                            createNestedResource(
                              `${OFFER_BASE_PATH}/${selectedOfferId}/store-targets`,
                              storeTargetDraft,
                              "Store target",
                              async () => loadOfferDetail(selectedOfferId),
                              () => setStoreTargetDraft("{\n  \n}")
                            )
                          }
                          onDelete={(itemId) =>
                            deleteNestedResource(
                              `${OFFER_BASE_PATH}/${selectedOfferId}/store-targets/${itemId}`,
                              "Store target",
                              async () => loadOfferDetail(selectedOfferId)
                            )
                          }
                        />

                        <ResourceSection
                          title="Plan Targets"
                          description="Manage plan eligibility targeting for the selected offer."
                          items={planTargets}
                          createDraft={planTargetDraft}
                          setCreateDraft={setPlanTargetDraft}
                          createLabel="Add plan target"
                          emptyLabel="No plan targets configured."
                          onCreate={() =>
                            createNestedResource(
                              `${OFFER_BASE_PATH}/${selectedOfferId}/plan-targets`,
                              planTargetDraft,
                              "Plan target",
                              async () => loadOfferDetail(selectedOfferId),
                              () => setPlanTargetDraft("{\n  \n}")
                            )
                          }
                          onDelete={(itemId) =>
                            deleteNestedResource(
                              `${OFFER_BASE_PATH}/${selectedOfferId}/plan-targets/${itemId}`,
                              "Plan target",
                              async () => loadOfferDetail(selectedOfferId)
                            )
                          }
                        />

                        <EditableResourceSection
                          title="Conditions"
                          description="Create, update, and remove offer conditions."
                          items={conditions}
                          draft={conditionDraft}
                          setDraft={setConditionDraft}
                          editingId={conditionEditingId}
                          setEditingId={setConditionEditingId}
                          createLabel="Add condition"
                          updateLabel="Update condition"
                          emptyLabel="No conditions configured."
                          onCreate={() =>
                            createNestedResource(
                              `${OFFER_BASE_PATH}/${selectedOfferId}/conditions`,
                              conditionDraft,
                              "Condition",
                              async () => loadOfferDetail(selectedOfferId),
                              () => {
                                setConditionDraft("{\n  \n}");
                                setConditionEditingId(null);
                              }
                            )
                          }
                          onUpdate={(itemId) =>
                            updateNestedResource(
                              `${OFFER_BASE_PATH}/${selectedOfferId}/conditions/${itemId}`,
                              conditionDraft,
                              "Condition",
                              async () => loadOfferDetail(selectedOfferId),
                              () => {
                                setConditionDraft("{\n  \n}");
                                setConditionEditingId(null);
                              }
                            )
                          }
                          onDelete={(itemId) =>
                            deleteNestedResource(
                              `${OFFER_BASE_PATH}/${selectedOfferId}/conditions/${itemId}`,
                              "Condition",
                              async () => loadOfferDetail(selectedOfferId)
                            )
                          }
                        />

                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="flex items-center gap-2">
                            <BadgePercent className="h-4 w-4 text-amber-600" />
                            <h3 className="text-lg font-semibold text-slate-900">Usage Limit</h3>
                          </div>
                          <p className="mt-2 text-sm text-slate-500">
                            Manage the single usage-limit object attached to this offer.
                          </p>
                          <Textarea
                            value={usageLimitDraft}
                            onChange={(event) => setUsageLimitDraft(event.target.value)}
                            className="mt-4 min-h-[220px] font-mono text-xs"
                          />
                          <div className="mt-4 flex gap-3">
                            <Button
                              onClick={() =>
                                updateNestedResource(
                                  `${OFFER_BASE_PATH}/${selectedOfferId}/usage-limit`,
                                  usageLimitDraft,
                                  "Usage limit",
                                  async () => loadOfferDetail(selectedOfferId),
                                  () => {}
                                )
                              }
                            >
                              <Save className="h-4 w-4" />
                              Save usage limit
                            </Button>
                            {usageLimit && (
                              <Button
                                variant="outline"
                                onClick={() => setUsageLimitDraft(prettify(usageLimit))}
                              >
                                Reset
                              </Button>
                            )}
                          </div>
                          {usageLimit && (
                            <div className="mt-4">
                              <JsonPreview value={usageLimit} />
                            </div>
                          )}
                        </div>
                      </div>

                      <EditableResourceSection
                        title="Redemptions"
                        description="Redemptions are intentionally non-deletable here to preserve audit history. Create new ones or update an existing redemption status."
                        items={redemptions}
                        draft={redemptionDraft}
                        setDraft={setRedemptionDraft}
                        editingId={redemptionEditingId}
                        setEditingId={setRedemptionEditingId}
                        createLabel="Add redemption"
                        updateLabel="Update redemption"
                        emptyLabel="No redemptions recorded."
                        onCreate={() =>
                          createNestedResource(
                            `${OFFER_BASE_PATH}/${selectedOfferId}/redemptions`,
                            redemptionDraft,
                            "Redemption",
                            async () => loadOfferDetail(selectedOfferId),
                            () => {
                              setRedemptionDraft("{\n  \n}");
                              setRedemptionEditingId(null);
                            }
                          )
                        }
                        onUpdate={(itemId) =>
                          updateNestedResource(
                            `${OFFER_BASE_PATH}/redemptions/${itemId}`,
                            redemptionDraft,
                            "Redemption",
                            async () => loadOfferDetail(selectedOfferId),
                            () => {
                              setRedemptionDraft("{\n  \n}");
                              setRedemptionEditingId(null);
                            }
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="subscriptions">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900">
                      Store Subscriptions
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Manage store subscription mappings independently from individual offer detail.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => void loadSubscriptions()}>
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>

                <div className="mt-6 space-y-4">
                  {loadingSubscriptions ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading subscriptions...
                    </div>
                  ) : subscriptions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      No store subscriptions configured.
                    </div>
                  ) : (
                    subscriptions.map((subscription) => {
                      const itemId = getId(subscription);
                      return (
                        <div
                          key={itemId || prettify(subscription)}
                          className="rounded-2xl border border-slate-200 p-4"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {getLabel(subscription)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                ID: {itemId || "Unavailable"}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSubscriptionEditingId(itemId || null);
                                  setSubscriptionDraft(prettify(subscription));
                                }}
                              >
                                Edit
                              </Button>
                              {itemId && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    void deleteNestedResource(
                                      `${OFFER_BASE_PATH}/store-subscriptions/${itemId}`,
                                      "Store subscription",
                                      loadSubscriptions
                                    )
                                  }
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="mt-4">
                            <JsonPreview value={subscription} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-amber-600" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    {subscriptionEditingId ? "Edit Subscription" : "Create Subscription"}
                  </h2>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Use the raw subscription payload so the admin stays compatible with backend
                  changes without another frontend rewrite.
                </p>
                <Textarea
                  value={subscriptionDraft}
                  onChange={(event) => setSubscriptionDraft(event.target.value)}
                  className="mt-4 min-h-[300px] font-mono text-xs"
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  {subscriptionEditingId ? (
                    <Button
                      onClick={() =>
                        void updateNestedResource(
                          `${OFFER_BASE_PATH}/store-subscriptions/${subscriptionEditingId}`,
                          subscriptionDraft,
                          "Store subscription",
                          loadSubscriptions,
                          () => {
                            setSubscriptionDraft("{\n  \n}");
                            setSubscriptionEditingId(null);
                          }
                        )
                      }
                    >
                      <Save className="h-4 w-4" />
                      Update subscription
                    </Button>
                  ) : (
                    <Button
                      onClick={() =>
                        void createNestedResource(
                          `${OFFER_BASE_PATH}/store-subscriptions`,
                          subscriptionDraft,
                          "Store subscription",
                          loadSubscriptions,
                          () => setSubscriptionDraft("{\n  \n}")
                        )
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Create subscription
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSubscriptionDraft("{\n  \n}");
                      setSubscriptionEditingId(null);
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ResourceSection({
  title,
  description,
  items,
  createDraft,
  setCreateDraft,
  createLabel,
  emptyLabel,
  onCreate,
  onDelete,
}: {
  title: string;
  description: string;
  items: JsonRecord[];
  createDraft: string;
  setCreateDraft: (value: string) => void;
  createLabel: string;
  emptyLabel: string;
  onCreate: () => void;
  onDelete?: (itemId: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            {emptyLabel}
          </div>
        ) : (
          items.map((item) => {
            const itemId = getId(item);
            return (
              <div key={itemId || prettify(item)} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{getLabel(item)}</p>
                    <p className="mt-1 text-xs text-slate-500">ID: {itemId || "Unavailable"}</p>
                  </div>
                  {onDelete && itemId && (
                    <Button variant="destructive" size="sm" onClick={() => onDelete(itemId)}>
                      Delete
                    </Button>
                  )}
                </div>
                <div className="mt-4">
                  <JsonPreview value={item} />
                </div>
              </div>
            );
          })
        )}
      </div>

      <Textarea
        value={createDraft}
        onChange={(event) => setCreateDraft(event.target.value)}
        className="mt-4 min-h-[180px] font-mono text-xs"
      />
      <Button onClick={onCreate} className="mt-4">
        <Plus className="h-4 w-4" />
        {createLabel}
      </Button>
    </div>
  );
}

function EditableResourceSection({
  title,
  description,
  items,
  draft,
  setDraft,
  editingId,
  setEditingId,
  createLabel,
  updateLabel,
  emptyLabel,
  onCreate,
  onUpdate,
  onDelete,
}: {
  title: string;
  description: string;
  items: JsonRecord[];
  draft: string;
  setDraft: (value: string) => void;
  editingId: string | null;
  setEditingId: (value: string | null) => void;
  createLabel: string;
  updateLabel: string;
  emptyLabel: string;
  onCreate: () => void;
  onUpdate: (itemId: string) => void;
  onDelete?: (itemId: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            {emptyLabel}
          </div>
        ) : (
          items.map((item) => {
            const itemId = getId(item);
            const active = editingId === itemId;

            return (
              <div
                key={itemId || prettify(item)}
                className={[
                  "rounded-2xl border p-4",
                  active ? "border-amber-300 bg-amber-50/60" : "border-slate-200",
                ].join(" ")}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{getLabel(item)}</p>
                    <p className="mt-1 text-xs text-slate-500">ID: {itemId || "Unavailable"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {itemId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(itemId);
                          setDraft(prettify(item));
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    {onDelete && itemId && (
                      <Button variant="destructive" size="sm" onClick={() => onDelete(itemId)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <JsonPreview value={item} />
                </div>
              </div>
            );
          })
        )}
      </div>

      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="mt-4 min-h-[220px] font-mono text-xs"
      />
      <div className="mt-4 flex flex-wrap gap-3">
        {editingId ? (
          <Button onClick={() => onUpdate(editingId)}>
            <Save className="h-4 w-4" />
            {updateLabel}
          </Button>
        ) : (
          <Button onClick={onCreate}>
            <Plus className="h-4 w-4" />
            {createLabel}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => {
            setEditingId(null);
            setDraft("{\n  \n}");
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
