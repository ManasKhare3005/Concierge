import type { ClientSearchProfile, RecommendedPropertyMatch } from "@shared";

interface DemoPropertySeed {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  propertyType: string;
  summary: string;
  amenities: string[];
}

interface ClientSearchProfileInput {
  targetCities: string[];
  priceMin?: number | undefined;
  priceMax?: number | undefined;
  bedroomsMin?: number | undefined;
  bathroomsMin?: number | undefined;
  timeline?: string | undefined;
  propertyStyle?: string | undefined;
  mustHaves: string[];
  dealBreakers: string[];
  notes?: string | undefined;
}

const demoPropertySeeds: DemoPropertySeed[] = [
  {
    id: "demo-arcadia-modern",
    address: "3812 E Orange Dr",
    city: "Phoenix",
    state: "AZ",
    zip: "85018",
    price: 785000,
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2280,
    propertyType: "single_family",
    summary: "Modern remodel near Arcadia Lite with open kitchen, shaded patio, and quick access to dining corridors.",
    amenities: ["open kitchen", "patio", "updated roof", "home office", "walkable dining"]
  },
  {
    id: "demo-tempe-townhome",
    address: "2117 S River Dr",
    city: "Tempe",
    state: "AZ",
    zip: "85281",
    price: 512000,
    bedrooms: 3,
    bathrooms: 2.5,
    squareFeet: 1710,
    propertyType: "townhome",
    summary: "Low-maintenance Tempe townhome with attached garage, community pool, and easy freeway access.",
    amenities: ["attached garage", "pool", "low maintenance", "hoa", "lock and leave"]
  },
  {
    id: "demo-scottsdale-ranch",
    address: "9025 N 74th Pl",
    city: "Scottsdale",
    state: "AZ",
    zip: "85258",
    price: 1185000,
    bedrooms: 4,
    bathrooms: 3.5,
    squareFeet: 3010,
    propertyType: "single_family",
    summary: "Scottsdale ranch home with pool, split floor plan, and strong school-district appeal.",
    amenities: ["pool", "split floor plan", "three car garage", "updated hvac", "large lot"]
  },
  {
    id: "demo-chandler-family",
    address: "6412 S Birchleaf Dr",
    city: "Chandler",
    state: "AZ",
    zip: "85249",
    price: 654000,
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2460,
    propertyType: "single_family",
    summary: "Chandler family home with bonus loft, backyard turf, and extra storage near community parks.",
    amenities: ["bonus loft", "backyard turf", "storage", "park nearby", "community trails"]
  },
  {
    id: "demo-mesa-casita",
    address: "1048 N Meadow Vista",
    city: "Mesa",
    state: "AZ",
    zip: "85203",
    price: 438000,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1585,
    propertyType: "single_family",
    summary: "Move-in-ready Mesa home with updated kitchen, mature trees, and room for first-time buyers to grow.",
    amenities: ["updated kitchen", "mature trees", "starter home", "large yard", "natural light"]
  },
  {
    id: "demo-gilbert-courtyard",
    address: "2871 E Indigo Bay Dr",
    city: "Gilbert",
    state: "AZ",
    zip: "85234",
    price: 732000,
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2550,
    propertyType: "single_family",
    summary: "Gilbert courtyard layout with guest suite, upgraded finishes, and a strong work-from-home setup.",
    amenities: ["guest suite", "upgraded finishes", "home office", "courtyard", "new appliances"]
  }
];

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 8);
}

function normalizeOptionalText(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function parseSearchProfileJson(value?: string | null): ClientSearchProfile | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as Partial<ClientSearchProfile>;

    const searchProfileInput: ClientSearchProfileInput = {
      targetCities: Array.isArray(parsed.targetCities) ? parsed.targetCities : [],
      mustHaves: Array.isArray(parsed.mustHaves) ? parsed.mustHaves : [],
      dealBreakers: Array.isArray(parsed.dealBreakers) ? parsed.dealBreakers : []
    };

    if (typeof parsed.priceMin === "number") {
      searchProfileInput.priceMin = parsed.priceMin;
    }
    if (typeof parsed.priceMax === "number") {
      searchProfileInput.priceMax = parsed.priceMax;
    }
    if (typeof parsed.bedroomsMin === "number") {
      searchProfileInput.bedroomsMin = parsed.bedroomsMin;
    }
    if (typeof parsed.bathroomsMin === "number") {
      searchProfileInput.bathroomsMin = parsed.bathroomsMin;
    }
    if (typeof parsed.timeline === "string") {
      searchProfileInput.timeline = parsed.timeline;
    }
    if (typeof parsed.propertyStyle === "string") {
      searchProfileInput.propertyStyle = parsed.propertyStyle;
    }
    if (typeof parsed.notes === "string") {
      searchProfileInput.notes = parsed.notes;
    }

    return sanitizeClientSearchProfile(searchProfileInput);
  } catch {
    return undefined;
  }
}

export function sanitizeClientSearchProfile(profile: ClientSearchProfileInput): ClientSearchProfile {
  const priceMin =
    typeof profile.priceMin === "number" && Number.isFinite(profile.priceMin) && profile.priceMin > 0
      ? Math.round(profile.priceMin)
      : undefined;
  const priceMax =
    typeof profile.priceMax === "number" && Number.isFinite(profile.priceMax) && profile.priceMax > 0
      ? Math.round(profile.priceMax)
      : undefined;

  return {
    targetCities: dedupeStrings(profile.targetCities),
    ...(priceMin ? { priceMin } : {}),
    ...(priceMax ? { priceMax } : {}),
    ...(typeof profile.bedroomsMin === "number" && profile.bedroomsMin > 0
      ? { bedroomsMin: Math.round(profile.bedroomsMin) }
      : {}),
    ...(typeof profile.bathroomsMin === "number" && profile.bathroomsMin > 0
      ? { bathroomsMin: profile.bathroomsMin }
      : {}),
    ...(normalizeOptionalText(profile.timeline)
      ? { timeline: normalizeOptionalText(profile.timeline) as string }
      : {}),
    ...(normalizeOptionalText(profile.propertyStyle)
      ? { propertyStyle: normalizeOptionalText(profile.propertyStyle) as string }
      : {}),
    mustHaves: dedupeStrings(profile.mustHaves),
    dealBreakers: dedupeStrings(profile.dealBreakers),
    ...(normalizeOptionalText(profile.notes) ? { notes: normalizeOptionalText(profile.notes) as string } : {})
  };
}

export function serializeClientSearchProfile(profile?: ClientSearchProfile): string | null {
  if (!profile) {
    return null;
  }

  const sanitized = sanitizeClientSearchProfile(profile);
  const isEmpty =
    sanitized.targetCities.length === 0 &&
    sanitized.mustHaves.length === 0 &&
    sanitized.dealBreakers.length === 0 &&
    !sanitized.priceMin &&
    !sanitized.priceMax &&
    !sanitized.bedroomsMin &&
    !sanitized.bathroomsMin &&
    !sanitized.timeline &&
    !sanitized.propertyStyle &&
    !sanitized.notes;

  return isEmpty ? null : JSON.stringify(sanitized);
}

function scorePropertyMatch(property: DemoPropertySeed, profile?: ClientSearchProfile): number {
  if (!profile) {
    return 0;
  }

  let score = 0;
  const cityMatches = profile.targetCities.map((city) => city.toLowerCase());
  const propertySearchText = `${property.summary} ${property.amenities.join(" ")}`.toLowerCase();

  if (cityMatches.includes(property.city.toLowerCase())) {
    score += 5;
  }

  if (profile.priceMin && property.price >= profile.priceMin) {
    score += 1;
  }

  if (profile.priceMax && property.price <= profile.priceMax) {
    score += 3;
  }

  if (profile.bedroomsMin && property.bedrooms >= profile.bedroomsMin) {
    score += 2;
  }

  if (profile.bathroomsMin && property.bathrooms >= profile.bathroomsMin) {
    score += 2;
  }

  if (profile.propertyStyle && property.propertyType.includes(profile.propertyStyle.toLowerCase())) {
    score += 2;
  }

  for (const mustHave of profile.mustHaves) {
    if (propertySearchText.includes(mustHave.toLowerCase())) {
      score += 1;
    }
  }

  for (const dealBreaker of profile.dealBreakers) {
    if (propertySearchText.includes(dealBreaker.toLowerCase())) {
      score -= 3;
    }
  }

  return score;
}

function buildMatchReasons(property: DemoPropertySeed, profile?: ClientSearchProfile): string[] {
  const reasons: string[] = [];

  if (!profile) {
    return ["Add search preferences to see tighter matches for your next move."];
  }

  if (profile.targetCities.some((city) => city.toLowerCase() === property.city.toLowerCase())) {
    reasons.push(`Matches your target city: ${property.city}.`);
  }

  if (profile.priceMax && property.price <= profile.priceMax) {
    reasons.push("Fits under your current top budget.");
  }

  if (profile.bedroomsMin && property.bedrooms >= profile.bedroomsMin) {
    reasons.push(`Meets your ${profile.bedroomsMin}+ bedroom goal.`);
  }

  if (profile.bathroomsMin && property.bathrooms >= profile.bathroomsMin) {
    reasons.push(`Supports your ${profile.bathroomsMin}+ bathroom preference.`);
  }

  for (const mustHave of profile.mustHaves) {
    if (`${property.summary} ${property.amenities.join(" ")}`.toLowerCase().includes(mustHave.toLowerCase())) {
      reasons.push(`Includes a likely must-have: ${mustHave}.`);
      if (reasons.length >= 3) {
        break;
      }
    }
  }

  if (reasons.length === 0) {
    reasons.push("A broader Arizona fit based on your current profile and budget range.");
  }

  return reasons.slice(0, 3);
}

export function buildRecommendedPropertyMatches(
  profile?: ClientSearchProfile
): RecommendedPropertyMatch[] {
  return demoPropertySeeds
    .map((property) => ({
      ...property,
      score: scorePropertyMatch(property, profile)
    }))
    .sort((left, right) => right.score - left.score || left.price - right.price)
    .slice(0, 3)
    .map(({ score: _score, ...property }) => {
      const { amenities: _amenities, ...propertyMatch } = property;
      return {
        ...propertyMatch,
        matchReasons: buildMatchReasons(property, profile)
      };
    });
}
