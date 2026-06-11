const EASTERN_TIME_ZONE = "America/New_York";

function validDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatEasternDateTime(value: string | Date | null | undefined, fallback = "Time pending") {
  const date = validDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: EASTERN_TIME_ZONE,
  }).format(date);
}

export function formatEasternCompactDateTime(value: string | Date | null | undefined, fallback = "Time pending") {
  return formatEasternDateTime(value, fallback).replace(":00", "");
}

export function formatEasternDate(value: string | Date | null | undefined, fallback = "Date pending") {
  const date = validDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: EASTERN_TIME_ZONE,
  }).format(date);
}

export function formatEasternTime(value: string | Date | null | undefined, fallback = "Time pending") {
  const date = validDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: EASTERN_TIME_ZONE,
  }).format(date);
}
