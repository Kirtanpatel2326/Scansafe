/**
 * ScanSafe Official Plans and Scan Packs Catalog
 * Server-owned, source of truth for pricing and credit allotments.
 */

export interface ScanPack {
  id: string
  name: string
  scans: number
  priceInr: number // in Rupees
  pricePaise: number // in Paise (for Razorpay)
  priceUsd?: number
  priceCents?: number
  tag?: string
  description: string
  isPopular?: boolean
  features: string[]
}

export const SCAN_PACKS: Record<string, ScanPack> = {
  pack_10: {
    id: "pack_10",
    name: "10 Scan Pack",
    scans: 10,
    priceInr: 10,
    pricePaise: 1000,
    priceUsd: 1,
    priceCents: 100,
    tag: "Quick Trial",
    description: "10 lifetime scans for quick label checks.",
    features: [
      "10 High-Precision Food Scans",
      "Instant OCR & Additive Analysis",
      "Personalized Allergen Checks",
      "Never Expires"
    ]
  },
  pack_100: {
    id: "pack_100",
    name: "100 Scan Pack",
    scans: 100,
    priceInr: 99,
    pricePaise: 9900,
    priceUsd: 9,
    priceCents: 900,
    tag: "Save 70%",
    description: "100 lifetime scans for regular grocery shopping.",
    features: [
      "100 High-Precision Food Scans",
      "Side-by-Side Product Comparison (2 credits/test)",
      "Composite Meal Composer (1 credit/meal)",
      "Complete History Browser",
      "Never Expires"
    ]
  },
  pack_320: {
    id: "pack_320",
    name: "320 Scan Pack",
    scans: 320,
    priceInr: 299,
    pricePaise: 29900,
    priceUsd: 29,
    priceCents: 2900,
    tag: "Most Popular ⭐",
    isPopular: true,
    description: "320 lifetime scans for health-conscious families.",
    features: [
      "320 High-Precision Food Scans",
      "Multi-Profile Family Dietary Modes",
      "Advanced Additive & Toxicology Deep Dives",
      "Smart Food Alternatives & Clean Swaps",
      "Priority OCR Processing",
      "Never Expires"
    ]
  },
  pack_1200: {
    id: "pack_1200",
    name: "1200 Scan Pack",
    scans: 1200,
    priceInr: 999,
    pricePaise: 99900,
    priceUsd: 99,
    priceCents: 9900,
    tag: "Best Value 👑",
    description: "1,200 lifetime scans for fitness enthusiasts & bulk shoppers.",
    features: [
      "1,200 High-Precision Food Scans",
      "Unlimited Family Profiles",
      "Exportable Clean PDF Health Breakdowns",
      "Priority AI Engine Access",
      "Dedicated Email Support",
      "Never Expires"
    ]
  },
  // Legacy aliases for backward compatibility
  day: {
    id: "pack_10",
    name: "10 Scan Pack",
    scans: 10,
    priceInr: 10,
    pricePaise: 1000,
    priceUsd: 1,
    priceCents: 100,
    tag: "Quick Trial",
    description: "10 lifetime scans for quick label checks.",
    features: ["10 High-Precision Food Scans", "Never Expires"]
  },
  week: {
    id: "pack_100",
    name: "100 Scan Pack",
    scans: 100,
    priceInr: 99,
    pricePaise: 9900,
    priceUsd: 9,
    priceCents: 900,
    tag: "Save 70%",
    description: "100 lifetime scans for regular grocery shopping.",
    features: ["100 High-Precision Food Scans", "Never Expires"]
  },
  month: {
    id: "pack_320",
    name: "320 Scan Pack",
    scans: 320,
    priceInr: 299,
    pricePaise: 29900,
    priceUsd: 29,
    priceCents: 2900,
    tag: "Most Popular ⭐",
    isPopular: true,
    description: "320 lifetime scans for health-conscious families.",
    features: ["320 High-Precision Food Scans", "Never Expires"]
  },
  year: {
    id: "pack_1200",
    name: "1200 Scan Pack",
    scans: 1200,
    priceInr: 999,
    pricePaise: 99900,
    priceUsd: 99,
    priceCents: 9900,
    tag: "Best Value 👑",
    description: "1,200 lifetime scans for fitness enthusiasts & bulk shoppers.",
    features: ["1,200 High-Precision Food Scans", "Never Expires"]
  }
};

export const INITIAL_FREE_SCANS = 3;
export const CREDIT_COSTS = {
  SCAN: 1,
  COMPARE: 2,
  MEAL_COMPOSER: 1
} as const;

export function getScanPack(packId: string): ScanPack | null {
  return SCAN_PACKS[packId] || null;
}

export function getAllPacks(): ScanPack[] {
  return [
    SCAN_PACKS.pack_10,
    SCAN_PACKS.pack_100,
    SCAN_PACKS.pack_320,
    SCAN_PACKS.pack_1200
  ];
}
