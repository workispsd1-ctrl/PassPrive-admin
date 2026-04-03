"use client";

import { Store } from "lucide-react";

import PassPriveCardManager from "@/app/dashboard/_components/PassPriveCardManager";

export default function StoreInYourPassPrivePage() {
  return (
    <PassPriveCardManager
      apiPath="/api/storesinyourpassprive"
      basePath="/dashboard/store-in-your-passprive"
      pageTitle="Store In Your PassPrive"
      description="Manage the store cards and linked stores shown in the Stores home section."
      searchPlaceholder="Search by title or subtitle"
      emptyTitle="No store cards yet."
      emptyDescription="Create your first store card to start curating stores for this section."
      detailLabel="Manage Stores"
      icon={Store}
      editIconSrc="/restaurentpasspriveedit.png"
      manageIconSrc="/restaurentpassprivemange.png"
    />
  );
}
