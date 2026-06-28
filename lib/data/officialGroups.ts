export const OFFICIAL_WORLD_CUP_GROUP_LABELS = Array.from({ length: 12 }, (_, index) => `Group ${String.fromCharCode(65 + index)}`);

export function canonicalWorldCupGroupName(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/\bGroup\s+([A-L])\b/i);
  return match ? `Group ${match[1].toUpperCase()}` : null;
}
