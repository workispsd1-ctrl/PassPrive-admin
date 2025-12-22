import { DAYS } from "./constants";

export type DayName = (typeof DAYS)[number];

export type DayHours = {
  open: string;
  close: string;
  closed?: boolean;
};

export type StoreFormState = {
  name: string;
  category: string;
  subcategory: string;
  tags: string;
  description: string;

  phone: string;
  whatsapp: string;
  email: string;
  website: string;

  location_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  region: string;
  postal_code: string;
  lat: string;
  lng: string;
  google_place_id: string;

  instagram: string;
  facebook: string;
  tiktok: string;
  maps: string;

  is_active: boolean;
  is_featured: boolean;
};

export type PaymentDetails = {
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

export type CatalogueItemDraft = {
  id: string;
  title: string;
  price: string;
  sku?: string;
  description?: string;
  is_available: boolean;
  imageFile?: File | null;
  imageUrl?: string | null;
};

export type CatalogueCategoryDraft = {
  id: string;
  enabled: boolean;
  title: string;
  starting_from: string;
  items: CatalogueItemDraft[];
  expanded: boolean;
};

/** ✅ No more DISTRICT_PASS */
export type DiscountType = "IN_STORE" | "PASSPRIVE_PASS" | "BANK_BENEFIT" | "COUPON";
export type DiscountValueType = "PERCENT" | "FLAT";

export type StoreOfferDraft = {
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

export type OpenSection =
  | "basic"
  | "contact"
  | "location"
  | "media"
  | "hours"
  | "discounts"
  | "payment"
  | "catalogue"
  | null;