import { supabaseBrowser } from "@/lib/supabaseBrowser";

export type MerchantKind = "restaurant" | "store";

export type AuthorisedContact = {
  authorised_contact_name: string;
  authorised_contact_phone: string;
  authorised_contact_email: string;
};

export const emptyAuthorisedContact = (): AuthorisedContact => ({
  authorised_contact_name: "",
  authorised_contact_phone: "",
  authorised_contact_email: "",
});

const keyFor = (kind: MerchantKind) => (kind === "restaurant" ? "restaurant_id" : "store_id");
const clean = (value: string) => value.trim() || null;

export async function fetchAuthorisedContact(kind: MerchantKind, merchantId: string): Promise<AuthorisedContact> {
  const { data, error } = await supabaseBrowser
    .from("merchant_contacts")
    .select("authorised_contact_name, authorised_contact_phone, authorised_contact_email")
    .eq(keyFor(kind), merchantId)
    .maybeSingle();
  if (error) throw error;
  return {
    authorised_contact_name: data?.authorised_contact_name ?? "",
    authorised_contact_phone: data?.authorised_contact_phone ?? "",
    authorised_contact_email: data?.authorised_contact_email ?? "",
  };
}

export async function saveAuthorisedContact(kind: MerchantKind, merchantId: string, contact: AuthorisedContact) {
  const { error } = await supabaseBrowser.from("merchant_contacts").upsert(
    {
      [keyFor(kind)]: merchantId,
      authorised_contact_name: clean(contact.authorised_contact_name),
      authorised_contact_phone: clean(contact.authorised_contact_phone),
      authorised_contact_email: clean(contact.authorised_contact_email),
    },
    { onConflict: keyFor(kind) },
  );
  if (error) throw error;
}

export function normaliseBrn(value: string) {
  return value.toUpperCase().replace(/\s+/g, "");
}

export function brnError(value: string | null | undefined) {
  const brn = normaliseBrn(value || "");
  if (!brn) return null;
  return /^[A-Z][0-9]{8}$/.test(brn) ? null : "BRN should be a letter followed by 8 digits, e.g. C07012345";
}
