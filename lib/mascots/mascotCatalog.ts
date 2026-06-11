export type MascotId = "maple" | "zayu" | "clutch";

export type MascotDefinition = {
  id: MascotId;
  name: string;
  productName: "Canada Mascot" | "Mexico Mascot" | "USA Mascot";
  host: "Canada" | "Mexico" | "United States";
  countryCode: "CA" | "MX" | "US";
  code: "CAN" | "MEX" | "USA";
  flagLabel: "CA" | "MX" | "US";
  modelSrc: string;
  fallbackModelSrc: string;
  lightweightAssetPath: string | null;
  accent: string;
  secondaryAccent: string;
  cameraOrbit: string;
  fieldOfView: string;
  description: string;
  unlockPoints: number;
  autoUnlockAt: string | null;
  unlockLabel: string;
  finalWeekUnlock: boolean;
};

export const mascotIds = ["maple", "zayu", "clutch"] as const satisfies readonly MascotId[];

export const mascotCatalog: Record<MascotId, MascotDefinition> = {
  maple: {
    id: "maple",
    name: "Maple",
    productName: "Canada Mascot",
    host: "Canada",
    countryCode: "CA",
    code: "CAN",
    flagLabel: "CA",
    modelSrc: "/mascot-lab/models/maple-posed.glb",
    fallbackModelSrc: "/mascot-lab/models/maple-posed.glb",
    lightweightAssetPath: "/assets/profile/maple/mascot-icon.webp",
    accent: "#cf573c",
    secondaryAccent: "#f2f4ff",
    cameraOrbit: "18deg 72deg 4.25m",
    fieldOfView: "30deg",
    description: "Original Canada mascot identity used as the Maple profile base.",
    unlockPoints: 0,
    autoUnlockAt: null,
    unlockLabel: "Free starter choice.",
    finalWeekUnlock: true,
  },
  zayu: {
    id: "zayu",
    name: "Zayu",
    productName: "Mexico Mascot",
    host: "Mexico",
    countryCode: "MX",
    code: "MEX",
    flagLabel: "MX",
    modelSrc: "/mascot-lab/models/zayu-posed.glb",
    fallbackModelSrc: "/mascot-lab/models/zayu-rig.glb",
    lightweightAssetPath: "/assets/profile/zayu/mascot-icon.webp",
    accent: "#3aa66a",
    secondaryAccent: "#d94436",
    cameraOrbit: "22deg 73deg 4.35m",
    fieldOfView: "30deg",
    description: "Original Mexico mascot identity used as the Zayu profile base.",
    unlockPoints: 0,
    autoUnlockAt: null,
    unlockLabel: "Free starter choice.",
    finalWeekUnlock: true,
  },
  clutch: {
    id: "clutch",
    name: "Clutch",
    productName: "USA Mascot",
    host: "United States",
    countryCode: "US",
    code: "USA",
    flagLabel: "US",
    modelSrc: "/mascot-lab/models/clutch-posed.glb",
    fallbackModelSrc: "/mascot-lab/models/clutch-rig.glb",
    lightweightAssetPath: "/assets/profile/clutch/mascot-icon.webp",
    accent: "#f5c94d",
    secondaryAccent: "#6684ff",
    cameraOrbit: "-18deg 73deg 4.45m",
    fieldOfView: "30deg",
    description: "Original United States mascot identity used as the Clutch profile base.",
    unlockPoints: 0,
    autoUnlockAt: null,
    unlockLabel: "Free starter choice.",
    finalWeekUnlock: true,
  },
};

const mascotAliases: Record<string, MascotId> = {
  canada: "maple",
  can: "maple",
  maple: "maple",
  mexico: "zayu",
  mex: "zayu",
  zayu: "zayu",
  usa: "clutch",
  us: "clutch",
  "united-states": "clutch",
  "united states": "clutch",
  clutch: "clutch",
};

export const mascotList = mascotIds.map((id) => mascotCatalog[id]);

export function normalizeMascotId(value: unknown): MascotId | null {
  if (typeof value !== "string") return null;
  return mascotAliases[value.trim().toLowerCase()] ?? null;
}
