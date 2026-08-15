export type BannerKind = "homehero" | "dinein" | "store" | "wellness" | "tourist";

export type BannerConfig = {
  key: BannerKind;
  title: string;
  description: string;
  collectionLabel: string;
  table: string;
  storageBucket: string;
  emptyLabel: string;
  addLabel: string;
  editLabel: string;
  /** Home hero uses its own /new and /[id] pages; the rest create inline and edit via /banner/[kind]/[id]. */
  usesDedicatedPages: boolean;
};

export const bannerConfigs: BannerConfig[] = [
  {
    key: "homehero",
    title: "Home Hero Offers",
    description: "Top-level hero creatives shown on the main home experience.",
    collectionLabel: "Hero offers",
    table: "homeherooffers",
    storageBucket: "HomeHeroOffers",
    emptyLabel: "No home hero offers available yet.",
    addLabel: "Add Home Hero Offer",
    editLabel: "Edit Home Hero Offer",
    usesDedicatedPages: true,
  },
  {
    key: "dinein",
    title: "Dine-In Home Banners",
    description: "Promotional banners shown in the dine-in home section.",
    collectionLabel: "Dine-in banners",
    table: "dineinhomebanners",
    storageBucket: "DineinHomeBanners",
    emptyLabel: "No dine-in home banners available yet.",
    addLabel: "Add Dine-In Banner",
    editLabel: "Edit Dine-In Banner",
    usesDedicatedPages: false,
  },
  {
    key: "store",
    title: "Store Home Banners",
    description: "Promotional banners shown in the store home section.",
    collectionLabel: "Store banners",
    table: "storeshomebanners",
    storageBucket: "StoresHomeBanners",
    emptyLabel: "No store home banners available yet.",
    addLabel: "Add Store Banner",
    editLabel: "Edit Store Banner",
    usesDedicatedPages: false,
  },
  {
    key: "wellness",
    title: "Wellness Home Banners",
    description: "Promotional banners shown in the wellness home section.",
    collectionLabel: "Wellness banners",
    table: "wellnesshomebanners",
    storageBucket: "WellnessHomeBanners",
    emptyLabel: "No wellness home banners available yet.",
    addLabel: "Add Wellness Banner",
    editLabel: "Edit Wellness Banner",
    usesDedicatedPages: false,
  },
  {
    key: "tourist",
    title: "Explore Home Banners",
    description: "Promotional banners shown in the explore (tourist) home section.",
    collectionLabel: "Explore banners",
    table: "touristhomebanners",
    storageBucket: "TouristHomeBanners",
    emptyLabel: "No explore home banners available yet.",
    addLabel: "Add Explore Banner",
    editLabel: "Edit Explore Banner",
    usesDedicatedPages: false,
  },
];

export function getBannerConfig(kind: string): BannerConfig | undefined {
  return bannerConfigs.find((config) => config.key === kind);
}

export function bannerEditHref(config: BannerConfig, id: number) {
  return config.usesDedicatedPages
    ? `/dashboard/offers/${id}`
    : `/dashboard/offers/banner/${config.key}/${id}`;
}

export function extractStoragePath(publicUrl: string, bucket: string): string | null {
  if (!publicUrl) return null;
  const objectPublicMatch = publicUrl.match(/\/object\/public\/[^/]+\/(.+)$/);
  if (objectPublicMatch?.[1]) return objectPublicMatch[1];
  const bucketMatch = publicUrl.match(new RegExp(`/${bucket}/(.+)$`));
  return bucketMatch?.[1] ?? null;
}

export function buildBannerStoragePath(type: string, fileName: string) {
  const extension = fileName.split(".").pop() || "bin";
  const random = Math.random().toString(36).slice(2, 9);
  return `${type}/${Date.now()}-${random}.${extension}`;
}
