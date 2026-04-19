export type PreferredLanguage = "en" | "es";

export interface ClientAccountSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  preferredLanguage: PreferredLanguage;
  createdAt: string;
}

export interface ClientSession {
  clientAccountId: string;
  accessibleTransactionIds: string[];
  via: "password" | "magic_link";
}
