"use client";

import { PanelsTopLeft } from "lucide-react";

import PassPriveCardManager from "@/app/dashboard/_components/PassPriveCardManager";

export default function InYourPassPrivePage() {
  return (
    <PassPriveCardManager
      apiPath="/api/inyourpassprive"
      basePath="/dashboard/in-your-passprive"
      pageTitle="Restaurant In Your PassPrive"
      description="Manage the restaurant cards and linked venues shown in the Dine In home section."
      searchPlaceholder="Search by title or subtitle"
      emptyTitle="No restaurant cards yet."
      emptyDescription="Create your first restaurant card to start curating venues for this section."
      detailLabel="Manage Restaurants"
      icon={PanelsTopLeft}
    />
  );
}
