import "server-only";
import { requiredEnv } from "@/lib/env";
import type { ApiFootballLeague, ApiFootballResponse, FixtureQuery } from "@/lib/providers/types";

const requestCounts = new Map<string, number>();

function baseUrl() {
  return process.env.API_FOOTBALL_BASE_URL || "https://v3.football.api-sports.io";
}

function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  return search.toString();
}

export function getProviderRequestCounts() {
  return Object.fromEntries(requestCounts.entries());
}

async function apiFootballGet<T>(path: string, params: Record<string, string | number | boolean | undefined> = {}) {
  const query = toQuery(params);
  const url = new URL(`${path}${query ? `?${query}` : ""}`, baseUrl());
  const key = requiredEnv("API_FOOTBALL_KEY");

  requestCounts.set(path, (requestCounts.get(path) || 0) + 1);

  const response = await fetch(url, {
    headers: {
      "x-apisports-key": key,
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as ApiFootballResponse<T>;

  if (!response.ok) {
    throw new Error(`API-Football request failed: ${path} ${response.status}`);
  }

  return payload;
}

export function getLeagues(params: { search?: string; season?: string | number } = {}) {
  return apiFootballGet<ApiFootballLeague[]>("/leagues", params);
}

export async function resolveWorldCup2026League() {
  const configured = process.env.API_FOOTBALL_WORLD_CUP_LEAGUE_ID;
  if (configured) return Number(configured);

  const candidates = await getLeagues({ search: "world cup", season: process.env.API_FOOTBALL_SEASON || "2026" });
  const exact = candidates.response.find((item) => item.league.name.toLowerCase() === "world cup");
  return exact?.league.id ?? null;
}

export function getTeams(params: { league?: string | number; season?: string | number } = {}) {
  return apiFootballGet<unknown[]>("/teams", params);
}

export function getFixtures(params: FixtureQuery = {}) {
  return apiFootballGet<unknown[]>("/fixtures", params);
}

export function getLiveFixtures() {
  return getFixtures({ live: "all" });
}

export function getStandings(params: { league?: string | number; season?: string | number } = {}) {
  return apiFootballGet<unknown[]>("/standings", params);
}

export function getFixtureById(id: number | string) {
  return getFixtures({ id });
}

export function getCountries() {
  return apiFootballGet<unknown[]>("/countries");
}
