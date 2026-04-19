import type { AiTransparency } from "./document";

export type PreferredLanguage = "en" | "es";

export interface ClientSearchProfile {
  targetCities: string[];
  priceMin?: number;
  priceMax?: number;
  bedroomsMin?: number;
  bathroomsMin?: number;
  timeline?: string;
  propertyStyle?: string;
  mustHaves: string[];
  dealBreakers: string[];
  notes?: string;
}

export interface RecommendedPropertyMatch {
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
  matchReasons: string[];
}

export interface ClientOutboundCallResult {
  success: boolean;
  message: string;
  generatedBy: "elevenlabs" | "fallback";
  transparency: AiTransparency;
  conversationId?: string;
  callSid?: string;
}

export interface ClientAccountSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  preferredLanguage: PreferredLanguage;
  searchProfile?: ClientSearchProfile;
  createdAt: string;
}

export interface ClientSession {
  clientAccountId: string;
  accessibleTransactionIds: string[];
  via: "password" | "magic_link";
}
