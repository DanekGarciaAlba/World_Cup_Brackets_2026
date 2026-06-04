import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

type Status = "PASS" | "FAIL" | "WARNING" | "MANUAL REQUIRED";

type Row = {
  Service: string;
  Check: string;
  Status: Status;
  Notes: string;
};

const requiredTables = [
  "profiles",
  "teams",
  "matches",
  "standings",
  "match_predictions",
  "group_predictions",
  "tournament_predictions",
  "bracket_predictions",
  "prediction_scores",
  "leaderboard_cache",
  "mini_leagues",
  "mini_league_members",
  "sync_logs",
  "system_settings",
];

function loadEnvFile(path: string) {
  const env: Record<string, string> = {};
  if (!existsSync(path)) return env;

  const contents = readFileSync(path, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = value;
  }
  return env;
}

function push(rows: Row[], Service: string, Check: string, Status: Status, Notes: string) {
  rows.push({ Service, Check, Status, Notes });
}

function run(command: string, args: string[]) {
  try {
    if (process.platform === "win32" && command.endsWith(".cmd")) {
      return execFileSync("cmd.exe", ["/d", "/s", "/c", [command, ...args].join(" ")], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
    }

    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function hasPackageScript(name: string) {
  try {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts?: Record<string, string> };
    return Boolean(packageJson.scripts?.[name]);
  } catch {
    return false;
  }
}

async function apiFootballCheck(env: Record<string, string>, rows: Row[]) {
  if (!env.API_FOOTBALL_KEY || !env.API_FOOTBALL_BASE_URL) return;

  try {
    const countries = await fetch(new URL("/countries", env.API_FOOTBALL_BASE_URL), {
      headers: { "x-apisports-key": env.API_FOOTBALL_KEY },
    });
    push(rows, "API-Football", "Countries endpoint", countries.ok ? "PASS" : "FAIL", `HTTP ${countries.status}`);

    const leagues = await fetch(new URL("/leagues?search=world%20cup", env.API_FOOTBALL_BASE_URL), {
      headers: { "x-apisports-key": env.API_FOOTBALL_KEY },
    });
    const payload = await leagues.json();
    const worldCup = payload.response?.find((item: { league?: { name?: string; id?: number } }) => {
      return item.league?.name?.toLowerCase() === "world cup";
    });
    push(
      rows,
      "API-Football",
      "World Cup league resolve",
      leagues.ok && worldCup ? "PASS" : "WARNING",
      worldCup ? `Resolved league id ${worldCup.league.id}` : `HTTP ${leagues.status}; confirm league manually`,
    );
  } catch (error) {
    push(rows, "API-Football", "Connection", "FAIL", error instanceof Error ? error.message : "Unknown error");
  }
}

async function supabaseCheck(env: Record<string, string>, rows: Row[]) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;

  for (const table of requiredTables) {
    try {
      const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
        headers: {
          apikey: key,
          authorization: `Bearer ${key}`,
        },
      });
      push(rows, "Supabase", `Table ${table}`, response.status < 500 ? "PASS" : "FAIL", `REST API HTTP ${response.status}`);
    } catch (error) {
      push(rows, "Supabase", `Table ${table}`, "FAIL", error instanceof Error ? error.message : "Unknown error");
    }
  }
}

async function main() {
  const env = {
    ...process.env,
    ...loadEnvFile(join(process.cwd(), ".env.local")),
  } as Record<string, string>;

  const rows: Row[] = [];
  const requiredEnv = [
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "API_FOOTBALL_KEY",
    "API_FOOTBALL_BASE_URL",
    "API_FOOTBALL_SEASON",
    "API_FOOTBALL_WORLD_CUP_LEAGUE_ID",
    "CRON_SECRET",
    "AUTH_EMAIL_MODE",
    "ADMIN_EMAILS",
  ];

  push(rows, "Node", "package.json exists", existsSync("package.json") ? "PASS" : "FAIL", existsSync("package.json") ? "Found" : "Missing");
  push(rows, "Node", "node_modules installed", existsSync("node_modules") ? "PASS" : "WARNING", existsSync("node_modules") ? "Found" : "Run npm.cmd install");

  for (const name of requiredEnv) {
    const missingSecret = name === "SUPABASE_SERVICE_ROLE_KEY" && !env[name];
    push(
      rows,
      "Env",
      name,
      env[name] ? "PASS" : missingSecret ? "MANUAL REQUIRED" : "FAIL",
      env[name] ? "Set" : missingSecret ? "Copy from Supabase dashboard Settings > API Keys" : "Missing",
    );
  }

  push(
    rows,
    "API-Football",
    "Season is 2026",
    env.API_FOOTBALL_SEASON === "2026" ? "PASS" : "FAIL",
    env.API_FOOTBALL_SEASON || "Missing",
  );

  await apiFootballCheck(env, rows);
  await supabaseCheck(env, rows);

  const vercelUser = run("vercel.cmd", ["whoami"]);
  push(rows, "Vercel", "CLI authenticated", vercelUser ? "PASS" : "FAIL", vercelUser || "Not logged in");
  push(
    rows,
    "Vercel",
    "Project linked",
    existsSync(".vercel/project.json") ? "PASS" : "WARNING",
    existsSync(".vercel/project.json") ? "Found .vercel/project.json" : "Run vercel.cmd link --scope danek-garcia-s-projects",
  );

  const cronRoute = existsSync("app/api/cron/sync-world-cup/route.ts")
    ? readFileSync("app/api/cron/sync-world-cup/route.ts", "utf8")
    : "";
  push(
    rows,
    "Cron",
    "Protected by CRON_SECRET",
    cronRoute.includes("CRON_SECRET") && cronRoute.includes("Bearer") ? "PASS" : "FAIL",
    cronRoute ? "Route checks Authorization bearer secret" : "Route missing",
  );

  push(rows, "Build", "build script", hasPackageScript("build") ? "PASS" : "WARNING", "Run npm.cmd run build for full verification");
  push(rows, "Tests", "test script", hasPackageScript("test") ? "PASS" : "WARNING", "Run npm.cmd run test for full verification");

  console.table(rows);

  const failed = rows.some((row) => row.Status === "FAIL");
  if (failed) process.exitCode = 1;
}

await main();
