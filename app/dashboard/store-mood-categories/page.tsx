"use client";

import MoodCategoryManager from "@/app/dashboard/_components/MoodCategoryManager";

export default function StoreMoodCategoriesPage() {
  return (
    <MoodCategoryManager
      title="Store Mood Categories"
      description="Create, edit, and organize store category cards shown in the app."
      apiPath="/api/storemoodcategories"
      supabaseTable="store_mood_categories"
      storageBucket="stores"
      storageFolder="mood-categories"
    />
  );
}
