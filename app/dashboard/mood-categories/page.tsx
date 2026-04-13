"use client";

import MoodCategoryManager from "@/app/dashboard/_components/MoodCategoryManager";

export default function MoodCategoriesPage() {
  return (
    <MoodCategoryManager
      title="Restaurant Mood Categories"
      description="Create, edit, and organize restaurant category cards shown in the app."
      apiPath="/api/moodcategories"
      supabaseTable="restaurant_mood_categories"
      storageBucket="restaurant"
      storageFolder="mood-categories"
    />
  );
}
