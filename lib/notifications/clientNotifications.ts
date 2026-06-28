"use client";

export type ClientNotificationKind = "score" | "unlock" | "profile";

export type ClientNotification = {
  id: string;
  kind: ClientNotificationKind;
  title: string;
  body: string;
  createdAt: string;
  sortAt?: string | null;
  imageUrl?: string | null;
  href?: string | null;
  accent?: "gold" | "green" | "red" | "blue";
  read?: boolean;
};

export const CLIENT_NOTIFICATIONS_EVENT = "world-cup:notifications-updated";

const STORAGE_KEY = "wc-notification-inbox:v2";
const LEGACY_STORAGE_KEYS = ["wc-notification-inbox:v1"];
const MAX_NOTIFICATIONS = 80;
const VALID_KINDS = new Set<ClientNotificationKind>(["score", "unlock", "profile"]);
const VALID_ACCENTS = new Set<NonNullable<ClientNotification["accent"]>>(["gold", "green", "red", "blue"]);

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isReasonableDate(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time);
}

function dateTime(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function normalizeImageUrl(value: unknown) {
  const imageUrl = cleanText(value);
  if (!imageUrl) return null;
  return imageUrl.startsWith("/") || imageUrl.startsWith("https://") || imageUrl.startsWith("http://") ? imageUrl : null;
}

function normalizeHref(value: unknown) {
  const href = cleanText(value);
  if (!href || !href.startsWith("/") || href.startsWith("//")) return null;
  return href;
}

function hasDemoOrLocalId(id: string) {
  const normalized = id.toLowerCase();
  return normalized === "demo" || normalized.startsWith("demo:") || normalized.includes(":demo:");
}

function hasPlaceholderPick(notification: Pick<ClientNotification, "title" | "body">) {
  const text = `${notification.title} ${notification.body}`;
  return /\b(?:your\s+pick|pick|final)\s*--/i.test(text);
}

function isTrustedNotification(notification: ClientNotification) {
  if (hasDemoOrLocalId(notification.id)) return false;

  if (notification.kind === "score") {
    return notification.id.startsWith("score:") && /^\+[1-9]\d*\s+pts?\b/i.test(notification.title) && !hasPlaceholderPick(notification);
  }

  if (notification.kind === "unlock") {
    return notification.id.startsWith("unlock:") && /^New (mascot|skin|emote|pin|rewards?) available$/i.test(notification.title);
  }

  return notification.id.startsWith("profile:");
}

function kindRank(kind: ClientNotificationKind) {
  if (kind === "score") return 0;
  if (kind === "unlock") return 1;
  return 2;
}

function scoreMatchId(notification: ClientNotification) {
  if (notification.kind !== "score") return 0;
  const value = Number(notification.id.split(":")[2]);
  return Number.isFinite(value) ? value : 0;
}

export function compareClientNotifications(a: ClientNotification, b: ClientNotification) {
  const timeDiff = dateTime(b.sortAt ?? b.createdAt) - dateTime(a.sortAt ?? a.createdAt);
  if (timeDiff !== 0) return timeDiff;

  const kindDiff = kindRank(a.kind) - kindRank(b.kind);
  if (kindDiff !== 0) return kindDiff;

  const matchDiff = scoreMatchId(b) - scoreMatchId(a);
  if (matchDiff !== 0) return matchDiff;

  return `${a.title}:${a.id}`.localeCompare(`${b.title}:${b.id}`);
}

export function normalizeClientNotification(item: unknown): ClientNotification | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  const id = cleanText(record.id);
  const title = cleanText(record.title);
  const body = cleanText(record.body);
  const createdAt = cleanText(record.createdAt);
  const sortAt = cleanText(record.sortAt);
  const kind = cleanText(record.kind) as ClientNotificationKind;
  if (!id || !title || !body || !createdAt || !VALID_KINDS.has(kind) || !isReasonableDate(createdAt)) return null;

  const notification: ClientNotification = {
    id,
    kind,
    title,
    body,
    createdAt,
    sortAt: sortAt && isReasonableDate(sortAt) ? sortAt : null,
    imageUrl: normalizeImageUrl(record.imageUrl),
    href: normalizeHref(record.href),
    accent: VALID_ACCENTS.has(cleanText(record.accent) as NonNullable<ClientNotification["accent"]>)
      ? (cleanText(record.accent) as ClientNotification["accent"])
      : "blue",
    read: Boolean(record.read),
  };

  return isTrustedNotification(notification) ? notification : null;
}

export function sanitizeClientNotifications(value: unknown): ClientNotification[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeClientNotification)
    .filter((item): item is ClientNotification => Boolean(item))
    .sort(compareClientNotifications)
    .slice(0, MAX_NOTIFICATIONS);
}

function safeParse(raw: string | null): ClientNotification[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeClientNotifications(parsed);
  } catch {
    return [];
  }
}

export function readClientNotifications() {
  if (typeof window === "undefined") return [];
  clearLegacyNotificationStorage();
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function writeClientNotifications(notifications: ClientNotification[]) {
  if (typeof window === "undefined") return;
  try {
    clearLegacyNotificationStorage();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeClientNotifications(notifications)));
    window.dispatchEvent(new CustomEvent(CLIENT_NOTIFICATIONS_EVENT));
  } catch {
    // Notification history is a convenience layer; never block gameplay.
  }
}

function clearLegacyNotificationStorage() {
  try {
    for (const key of LEGACY_STORAGE_KEYS) window.localStorage.removeItem(key);
  } catch {
    // If storage is unavailable, the inbox simply starts fresh for this session.
  }
}

function upsertClientNotifications(notifications: ClientNotification[], options: { markUnread: boolean }) {
  if (typeof window === "undefined" || notifications.length === 0) return;
  const existing = readClientNotifications();
  const incoming = sanitizeClientNotifications(notifications);
  if (incoming.length === 0) return;
  const byId = new Map(existing.map((item) => [item.id, item]));

  for (const notification of incoming) {
    const previous = byId.get(notification.id);
    byId.set(notification.id, {
      ...previous,
      ...notification,
      read: options.markUnread ? false : (previous?.read ?? true),
    });
  }

  writeClientNotifications(
    Array.from(byId.values()).sort(compareClientNotifications),
  );
}

export function pushClientNotifications(notifications: ClientNotification[]) {
  upsertClientNotifications(notifications, { markUnread: true });
}

export function syncClientNotifications(notifications: ClientNotification[]) {
  upsertClientNotifications(notifications, { markUnread: false });
}

export function replaceClientNotificationsByPrefix(prefix: string, notifications: ClientNotification[]) {
  if (typeof window === "undefined") return;
  const cleanPrefix = cleanText(prefix);
  if (!cleanPrefix) return;

  const existing = readClientNotifications();
  const previousById = new Map(existing.map((item) => [item.id, item]));
  const incoming = sanitizeClientNotifications(notifications).filter((notification) => notification.id.startsWith(cleanPrefix));
  const merged = existing.filter((notification) => !notification.id.startsWith(cleanPrefix));

  for (const notification of incoming) {
    const previous = previousById.get(notification.id);
    merged.push({
      ...previous,
      ...notification,
      read: previous?.read ?? true,
    });
  }

  writeClientNotifications(merged.sort(compareClientNotifications));
}

export function markClientNotificationsRead(kind?: ClientNotificationKind) {
  const notifications = readClientNotifications();
  if (notifications.every((item) => item.read || (kind && item.kind !== kind))) return;
  writeClientNotifications(notifications.map((item) => (kind && item.kind !== kind ? item : { ...item, read: true })));
}
