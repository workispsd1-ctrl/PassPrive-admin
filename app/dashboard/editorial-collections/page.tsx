"use client";

import { Newspaper } from "lucide-react";

import EditorialCollectionManager from "@/app/dashboard/_components/EditorialCollectionManager";

export default function EditorialCollectionsPage() {
  return (
    <EditorialCollectionManager
      apiPath="/api/editorial-collections"
      basePath="/dashboard/editorial-collections"
      pageTitle="Editorial Collections"
      description="Create and manage editorial collections shown in the app."
      searchPlaceholder="Search by title, slug, city, or area"
      emptyTitle="No editorial collections yet."
      emptyDescription="Create your first editorial collection and then add items to it."
      detailLabel="Manage Items"
      icon={Newspaper}
    />
  );
}
