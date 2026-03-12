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
  bank_logo_dark_url: string;
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
  category?: string | null;
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
  bank_logo_dark_url: "",
  bank_brand_color: "",
  funded_by: "BANK",
};

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
    bank_logo_dark_url: form.bank_logo_dark_url.trim() || null,
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
  const fileRef = useRef<HTMLInputElement | null>(null);
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
    () => Array.from(new Set(stores.map((item) => item.category).filter(isNonEmptyString))).sort(),
    [stores]
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

  const dashboardStats = useMemo(() => {
    const live = offers.filter((offer) => offer.is_active && offer.status === "ACTIVE").length;
    const draft = offers.filter((offer) => offer.status === "DRAFT").length;
    const couponBased = offers.filter((offer) => offer.coupon_code).length;
    return {
      total: offers.length,
      live,
      draft,
      couponBased,
    };
  }, [offers]);

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
      supabaseBrowser.from("stores").select("id,name,city,area,category").order("name", { ascending: true }),
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
        bank_logo_dark_url: data.bank_logo_dark_url || "",
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
      bank_logo_dark_url: "",
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

      const offerId = editingId
        ? editingId
        : (
            await supabaseBrowser.from("bank_offers").insert(payload).select("id").single()
          ).data?.id;

      if (!editingId) {
        if (!offerId) throw new Error("Offer was created without a returned id.");
        createdOfferId = offerId;
      }

      if (editingId) {
        const { error } = await supabaseBrowser.from("bank_offers").update(payload).eq("id", editingId);
        if (error) throw error;
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
    <div className="min-h-full bg-slate-50">
      <div className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Payments Operations
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Bank Offer Console</h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage customer-facing discounts and payment eligibility with audit visibility.
            </p>
          </div>

          {editingId ? (
            <Button variant="outline" onClick={resetForm} className="border-slate-200 bg-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              New Offer
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-amber-50 shadow-sm">
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Production-facing discounts
              </div>
              <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900">
                Create bank offers in plain language, without forcing the client to think in database fields.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                The main form now follows a simple business flow: what the offer is, what the customer gets, when it runs,
                where it works, and which cards are eligible.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total offers" value={String(dashboardStats.total)} tone="slate" />
              <StatCard label="Live now" value={String(dashboardStats.live)} tone="emerald" />
              <StatCard label="In draft" value={String(dashboardStats.draft)} tone="amber" />
              <StatCard label="Coupon-based" value={String(dashboardStats.couponBased)} tone="blue" />
            </div>
          </div>
        </section>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-6 sm:px-6 lg:grid-cols-[460px_minmax(0,1fr)]">
        <div className="space-y-6">
          <SectionCard
            icon={BadgePercent}
            title={editingId ? "Edit Offer" : "Create Offer"}
            description="Simple setup for the client. Technical controls live inside Advanced Settings."
          >
            <Subsection
              eyebrow="Step 1"
              title="Bank and offer identity"
              description="Start with the bank details and logo so it is clear which brand this offer belongs to."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Offer name" value={form.title} onChange={(value) => setForm((c) => ({ ...c, title: value }))} placeholder="20% off weekend dining" />
              <TextField label="Short customer label" value={form.short_title} onChange={(value) => setForm((c) => ({ ...c, short_title: value }))} placeholder="Weekend dining deal" />
              <TextField label="Bank name" value={form.bank_name} onChange={(value) => setForm((c) => ({ ...c, bank_name: value }))} placeholder="HDFC Bank" />
              <TextField label="Partner / sponsor name" value={form.sponsor_name} onChange={(value) => setForm((c) => ({ ...c, sponsor_name: value }))} placeholder="Usually the same as bank name" />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">Bank logo</p>
                  <p className="mt-1 text-xs text-slate-500">Upload the bank logo. You can replace or remove it any time.</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoPick} />
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="border-slate-200 bg-white">
                  <Upload className="mr-2 h-4 w-4" />
                  {logoPreview ? "Replace logo" : "Upload logo"}
                </Button>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                  {logoPreview ? (
                    <Image src={logoPreview} alt="Bank logo preview" width={80} height={80} className="h-full w-full object-contain" unoptimized />
                  ) : (
                    <Building2 className="h-8 w-8 text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-medium text-slate-800">
                      {logoPreview ? "Logo uploaded" : "No logo uploaded yet"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {logoFile
                        ? `Selected file: ${logoFile.name}`
                        : logoPreview
                          ? "Current logo will be used for this bank offer."
                          : "Upload a PNG, JPG, or SVG logo."}
                    </p>
                    {logoPreview ? (
                      <button
                        type="button"
                        onClick={() => void handleRemoveLogo()}
                        className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Remove logo
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <TextareaField label="Offer description" value={form.description} onChange={(value) => setForm((c) => ({ ...c, description: value }))} />
            <TextField label="Badge text shown in the app" value={form.badge_text} onChange={(value) => setForm((c) => ({ ...c, badge_text: value }))} placeholder="Bank Offer" />

            <Subsection
              eyebrow="Step 2"
              title="Customer benefit"
              description="Choose the offer type and fill the values the customer will actually receive."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Offer type" value={form.offer_type} options={OFFER_TYPES} onChange={(value) => setForm((c) => ({ ...c, offer_type: value as BankOfferForm["offer_type"] }))} />
              <SelectField label="Payment method" value={form.payment_instrument_type} options={PAYMENT_INSTRUMENTS} onChange={(value) => setForm((c) => ({ ...c, payment_instrument_type: value as BankOfferForm["payment_instrument_type"] }))} />
              <NumberField label="Discount percentage" value={form.discount_percent} onChange={(value) => setForm((c) => ({ ...c, discount_percent: value }))} />
              <NumberField label="Flat discount amount" value={form.discount_amount} onChange={(value) => setForm((c) => ({ ...c, discount_amount: value }))} />
              <NumberField label="Cashback percentage" value={form.cashback_percent} onChange={(value) => setForm((c) => ({ ...c, cashback_percent: value }))} />
              <NumberField label="Cashback amount" value={form.cashback_amount} onChange={(value) => setForm((c) => ({ ...c, cashback_amount: value }))} />
              <NumberField label="Maximum discount" value={form.max_discount_amount} onChange={(value) => setForm((c) => ({ ...c, max_discount_amount: value }))} />
              <TextField label="Currency" value={form.currency_code} onChange={(value) => setForm((c) => ({ ...c, currency_code: value.toUpperCase() }))} maxLength={3} />
            </div>

            <Subsection
              eyebrow="Step 3"
              title="Offer schedule"
              description="Choose when the offer starts and ends, and whether it should already be visible in the app."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <DateTimeField label="Starts on" value={form.valid_from} onChange={(value) => setForm((c) => ({ ...c, valid_from: value }))} />
              <DateTimeField label="Ends on" value={form.valid_until} onChange={(value) => setForm((c) => ({ ...c, valid_until: value }))} />
              <SelectField label="Status" value={form.status} options={STATUS_OPTIONS} onChange={(value) => setForm((c) => ({ ...c, status: value as BankOfferForm["status"] }))} />
              <NumberField label="Priority order" value={form.priority} onChange={(value) => setForm((c) => ({ ...c, priority: value }))} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleField label="Show this offer in the app" checked={form.is_active} onChange={(checked) => setForm((c) => ({ ...c, is_active: checked }))} />
              <ToggleField label="Customer needs a coupon code" checked={form.requires_coupon_code} onChange={(checked) => setForm((c) => ({ ...c, requires_coupon_code: checked, coupon_code: checked ? c.coupon_code : "" }))} />
            </div>

            {form.requires_coupon_code ? (
              <TextField label="Coupon code" value={form.coupon_code} onChange={(value) => setForm((c) => ({ ...c, coupon_code: value }))} />
            ) : null}

            <details className="rounded-3xl border border-slate-200 bg-slate-50/80">
              <summary className="cursor-pointer list-none px-4 py-4 text-sm font-semibold text-slate-800">
                Advanced Settings
              </summary>
              <div className="space-y-4 border-t border-slate-200 px-4 py-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField label="Sponsor type" value={form.sponsor_type} options={SPONSOR_TYPES} onChange={(value) => setForm((c) => ({ ...c, sponsor_type: value as BankOfferForm["sponsor_type"] }))} />
                  <SelectField label="Who funds this offer?" value={form.funded_by} options={FUNDED_BY} onChange={(value) => setForm((c) => ({ ...c, funded_by: value as BankOfferForm["funded_by"] }))} />
                  <SelectField label="Benefit kind" value={form.benefit_kind} options={BENEFIT_KINDS} onChange={(value) => setForm((c) => ({ ...c, benefit_kind: value as BankOfferForm["benefit_kind"] }))} />
                  <SelectField label="Card network" value={form.card_network} options={CARD_NETWORKS} onChange={(value) => setForm((c) => ({ ...c, card_network: value }))} />
                  <SelectField label="App section" value={form.applies_to_module} options={MODULE_TYPES} onChange={(value) => setForm((c) => ({ ...c, applies_to_module: value as BankOfferForm["applies_to_module"] }))} />
                  <SelectField label="Payment stage" value={form.applies_to_payment_flow} options={PAYMENT_FLOWS} onChange={(value) => setForm((c) => ({ ...c, applies_to_payment_flow: value as BankOfferForm["applies_to_payment_flow"] }))} />
                  <NumberField label="Minimum bill amount" value={form.min_transaction_amount} onChange={(value) => setForm((c) => ({ ...c, min_transaction_amount: value }))} />
                  <NumberField label="Maximum bill amount" value={form.max_transaction_amount} onChange={(value) => setForm((c) => ({ ...c, max_transaction_amount: value }))} />
                  <TextField label="Customer display label" value={form.display_label} onChange={(value) => setForm((c) => ({ ...c, display_label: value }))} />
                  <TextField label="Issuer bank name override" value={form.issuer_bank_name} onChange={(value) => setForm((c) => ({ ...c, issuer_bank_name: value }))} />
                  <TextField label="Banner image URL" value={form.banner_image} onChange={(value) => setForm((c) => ({ ...c, banner_image: value }))} />
                  <TextField label="Brand color" value={form.bank_brand_color} onChange={(value) => setForm((c) => ({ ...c, bank_brand_color: value }))} placeholder="#0047AB" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ToggleField label="Can combine with other offers" checked={form.stackable_with_other_offers} onChange={(checked) => setForm((c) => ({ ...c, stackable_with_other_offers: checked }))} />
                  <ToggleField label="Can combine with platform offers" checked={form.stackable_with_platform_offers} onChange={(checked) => setForm((c) => ({ ...c, stackable_with_platform_offers: checked }))} />
                </div>

                <TextareaField label="Terms and conditions" value={form.terms_and_conditions} onChange={(value) => setForm((c) => ({ ...c, terms_and_conditions: value }))} />
              </div>
            </details>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSubmit} disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    {editingId ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                    {editingId ? "Update offer" : "Create offer"}
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} className="border-slate-200">
                Reset
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            icon={CreditCard}
            title="Eligible Cards"
            description="Only add these rules if the offer should work for specific cards."
            action={
              <Button type="button" variant="outline" onClick={() => setBins((current) => [...current, createBinDraft()])} className="border-slate-200">
                <Plus className="mr-2 h-4 w-4" />
                Add card rule
              </Button>
            }
          >
            <div className="space-y-3">
              {bins.map((row, index) => (
                <div key={row.clientId} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">Card Rule {index + 1}</p>
                    <button type="button" onClick={() => setBins((current) => current.filter((item) => item.clientId !== row.clientId))} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-700">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField label="Card BIN" value={row.bin} onChange={(value) => setBins((current) => current.map((item) => item.clientId === row.clientId ? { ...item, bin: value.replace(/\D/g, "") } : item))} placeholder="431940" />
                    <NumberField label="BIN length" value={row.bin_length} onChange={(value) => setBins((current) => current.map((item) => item.clientId === row.clientId ? { ...item, bin_length: value } : item))} />
                    <SelectField label="Card type" value={row.card_type} options={BIN_CARD_TYPES} onChange={(value) => setBins((current) => current.map((item) => item.clientId === row.clientId ? { ...item, card_type: value } : item))} />
                    <SelectField label="Card network" value={row.card_network} options={CARD_NETWORKS} onChange={(value) => setBins((current) => current.map((item) => item.clientId === row.clientId ? { ...item, card_network: value } : item))} />
                    <TextField label="Bank name override" value={row.issuer_bank_name} onChange={(value) => setBins((current) => current.map((item) => item.clientId === row.clientId ? { ...item, issuer_bank_name: value } : item))} />
                    <ToggleField label="Use this card rule" checked={row.is_active} onChange={(checked) => setBins((current) => current.map((item) => item.clientId === row.clientId ? { ...item, is_active: checked } : item))} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            icon={Target}
            title="Where This Offer Works"
            description="Choose where customers can use the offer."
            action={
              <Button type="button" variant="outline" onClick={() => setTargets((current) => [...current, createTargetDraft()])} className="border-slate-200">
                <Plus className="mr-2 h-4 w-4" />
                Add location rule
              </Button>
            }
          >
            <div className="space-y-3">
              {targets.map((row, index) => (
                <div key={row.clientId} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">Location Rule {index + 1}</p>
                    <button type="button" onClick={() => setTargets((current) => current.filter((item) => item.clientId !== row.clientId))} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-700">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField label="Availability type" value={row.target_type} options={TARGET_TYPES} onChange={(value) => setTargets((current) => current.map((item) => item.clientId === row.clientId ? { ...item, target_type: value as TargetDraft["target_type"], target_id: "", city: "", area: "", category_slug: "", chain_name: "" } : item))} />
                    {row.target_type === "CITY" || row.target_type === "AREA" ? (
                      <SelectField label="City" value={row.city} options={cityOptions} onChange={(value) => setTargets((current) => current.map((item) => item.clientId === row.clientId ? { ...item, city: value, area: row.target_type === "CITY" ? "" : item.area } : item))} />
                    ) : null}
                    {row.target_type === "AREA" ? (
                      <TextField label="Area / locality" value={row.area} onChange={(value) => setTargets((current) => current.map((item) => item.clientId === row.clientId ? { ...item, area: value } : item))} />
                    ) : null}
                    {row.target_type === "CATEGORY" ? (
                      <SelectField label="Store category" value={row.category_slug} options={categoryOptions} onChange={(value) => setTargets((current) => current.map((item) => item.clientId === row.clientId ? { ...item, category_slug: value } : item))} />
                    ) : null}
                    {row.target_type === "CHAIN" ? (
                      <TextField label="Chain name" value={row.chain_name} onChange={(value) => setTargets((current) => current.map((item) => item.clientId === row.clientId ? { ...item, chain_name: value } : item))} />
                    ) : null}
                    {row.target_type === "RESTAURANT" ? (
                      <SelectField label="Restaurant" value={row.target_id} options={restaurants.map((item) => ({ value: item.id, label: `${item.name}${item.city ? ` • ${item.city}` : ""}` }))} onChange={(value) => setTargets((current) => current.map((item) => item.clientId === row.clientId ? { ...item, target_id: value } : item))} />
                    ) : null}
                    {row.target_type === "STORE" ? (
                      <SelectField label="Store" value={row.target_id} options={stores.map((item) => ({ value: item.id, label: `${item.name}${item.category ? ` • ${item.category}` : ""}` }))} onChange={(value) => setTargets((current) => current.map((item) => item.clientId === row.clientId ? { ...item, target_id: value } : item))} />
                    ) : null}
                    {row.target_type === "ALL" ? (
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                        This offer is available everywhere that matches the payment rule.
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            icon={ShieldCheck}
            title="Live Offers"
            description="Review and edit offers that are already saved."
          >
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search by bank, title, type, status..." className="border-slate-200" />

            {loading ? (
              <div className="space-y-3 pt-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
                ))}
              </div>
            ) : filteredOffers.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
                <BadgePercent className="h-10 w-10 text-slate-300" />
                <p className="mt-4 text-base font-medium text-slate-700">No bank offers found</p>
                <p className="mt-1 text-sm text-slate-500">Create an offer or adjust the search criteria.</p>
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                {filteredOffers.map((offer) => (
                  <article key={offer.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                          {offer.bank_logo_url ? (
                            <Image src={offer.bank_logo_url} alt={offer.bank_name} width={64} height={64} className="h-full w-full object-contain" unoptimized />
                          ) : (
                            <Building2 className="h-7 w-7 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold text-slate-900">{offer.bank_name}</h3>
                            <StatusBadge active={offer.is_active} label={offer.status} />
                            <Pill>{humanize(offer.payment_instrument_type)}</Pill>
                            {offer.card_network ? <Pill>{humanize(offer.card_network)}</Pill> : null}
                          </div>
                          <p className="mt-1 text-sm font-medium text-slate-800">{offer.title}</p>
                          {offer.short_title ? <p className="mt-1 text-sm text-slate-500">{offer.short_title}</p> : null}
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                            <Pill>{offerBenefitText(offer)}</Pill>
                            <Pill>Priority {offer.priority}</Pill>
                            {offer.coupon_code ? <Pill>Code {offer.coupon_code}</Pill> : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-3 xl:items-end">
                        <div className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs text-slate-500">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {new Date(offer.valid_from).toLocaleString()} - {new Date(offer.valid_until).toLocaleString()}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => startEdit(offer.id)} className="border-slate-200">
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(offer.id)} disabled={deletingId === offer.id} className="border-slate-200 text-red-600 hover:text-red-700">
                            {deletingId === offer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="mr-2 h-4 w-4" />Delete</>}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={MapPin}
            title="Redemption Visibility"
            description={
              editingId
                ? "Recent customer usage for this offer."
                : "Open an offer to inspect customer usage after it goes live."
            }
          >
            {redemptionsLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading redemption history...
              </div>
            ) : !editingId ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Select an offer to view recent redemptions and settlement states.
              </div>
            ) : redemptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No redemption records yet for this offer.
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Order</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Payment</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Redeemed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redemptions.map((row) => (
                      <tr key={row.id} className="border-t border-slate-200 bg-white">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{row.order_reference}</div>
                          {row.payment_reference ? <div className="text-xs text-slate-500">{row.payment_reference}</div> : null}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div>{formatCurrency(row.original_amount, form.currency_code)}</div>
                          <div className="text-xs text-emerald-600">Discount {formatCurrency(row.discount_amount, form.currency_code)}</div>
                          <div className="text-xs text-slate-500">Final {formatCurrency(row.final_amount, form.currency_code)}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div>{row.payment_instrument_type ? humanize(row.payment_instrument_type) : "—"}</div>
                          <div className="text-xs text-slate-500">{row.card_network ? humanize(row.card_network) : "—"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-800">{row.redemption_status}</div>
                          <div className="text-xs text-slate-500">{row.settlement_status}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{new Date(row.redeemed_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
            <Icon className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Subsection({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-t border-slate-100 pt-1 first:border-t-0 first:pt-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{eyebrow}</p>
      <h3 className="mt-1 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "slate" | "emerald" | "amber" | "blue";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : tone === "blue"
          ? "bg-blue-50 text-blue-700 border-blue-100"
          : "bg-white text-slate-700 border-slate-200";

  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
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
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} className="mt-2 h-11 border-slate-200 bg-white shadow-none" />
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
      <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 h-11 border-slate-200 bg-white shadow-none" />
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
      <Input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 h-11 border-slate-200 bg-white shadow-none" />
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
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 min-h-24 border-slate-200 bg-white shadow-none" />
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
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none shadow-none">
        {options.map((option) => {
          if (typeof option === "string") {
            return (
              <option key={option} value={option}>
                {option}
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
    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
      {label}
    </label>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">{children}</span>;
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={[
        "rounded-full px-2.5 py-1 text-xs font-medium",
        active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600",
      ].join(" ")}
    >
      {label}
    </span>
  );
}
