export const SYSTEM_ADMIN_EMAILS = ["danek.chat@gmail.com", "admin@tgp.build", "danek.chat@tgp.build"] as const;
export const SYSTEM_ADMIN_EMAIL = SYSTEM_ADMIN_EMAILS[0];
export const FULL_COSMETIC_ACCESS_EMAIL = SYSTEM_ADMIN_EMAIL;
export const FULL_COSMETIC_ACCESS_EMAILS = SYSTEM_ADMIN_EMAILS;

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

export function isSystemAdminEmail(email?: string | null) {
  return SYSTEM_ADMIN_EMAILS.includes(normalizeEmail(email) as (typeof SYSTEM_ADMIN_EMAILS)[number]);
}

export function hasFullCosmeticAccess(email?: string | null) {
  return FULL_COSMETIC_ACCESS_EMAILS.includes(normalizeEmail(email) as (typeof FULL_COSMETIC_ACCESS_EMAILS)[number]);
}

export function isCompetitiveHiddenEmail(email?: string | null) {
  return isSystemAdminEmail(email);
}
