import { customKits } from "@/lib/kits/customKits";

export type KitCatalogItem = {
  id: string;
  name: string;
  countryCode: string;
  countryName: string;
  flagLabel: string;
  primaryColor: string;
  secondaryColor: string;
  pattern: "home" | "away" | "special";
  thumbnailPath: string | null;
  profileThumbnailPath: string | null;
  isPlaceholder: boolean;
};

const countryNames: Record<string, string> = {
  CAN: "Canada",
  MEX: "Mexico",
  USA: "United States",
  FRA: "France",
  GER: "Germany",
  ESP: "Spain",
  ARG: "Argentina",
  ENG: "England",
  POR: "Portugal",
  RSA: "South Africa",
  COL: "Colombia",
  ECU: "Ecuador",
  BRA: "Brazil",
};

export const kitCatalog: KitCatalogItem[] = customKits.map((kit, index) => ({
  id: kit.id,
  name: kit.name,
  countryCode: kit.countryCode,
  countryName: countryNames[kit.countryCode] ?? kit.name,
  flagLabel: kit.countryCode,
  primaryColor: kit.accent,
  secondaryColor: kit.secondary,
  pattern: index % 5 === 0 ? "special" : index % 2 === 0 ? "away" : "home",
  thumbnailPath: kit.src,
  profileThumbnailPath: `/assets/kits/custom/profile/${kit.id}.png`,
  isPlaceholder: false,
}));

export const defaultKitId = "canada";

export function findKitById(id?: string | null) {
  return kitCatalog.find((kit) => kit.id === id) ?? kitCatalog.find((kit) => kit.id === defaultKitId) ?? kitCatalog[0];
}
