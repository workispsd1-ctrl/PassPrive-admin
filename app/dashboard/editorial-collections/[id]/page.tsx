"use client";

import { Newspaper } from "lucide-react";

import EditorialCollectionItemsManager from "@/app/dashboard/_components/EditorialCollectionItemsManager";

export default function EditorialCollectionDetailPage() {
  return (
    <EditorialCollectionItemsManager
      apiPath="/api/editorial-collections"
      basePath="/dashboard/editorial-collections"
      pageTitle="Editorial Collection"
      pageDescription="Manage the linked stores and restaurants for this collection."
      backLabel="Back to collections"
      emptyTitle="No editorial items linked yet."
      emptyDescription="Add stores or restaurants and arrange the order they should appear."
      searchPlaceholder="Search by name, type, city, or area"
      pickerPlaceholder="Search stores and restaurants to add to this collection."
      icon={Newspaper}
    />
  );
}
