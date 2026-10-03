import { PLATFORMS } from "@/lib/platforms";

export interface CatalogItem {
  id: string;
  label: string;
  tagline: string;
  category: "socials" | "contact";
  placeholder: string;
  buildUrl: (input: string) => string | null;
  // Custom rows carry no platform; socials do.
  platform: string | null;
}

const CONTACTS: CatalogItem[] = [
  {
    id: "email",
    label: "Email",
    category: "contact",
    tagline: "Reach you by email",
    placeholder: "you@example.com",
    platform: null,
    buildUrl: (input) => {
      const trimmed = input.trim();
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? `mailto:${trimmed}` : null;
    },
  },
  {
    id: "phone",
    label: "Phone",
    category: "contact",
    tagline: "Let people call or text you",
    placeholder: "+1 555 010 2233",
    platform: null,
    buildUrl: (input) => {
      const digits = input.replace(/[^\d+]/g, "");
      return digits.replace(/\D/g, "").length >= 7 ? `tel:${digits}` : null;
    },
  },
];

export const CATALOG: CatalogItem[] = [
  ...PLATFORMS.map((platform) => ({
    id: platform.id,
    label: platform.label,
    tagline: platform.tagline,
    category: "socials" as const,
    placeholder: platform.placeholder,
    buildUrl: platform.profileUrl,
    platform: platform.id,
  })),
  ...CONTACTS,
];

export const CATEGORIES = [
  { id: "socials", label: "Socials" },
  { id: "contact", label: "Contact" },
] as const;
