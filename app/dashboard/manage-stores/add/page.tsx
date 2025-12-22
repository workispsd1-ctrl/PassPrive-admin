"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import {
  X,
  Plus,
  Minus,
  Building2,
  MapPin,
  Phone,
  Wallet,
  Images,
  Clock3,
  Tags,
  BadgeCheck,
  FileText,
  CreditCard,
  Package,
  Video,
  Mic,
  Percent,
  Ticket,
} from "lucide-react";

const inputClass = "border border-gray-300 focus:border-gray-400 focus:ring-0";

const PRIMARY_BTN = "bg-indigo-600 text-white hover:bg-indigo-700";
const PRIMARY_BTN_OUTLINE =
  "border-indigo-200 text-indigo-700 hover:bg-indigo-50";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type DayHours = {
  open: string;
  close: string;
  closed?: boolean;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

type PaymentDetails = {
  legal_business_name: string;
  display_name_on_invoice?: string;

  payout_method: "BANK_TRANSFER" | "UPI" | "MANUAL";
  beneficiary_name?: string;
  bank_name?: string;
  account_number?: string;
  ifsc?: string;
  iban?: string;
  swift?: string;
  payout_upi_id?: string;

  settlement_cycle: "T+0" | "T+1" | "T+2" | "WEEKLY" | "MONTHLY";
  commission_percent?: string;
  currency: string;

  tax_id_label?: "VAT" | "GST" | "BRN" | "TIN" | "OTHER";
  tax_id_value?: string;

  billing_email?: string;
  billing_phone?: string;

  kyc_status: "NOT_STARTED" | "PENDING" | "VERIFIED";
  notes?: string;
};

type CatalogueItemDraft = {
  id: string;
  title: string;
  price: string;
  sku?: string;
  description?: string;
  is_available: boolean;
  imageFile?: File | null;
  imageUrl?: string | null;
};

type CatalogueCategoryDraft = {
  id: string;
  enabled: boolean;
  title: string;
  starting_from: string;
  items: CatalogueItemDraft[];
  expanded: boolean;
};

/* -----------------------------
   ✅ DISCOUNTS / OFFERS
----------------------------- */

type DiscountType =
  | "IN_STORE"
  | "DISTRICT_PASS"
  | "BANK_BENEFIT"
  | "COUPON";

type DiscountValueType = "PERCENT" | "FLAT";

type StoreOfferDraft = {
  id: string;
  enabled: boolean;

  type: DiscountType;
  title: string;
  subtitle?: string;
  badge_text?: string;

  value_type: DiscountValueType;
  percent?: string;
  flat_amount?: string;
  currency?: string;

  min_bill?: string;
  max_discount?: string;

  start_at?: string;
  end_at?: string;

  requires_pass?: boolean;
  pass_tiers?: string;

  coupon_code?: string;

  stackable?: boolean;
  terms?: string;

  expanded: boolean;
};

function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(16)}_${Math.random()
    .toString(16)
    .slice(2)}`;
}

function safeNumberOrNull(v: string) {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const DEFAULT_CATALOGUE_PRESETS: Array<{ title: string; starting_from: string }> =
  [
    { title: "New Arrivals", starting_from: "" },
    { title: "Hot Drops", starting_from: "" },
    { title: "Mens Wear", starting_from: "" },
    { title: "Women Wear", starting_from: "" },
    { title: "Kids Wear", starting_from: "" },
    { title: "Sneakers", starting_from: "" },
    { title: "Accessories", starting_from: "" },
    { title: "Home & Living", starting_from: "" },
  ];

export default function AddStorePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Media
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverVideoFile, setCoverVideoFile] = useState<File | null>(null);
  const [coverAudioFile, setCoverAudioFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  // ✅ Only one section expanded at a time
  const [openSection, setOpenSection] = useState<
    | "basic"
    | "contact"
    | "location"
    | "media"
    | "hours"
    | "discounts"
    | "payment"
    | "catalogue"
    | null
  >("basic");

  // Preserve scroll position on state changes
  const scrollYRef = useRef<number>(0);
  useEffect(() => {
    const onScroll = () => {
      scrollYRef.current = window.scrollY || 0;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const preserveScroll = (fn: () => void) => {
    const y = scrollYRef.current || window.scrollY || 0;
    fn();
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, behavior: "auto" });
    });
  };

  const setOpenSectionStable = (next: typeof openSection) => {
    const y = scrollYRef.current;
    setOpenSection(next);
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, behavior: "auto" });
    });
  };

  const toggleSectionStable = (key: typeof openSection) => {
    const next = openSection === key ? null : key;
    setOpenSectionStable(next);
  };

  // ✅ Status switch (is_active)
  const [form, setForm] = useState({
    name: "",
    category: "",
    subcategory: "",
    tags: "",
    description: "",

    phone: "",
    whatsapp: "",
    email: "",
    website: "",

    location_name: "",
    address_line1: "",
    address_line2: "",
    city: "",
    region: "",
    postal_code: "",
    lat: "",
    lng: "",
    google_place_id: "",

    instagram: "",
    facebook: "",
    tiktok: "",
    maps: "",

    is_active: true,
    is_featured: false,
  });

  const [openingHours, setOpeningHours] = useState<Record<string, DayHours>>(
    DAYS.reduce((acc, day) => {
      acc[day] = { open: "", close: "", closed: false };
      return acc;
    }, {} as Record<string, DayHours>)
  );

  const [payment, setPayment] = useState<PaymentDetails>({
    legal_business_name: "",
    display_name_on_invoice: "",
    payout_method: "BANK_TRANSFER",
    beneficiary_name: "",
    bank_name: "",
    account_number: "",
    ifsc: "",
    iban: "",
    swift: "",
    payout_upi_id: "",
    settlement_cycle: "T+1",
    commission_percent: "",
    currency: "MUR",
    tax_id_label: "VAT",
    tax_id_value: "",
    billing_email: "",
    billing_phone: "",
    kyc_status: "NOT_STARTED",
    notes: "",
  });

  const [catalogueCategories, setCatalogueCategories] = useState<
    CatalogueCategoryDraft[]
  >(() =>
    DEFAULT_CATALOGUE_PRESETS.map((p) => ({
      id: uid("cat"),
      enabled: false,
      title: p.title,
      starting_from: p.starting_from,
      items: [],
      expanded: false,
    }))
  );

  const [customCategoryTitle, setCustomCategoryTitle] = useState("");
  const [customCategoryStartingFrom, setCustomCategoryStartingFrom] =
    useState("");

  // ✅ Discounts state
  const [offers, setOffers] = useState<StoreOfferDraft[]>([
    {
      id: uid("offer"),
      enabled: false,
      type: "DISTRICT_PASS",
      title: "District Pass: 10% off",
      subtitle: "Only for Pass members",
      badge_text: "District Pass",
      value_type: "PERCENT",
      percent: "10",
      flat_amount: "",
      currency: "MUR",
      min_bill: "",
      max_discount: "",
      start_at: "",
      end_at: "",
      requires_pass: true,
      pass_tiers: "Gold, Platinum",
      coupon_code: "",
      stackable: false,
      terms: "",
      expanded: false,
    },
  ]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  const tagsArray = useMemo(() => {
    return form.tags
      ? form.tags.split(",").map((v) => v.trim()).filter(Boolean)
      : [];
  }, [form.tags]);

  /* ---------------------------------------------
     OFFERS HELPERS
  --------------------------------------------- */
  const addOffer = (preset?: DiscountType) => {
    const type: DiscountType = preset || "IN_STORE";
    const isPass = type === "DISTRICT_PASS";
    const isCoupon = type === "COUPON";
    const isBank = type === "BANK_BENEFIT";

    preserveScroll(() => {
      setOffers((prev) => [
        ...prev.map((o) => ({ ...o, expanded: false })),
        {
          id: uid("offer"),
          enabled: true,
          type,
          title:
            type === "IN_STORE"
              ? "In-store: 10% off"
              : type === "DISTRICT_PASS"
              ? "District Pass: 15% off"
              : type === "BANK_BENEFIT"
              ? "Bank benefits: 10% off"
              : "Coupon: SAVE10",

          subtitle:
            type === "DISTRICT_PASS"
              ? "Only for Pass members"
              : type === "BANK_BENEFIT"
              ? "Only for eligible card holders"
              : type === "COUPON"
              ? "Apply code at checkout"
              : "",

          badge_text: isPass
            ? "District Pass"
            : isBank
            ? "Bank benefits"
            : isCoupon
            ? "Coupon"
            : "In-store",

          value_type: "PERCENT",
          percent: "10",
          flat_amount: "",
          currency: "MUR",
          min_bill: "",
          max_discount: "",
          start_at: "",
          end_at: "",
          requires_pass: isPass ? true : false,
          pass_tiers: isPass ? "Gold, Platinum" : "",
          coupon_code: isCoupon ? "SAVE10" : "",
          stackable: false,
          terms: "",
          expanded: true,
        },
      ]);
    });
  };

  const removeOffer = (id: string) => {
    preserveScroll(() => {
      setOffers((prev) => prev.filter((o) => o.id !== id));
    });
  };

  const toggleOfferExpanded = (id: string) => {
    preserveScroll(() => {
      setOffers((prev) =>
        prev.map((o) =>
          o.id === id
            ? { ...o, expanded: !o.expanded }
            : { ...o, expanded: false }
        )
      );
    });
  };

  const updateOffer = (id: string, patch: Partial<StoreOfferDraft>) => {
    preserveScroll(() => {
      setOffers((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
      );
    });
  };

  /* ---------------------------------------------
     STORAGE UPLOAD HELPERS
  --------------------------------------------- */
  const uploadSingle = async (
    storeId: string,
    file: File | null,
    folder: "logo" | "cover_video" | "cover_audio"
  ) => {
    if (!file) return null;

    const ext = file.name.split(".").pop();
    const path = `${folder}/${storeId}/${Date.now()}.${ext}`;

    const { error } = await supabaseBrowser.storage
      .from("stores")
      .upload(path, file);

    if (error) throw error;

    const { data } = supabaseBrowser.storage.from("stores").getPublicUrl(path);
    return data.publicUrl;
  };

  const uploadMultiple = async (
    storeId: string,
    files: File[],
    folder: "gallery"
  ) => {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${folder}/${storeId}/${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}.${ext}`;

      const { error } = await supabaseBrowser.storage
        .from("stores")
        .upload(path, file);

      if (error) throw error;

      const { data } = supabaseBrowser.storage.from("stores").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const uploadCatalogueImage = async (
    storeId: string,
    categoryId: string,
    itemId: string,
    file: File
  ) => {
    const ext = file.name.split(".").pop();
    const path = `catalogue/${storeId}/${categoryId}/${itemId}-${Date.now()}.${ext}`;

    const { error } = await supabaseBrowser.storage
      .from("stores")
      .upload(path, file);

    if (error) throw error;

    const { data } = supabaseBrowser.storage.from("stores").getPublicUrl(path);
    return data.publicUrl;
  };

  /* ---------------------------------------------
     CATALOGUE ACTIONS
  --------------------------------------------- */
  const toggleCategoryEnabled = (catId: string, enabled: boolean) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) =>
        prev.map((c) =>
          c.id === catId
            ? {
                ...c,
                enabled,
                expanded: enabled ? true : false,
                items:
                  enabled && c.items.length === 0
                    ? [
                        {
                          id: uid("item"),
                          title: "",
                          price: "",
                          sku: "",
                          description: "",
                          is_available: true,
                          imageFile: null,
                          imageUrl: null,
                        },
                      ]
                    : enabled
                    ? c.items
                    : [],
              }
            : c
        )
      );
    });
  };

  const toggleCategoryExpanded = (catId: string) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) =>
        prev.map((c) =>
          c.id === catId ? { ...c, expanded: !c.expanded } : c
        )
      );
    });
  };

  const addCategory = () => {
    const title = customCategoryTitle.trim();
    if (!title) return;

    preserveScroll(() => {
      setCatalogueCategories((prev) => [
        {
          id: uid("cat"),
          enabled: true,
          title,
          starting_from: customCategoryStartingFrom.trim(),
          items: [
            {
              id: uid("item"),
              title: "",
              price: "",
              sku: "",
              description: "",
              is_available: true,
              imageFile: null,
              imageUrl: null,
            },
          ],
          expanded: true,
        },
        ...prev,
      ]);

      setCustomCategoryTitle("");
      setCustomCategoryStartingFrom("");
    });
  };

  const removeCategory = (catId: string) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) => prev.filter((c) => c.id !== catId));
    });
  };

  const updateCategoryField = (
    catId: string,
    key: "title" | "starting_from",
    value: string
  ) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, [key]: value } : c))
      );
    });
  };

  const addItemToCategory = (catId: string) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) =>
        prev.map((c) =>
          c.id === catId
            ? {
                ...c,
                items: [
                  ...c.items,
                  {
                    id: uid("item"),
                    title: "",
                    price: "",
                    sku: "",
                    description: "",
                    is_available: true,
                    imageFile: null,
                    imageUrl: null,
                  },
                ],
                expanded: true,
              }
            : c
        )
      );
    });
  };

  const removeItemFromCategory = (catId: string, itemId: string) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) =>
        prev.map((c) =>
          c.id === catId
            ? { ...c, items: c.items.filter((it) => it.id !== itemId) }
            : c
        )
      );
    });
  };

  const updateItem = (
    catId: string,
    itemId: string,
    key:
      | "title"
      | "price"
      | "sku"
      | "description"
      | "is_available"
      | "imageFile",
    value: any
  ) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) =>
        prev.map((c) =>
          c.id === catId
            ? {
                ...c,
                items: c.items.map((it) =>
                  it.id === itemId ? { ...it, [key]: value } : it
                ),
              }
            : c
        )
      );
    });
  };

  /* ---------------------------------------------
     PREVIEW HELPERS
  --------------------------------------------- */
  const SinglePreview = ({
    file,
    onRemove,
  }: {
    file: File | null;
    onRemove: () => void;
  }) => {
    if (!file) return null;
    const url = URL.createObjectURL(file);
    return (
      <div className="relative h-24 w-24 rounded-xl overflow-hidden border border-gray-200 mt-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="preview" className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={() => preserveScroll(onRemove)}
          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black"
          aria-label="Remove"
        >
          <X size={12} />
        </button>
      </div>
    );
  };

  const MediaPreview = ({
    file,
    kind,
    onRemove,
  }: {
    file: File | null;
    kind: "video" | "audio";
    onRemove: () => void;
  }) => {
    if (!file) return null;
    const url = URL.createObjectURL(file);
    return (
      <div className="mt-3 rounded-xl border bg-white p-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">
            Selected {kind}: {file.name}
          </div>
          <button
            type="button"
            onClick={() => preserveScroll(onRemove)}
            className="rounded-full bg-black/70 p-2 text-white hover:bg-black"
            aria-label="Remove"
          >
            <X size={14} />
          </button>
        </div>

        <div className="mt-3">
          {kind === "video" ? (
            <video
              src={url}
              controls
              className="w-full max-h-[260px] rounded-lg"
            />
          ) : (
            <audio src={url} controls className="w-full" />
          )}
        </div>
      </div>
    );
  };

  const ImagePreviewGrid = ({
    files,
    onRemove,
  }: {
    files: File[];
    onRemove: (index: number) => void;
  }) => (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
      {files.map((file, index) => {
        const url = URL.createObjectURL(file);
        return (
          <div
            key={index}
            className="relative h-24 rounded-xl overflow-hidden border border-gray-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="preview"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => preserveScroll(() => onRemove(index))}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black"
              aria-label="Remove"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );

  const ItemImagePreview = ({
    file,
    onRemove,
  }: {
    file: File | null | undefined;
    onRemove: () => void;
  }) => {
    if (!file) return null;
    const url = URL.createObjectURL(file);
    return (
      <div className="relative h-20 w-20 rounded-xl overflow-hidden border border-gray-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="item" className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={() => preserveScroll(onRemove)}
          className="absolute -top-2 -right-2 bg-black/70 text-white rounded-full p-1 hover:bg-black"
          aria-label="Remove item image"
        >
          <X size={12} />
        </button>
      </div>
    );
  };

  const Label = ({
    children,
    hint,
    required,
  }: {
    children: React.ReactNode;
    hint?: string;
    required?: boolean;
  }) => (
    <div className="mb-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">
          {children} {required ? <span className="text-red-600">*</span> : null}
        </span>
      </div>
      {hint ? <div className="text-xs text-gray-500 mt-1">{hint}</div> : null}
    </div>
  );

  const Switch = ({
    checked,
    onChange,
    label,
    hint,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    hint?: string;
  }) => (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-gray-50 px-4 py-3">
      <div>
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        {hint ? <div className="text-xs text-gray-500 mt-1">{hint}</div> : null}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => preserveScroll(() => onChange(!checked))}
        className={[
          "relative inline-flex h-7 w-12 items-center rounded-full transition",
          checked ? "bg-[#DA3224]" : "bg-gray-300",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-5 w-5 transform rounded-full bg-white transition",
            checked ? "translate-x-6" : "translate-x-1",
          ].join(" ")}
        />
      </button>
    </div>
  );

  const Section = ({
    id,
    title,
    subtitle,
    icon,
    children,
  }: {
    id: NonNullable<typeof openSection>;
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    const open = openSection === id;
    return (
      <div className="rounded-2xl border bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => preserveScroll(() => toggleSectionStable(id))}
          className="w-full flex items-center justify-between px-5 py-4"
        >
          <div className="flex items-start gap-3 text-left">
            <div className="mt-0.5 text-gray-900">{icon}</div>
            <div>
              <div className="text-[13px] font-semibold tracking-wide text-gray-900 uppercase">
                {title}
              </div>
              {subtitle ? (
                <div className="text-sm text-gray-500 mt-1">{subtitle}</div>
              ) : null}
            </div>
          </div>
          <div className="text-gray-800">
            {open ? <Minus size={18} /> : <Plus size={18} />}
          </div>
        </button>

        {open ? <div className="px-5 pb-5">{children}</div> : null}
      </div>
    );
  };

  /* ---------------------------------------------
     SUBMIT
  --------------------------------------------- */
  const handleSubmit = async () => {
    if (!form.name.trim()) {
      showToast({ type: "error", title: "Store name is required" });
      setOpenSectionStable("basic");
      return;
    }
    if (!form.category.trim()) {
      showToast({ type: "error", title: "Category is required" });
      setOpenSectionStable("basic");
      return;
    }
    if (!form.region.trim()) {
      showToast({ type: "error", title: "Region is required" });
      setOpenSectionStable("location");
      return;
    }
    if (!form.postal_code.trim()) {
      showToast({ type: "error", title: "Postal code is required" });
      setOpenSectionStable("location");
      return;
    }
    if (!payment.legal_business_name.trim()) {
      showToast({
        type: "error",
        title: "Legal business name is required",
        description: "Required for settlement & invoicing.",
      });
      setOpenSectionStable("payment");
      return;
    }

    setLoading(true);

    try {
      const hours = DAYS.map((day) => {
        const d = openingHours[day];
        const closed = !!d.closed || (!d.open && !d.close);
        return {
          day,
          closed,
          slots: closed ? [] : [{ open: d.open, close: d.close }],
        };
      });

      const social_links = {
        instagram: form.instagram || undefined,
        facebook: form.facebook || undefined,
        tiktok: form.tiktok || undefined,
        maps: form.maps || undefined,
        website: form.website || undefined,
      };

      const lat = safeNumberOrNull(form.lat);
      const lng = safeNumberOrNull(form.lng);

      // ✅ offers: keep only enabled, normalize numbers
      const offersFinal = offers
        .filter((o) => o.enabled)
        .map((o) => ({
          id: o.id,
          type: o.type,
          title: o.title?.trim(),
          subtitle: o.subtitle?.trim() || null,
          badge_text: o.badge_text?.trim() || null,
          value_type: o.value_type,
          percent:
            o.value_type === "PERCENT"
              ? safeNumberOrNull(o.percent || "")
              : null,
          flat_amount:
            o.value_type === "FLAT"
              ? safeNumberOrNull(o.flat_amount || "")
              : null,
          currency: o.currency || "MUR",
          min_bill: safeNumberOrNull(o.min_bill || ""),
          max_discount: safeNumberOrNull(o.max_discount || ""),
          start_at: o.start_at || null,
          end_at: o.end_at || null,
          requires_pass: !!o.requires_pass,
          pass_tiers: o.pass_tiers
            ? o.pass_tiers
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean)
            : [],
          coupon_code: o.coupon_code?.trim() || null,
          stackable: !!o.stackable,
          terms: o.terms?.trim() || null,
        }))
        .filter((o) => o.title);

      // Catalogue draft in metadata
      const enabledCatalogueDraft = catalogueCategories
        .filter((c) => c.enabled)
        .map((c) => ({
          id: c.id,
          title: c.title.trim(),
          startingFrom: c.starting_from ? Number(c.starting_from) : null,
          items: c.items.map((it) => ({
            id: it.id,
            title: it.title.trim(),
            price: it.price ? Number(it.price) : null,
            sku: it.sku?.trim() || null,
            description: it.description?.trim() || null,
            isAvailable: !!it.is_available,
            imageUrl: null as string | null,
          })),
        }))
        .filter((c) => c.title);

      const metadataDraft = {
        payment_details: {
          ...payment,
          commission_percent: payment.commission_percent
            ? Number(payment.commission_percent)
            : null,
        },
        catalogue: { version: 1, categories: enabledCatalogueDraft },
        cover_media: {
          type: coverVideoFile ? "video" : coverAudioFile ? "audio" : null,
          url: null as string | null,
        },
      };

      const uniqueSlug = `${slugify(form.name)}-${Math.random()
        .toString(16)
        .slice(2, 6)}`;

      const { data: store, error } = await supabaseBrowser
        .from("stores")
        .insert({
          name: form.name.trim(),
          slug: uniqueSlug,
          description: form.description?.trim() || null,

          category: form.category?.trim() || null,
          subcategory: form.subcategory?.trim() || null,
          tags: tagsArray,

          phone: form.phone?.trim() || null,
          whatsapp: form.whatsapp?.trim() || null,
          email: form.email?.trim() || null,
          website: form.website?.trim() || null,

          social_links,

          location_name: form.location_name?.trim() || null,
          address_line1: form.address_line1?.trim() || null,
          address_line2: form.address_line2?.trim() || null,
          city: form.city?.trim() || null,
          region: form.region?.trim() || null,
          postal_code: form.postal_code?.trim() || null,
          country: "Mauritius",

          lat,
          lng,
          google_place_id: form.google_place_id?.trim() || null,

          hours,

          logo_url: null,
          cover_image_url: null,
          gallery_urls: [],

          amenities: {},
          services: {},
          pricing: {},

          offers: offersFinal,

          metadata: metadataDraft,

          is_active: !!form.is_active,
          is_featured: !!form.is_featured,
        })
        .select()
        .single();

      if (error) throw error;

      const logoUrl = await uploadSingle(store.id, logoFile, "logo");

      let coverMediaUrl: string | null = null;
      if (coverVideoFile) {
        coverMediaUrl = await uploadSingle(
          store.id,
          coverVideoFile,
          "cover_video"
        );
      } else if (coverAudioFile) {
        coverMediaUrl = await uploadSingle(
          store.id,
          coverAudioFile,
          "cover_audio"
        );
      }

      const galleryUrls = await uploadMultiple(store.id, galleryFiles, "gallery");

      // Upload catalogue images
      const categoriesWithImages = await Promise.all(
        catalogueCategories.map(async (cat) => {
          if (!cat.enabled) return cat;

          const updatedItems = await Promise.all(
            cat.items.map(async (it) => {
              if (!it.imageFile) return it;
              const url = await uploadCatalogueImage(
                store.id,
                cat.id,
                it.id,
                it.imageFile
              );
              return { ...it, imageUrl: url };
            })
          );

          return { ...cat, items: updatedItems };
        })
      );

      const enabledCatalogueFinal = categoriesWithImages
        .filter((c) => c.enabled)
        .map((c) => ({
          id: c.id,
          title: c.title.trim(),
          startingFrom: c.starting_from ? Number(c.starting_from) : null,
          items: c.items
            .filter((it) => it.title.trim() || it.price)
            .map((it) => ({
              id: it.id,
              title: it.title.trim(),
              price: it.price ? Number(it.price) : null,
              sku: it.sku?.trim() || null,
              description: it.description?.trim() || null,
              isAvailable: !!it.is_available,
              imageUrl: it.imageUrl || null,
            })),
        }))
        .filter((c) => c.title);

      const metadataFinal = {
        ...metadataDraft,
        catalogue: { version: 1, categories: enabledCatalogueFinal },
        cover_media: {
          type: coverVideoFile ? "video" : coverAudioFile ? "audio" : null,
          url: coverMediaUrl,
        },
      };

      const { error: upErr } = await supabaseBrowser
        .from("stores")
        .update({
          logo_url: logoUrl,
          gallery_urls: galleryUrls,
          metadata: metadataFinal,
        })
        .eq("id", store.id);

      if (upErr) throw upErr;

      showToast({ type: "success", title: "Store added successfully" });
      router.push("/dashboard/manage-stores");
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Failed to add store",
        description: err?.message ?? "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col gap-2 mb-6">
        <div className="text-2xl font-extrabold text-gray-900">Add Store</div>
        <div className="text-sm text-gray-600">
          District-style store details + offers/discounts + settlements.
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Switch
            checked={!!form.is_active}
            onChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
            label="Status"
            hint={
              form.is_active ? "Active (visible in app)" : "Inactive (hidden from app)"
            }
          />

          <Switch
            checked={!!form.is_featured}
            onChange={(v) => setForm((p) => ({ ...p, is_featured: v }))}
            label="Featured"
            hint="Prioritize this store in modules like ‘near you’ and ‘featured’."
          />
        </div>
      </div>

      <div className="space-y-5">
        {/* BASIC */}
        <Section
          id="basic"
          title="Basic Information"
          subtitle="Name, category, tags, description."
          icon={<Building2 size={18} />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label required>Store name</Label>
              <Input
                className={inputClass}
                name="name"
                placeholder="e.g. Culture Circle"
                value={form.name}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label required>Category</Label>
              <Input
                className={inputClass}
                name="category"
                placeholder="e.g. Fashion, Supermarket, Electronics"
                value={form.category}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label>Subcategory</Label>
              <Input
                className={inputClass}
                name="subcategory"
                placeholder="e.g. Footwear"
                value={form.subcategory}
                onChange={handleChange}
              />
            </div>

            <div className="md:col-span-2">
              <Label hint="Comma separated tags. Example: bank benefits, premium, offers">
                Tags
              </Label>
              <Textarea
                className={inputClass}
                name="tags"
                placeholder="e.g. bank benefits, premium, offers"
                value={form.tags}
                onChange={handleChange}
              />
              {tagsArray.length ? (
                <div className="flex flex-wrap gap-2 mt-3">
                  {tagsArray.map((t) => (
                    <div
                      key={t}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold text-gray-700 bg-white"
                    >
                      <Tags size={14} />
                      {t}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <Label>Description / About</Label>
              <Textarea
                className={inputClass}
                name="description"
                placeholder="Write a premium brand description..."
                value={form.description}
                onChange={handleChange}
              />
            </div>
          </div>
        </Section>

        {/* CONTACT */}
        <Section
          id="contact"
          title="Contact & Links"
          subtitle="Phone, WhatsApp, website and social profiles."
          icon={<Phone size={18} />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Phone</Label>
              <Input
                className={inputClass}
                name="phone"
                placeholder="+230 ..."
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label>WhatsApp</Label>
              <Input
                className={inputClass}
                name="whatsapp"
                placeholder="+230 ..."
                value={form.whatsapp}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                className={inputClass}
                name="email"
                placeholder="store@email.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label>Website</Label>
              <Input
                className={inputClass}
                name="website"
                placeholder="https://..."
                value={form.website}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label>Instagram</Label>
              <Input
                className={inputClass}
                name="instagram"
                placeholder="https://instagram.com/..."
                value={form.instagram}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label>Facebook</Label>
              <Input
                className={inputClass}
                name="facebook"
                placeholder="https://facebook.com/..."
                value={form.facebook}
                onChange={handleChange}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Maps Link</Label>
              <Input
                className={inputClass}
                name="maps"
                placeholder="https://maps.google.com/..."
                value={form.maps}
                onChange={handleChange}
              />
            </div>
          </div>
        </Section>

        {/* LOCATION */}
        <Section
          id="location"
          title="Location"
          subtitle="Address, city, coordinates & Place ID."
          icon={<MapPin size={18} />}
        >
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>Location name</Label>
              <Input
                className={inputClass}
                name="location_name"
                placeholder="e.g. Bagatelle Mall"
                value={form.location_name}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label>Address line 1</Label>
              <Textarea
                className={inputClass}
                name="address_line1"
                placeholder="Street, building..."
                value={form.address_line1}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label>Address line 2</Label>
              <Textarea
                className={inputClass}
                name="address_line2"
                placeholder="Landmark, shop no..."
                value={form.address_line2}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>City</Label>
                <Input
                  className={inputClass}
                  name="city"
                  placeholder="Port Louis"
                  value={form.city}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label required>Region</Label>
                <Input
                  className={inputClass}
                  name="region"
                  placeholder="Plaines Wilhems"
                  value={form.region}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label required>Postal code</Label>
                <Input
                  className={inputClass}
                  name="postal_code"
                  placeholder="xxxx"
                  value={form.postal_code}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Latitude</Label>
                <Input
                  className={inputClass}
                  name="lat"
                  placeholder="-20.12345"
                  value={form.lat}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input
                  className={inputClass}
                  name="lng"
                  placeholder="57.12345"
                  value={form.lng}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label>Google Place ID</Label>
                <Input
                  className={inputClass}
                  name="google_place_id"
                  placeholder="ChIJ..."
                  value={form.google_place_id}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </Section>

        {/* MEDIA */}
        <Section
          id="media"
          title="Media"
          subtitle="Logo, cover (video/audio), gallery."
          icon={<Images size={18} />}
        >
          <div className="grid grid-cols-1 gap-6">
            <div className="rounded-xl border bg-gray-50 p-4">
              <div className="flex items-center gap-2 font-semibold text-gray-900">
                <BadgeCheck size={18} />
                Logo
              </div>
              <div className="mt-3">
                <Input
                  className={inputClass}
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    preserveScroll(() =>
                      setLogoFile(e.target.files?.[0] || null)
                    )
                  }
                />
                <SinglePreview file={logoFile} onRemove={() => setLogoFile(null)} />
              </div>
            </div>

            <div className="rounded-xl border bg-gray-50 p-4">
              <div className="flex items-center gap-2 font-semibold text-gray-900">
                <Video size={18} />
                Cover Media (Video or Audio)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div className="rounded-xl border bg-white p-4">
                  <div className="flex items-center gap-2 font-semibold text-gray-900">
                    <Video size={16} /> Video
                  </div>
                  <div className="mt-3">
                    <Input
                      className={inputClass}
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        preserveScroll(() => {
                          setCoverVideoFile(f);
                          if (f) setCoverAudioFile(null);
                        });
                      }}
                    />
                    <MediaPreview
                      file={coverVideoFile}
                      kind="video"
                      onRemove={() => setCoverVideoFile(null)}
                    />
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-4">
                  <div className="flex items-center gap-2 font-semibold text-gray-900">
                    <Mic size={16} /> Audio
                  </div>
                  <div className="mt-3">
                    <Input
                      className={inputClass}
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        preserveScroll(() => {
                          setCoverAudioFile(f);
                          if (f) setCoverVideoFile(null);
                        });
                      }}
                    />
                    <MediaPreview
                      file={coverAudioFile}
                      kind="audio"
                      onRemove={() => setCoverAudioFile(null)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-gray-50 p-4">
              <div className="flex items-center gap-2 font-semibold text-gray-900">
                <Images size={18} />
                Gallery
              </div>

              <div className="mt-3">
                <Input
                  className={inputClass}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) =>
                    preserveScroll(() =>
                      setGalleryFiles([
                        ...galleryFiles,
                        ...(e.target.files || []),
                      ])
                    )
                  }
                />

                <ImagePreviewGrid
                  files={galleryFiles}
                  onRemove={(i) =>
                    setGalleryFiles(galleryFiles.filter((_, idx) => idx !== i))
                  }
                />
              </div>
            </div>
          </div>
        </Section>

        {/* HOURS */}
        <Section
          id="hours"
          title="Opening Hours"
          subtitle="Weekly schedule used for Open/Closed logic."
          icon={<Clock3 size={18} />}
        >
          <div className="rounded-xl border bg-white overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase">
              <div className="col-span-3">Day</div>
              <div className="col-span-2">Closed</div>
              <div className="col-span-3">Open</div>
              <div className="col-span-3">Close</div>
              <div className="col-span-1"></div>
            </div>

            {DAYS.map((day) => (
              <div
                key={day}
                className="grid grid-cols-12 gap-3 px-4 py-3 border-b last:border-b-0 items-center"
              >
                <div className="col-span-3 text-sm font-semibold text-gray-900">
                  {day}
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!openingHours[day].closed}
                    onChange={(e) =>
                      preserveScroll(() =>
                        setOpeningHours({
                          ...openingHours,
                          [day]: {
                            ...openingHours[day],
                            closed: e.target.checked,
                            open: e.target.checked ? "" : openingHours[day].open,
                            close: e.target.checked ? "" : openingHours[day].close,
                          },
                        })
                      )
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-600">Closed</span>
                </div>

                <div className="col-span-3">
                  <Input
                    className={inputClass}
                    type="time"
                    value={openingHours[day].open}
                    disabled={!!openingHours[day].closed}
                    onChange={(e) =>
                      preserveScroll(() =>
                        setOpeningHours({
                          ...openingHours,
                          [day]: { ...openingHours[day], open: e.target.value },
                        })
                      )
                    }
                  />
                </div>

                <div className="col-span-3">
                  <Input
                    className={inputClass}
                    type="time"
                    value={openingHours[day].close}
                    disabled={!!openingHours[day].closed}
                    onChange={(e) =>
                      preserveScroll(() =>
                        setOpeningHours({
                          ...openingHours,
                          [day]: { ...openingHours[day], close: e.target.value },
                        })
                      )
                    }
                  />
                </div>

                <div className="col-span-1" />
              </div>
            ))}
          </div>
        </Section>

        {/* ✅ OFFERS / DISCOUNTS */}
        <Section
          id="discounts"
          title="Offers & Discounts"
          subtitle="In-store discount, District Pass/Passport discounts, bank benefits, coupons."
          icon={<Percent size={18} />}
        >
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-900">Quick add</div>
              <div className="text-xs text-gray-500 mt-1">
                Add multiple rules. Your app can display these under the Offers section.
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  className={PRIMARY_BTN}
                  onClick={() => addOffer("IN_STORE")}
                >
                  <Plus size={16} className="mr-2" />
                  In-store Discount
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className={PRIMARY_BTN_OUTLINE}
                  onClick={() => addOffer("DISTRICT_PASS")}
                >
                  <Plus size={16} className="mr-2" />
                  District Pass Discount
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className={PRIMARY_BTN_OUTLINE}
                  onClick={() => addOffer("BANK_BENEFIT")}
                >
                  <Plus size={16} className="mr-2" />
                  Bank Benefits
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className={PRIMARY_BTN_OUTLINE}
                  onClick={() => addOffer("COUPON")}
                >
                  <Ticket size={16} className="mr-2" />
                  Coupon Code
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {offers.map((o, idx) => (
                <div key={o.id} className="rounded-2xl border bg-white">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-5 w-5"
                        checked={o.enabled}
                        onChange={(e) =>
                          updateOffer(o.id, { enabled: e.target.checked })
                        }
                      />
                      <div>
                        <div className="text-sm font-extrabold text-gray-900">
                          {o.title || `Offer #${idx + 1}`}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {o.type} • {o.enabled ? "Enabled" : "Disabled"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleOfferExpanded(o.id)}
                        className="rounded-lg border px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                        title={o.expanded ? "Collapse" : "Expand"}
                      >
                        {o.expanded ? <Minus size={16} /> : <Plus size={16} />}
                      </button>

                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => removeOffer(o.id)}
                      >
                        <X size={16} className="mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>

                  {o.expanded ? (
                    <div className="px-5 pb-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label required>Type</Label>
                          <select
                            className="w-full rounded-md border border-gray-300 px-3 h-10 text-sm"
                            value={o.type}
                            onChange={(e) => {
                              const type = e.target.value as DiscountType;
                              updateOffer(o.id, {
                                type,
                                requires_pass: type === "DISTRICT_PASS",
                                coupon_code: type === "COUPON" ? "SAVE10" : "",
                                badge_text:
                                  type === "DISTRICT_PASS"
                                    ? "District Pass"
                                    : type === "BANK_BENEFIT"
                                    ? "Bank benefits"
                                    : type === "COUPON"
                                    ? "Coupon"
                                    : "In-store",
                              });
                            }}
                          >
                            <option value="IN_STORE">In-store Discount</option>
                            <option value="DISTRICT_PASS">
                              District Pass / Passport
                            </option>
                            <option value="BANK_BENEFIT">Bank Benefits</option>
                            <option value="COUPON">Coupon Code</option>
                          </select>
                        </div>

                        <div>
                          <Label required>Title</Label>
                          <Input
                            className={inputClass}
                            value={o.title}
                            onChange={(e) =>
                              updateOffer(o.id, { title: e.target.value })
                            }
                            placeholder="e.g. District Pass: 15% off"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Label>Subtitle</Label>
                          <Input
                            className={inputClass}
                            value={o.subtitle || ""}
                            onChange={(e) =>
                              updateOffer(o.id, { subtitle: e.target.value })
                            }
                            placeholder="e.g. Only for pass members"
                          />
                        </div>

                        <div>
                          <Label>Badge text</Label>
                          <Input
                            className={inputClass}
                            value={o.badge_text || ""}
                            onChange={(e) =>
                              updateOffer(o.id, { badge_text: e.target.value })
                            }
                            placeholder="e.g. Bank benefits"
                          />
                        </div>

                        <div>
                          <Label>Value type</Label>
                          <select
                            className="w-full rounded-md border border-gray-300 px-3 h-10 text-sm"
                            value={o.value_type}
                            onChange={(e) =>
                              updateOffer(o.id, {
                                value_type: e.target.value as DiscountValueType,
                              })
                            }
                          >
                            <option value="PERCENT">Percentage</option>
                            <option value="FLAT">Flat Amount</option>
                          </select>
                        </div>

                        {o.value_type === "PERCENT" ? (
                          <div>
                            <Label required>Percent (0-100)</Label>
                            <Input
                              className={inputClass}
                              value={o.percent || ""}
                              onChange={(e) =>
                                updateOffer(o.id, { percent: e.target.value })
                              }
                              placeholder="10"
                            />
                          </div>
                        ) : (
                          <div>
                            <Label required>Flat amount</Label>
                            <Input
                              className={inputClass}
                              value={o.flat_amount || ""}
                              onChange={(e) =>
                                updateOffer(o.id, { flat_amount: e.target.value })
                              }
                              placeholder="200"
                            />
                          </div>
                        )}

                        <div>
                          <Label>Currency</Label>
                          <Input
                            className={inputClass}
                            value={o.currency || "MUR"}
                            onChange={(e) =>
                              updateOffer(o.id, { currency: e.target.value })
                            }
                            placeholder="MUR"
                          />
                        </div>

                        <div>
                          <Label>Min bill</Label>
                          <Input
                            className={inputClass}
                            value={o.min_bill || ""}
                            onChange={(e) =>
                              updateOffer(o.id, { min_bill: e.target.value })
                            }
                            placeholder="Optional"
                          />
                        </div>

                        <div>
                          <Label>Max discount</Label>
                          <Input
                            className={inputClass}
                            value={o.max_discount || ""}
                            onChange={(e) =>
                              updateOffer(o.id, { max_discount: e.target.value })
                            }
                            placeholder="Optional"
                          />
                        </div>

                        <div>
                          <Label>Start date</Label>
                          <Input
                            className={inputClass}
                            type="date"
                            value={o.start_at || ""}
                            onChange={(e) =>
                              updateOffer(o.id, { start_at: e.target.value })
                            }
                          />
                        </div>

                        <div>
                          <Label>End date</Label>
                          <Input
                            className={inputClass}
                            type="date"
                            value={o.end_at || ""}
                            onChange={(e) =>
                              updateOffer(o.id, { end_at: e.target.value })
                            }
                          />
                        </div>

                        {o.type === "DISTRICT_PASS" ? (
                          <>
                            <div className="md:col-span-2">
                              <Switch
                                checked={!!o.requires_pass}
                                onChange={(v) =>
                                  updateOffer(o.id, { requires_pass: v })
                                }
                                label="Requires District Pass"
                                hint="If ON, show only to pass members."
                              />
                            </div>

                            <div className="md:col-span-2">
                              <Label hint="Comma separated. e.g. Gold, Platinum">
                                Pass tiers
                              </Label>
                              <Input
                                className={inputClass}
                                value={o.pass_tiers || ""}
                                onChange={(e) =>
                                  updateOffer(o.id, { pass_tiers: e.target.value })
                                }
                                placeholder="Gold, Platinum"
                              />
                            </div>
                          </>
                        ) : null}

                        {o.type === "COUPON" ? (
                          <div className="md:col-span-2">
                            <Label required>Coupon code</Label>
                            <Input
                              className={inputClass}
                              value={o.coupon_code || ""}
                              onChange={(e) =>
                                updateOffer(o.id, { coupon_code: e.target.value })
                              }
                              placeholder="SAVE10"
                            />
                          </div>
                        ) : null}

                        <div className="md:col-span-2">
                          <Switch
                            checked={!!o.stackable}
                            onChange={(v) =>
                              updateOffer(o.id, { stackable: v })
                            }
                            label="Stackable"
                            hint="If ON, this offer can combine with others."
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Label>Terms</Label>
                          <Textarea
                            className={inputClass}
                            value={o.terms || ""}
                            onChange={(e) =>
                              updateOffer(o.id, { terms: e.target.value })
                            }
                            placeholder="Any exclusions, timing restrictions, required proof..."
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* PAYMENT */}
        <Section
          id="payment"
          title="Payment & Settlement"
          subtitle="Required to settle payouts and generate invoices."
          icon={<Wallet size={18} />}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* kept as-is */}
            <div className="rounded-xl border bg-gray-50 p-4">
              <div className="flex items-center gap-2 font-semibold text-gray-900">
                <FileText size={18} />
                Business & Invoicing
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <Label required>Legal business name</Label>
                  <Input
                    className={inputClass}
                    value={payment.legal_business_name}
                    onChange={(e) =>
                      setPayment((p) => ({
                        ...p,
                        legal_business_name: e.target.value,
                      }))
                    }
                    placeholder="e.g. Culture Circle Ltd"
                  />
                </div>

                <div>
                  <Label>Display name on invoice</Label>
                  <Input
                    className={inputClass}
                    value={payment.display_name_on_invoice || ""}
                    onChange={(e) =>
                      setPayment((p) => ({
                        ...p,
                        display_name_on_invoice: e.target.value,
                      }))
                    }
                    placeholder="e.g. Culture Circle"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Currency</Label>
                    <Input
                      className={inputClass}
                      value={payment.currency}
                      onChange={(e) =>
                        setPayment((p) => ({ ...p, currency: e.target.value }))
                      }
                      placeholder="MUR"
                    />
                  </div>

                  <div>
                    <Label>Settlement cycle</Label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 h-10 text-sm"
                      value={payment.settlement_cycle}
                      onChange={(e) =>
                        setPayment((p) => ({
                          ...p,
                          settlement_cycle:
                            e.target.value as PaymentDetails["settlement_cycle"],
                        }))
                      }
                    >
                      <option value="T+0">T+0</option>
                      <option value="T+1">T+1</option>
                      <option value="T+2">T+2</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Commission (%)</Label>
                  <Input
                    className={inputClass}
                    value={payment.commission_percent || ""}
                    onChange={(e) =>
                      setPayment((p) => ({
                        ...p,
                        commission_percent: e.target.value,
                      }))
                    }
                    placeholder="e.g. 10"
                  />
                </div>

                <div>
                  <Label>KYC Status</Label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 h-10 text-sm"
                    value={payment.kyc_status}
                    onChange={(e) =>
                      setPayment((p) => ({
                        ...p,
                        kyc_status:
                          e.target.value as PaymentDetails["kyc_status"],
                      }))
                    }
                  >
                    <option value="NOT_STARTED">Not started</option>
                    <option value="PENDING">Pending</option>
                    <option value="VERIFIED">Verified</option>
                  </select>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    className={inputClass}
                    value={payment.notes || ""}
                    onChange={(e) =>
                      setPayment((p) => ({ ...p, notes: e.target.value }))
                    }
                    placeholder="Any settlement notes..."
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-gray-50 p-4">
              <div className="flex items-center gap-2 font-semibold text-gray-900">
                <CreditCard size={18} />
                Payout Method
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <Label required>Payout method</Label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 h-10 text-sm"
                    value={payment.payout_method}
                    onChange={(e) =>
                      setPayment((p) => ({
                        ...p,
                        payout_method:
                          e.target.value as PaymentDetails["payout_method"],
                      }))
                    }
                  >
                    <option value="BANK_TRANSFER">Bank transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="MANUAL">Manual settlement</option>
                  </select>
                </div>

                {payment.payout_method === "BANK_TRANSFER" ? (
                  <>
                    <div>
                      <Label required>Beneficiary name</Label>
                      <Input
                        className={inputClass}
                        value={payment.beneficiary_name || ""}
                        onChange={(e) =>
                          setPayment((p) => ({
                            ...p,
                            beneficiary_name: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div>
                      <Label required>Bank name</Label>
                      <Input
                        className={inputClass}
                        value={payment.bank_name || ""}
                        onChange={(e) =>
                          setPayment((p) => ({ ...p, bank_name: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <Label required>Account number</Label>
                      <Input
                        className={inputClass}
                        value={payment.account_number || ""}
                        onChange={(e) =>
                          setPayment((p) => ({
                            ...p,
                            account_number: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>IFSC</Label>
                        <Input
                          className={inputClass}
                          value={payment.ifsc || ""}
                          onChange={(e) =>
                            setPayment((p) => ({ ...p, ifsc: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label>IBAN</Label>
                        <Input
                          className={inputClass}
                          value={payment.iban || ""}
                          onChange={(e) =>
                            setPayment((p) => ({ ...p, iban: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label>SWIFT</Label>
                      <Input
                        className={inputClass}
                        value={payment.swift || ""}
                        onChange={(e) =>
                          setPayment((p) => ({ ...p, swift: e.target.value }))
                        }
                      />
                    </div>
                  </>
                ) : null}

                {payment.payout_method === "UPI" ? (
                  <div>
                    <Label required>UPI ID</Label>
                    <Input
                      className={inputClass}
                      value={payment.payout_upi_id || ""}
                      onChange={(e) =>
                        setPayment((p) => ({
                          ...p,
                          payout_upi_id: e.target.value,
                        }))
                      }
                      placeholder="example@upi"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </Section>

        {/* CATALOGUE */}
        <Section
          id="catalogue"
          title="Catalogue (District-style)"
          subtitle="Tick categories to auto-expand and add items."
          icon={<Package size={18} />}
        >
          <div className="rounded-2xl border bg-gray-50 p-4 mb-4">
            <div className="text-sm font-semibold text-gray-900">
              Add a new category
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <Input
                className={inputClass}
                placeholder="Category title"
                value={customCategoryTitle}
                onChange={(e) => setCustomCategoryTitle(e.target.value)}
              />
              <Input
                className={inputClass}
                placeholder="Starting from (optional)"
                value={customCategoryStartingFrom}
                onChange={(e) => setCustomCategoryStartingFrom(e.target.value)}
              />
              <Button
                type="button"
                onClick={addCategory}
                className={PRIMARY_BTN}
              >
                <Plus size={16} className="mr-2" />
                Add Category
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {catalogueCategories.map((cat) => (
              <div key={cat.id} className="rounded-2xl border bg-white">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={cat.enabled}
                      onChange={(e) =>
                        toggleCategoryEnabled(cat.id, e.target.checked)
                      }
                    />
                    <div>
                      <div className="text-sm font-extrabold text-gray-900">
                        {cat.title || "Untitled category"}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {cat.enabled ? `${cat.items.length} item(s)` : "Disabled"}
                      </div>
                    </div>
                  </div>

                  {cat.enabled ? (
                    <button
                      type="button"
                      onClick={() => toggleCategoryExpanded(cat.id)}
                      className="rounded-lg border px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                    >
                      {cat.expanded ? <Minus size={16} /> : <Plus size={16} />}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeCategory(cat.id)}
                      className="rounded-lg border px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {cat.enabled && cat.expanded ? (
                  <div className="px-5 pb-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label required>Category title</Label>
                        <Input
                          className={inputClass}
                          value={cat.title}
                          onChange={(e) =>
                            updateCategoryField(cat.id, "title", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label>Starting from</Label>
                        <Input
                          className={inputClass}
                          value={cat.starting_from}
                          onChange={(e) =>
                            updateCategoryField(
                              cat.id,
                              "starting_from",
                              e.target.value
                            )
                          }
                          placeholder="e.g. 2999"
                        />
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      {cat.items.map((it, idx) => (
                        <div key={it.id} className="rounded-2xl border bg-gray-50 p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-extrabold text-gray-900">
                              Item #{idx + 1}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() =>
                                removeItemFromCategory(cat.id, it.id)
                              }
                            >
                              <X size={16} className="mr-2" />
                              Remove
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
                            <div className="lg:col-span-8">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label required>Product title</Label>
                                  <Input
                                    className={inputClass}
                                    value={it.title}
                                    onChange={(e) =>
                                      updateItem(cat.id, it.id, "title", e.target.value)
                                    }
                                  />
                                </div>

                                <div>
                                  <Label required>Price</Label>
                                  <Input
                                    className={inputClass}
                                    value={it.price}
                                    onChange={(e) =>
                                      updateItem(cat.id, it.id, "price", e.target.value)
                                    }
                                  />
                                </div>

                                <div>
                                  <Label>SKU</Label>
                                  <Input
                                    className={inputClass}
                                    value={it.sku || ""}
                                    onChange={(e) =>
                                      updateItem(cat.id, it.id, "sku", e.target.value)
                                    }
                                  />
                                </div>

                                <div className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3">
                                  <input
                                    type="checkbox"
                                    className="h-5 w-5"
                                    checked={it.is_available}
                                    onChange={(e) =>
                                      updateItem(
                                        cat.id,
                                        it.id,
                                        "is_available",
                                        e.target.checked
                                      )
                                    }
                                  />
                                  <div>
                                    <div className="text-sm font-semibold text-gray-900">
                                      Available
                                    </div>
                                  </div>
                                </div>

                                <div className="md:col-span-2">
                                  <Label>Description</Label>
                                  <Textarea
                                    className={inputClass}
                                    value={it.description || ""}
                                    onChange={(e) =>
                                      updateItem(
                                        cat.id,
                                        it.id,
                                        "description",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="lg:col-span-4">
                              <Label>Product image</Label>
                              <div className="rounded-2xl border bg-white p-4">
                                <Input
                                  className={inputClass}
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    updateItem(
                                      cat.id,
                                      it.id,
                                      "imageFile",
                                      e.target.files?.[0] || null
                                    )
                                  }
                                />
                                <div className="mt-3">
                                  <ItemImagePreview
                                    file={it.imageFile}
                                    onRemove={() =>
                                      updateItem(cat.id, it.id, "imageFile", null)
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        onClick={() => addItemToCategory(cat.id)}
                        className={PRIMARY_BTN}
                      >
                        <Plus size={16} className="mr-2" />
                        Add another item
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
          className={PRIMARY_BTN_OUTLINE}
        >
          Cancel
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className={[PRIMARY_BTN, "cursor-pointer"].join(" ")}
        >
          {loading ? "Saving..." : "Save Store"}
        </Button>
      </div>
    </div>
  );
}
