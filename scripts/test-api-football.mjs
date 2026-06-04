import { readFile } from "node:fs/promises";

const envPath = new URL("../.env.local", import.meta.url);

function parseEnv(contents) {
  const result = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    result[key] = value;
  }
  return result;
}

async function apiGet(baseUrl, path, key) {
  const response = await fetch(new URL(path, baseUrl), {
    headers: {
      "x-apisports-key": key,
    },
  });

  const payload = await response.json();
  return { ok: response.ok, status: response.status, payload };
}

function findWorldCupLeague(leagues) {
  return leagues.find((item) => {
    const name = item?.league?.name?.toLowerCase();
    return name === "world cup";
  });
}

const env = parseEnv(await readFile(envPath, "utf8"));
const key = env.API_FOOTBALL_KEY;
const baseUrl = env.API_FOOTBALL_BASE_URL || "https://v3.football.api-sports.io";

if (!key) {
  throw new Error("API_FOOTBALL_KEY is missing in .env.local");
}

const countries = await apiGet(baseUrl, "/countries", key);
const leagues = await apiGet(baseUrl, "/leagues?search=world%20cup", key);

const worldCup = findWorldCupLeague(leagues.payload.response || []);

console.log(
  JSON.stringify(
    {
      countries: {
        ok: countries.ok,
        status: countries.status,
        results: countries.payload.results,
      },
      leagues: {
        ok: leagues.ok,
        status: leagues.status,
        results: leagues.payload.results,
        worldCupLeagueId: worldCup?.league?.id ?? null,
        worldCupLeagueName: worldCup?.league?.name ?? null,
      },
    },
    null,
    2,
  ),
);
