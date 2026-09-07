export type BannerKind =
  | "homehero"
  | "dinein"
  | "store"
  | "wellness"
  | "tourist"
  | "website_home"
  | "website_dinein"
  | "website_store"
  | "website_wellness"
  | "website_tourist";

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
  /** Which surface this banner is shown on. Website creatives use different dimensions than app ones, so they are always separate rows/tables, never shared. */
  platform: "app" | "web";
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
    platform: "app",
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
    platform: "app",
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
    platform: "app",
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
    platform: "app",
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
    platform: "app",
  },
  {
    key: "website_home",
    title: "Website Home Banners",
    description: "Promotional banners shown on the public website's home page. Use web-sized creatives (wider aspect ratio than the app).",
    collectionLabel: "Website home banners",
    table: "websitehomebanners",
    storageBucket: "WebsiteHomeBanners",
    emptyLabel: "No website home banners available yet.",
    addLabel: "Add Website Home Banner",
    editLabel: "Edit Website Home Banner",
    usesDedicatedPages: false,
    platform: "web",
  },
  {
    key: "website_dinein",
    title: "Website Dine-In Banners",
    description: "Promotional banners shown on the website's dine-in section.",
    collectionLabel: "Website dine-in banners",
    table: "websitedineinbanners",
    storageBucket: "WebsiteDineinBanners",
    emptyLabel: "No website dine-in banners available yet.",
    addLabel: "Add Website Dine-In Banner",
    editLabel: "Edit Website Dine-In Banner",
    usesDedicatedPages: false,
    platform: "web",
  },
  {
    key: "website_store",
    title: "Website Store Banners",
    description: "Promotional banners shown on the website's store section.",
    collectionLabel: "Website store banners",
    table: "websitestorebanners",
    storageBucket: "WebsiteStoreBanners",
    emptyLabel: "No website store banners available yet.",
    addLabel: "Add Website Store Banner",
    editLabel: "Edit Website Store Banner",
    usesDedicatedPages: false,
    platform: "web",
  },
  {
    key: "website_wellness",
    title: "Website Wellness Banners",
    description: "Promotional banners shown on the website's wellness section.",
    collectionLabel: "Website wellness banners",
    table: "websitewellnessbanners",
    storageBucket: "WebsiteWellnessBanners",
    emptyLabel: "No website wellness banners available yet.",
    addLabel: "Add Website Wellness Banner",
    editLabel: "Edit Website Wellness Banner",
    usesDedicatedPages: false,
    platform: "web",
  },
  {
    key: "website_tourist",
    title: "Website Explore Banners",
    description: "Promotional banners shown on the website's explore (tourist) section.",
    collectionLabel: "Website explore banners",
    table: "websitetouristbanners",
    storageBucket: "WebsiteTouristBanners",
    emptyLabel: "No website explore banners available yet.",
    addLabel: "Add Website Explore Banner",
    editLabel: "Edit Website Explore Banner",
    usesDedicatedPages: false,
    platform: "web",
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
