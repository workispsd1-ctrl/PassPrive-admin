"use client";

import * as React from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";

import { OfferForm } from "@/app/dashboard/_components/unified-offers/OfferForm";
import {
  OfferApplicabilityTester,
  OfferBinsEditor,
  OfferConditionsEditor,
  OfferPaymentRulesEditor,
  OfferRedemptionsPanel,
  OfferTargetsEditor,
  OfferUsageLimitsEditor,
} from "@/app/dashboard/_components/unified-offers/OfferNestedEditors";
import {
  apiDelete,
  apiPost,
  apiPostForm,
  apiPut,
  apiPutForm,
  buildOfferPayload,
  createEmptyOfferForm,
  fetchOfferBundle,
  offerToForm,
  usageLimitToDraft,
  validateOfferForm,
  type EntityOption,
  type OfferBinRecord,
  type OfferConditionRecord,
  type OfferFormValues,
  type OfferPaymentRuleRecord,
  type OfferRecord,
  type OfferRedemptionRecord,
  type OfferSourceType,
  type OfferTargetRecord,
  type OfferUsageLimitDraft,
  type PlanOption,
} from "@/app/dashboard/_components/unified-offers/model";
import { EmptyState, LoadingBlock, PrimaryButton, StatusPill } from "@/app/dashboard/_components/unified-offers/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showToast } from "@/hooks/useToast";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

async function loadEntityOptions(table: "stores" | "restaurants"): Promise<EntityOption[]> {
  const response = await supabaseBrowser.from(table).select("id,name").order("name", { ascending: true });

  if (response.error) {
    throw response.error;
  }

  return ((response.data || []) as Array<Record<string, unknown>>).map((item) => ({
    id: String(item.id || ""),
    name: String(item.name || "Unnamed"),
    city: null,
    area: null,
  }));
}

function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      const candidates = [
        record.message,
        record.error,
        typeof record.details === "string" ? record.details : record.details ? JSON.stringify(record.details) : null,
        Array.isArray(record.errors) ? record.errors.join(", ") : null,
      ];
      for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) return candidate;
      }
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "Please try again.";
}

function toFormData(payload: Record<string, unknown>, logoFile: File | null) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null) {
      formData.append(key, "");
      return;
    }
    if (Array.isArray(value) || typeof value === "object") {
      formData.append(key, JSON.stringify(value));
      return;
    }
    formData.append(key, String(value));
  });

  if (logoFile) {
    formData.append("logo", logoFile);
  }

  return formData;
}

export function UnifiedOfferEditorPage({
  offerId,
  initialSourceType = "PLATFORM",
}: {
  offerId?: string;
  initialSourceType?: OfferSourceType;
}) {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [loading, setLoading] = React.useState(Boolean(offerId));
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const [offer, setOffer] = React.useState<OfferRecord | null>(null);
  const [form, setForm] = React.useState<OfferFormValues>(createEmptyOfferForm(initialSourceType));
  const [targets, setTargets] = React.useState<OfferTargetRecord[]>([]);
  const [conditions, setConditions] = React.useState<OfferConditionRecord[]>([]);
  const [paymentRules, setPaymentRules] = React.useState<OfferPaymentRuleRecord[]>([]);
  const [bins, setBins] = React.useState<OfferBinRecord[]>([]);
  const [usageLimit, setUsageLimit] = React.useState<OfferUsageLimitDraft>(usageLimitToDraft(null));
  const [redemptions, setRedemptions] = React.useState<OfferRedemptionRecord[]>([]);
  const [storeOptions, setStoreOptions] = React.useState<EntityOption[]>([]);
  const [restaurantOptions, setRestaurantOptions] = React.useState<EntityOption[]>([]);
  const [planOptions, setPlanOptions] = React.useState<PlanOption[]>([]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    async function loadReferenceData() {
      const [stores, restaurants] = await Promise.all([loadEntityOptions("stores"), loadEntityOptions("restaurants")]);

      setStoreOptions(stores);
      setRestaurantOptions(restaurants);
      setPlanOptions([]);
    }

    loadReferenceData().catch((error) => {
      showToast({ title: "Reference data warning", description: error instanceof Error ? error.message : "Some pickers may be incomplete.", type: "warning" });
    });
  }, []);

  React.useEffect(() => {
    if (!offerId) return;
    const currentOfferId = offerId;

    async function loadOffer() {
      try {
        setLoading(true);
        const bundle = await fetchOfferBundle(currentOfferId);
        setOffer(bundle.offer);
        setForm(offerToForm(bundle.offer));
        setTargets(bundle.targets);
        setConditions(bundle.conditions);
        setPaymentRules(bundle.paymentRules);
        setBins(bundle.bins);
        setUsageLimit(usageLimitToDraft(bundle.usageLimit));
        setRedemptions(bundle.redemptions);
      } catch (error) {
        showToast({ title: "Failed to load offer", description: error instanceof Error ? error.message : "Please try again.", type: "error" });
      } finally {
        setLoading(false);
      }
    }

    loadOffer();
  }, [offerId]);

  async function saveOffer() {
    const validationError = validateOfferForm(form);
    if (validationError) {
      showToast({ title: "Validation failed", description: validationError, type: "error" });
      return;
    }

    const payloadResult = buildOfferPayload(form);
    if ("error" in payloadResult) {
      showToast({
        title: "Validation failed",
        description: typeof payloadResult.error === "string" ? payloadResult.error : "Please review the form and try again.",
        type: "error",
      });
      return;
    }

    try {
      setSaving(true);
      const hasLogoUpload = form.source_type === "BANK" && Boolean(form.logo_file);
      const response = offerId
        ? hasLogoUpload
          ? await apiPutForm(`/api/offers/${offerId}`, toFormData(payloadResult.payload, form.logo_file))
          : await apiPut(`/api/offers/${offerId}`, payloadResult.payload)
        : hasLogoUpload
        ? await apiPostForm(`/api/offers`, toFormData(payloadResult.payload, form.logo_file))
        : await apiPost(`/api/offers`, payloadResult.payload);
      const savedOffer = (response as { offer?: OfferRecord; data?: OfferRecord }).offer || (response as { data?: OfferRecord }).data || (response as OfferRecord);
      setOffer(savedOffer);
      setForm(offerToForm(savedOffer));
      showToast({ title: offerId ? "Offer updated" : "Offer created", description: offerId ? "Offer saved successfully." : "Offer created. You can now manage nested rules." });
      if (!offerId && savedOffer.id) router.replace(`/dashboard/unified-offers/${savedOffer.id}`);
    } catch (error) {
      const debugError = axios.isAxiosError(error)
        ? {
            message: error.message,
            status: error.response?.status ?? null,
            data: error.response?.data ?? null,
          }
        : error;
      console.error("Offer save failed", {
        offerId,
        payload: payloadResult.payload,
        error: debugError,
      });
      showToast({ title: "Failed to save offer", description: getApiErrorMessage(error), type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteOffer() {
    if (!offerId) return;
    try {
      setDeleting(true);
      await apiDelete(`/api/offers/${offerId}`);
      showToast({ title: "Offer deleted", description: "Offer deleted successfully." });
      router.push("/dashboard/unified-offers");
    } catch (error) {
      showToast({ title: "Failed to delete offer", description: error instanceof Error ? error.message : "Please try again.", type: "error" });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const currentOfferId = offer?.id || offerId || "";
  const canManageNested = Boolean(currentOfferId);

  if (!mounted || loading) return <LoadingBlock label="Loading offer editor..." />;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/dashboard/unified-offers">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <StatusPill label={form.status} active={form.status === "ACTIVE"} />
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-slate-900">{offerId ? form.title || "Edit offer" : "Create offer"}</h1>
            <p className="mt-2 text-sm text-slate-500">This is the new unified-offers route, separate from the old home-banners screen.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <PrimaryButton busy={saving} onClick={saveOffer}>
              <Save className="mr-2 h-4 w-4" />
              {offerId ? "Save changes" : "Create offer"}
            </PrimaryButton>
            {offerId ? (
              <Button variant="outline" className="rounded-xl text-rose-600 hover:text-rose-700" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-auto flex-wrap rounded-2xl bg-white p-1 shadow-sm">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="targets" disabled={!canManageNested}>Targets</TabsTrigger>
          <TabsTrigger value="conditions" disabled={!canManageNested}>Conditions</TabsTrigger>
          <TabsTrigger value="payment-rules" disabled={!canManageNested}>Payment rules</TabsTrigger>
          <TabsTrigger value="bins" disabled={!canManageNested || form.source_type !== "BANK"}>BINs</TabsTrigger>
          <TabsTrigger value="usage-limits" disabled={!canManageNested}>Usage limits</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="redemptions" disabled={!canManageNested}>Redemptions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OfferForm value={form} onChange={setForm} planOptions={planOptions} />
        </TabsContent>

        <TabsContent value="targets">
          {canManageNested ? <OfferTargetsEditor offerId={currentOfferId} targets={targets} onChange={setTargets} storeOptions={storeOptions} restaurantOptions={restaurantOptions} /> : <EmptyState title="Save the offer first" description="Targets become available after the base offer exists." />}
        </TabsContent>

        <TabsContent value="conditions">
          {canManageNested ? <OfferConditionsEditor offerId={currentOfferId} conditions={conditions} onChange={setConditions} /> : <EmptyState title="Save the offer first" description="Conditions become available after the base offer exists." />}
        </TabsContent>

        <TabsContent value="payment-rules">
          {canManageNested ? <OfferPaymentRulesEditor offerId={currentOfferId} rules={paymentRules} onChange={setPaymentRules} /> : <EmptyState title="Save the offer first" description="Payment rules become available after the base offer exists." />}
        </TabsContent>

        <TabsContent value="bins">
          {canManageNested ? <OfferBinsEditor offerId={currentOfferId} bins={bins} onChange={setBins} /> : <EmptyState title="Save the offer first" description="BIN rules become available after the base offer exists." />}
        </TabsContent>

        <TabsContent value="usage-limits">
          {canManageNested ? <OfferUsageLimitsEditor offerId={currentOfferId} value={usageLimit} onChange={setUsageLimit} /> : <EmptyState title="Save the offer first" description="Usage limits become available after the base offer exists." />}
        </TabsContent>

        <TabsContent value="preview">
          <OfferApplicabilityTester storeOptions={storeOptions} restaurantOptions={restaurantOptions} />
        </TabsContent>

        <TabsContent value="redemptions">
          <OfferRedemptionsPanel redemptions={redemptions} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete offer?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the offer. Use pause or archive if you only want to disable it safely.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteOffer} className="bg-rose-600 hover:bg-rose-700" disabled={deleting}>
              {deleting ? "Deleting..." : "Delete offer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
