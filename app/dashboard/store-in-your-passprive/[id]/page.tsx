"use client";

import { Store } from "lucide-react";

import PassPriveItemsManager from "@/app/dashboard/_components/PassPriveItemsManager";

export default function StoreInYourPassPriveDetailPage() {
  return (
    <PassPriveItemsManager
      apiPath="/api/storesinyourpassprive"
      basePath="/dashboard/store-in-your-passprive"
      supabaseCardTable="store_in_your_passprive_cards"
      supabaseItemsTable="store_in_your_passprive_card_items"
      pageTitle="Store In Your PassPrive"
      pageDescription="Manage the stores linked to this card."
      backLabel="Back to store cards"
      emptyTitle="No stores linked yet."
      emptyDescription="Add stores to this card and arrange the order they should appear."
      entityLabel="Store"
      entityPluralLabel="Stores"
      entityTable="stores"
      entitySelect="id,name,city,category,subcategory"
      entityIdKey="store_id"
      entityNestedKey="store"
      searchPlaceholder="Search by store name, city, category, or subcategory"
      pickerPlaceholder="Search by store name, city, category, or subcategory."
      icon={Store}
    />
  );
}
