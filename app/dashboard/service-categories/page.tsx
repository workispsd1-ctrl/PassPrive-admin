"use client";

import MoodCategoryManager from "@/app/dashboard/_components/MoodCategoryManager";

export default function ServiceCategoriesPage() {
  return (
    <MoodCategoryManager
      title="Service Categories"
      description="Create, edit, and organize service-only categories and icons for service store partners."
      apiPath="/api/service-categories"
      supabaseTable="service_categories"
      storageBucket="Service_Store_categories"
      storageFolder="service-categories"
    />
  );
}
