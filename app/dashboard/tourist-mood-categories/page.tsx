"use client";

import MoodCategoryManager from "@/app/dashboard/_components/MoodCategoryManager";

export default function TouristMoodCategoriesPage() {
  return (
    <MoodCategoryManager
      title="Tourist Mood Categories"
      description="Create, edit, and organize tourist category cards shown in the app."
      apiPath="/api/touristmoodcategories"
      supabaseTable="tourist_mood_categories"
      storageBucket="tourist-images"
      storageFolder="mood-categories"
    />
  );
}
