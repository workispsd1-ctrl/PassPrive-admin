"use client";

import { PanelsTopLeft } from "lucide-react";

import PassPriveItemsManager from "@/app/dashboard/_components/PassPriveItemsManager";

export default function InYourPassPriveDetailPage() {
  return (
    <PassPriveItemsManager
      apiPath="/api/inyourpassprive"
      basePath="/dashboard/in-your-passprive"
      pageTitle="Restaurant In Your PassPrive"
      pageDescription="Manage the restaurants linked to this card."
      backLabel="Back to restaurant cards"
      emptyTitle="No restaurants linked yet."
      emptyDescription="Add restaurants to this card and arrange the order they should appear."
      entityLabel="Restaurant"
      entityPluralLabel="Restaurants"
      entityTable="restaurants"
      entitySelect="id,name,city,area"
      entityIdKey="restaurant_id"
      entityNestedKey="restaurant"
      searchPlaceholder="Search by restaurant name, city, or area"
      pickerPlaceholder="Search by restaurant name, city, or area."
      icon={PanelsTopLeft}
    />
  );
}
