"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  BadgePercent,
  Building2,
  CalendarDays,
  CreditCard,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Target,
  Trash2,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Zap,
  Layers,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";

const SPONSOR_TYPES = ["BANK", "CARD_NETWORK", "ISSUER_PARTNER", "PLATFORM", "MERCHANT", "CO_FUNDED"] as const;
const OFFER_TYPES = [
  "INSTANT_DISCOUNT",
  "CASHBACK",
  "FLAT_DISCOUNT",
  "PERCENT_DISCOUNT",
  "BOGO",
  "NO_COST_EMI",
  "REWARD_POINTS",
] as const;
const BENEFIT_KINDS = ["MONETARY", "NON_MONETARY"] as const;
const PAYMENT_INSTRUMENTS = ["CREDIT_CARD", "DEBIT_CARD", "UPI", "NET_BANKING", "WALLET", "EMI", "CARD"] as const;
const CARD_NETWORKS = ["VISA", "MASTERCARD", "RUPAY", "AMEX", "DINERS", "ANY"] as const;
const MODULE_TYPES = ["DINEIN", "STORES", "BOTH"] as const;
const PAYMENT_FLOWS = ["BOOKING", "BILL_PAYMENT", "ORDER_PAYMENT", "ANY"] as const;
const FUNDED_BY = ["BANK", "MERCHANT", "PLATFORM", "CO_FUNDED"] as const;
const STATUS_OPTIONS = ["DRAFT", "ACTIVE", "PAUSED", "EXPIRED", "ARCHIVED"] as const;
const TARGET_TYPES = ["ALL", "CITY", "AREA", "RESTAURANT", "STORE", "CATEGORY", "CHAIN"] as const;
const BIN_CARD_TYPES = ["CREDIT", "DEBIT", "PREPAID", "ANY"] as const;

type BankOfferRecord = {
  id: string;
  title: string;
  short_title: string | null;
  sponsor_name: string;
  offer_type: (typeof OFFER_TYPES)[number];
  payment_instrument_type: (typeof PAYMENT_INSTRUMENTS)[number];
  card_network: string | null;
  valid_from: string;
  valid_until: string;
  priority: number;
  status: (typeof STATUS_OPTIONS)[number];
  is_active: boolean;
  bank_name: string;
  bank_logo_url: string | null;
  currency_code: string;
  discount_percent: number | null;
  discount_amount: number | null;
  cashback_amount: number | null;
  cashback_percent: number | null;
  coupon_code: string | null;
};

type BankOfferForm = {
  title: string;
  short_title: string;
  description: string;
  terms_and_conditions: string;
  sponsor_type: (typeof SPONSOR_TYPES)[number];
  sponsor_name: string;
  offer_type: (typeof OFFER_TYPES)[number];
  benefit_kind: (typeof BENEFIT_KINDS)[number];
  discount_percent: string;
  discount_amount: string;
  max_discount_amount: string;
  cashback_amount: string;
  cashback_percent: string;
  min_transaction_amount: string;
  max_transaction_amount: string;
  currency_code: string;
  payment_instrument_type: (typeof PAYMENT_INSTRUMENTS)[number];
  card_network: string;
  issuer_bank_name: string;
  applies_to_module: (typeof MODULE_TYPES)[number];
  applies_to_payment_flow: (typeof PAYMENT_FLOWS)[number];
  valid_from: string;
  valid_until: string;
  stackable_with_other_offers: boolean;
  stackable_with_platform_offers: boolean;
  requires_coupon_code: boolean;
  coupon_code: string;
  priority: string;
  display_label: string;
  badge_text: string;
  banner_image: string;
  status: (typeof STATUS_OPTIONS)[number];
  is_active: boolean;
  bank_name: string;
  bank_logo_url: string;
  bank_brand_color: string;
  funded_by: (typeof FUNDED_BY)[number];
};

type BinDraft = {
  id?: string;
  clientId: string;
  bin: string;
  bin_length: string;
  card_type: string;
  card_network: string;
  issuer_bank_name: string;
  is_active: boolean;
};

type TargetDraft = {
  id?: string;
  clientId: string;
  target_type: (typeof TARGET_TYPES)[number];
  target_id: string;
  city: string;
  area: string;
  category_slug: string;
  chain_name: string;
};

type RedemptionRecord = {
  id: string;
  order_reference: string;
  payment_reference: string | null;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  redemption_status: string;
  settlement_status: string;
  redeemed_at: string;
  payment_instrument_type: string | null;
  card_network: string | null;
};

type MerchantOption = {
  id: string;
  name: string;
  city?: string | null;
  area?: string | null;
};

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

const initialForm: BankOfferForm = {
  title: "",
  short_title: "",
  description: "",
  terms_and_conditions: "",
  sponsor_type: "BANK",
  sponsor_name: "",
  offer_type: "PERCENT_DISCOUNT",
  benefit_kind: "MONETARY",
  discount_percent: "",
  discount_amount: "",
  max_discount_amount: "",
  cashback_amount: "",
  cashback_percent: "",
  min_transaction_amount: "",
  max_transaction_amount: "",
  currency_code: "INR",
  payment_instrument_type: "CARD",
  card_network: "ANY",
  issuer_bank_name: "",
  applies_to_module: "BOTH",
  applies_to_payment_flow: "BILL_PAYMENT",
  valid_from: "",
  valid_until: "",
  stackable_with_other_offers: false,
  stackable_with_platform_offers: false,
  requires_coupon_code: false,
  coupon_code: "",
  priority: "100",
  display_label: "",
  badge_text: "",
  banner_image: "",
  status: "DRAFT",
  is_active: false,
  bank_name: "",
  bank_logo_url: "",
  bank_brand_color: "",
  funded_by: "BANK",
};

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function createBinDraft(): BinDraft {
  return {
    clientId: uid(),
    bin: "",
    bin_length: "6",
    card_type: "ANY",
    card_network: "ANY",
    issuer_bank_name: "",
    is_active: true,
  };
}

function createTargetDraft(): TargetDraft {
  return {
    clientId: uid(),
    target_type: "ALL",
    target_id: "",
    city: "",
    area: "",
    category_slug: "",
    chain_name: "",
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function numberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : null;
}

function datetimeValue(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

function isoString(value: string) {
  return new Date(value).toISOString();
}

function fileExt(file: File) {
  return file.name.split(".").pop()?.toLowerCase() || file.type.split("/")[1] || "bin";
}

function uploadPath(file: File) {
  return `logos/${uid()}.${fileExt(file)}`;
}

function getBankLogoStoragePath(url: string | null | undefined) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const marker = "/storage/v1/object/public/bank-offers/";
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

function formatCurrency(value: number | null, currencyCode: string) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function offerBenefitText(offer: BankOfferRecord) {
  if (offer.discount_percent != null) return `${offer.discount_percent}% off`;
  if (offer.discount_amount != null) return `${formatCurrency(offer.discount_amount, offer.currency_code)} off`;
  if (offer.cashback_percent != null) return `${offer.cashback_percent}% cashback`;
  if (offer.cashback_amount != null) return `${formatCurrency(offer.cashback_amount, offer.currency_code)} cashback`;
  return offer.offer_type.replaceAll("_", " ");
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildOfferPayload(form: BankOfferForm, bankLogoUrl: string | null) {
  return {
    title: form.title.trim(),
    short_title: form.short_title.trim() || null,
    description: form.description.trim() || null,
    terms_and_conditions: form.terms_and_conditions.trim() || null,
    sponsor_type: form.sponsor_type,
    sponsor_name: form.sponsor_name.trim(),
    offer_type: form.offer_type,
    benefit_kind: form.benefit_kind,
    discount_percent: numberOrNull(form.discount_percent),
    discount_amount: numberOrNull(form.discount_amount),
    max_discount_amount: numberOrNull(form.max_discount_amount),
    cashback_amount: numberOrNull(form.cashback_amount),
    cashback_percent: numberOrNull(form.cashback_percent),
    min_transaction_amount: numberOrNull(form.min_transaction_amount),
    max_transaction_amount: numberOrNull(form.max_transaction_amount),
    currency_code: (form.currency_code.trim() || "INR").toUpperCase(),
    payment_instrument_type: form.payment_instrument_type,
    card_network: form.card_network || null,
    issuer_bank_name: form.issuer_bank_name.trim() || null,
    applies_to_module: form.applies_to_module,
    applies_to_payment_flow: form.applies_to_payment_flow,
    valid_from: isoString(form.valid_from),
    valid_until: isoString(form.valid_until),
    stackable_with_other_offers: form.stackable_with_other_offers,
    stackable_with_platform_offers: form.stackable_with_platform_offers,
    requires_coupon_code: form.requires_coupon_code,
    coupon_code: form.requires_coupon_code ? form.coupon_code.trim() : null,
    priority: Number(form.priority || 100),
    display_label: form.display_label.trim() || null,
    badge_text: form.badge_text.trim() || null,
    banner_image: form.banner_image.trim() || null,
    status: form.status,
    is_active: form.is_active,
    bank_name: form.bank_name.trim(),
    bank_logo_url: bankLogoUrl,
    bank_brand_color: form.bank_brand_color.trim() || null,
    funded_by: form.funded_by,
  };
}

export default function BankOffersPage() {
  const [offers, setOffers] = useState<BankOfferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BankOfferForm>(initialForm);
  const [bins, setBins] = useState<BinDraft[]>([createBinDraft()]);
  const [targets, setTargets] = useState<TargetDraft[]>([createTargetDraft()]);
  const [redemptions, setRedemptions] = useState<RedemptionRecord[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [filter, setFilter] = useState("");
  const [restaurants, setRestaurants] = useState<MerchantOption[]>([]);
  const [stores, setStores] = useState<MerchantOption[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const existingBinIdsRef = useRef<string[]>([]);
  const existingTargetIdsRef = useRef<string[]>([]);

  const cityOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...restaurants.map((item) => item.city).filter(isNonEmptyString),
          ...stores.map((item) => item.city).filter(isNonEmptyString),
        ])
      ).sort(),
    [restaurants, stores]
  );

  const categoryOptions = useMemo(
    () => [] as string[],
    []
  );

  const filteredOffers = useMemo(() => {
    const search = filter.trim().toLowerCase();
    if (!search) return offers;
    return offers.filter((offer) =>
      [offer.bank_name, offer.title, offer.short_title || "", offer.offer_type, offer.payment_instrument_type, offer.status]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [filter, offers]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await Promise.all([loadOffers(), loadMerchantOptions()]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  async function loadOffers() {
    const { data, error } = await supabaseBrowser
      .from("bank_offers")
      .select(
        "id,title,short_title,sponsor_name,offer_type,payment_instrument_type,card_network,valid_from,valid_until,priority,status,is_active,bank_name,bank_logo_url,currency_code,discount_percent,discount_amount,cashback_amount,cashback_percent,coupon_code"
      )
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      showToast({
        type: "error",
        title: "Failed to load bank offers",
        description: error.message,
      });
      setOffers([]);
      return;
    }

    setOffers((data as BankOfferRecord[]) || []);
  }

  async function loadMerchantOptions() {
    const [restaurantRes, storeRes] = await Promise.all([
      supabaseBrowser.from("restaurants").select("id,name,city,area").order("name", { ascending: true }),
      supabaseBrowser.from("stores").select("id,name,city,area").order("name", { ascending: true }),
    ]);

    if (!restaurantRes.error) setRestaurants((restaurantRes.data as MerchantOption[]) || []);
    if (!storeRes.error) setStores((storeRes.data as MerchantOption[]) || []);
  }

  async function loadRelations(offerId: string) {
    const [binsRes, targetsRes, redemptionsRes] = await Promise.all([
      supabaseBrowser
        .from("bank_offer_bins")
        .select("id,bin,bin_length,card_type,card_network,issuer_bank_name,is_active")
        .eq("bank_offer_id", offerId)
        .order("created_at", { ascending: true }),
      supabaseBrowser
        .from("bank_offer_targets")
        .select("id,target_type,target_id,city,area,category_slug,chain_name")
        .eq("bank_offer_id", offerId)
        .order("created_at", { ascending: true }),
      supabaseBrowser
        .from("bank_offer_redemptions")
        .select(
          "id,order_reference,payment_reference,original_amount,discount_amount,final_amount,redemption_status,settlement_status,redeemed_at,payment_instrument_type,card_network"
        )
        .eq("bank_offer_id", offerId)
        .order("redeemed_at", { ascending: false })
        .limit(25),
    ]);

    if (binsRes.error) throw binsRes.error;
    if (targetsRes.error) throw targetsRes.error;
    if (redemptionsRes.error) throw redemptionsRes.error;

    const nextBins =
      binsRes.data?.map((item) => ({
        id: item.id,
        clientId: item.id,
        bin: item.bin,
        bin_length: String(item.bin_length),
        card_type: item.card_type || "ANY",
        card_network: item.card_network || "ANY",
        issuer_bank_name: item.issuer_bank_name || "",
        is_active: item.is_active,
      })) || [];

    const nextTargets =
      targetsRes.data?.map((item) => ({
        id: item.id,
        clientId: item.id,
        target_type: item.target_type as TargetDraft["target_type"],
        target_id: item.target_id || "",
        city: item.city || "",
        area: item.area || "",
        category_slug: item.category_slug || "",
        chain_name: item.chain_name || "",
      })) || [];

    existingBinIdsRef.current = nextBins.map((item) => item.id!).filter(Boolean);
    existingTargetIdsRef.current = nextTargets.map((item) => item.id!).filter(Boolean);
    setBins(nextBins.length ? nextBins : [createBinDraft()]);
    setTargets(nextTargets.length ? nextTargets : [createTargetDraft()]);
    setRedemptions((redemptionsRes.data as RedemptionRecord[]) || []);
  }

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);
    setBins([createBinDraft()]);
    setTargets([createTargetDraft()]);
    setRedemptions([]);
    setLogoFile(null);
    setLogoPreview("");
    existingBinIdsRef.current = [];
    existingTargetIdsRef.current = [];
    if (fileRef.current) fileRef.current.value = "";
  }

  async function startEdit(offerId: string) {
    try {
      setRedemptionsLoading(true);

      const { data, error } = await supabaseBrowser.from("bank_offers").select("*").eq("id", offerId).single();
      if (error) throw error;

      setEditingId(offerId);
      setForm({
        title: data.title || "",
        short_title: data.short_title || "",
        description: data.description || "",
        terms_and_conditions: data.terms_and_conditions || "",
        sponsor_type: data.sponsor_type || "BANK",
        sponsor_name: data.sponsor_name || "",
        offer_type: data.offer_type || "PERCENT_DISCOUNT",
        benefit_kind: data.benefit_kind || "MONETARY",
        discount_percent: data.discount_percent?.toString() || "",
        discount_amount: data.discount_amount?.toString() || "",
        max_discount_amount: data.max_discount_amount?.toString() || "",
        cashback_amount: data.cashback_amount?.toString() || "",
        cashback_percent: data.cashback_percent?.toString() || "",
        min_transaction_amount: data.min_transaction_amount?.toString() || "",
        max_transaction_amount: data.max_transaction_amount?.toString() || "",
        currency_code: data.currency_code || "INR",
        payment_instrument_type: data.payment_instrument_type || "CARD",
        card_network: data.card_network || "ANY",
        issuer_bank_name: data.issuer_bank_name || "",
        applies_to_module: data.applies_to_module || "BOTH",
        applies_to_payment_flow: data.applies_to_payment_flow || "BILL_PAYMENT",
        valid_from: datetimeValue(data.valid_from),
        valid_until: datetimeValue(data.valid_until),
        stackable_with_other_offers: Boolean(data.stackable_with_other_offers),
        stackable_with_platform_offers: Boolean(data.stackable_with_platform_offers),
        requires_coupon_code: Boolean(data.requires_coupon_code),
        coupon_code: data.coupon_code || "",
        priority: data.priority?.toString() || "100",
        display_label: data.display_label || "",
        badge_text: data.badge_text || "",
        banner_image: data.banner_image || "",
        status: data.status || "DRAFT",
        is_active: Boolean(data.is_active),
        bank_name: data.bank_name || "",
        bank_logo_url: data.bank_logo_url || "",
        bank_brand_color: data.bank_brand_color || "",
        funded_by: data.funded_by || "BANK",
      });
      setLogoFile(null);
      setLogoPreview(data.bank_logo_url || "");
      if (fileRef.current) fileRef.current.value = "";

      await loadRelations(offerId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to load offer details",
        description: getErrorMessage(error, "Could not load the selected bank offer."),
      });
    } finally {
      setRedemptionsLoading(false);
    }
  }

  async function uploadLogoIfNeeded() {
    if (!logoFile) return form.bank_logo_url.trim() || null;
    const path = uploadPath(logoFile);
    const { error } = await supabaseBrowser.storage.from("bank-offers").upload(path, logoFile, {
      upsert: true,
    });
    if (error) throw error;
    const { data } = supabaseBrowser.storage.from("bank-offers").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleRemoveLogo() {
    const currentUrl = form.bank_logo_url.trim();
    const storagePath = getBankLogoStoragePath(currentUrl);

    if (storagePath) {
      await supabaseBrowser.storage.from("bank-offers").remove([storagePath]);
    }

    setLogoFile(null);
    setLogoPreview("");
    setForm((current) => ({
      ...current,
      bank_logo_url: "",
    }));

    if (fileRef.current) fileRef.current.value = "";
  }

  function validateForm() {
    if (!form.title.trim()) return "Offer title is required.";
    if (!form.sponsor_name.trim()) return "Sponsor name is required.";
    if (!form.bank_name.trim()) return "Bank name is required.";
    if (!form.valid_from || !form.valid_until) return "Start and end dates are required.";
    if (new Date(form.valid_until) <= new Date(form.valid_from)) return "End date must be later than start date.";
    if (form.requires_coupon_code && !form.coupon_code.trim()) return "Coupon code is required when coupon mode is enabled.";

    const hasMonetaryValue =
      !!form.discount_percent || !!form.discount_amount || !!form.cashback_amount || !!form.cashback_percent;
    const specialOffer = ["BOGO", "NO_COST_EMI", "REWARD_POINTS"].includes(form.offer_type);
    if (!hasMonetaryValue && !specialOffer) return "Add a discount or cashback value for this offer type.";

    for (const row of bins) {
      if (row.bin.trim() && !/^\d+$/.test(row.bin.trim())) return "BIN rules must contain digits only.";
    }

    for (const row of targets) {
      if (row.target_type === "CITY" && !row.city.trim()) return "City is required for city targeting.";
      if (row.target_type === "AREA" && (!row.city.trim() || !row.area.trim()))
        return "City and area are required for area targeting.";
      if ((row.target_type === "RESTAURANT" || row.target_type === "STORE") && !row.target_id)
        return "Select a merchant for restaurant/store targeting.";
      if (row.target_type === "CATEGORY" && !row.category_slug.trim()) return "Category is required for category targeting.";
      if (row.target_type === "CHAIN" && !row.chain_name.trim()) return "Chain name is required for chain targeting.";
    }

    return null;
  }

  async function syncBins(offerId: string) {
    const cleanRows = bins.filter((item) => item.bin.trim());
    const currentIds = cleanRows.map((item) => item.id).filter(Boolean) as string[];
    const deleteIds = existingBinIdsRef.current.filter((id) => !currentIds.includes(id));

    if (deleteIds.length) {
      const { error } = await supabaseBrowser.from("bank_offer_bins").delete().in("id", deleteIds);
      if (error) throw error;
    }

    for (const row of cleanRows) {
      const payload = {
        bank_offer_id: offerId,
        bin: row.bin.trim(),
        bin_length: Number(row.bin_length || 6),
        card_type: row.card_type || null,
        card_network: row.card_network || null,
        issuer_bank_name: row.issuer_bank_name.trim() || null,
        is_active: row.is_active,
      };

      if (row.id) {
        const { error } = await supabaseBrowser.from("bank_offer_bins").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabaseBrowser.from("bank_offer_bins").insert(payload).select("id").single();
        if (error) throw error;
        row.id = data.id;
      }
    }

    existingBinIdsRef.current = cleanRows.map((item) => item.id!).filter(Boolean);
  }

  async function syncTargets(offerId: string) {
    const cleanRows = targets.filter((item) => item.target_type === "ALL" || item.city || item.area || item.target_id || item.category_slug || item.chain_name);
    const currentIds = cleanRows.map((item) => item.id).filter(Boolean) as string[];
    const deleteIds = existingTargetIdsRef.current.filter((id) => !currentIds.includes(id));

    if (deleteIds.length) {
      const { error } = await supabaseBrowser.from("bank_offer_targets").delete().in("id", deleteIds);
      if (error) throw error;
    }

    for (const row of cleanRows) {
      const payload = {
        bank_offer_id: offerId,
        target_type: row.target_type,
        target_id:
          row.target_type === "RESTAURANT" || row.target_type === "STORE" ? row.target_id || null : null,
        city: row.target_type === "CITY" || row.target_type === "AREA" ? row.city.trim() || null : null,
        area: row.target_type === "AREA" ? row.area.trim() || null : null,
        category_slug: row.target_type === "CATEGORY" ? row.category_slug.trim() || null : null,
        chain_name: row.target_type === "CHAIN" ? row.chain_name.trim() || null : null,
      };

      if (row.id) {
        const { error } = await supabaseBrowser.from("bank_offer_targets").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabaseBrowser.from("bank_offer_targets").insert(payload).select("id").single();
        if (error) throw error;
        row.id = data.id;
      }
    }

    existingTargetIdsRef.current = cleanRows.map((item) => item.id!).filter(Boolean);
  }

  async function handleSubmit() {
    const validationError = validateForm();
    if (validationError) {
      showToast({ type: "error", title: validationError });
      return;
    }

    let createdOfferId: string | null = null;

    try {
      setSaving(true);
      const bankLogoUrl = await uploadLogoIfNeeded();
      const payload = buildOfferPayload(form, bankLogoUrl);

      const offerId = editingId || uid();

      if (editingId) {
        const { error } = await supabaseBrowser.from("bank_offers").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabaseBrowser.from("bank_offers").insert({
          id: offerId,
          ...payload,
        });
        if (error) throw error;
        createdOfferId = offerId;
      }

      const finalOfferId = editingId || createdOfferId;
      if (!finalOfferId) throw new Error("Missing bank offer id.");

      await syncBins(finalOfferId);
      await syncTargets(finalOfferId);

      showToast({ title: editingId ? "Bank offer updated" : "Bank offer created" });
      await loadOffers();
      await startEdit(finalOfferId);
    } catch (error: unknown) {
      if (createdOfferId) {
        await supabaseBrowser.from("bank_offers").delete().eq("id", createdOfferId);
      }
      showToast({
        type: "error",
        title: "Failed to save bank offer",
        description: getErrorMessage(error, "Check policies, bucket access, and related table permissions."),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this bank offer and its targeting rules?")) return;

    try {
      setDeletingId(id);
      const { error } = await supabaseBrowser.from("bank_offers").delete().eq("id", id);
      if (error) throw error;
      if (editingId === id) resetForm();
      setOffers((current) => current.filter((offer) => offer.id !== id));
      showToast({ title: "Bank offer deleted" });
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to delete bank offer",
        description: getErrorMessage(error, "Delete operation failed."),
      });
    } finally {
      setDeletingId(null);
    }
  }

  function handleLogoPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setLogoFile(file);

    if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    if (!file) {
      setLogoPreview(form.bank_logo_url || "");
      return;
    }

    setLogoPreview(URL.createObjectURL(file));
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-slate-50 to-blue-50">
      {/* Enhanced Header */}
      <div className="sticky top-0 z-20 border-b border-slate-200/40 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-2.5 shadow-lg">
              <BadgePercent className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Bank Offers Manager</h1>
              <p className="text-xs text-slate-500">Create and manage promotional offers</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {editingId ? (
              <Button 
                variant="outline" 
                onClick={resetForm} 
                className="border-slate-200 bg-white hover:bg-slate-50 transition-colors duration-200"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                New Offer
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[480px_1fr]">
          {/* Left Sidebar - Form */}
          <div className="space-y-6">
            {/* Main Form Card */}
            <SectionCard
              icon={BadgePercent}
              title={editingId ? "Edit Offer" : "Create Offer"}
              description="Build your offer step by step"
              gradient="from-emerald-50 to-green-50"
            >
              {/* Step 1 */}
              <StepSection
                stepNumber={1}
                title="Bank Identity"
                description="Bank details and branding"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField 
                  label="Offer name" 
                  value={form.title} 
                  onChange={(value) => setForm((c) => ({ ...c, title: value }))} 
                  placeholder="20% off weekend dining" 
                />
                <TextField 
                  label="Short label" 
                  value={form.short_title} 
                  onChange={(value) => setForm((c) => ({ ...c, short_title: value }))} 
                  placeholder="Weekend deal" 
                />
                <TextField 
                  label="Bank name" 
                  value={form.bank_name} 
                  onChange={(value) => setForm((c) => ({ ...c, bank_name: value }))} 
                  placeholder="HDFC Bank" 
                />
                <TextField 
                  label="Sponsor name" 
                  value={form.sponsor_name} 
                  onChange={(value) => setForm((c) => ({ ...c, sponsor_name: value }))} 
                  placeholder="Usually the same as bank name" 
                />
              </div>

              {/* Logo Upload */}
              <LogoUploadSection
                logoPreview={logoPreview}
                logoFile={logoFile}
                fileRef={fileRef}
                onLogoPick={handleLogoPick}
                onRemoveLogo={() => void handleRemoveLogo()}
              />

              <TextareaField 
                label="Offer description" 
                value={form.description} 
                onChange={(value) => setForm((c) => ({ ...c, description: value }))} 
              />
              <TextField 
                label="Badge text" 
                value={form.badge_text} 
                onChange={(value) => setForm((c) => ({ ...c, badge_text: value }))} 
                placeholder="Bank Offer" 
              />

              {/* Step 2 */}
              <StepSection
                stepNumber={2}
                title="Customer Benefit"
                description="What will customers get?"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField 
                  label="Offer type" 
                  value={form.offer_type} 
                  options={OFFER_TYPES} 
                  onChange={(value) => setForm((c) => ({ ...c, offer_type: value as BankOfferForm["offer_type"] }))} 
                />
                <SelectField 
                  label="Payment method" 
                  value={form.payment_instrument_type} 
                  options={PAYMENT_INSTRUMENTS} 
                  onChange={(value) => setForm((c) => ({ ...c, payment_instrument_type: value as BankOfferForm["payment_instrument_type"] }))} 
                />
                <NumberField 
                  label="Discount %" 
                  value={form.discount_percent} 
                  onChange={(value) => setForm((c) => ({ ...c, discount_percent: value }))} 
                />
                <NumberField 
                  label="Flat discount" 
                  value={form.discount_amount} 
                  onChange={(value) => setForm((c) => ({ ...c, discount_amount: value }))} 
                />
                <NumberField 
                  label="Cashback %" 
                  value={form.cashback_percent} 
                  onChange={(value) => setForm((c) => ({ ...c, cashback_percent: value }))} 
                />
                <NumberField 
                  label="Cashback amount" 
                  value={form.cashback_amount} 
                  onChange={(value) => setForm((c) => ({ ...c, cashback_amount: value }))} 
                />
                <NumberField 
                  label="Max discount" 
                  value={form.max_discount_amount} 
                  onChange={(value) => setForm((c) => ({ ...c, max_discount_amount: value }))} 
                />
                <TextField 
                  label="Currency" 
                  value={form.currency_code} 
                  onChange={(value) => setForm((c) => ({ ...c, currency_code: value.toUpperCase() }))} 
                  maxLength={3} 
                />
              </div>

              {/* Step 3 */}
              <StepSection
                stepNumber={3}
                title="Schedule"
                description="When is this offer live?"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <DateTimeField 
                  label="Starts on" 
                  value={form.valid_from} 
                  onChange={(value) => setForm((c) => ({ ...c, valid_from: value }))} 
                />
                <DateTimeField 
                  label="Ends on" 
                  value={form.valid_until} 
                  onChange={(value) => setForm((c) => ({ ...c, valid_until: value }))} 
                />
                <SelectField 
                  label="Status" 
                  value={form.status} 
                  options={STATUS_OPTIONS} 
                  onChange={(value) => setForm((c) => ({ ...c, status: value as BankOfferForm["status"] }))} 
                />
                <NumberField 
                  label="Priority" 
                  value={form.priority} 
                  onChange={(value) => setForm((c) => ({ ...c, priority: value }))} 
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ToggleField 
                  label="Show in app" 
                  checked={form.is_active} 
                  onChange={(checked) => setForm((c) => ({ ...c, is_active: checked }))} 
                />
                <ToggleField 
                  label="Needs coupon code" 
                  checked={form.requires_coupon_code} 
                  onChange={(checked) => setForm((c) => ({ ...c, requires_coupon_code: checked, coupon_code: checked ? c.coupon_code : "" }))} 
                />
              </div>

              {form.requires_coupon_code ? (
                <TextField 
                  label="Coupon code" 
                  value={form.coupon_code} 
                  onChange={(value) => setForm((c) => ({ ...c, coupon_code: value }))} 
                />
              ) : null}

              {/* Advanced Settings */}
              <AdvancedSettingsSection form={form} setForm={setForm} />

              <div className="pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm} 
                  className="border-slate-200 hover:bg-slate-50 transition-colors duration-200"
                >
                  Reset form
                </Button>
              </div>
            </SectionCard>

            {/* Card Rules Section */}
            <SectionCard
              icon={CreditCard}
              title="Eligible Cards"
              description="Specific card BINs (optional)"
              gradient="from-blue-50 to-cyan-50"
              action={
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setBins((current) => [...current, createBinDraft()])} 
                  className="border-slate-200 hover:bg-slate-50 transition-colors duration-200"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add rule
                </Button>
              }
            >
              <div className="space-y-3">
                {bins.map((row, index) => (
                  <BinRuleCard
                    key={row.clientId}
                    row={row}
                    index={index}
                    onUpdate={(value) =>
                      setBins((current) =>
                        current.map((item) =>
                          item.clientId === row.clientId ? value : item
                        )
                      )
                    }
                    onRemove={() =>
                      setBins((current) =>
                        current.filter((item) => item.clientId !== row.clientId)
                      )
                    }
                  />
                ))}
              </div>
            </SectionCard>

            {/* Location Rules Section */}
            <SectionCard
              icon={Target}
              title="Where This Works"
              description="Geographic and merchant targeting"
              gradient="from-purple-50 to-pink-50"
              action={
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setTargets((current) => [...current, createTargetDraft()])} 
                  className="border-slate-200 hover:bg-slate-50 transition-colors duration-200"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add rule
                </Button>
              }
            >
              <div className="space-y-3">
                {targets.map((row, index) => (
                  <TargetRuleCard
                    key={row.clientId}
                    row={row}
                    index={index}
                    cityOptions={cityOptions}
                    categoryOptions={categoryOptions}
                    restaurants={restaurants}
                    stores={stores}
                    onUpdate={(value) =>
                      setTargets((current) =>
                        current.map((item) =>
                          item.clientId === row.clientId ? value : item
                        )
                      )
                    }
                    onRemove={() =>
                      setTargets((current) =>
                        current.filter((item) => item.clientId !== row.clientId)
                      )
                    }
                  />
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Right Sidebar - List & Redemptions */}
          <div className="space-y-6">
            {/* Live Offers Section */}
            <SectionCard
              icon={ShieldCheck}
              title="Live Offers"
              description="Review and manage offers"
              gradient="from-amber-50 to-orange-50"
            >
              <div className="relative">
                <Input 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value)} 
                  placeholder="Search offers..." 
                  className="border-slate-200 pl-10 focus:border-emerald-400 focus:ring-emerald-400 transition-colors duration-200" 
                />
                <BadgePercent className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              </div>

              {loading ? (
                <OfferListSkeleton />
              ) : filteredOffers.length === 0 ? (
                <EmptyState
                  icon={BadgePercent}
                  title="No bank offers found"
                  description="Create an offer or adjust the search criteria."
                />
              ) : (
                <div className="space-y-3 pt-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {filteredOffers.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      onEdit={() => startEdit(offer.id)}
                      onDelete={() => handleDelete(offer.id)}
                      isDeleting={deletingId === offer.id}
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Redemption History Section */}
            <SectionCard
              icon={MapPin}
              title="Redemptions"
              description={editingId ? "Recent customer usage" : "Open an offer to view usage"}
              gradient="from-rose-50 to-pink-50"
            >
              {redemptionsLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : !editingId ? (
                <EmptyState
                  icon={MapPin}
                  title="No offer selected"
                  description="Open an offer to view redemption history."
                />
              ) : redemptions.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="No redemptions yet"
                  description="Redemption records will appear here."
                />
              ) : (
                <RedemptionTable redemptions={redemptions} currencyCode={form.currency_code} />
              )}
            </SectionCard>
          </div>
        </div>
      </div>

      {/* Floating Save Button */}
      <div className="fixed right-5 bottom-5 z-40 sm:right-6 sm:bottom-6">
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="h-12 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 text-white shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Save Offer
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT SECTIONS
// ============================================================================

function SectionCard({
  icon: Icon,
  title,
  description,
  action,
  children,
  gradient = "from-slate-50 to-slate-50",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  gradient?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200/60 bg-gradient-to-br ${gradient} p-6 shadow-sm hover:shadow-md transition-shadow duration-300`}>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
            <Icon className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="mt-0.5 text-xs text-slate-600">{description}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function StepSection({
  stepNumber,
  title,
  description,
}: {
  stepNumber: number;
  title: string;
  description: string;
}) {
  return (
    <div className="border-t border-slate-200/50 pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
          {stepNumber}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <Input 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder} 
        maxLength={maxLength} 
        className="mt-2 h-10 border-slate-200 bg-white shadow-sm focus:border-emerald-400 focus:ring-emerald-400 transition-colors duration-200" 
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <Input 
        type="number" 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="mt-2 h-10 border-slate-200 bg-white shadow-sm focus:border-emerald-400 focus:ring-emerald-400 transition-colors duration-200" 
      />
    </div>
  );
}

function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <Input 
        type="datetime-local" 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="mt-2 h-10 border-slate-200 bg-white shadow-sm focus:border-emerald-400 focus:ring-emerald-400 transition-colors duration-200" 
      />
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <Textarea 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="mt-2 min-h-20 border-slate-200 bg-white shadow-sm focus:border-emerald-400 focus:ring-emerald-400 transition-colors duration-200 resize-none" 
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[] | { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="mt-2 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none shadow-sm focus:border-emerald-400 focus:ring-emerald-400 transition-colors duration-200"
      >
        {options.map((option) => {
          if (typeof option === "string") {
            return (
              <option key={option} value={option}>
                {humanize(option)}
              </option>
            );
          }
          return (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer transition-colors duration-200">
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)} 
        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
      />
      {label}
    </label>
  );
}

function LogoUploadSection({
  logoPreview,
  logoFile,
  fileRef,
  onLogoPick,
  onRemoveLogo,
}: {
  logoPreview: string;
  logoFile: File | null;
  fileRef: React.RefObject<HTMLInputElement>;
  onLogoPick: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-sm font-medium text-slate-800">Bank logo</p>
          <p className="mt-1 text-xs text-slate-600">PNG, JPG, or SVG</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogoPick} />
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => fileRef.current?.click()} 
          className="border-slate-200 bg-white hover:bg-slate-50 transition-colors duration-200"
        >
          <Upload className="mr-2 h-4 w-4" />
          {logoPreview ? "Replace" : "Upload"}
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
          {logoPreview ? (
            <Image src={logoPreview} alt="Bank logo preview" width={80} height={80} className="h-full w-full object-contain" unoptimized />
          ) : (
            <Building2 className="h-8 w-8 text-slate-300" />
          )}
        </div>
        <div className="flex-1">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-800">
              {logoPreview ? "✓ Logo ready" : "No logo yet"}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {logoFile
                ? `${logoFile.name}`
                : logoPreview
                  ? "Current logo"
                  : "Upload to add branding"}
            </p>
            {logoPreview ? (
              <button
                type="button"
                onClick={onRemoveLogo}
                className="mt-2 text-xs font-medium text-red-600 hover:text-red-700 transition-colors duration-200"
              >
                Remove logo
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdvancedSettingsSection({
  form,
  setForm,
}: {
  form: BankOfferForm;
  setForm: (fn: (current: BankOfferForm) => BankOfferForm) => void;
}) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-slate-50/50 group">
      <summary className="cursor-pointer list-none px-4 py-4 text-sm font-semibold text-slate-800 flex items-center gap-2 hover:text-slate-900 transition-colors duration-200">
        <Zap className="h-4 w-4 text-amber-600" />
        Advanced Settings
        <span className="ml-auto group-open:rotate-180 transition-transform duration-200">▼</span>
      </summary>
      <div className="space-y-4 border-t border-slate-200 px-4 py-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField 
            label="Sponsor type" 
            value={form.sponsor_type} 
            options={SPONSOR_TYPES} 
            onChange={(value) => setForm((c) => ({ ...c, sponsor_type: value as BankOfferForm["sponsor_type"] }))} 
          />
          <SelectField 
            label="Funding" 
            value={form.funded_by} 
            options={FUNDED_BY} 
            onChange={(value) => setForm((c) => ({ ...c, funded_by: value as BankOfferForm["funded_by"] }))} 
          />
          <SelectField 
            label="Benefit type" 
            value={form.benefit_kind} 
            options={BENEFIT_KINDS} 
            onChange={(value) => setForm((c) => ({ ...c, benefit_kind: value as BankOfferForm["benefit_kind"] }))} 
          />
          <SelectField 
            label="Card network" 
            value={form.card_network} 
            options={CARD_NETWORKS} 
            onChange={(value) => setForm((c) => ({ ...c, card_network: value }))} 
          />
          <SelectField 
            label="Module" 
            value={form.applies_to_module} 
            options={MODULE_TYPES} 
            onChange={(value) => setForm((c) => ({ ...c, applies_to_module: value as BankOfferForm["applies_to_module"] }))} 
          />
          <SelectField 
            label="Payment flow" 
            value={form.applies_to_payment_flow} 
            options={PAYMENT_FLOWS} 
            onChange={(value) => setForm((c) => ({ ...c, applies_to_payment_flow: value as BankOfferForm["applies_to_payment_flow"] }))} 
          />
          <NumberField 
            label="Min bill amount" 
            value={form.min_transaction_amount} 
            onChange={(value) => setForm((c) => ({ ...c, min_transaction_amount: value }))} 
          />
          <NumberField 
            label="Max bill amount" 
            value={form.max_transaction_amount} 
            onChange={(value) => setForm((c) => ({ ...c, max_transaction_amount: value }))} 
          />
          <TextField 
            label="Display label" 
            value={form.display_label} 
            onChange={(value) => setForm((c) => ({ ...c, display_label: value }))} 
          />
          <TextField 
            label="Issuer bank" 
            value={form.issuer_bank_name} 
            onChange={(value) => setForm((c) => ({ ...c, issuer_bank_name: value }))} 
          />
          <TextField 
            label="Banner image URL" 
            value={form.banner_image} 
            onChange={(value) => setForm((c) => ({ ...c, banner_image: value }))} 
          />
          <TextField 
            label="Brand color" 
            value={form.bank_brand_color} 
            onChange={(value) => setForm((c) => ({ ...c, bank_brand_color: value }))} 
            placeholder="#0047AB" 
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleField 
            label="Stack with other offers" 
            checked={form.stackable_with_other_offers} 
            onChange={(checked) => setForm((c) => ({ ...c, stackable_with_other_offers: checked }))} 
          />
          <ToggleField 
            label="Stack with platform offers" 
            checked={form.stackable_with_platform_offers} 
            onChange={(checked) => setForm((c) => ({ ...c, stackable_with_platform_offers: checked }))} 
          />
        </div>

        <TextareaField 
          label="Terms & conditions" 
          value={form.terms_and_conditions} 
          onChange={(value) => setForm((c) => ({ ...c, terms_and_conditions: value }))} 
        />
      </div>
    </details>
  );
}

function BinRuleCard({
  row,
  index,
  onUpdate,
  onRemove,
}: {
  row: BinDraft;
  index: number;
  onUpdate: (value: BinDraft) => void;
  onRemove: () => void;
}) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-slate-300">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
            {index + 1}
          </div>
          <p className="text-sm font-medium text-slate-800">Card Rule</p>
        </div>
        <button 
          type="button" 
          onClick={onRemove} 
          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField 
          label="BIN" 
          value={row.bin} 
          onChange={(value) => onUpdate({ ...row, bin: value.replace(/\D/g, "") })} 
          placeholder="431940" 
        />
        <NumberField 
          label="BIN length" 
          value={row.bin_length} 
          onChange={(value) => onUpdate({ ...row, bin_length: value })} 
        />
        <SelectField 
          label="Card type" 
          value={row.card_type} 
          options={BIN_CARD_TYPES} 
          onChange={(value) => onUpdate({ ...row, card_type: value })} 
        />
        <SelectField 
          label="Network" 
          value={row.card_network} 
          options={CARD_NETWORKS} 
          onChange={(value) => onUpdate({ ...row, card_network: value })} 
        />
        <TextField 
          label="Bank name" 
          value={row.issuer_bank_name} 
          onChange={(value) => onUpdate({ ...row, issuer_bank_name: value })} 
        />
        <ToggleField 
          label="Active" 
          checked={row.is_active} 
          onChange={(checked) => onUpdate({ ...row, is_active: checked })} 
        />
      </div>
    </div>
  );
}

function TargetRuleCard({
  row,
  index,
  cityOptions,
  categoryOptions,
  restaurants,
  stores,
  onUpdate,
  onRemove,
}: {
  row: TargetDraft;
  index: number;
  cityOptions: string[];
  categoryOptions: string[];
  restaurants: MerchantOption[];
  stores: MerchantOption[];
  onUpdate: (value: TargetDraft) => void;
  onRemove: () => void;
}) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-slate-300">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-700">
            {index + 1}
          </div>
          <p className="text-sm font-medium text-slate-800">Location Rule</p>
        </div>
        <button 
          type="button" 
          onClick={onRemove} 
          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField 
          label="Type" 
          value={row.target_type} 
          options={TARGET_TYPES} 
          onChange={(value) =>
            onUpdate({
              ...row,
              target_type: value as TargetDraft["target_type"],
              target_id: "",
              city: "",
              area: "",
              category_slug: "",
              chain_name: "",
            })
          }
        />
        {row.target_type === "CITY" || row.target_type === "AREA" ? (
          <SelectField 
            label="City" 
            value={row.city} 
            options={cityOptions} 
            onChange={(value) =>
              onUpdate({
                ...row,
                city: value,
                area: row.target_type === "CITY" ? "" : row.area,
              })
            }
          />
        ) : null}
        {row.target_type === "AREA" ? (
          <TextField 
            label="Area" 
            value={row.area} 
            onChange={(value) => onUpdate({ ...row, area: value })} 
          />
        ) : null}
        {row.target_type === "CATEGORY" ? (
          <SelectField 
            label="Category" 
            value={row.category_slug} 
            options={categoryOptions} 
            onChange={(value) => onUpdate({ ...row, category_slug: value })} 
          />
        ) : null}
        {row.target_type === "CHAIN" ? (
          <TextField 
            label="Chain name" 
            value={row.chain_name} 
            onChange={(value) => onUpdate({ ...row, chain_name: value })} 
          />
        ) : null}
        {row.target_type === "RESTAURANT" ? (
          <SelectField 
            label="Restaurant" 
            value={row.target_id} 
            options={restaurants.map((item) => ({
              value: item.id,
              label: `${item.name}${item.city ? ` • ${item.city}` : ""}`,
            }))}
            onChange={(value) => onUpdate({ ...row, target_id: value })}
          />
        ) : null}
        {row.target_type === "STORE" ? (
          <SelectField 
            label="Store" 
            value={row.target_id} 
            options={stores.map((item) => ({
              value: item.id,
              label: `${item.name}${item.city ? ` • ${item.city}` : ""}`,
            }))}
            onChange={(value) => onUpdate({ ...row, target_id: value })}
          />
        ) : null}
        {row.target_type === "ALL" ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            ✓ Available everywhere
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OfferCard({
  offer,
  onEdit,
  onDelete,
  isDeleting,
}: {
  offer: BankOfferRecord;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <article className="group rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
      <div className="flex gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {offer.bank_logo_url ? (
            <Image 
              src={offer.bank_logo_url} 
              alt={offer.bank_name} 
              width={56} 
              height={56} 
              className="h-full w-full object-contain" 
              unoptimized 
            />
          ) : (
            <Building2 className="h-6 w-6 text-slate-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-900">{offer.bank_name}</h3>
            <StatusBadge active={offer.is_active} label={offer.status} />
            <Pill>{humanize(offer.payment_instrument_type)}</Pill>
          </div>
          <p className="mt-1 truncate text-xs font-medium text-slate-800">{offer.title}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Pill>{offerBenefitText(offer)}</Pill>
            <Pill>Priority {offer.priority}</Pill>
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onEdit} 
          className="flex-1 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 transition-colors duration-200"
        >
          <Pencil className="mr-1 h-3.5 w-3.5" />
          Edit
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onDelete} 
          disabled={isDeleting} 
          className="flex-1 border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors duration-200"
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Delete
            </>
          )}
        </Button>
      </div>
    </article>
  );
}

function RedemptionTable({
  redemptions,
  currencyCode,
}: {
  redemptions: RedemptionRecord[];
  currencyCode: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Payment</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {redemptions.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors duration-150">
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-800 truncate">{row.order_reference}</div>
                  {row.payment_reference ? (
                    <div className="text-xs text-slate-500 truncate">{row.payment_reference}</div>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <div className="text-slate-700">{formatCurrency(row.original_amount, currencyCode)}</div>
                  <div className="text-xs text-emerald-600">-{formatCurrency(row.discount_amount, currencyCode)}</div>
                </td>
                <td className="px-3 py-2">
                  <div className="text-slate-700">{row.payment_instrument_type ? humanize(row.payment_instrument_type) : "—"}</div>
                  <div className="text-xs text-slate-500">{row.card_network ? humanize(row.card_network) : "—"}</div>
                </td>
                <td className="px-3 py-2">
                  <div className="text-slate-700 font-medium">{row.redemption_status}</div>
                  <div className="text-xs text-slate-500">{row.settlement_status}</div>
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {new Date(row.redeemed_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OfferListSkeleton() {
  return (
    <div className="space-y-3 pt-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-xl border border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50"
        />
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center">
      <Icon className="h-10 w-10 text-slate-300" />
      <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
      <p className="mt-1 text-xs text-slate-600">{description}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 transition-colors duration-200">
      {children}
    </span>
  );
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  const colors = {
    DRAFT: "bg-slate-100 text-slate-700",
    ACTIVE: "bg-emerald-100 text-emerald-700",
    PAUSED: "bg-amber-100 text-amber-700",
    EXPIRED: "bg-slate-100 text-slate-600",
    ARCHIVED: "bg-gray-100 text-gray-600",
  };
  
  const color = colors[label as keyof typeof colors] || "bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}