import { existsSync } from "node:fs";

export type SystemStatus = {
  service: string;
  check: string;
  status: "PASS" | "FAIL" | "WARNING" | "MANUAL REQUIRED";
  notes: string;
};

function envSet(name: string) {
  return Boolean(process.env[name]);
}

export async function getSystemStatus(): Promise<SystemStatus[]> {
  return [
    {
      service: "API-Football",
      check: "API key configured",
      status: envSet("API_FOOTBALL_KEY") ? "PASS" : "FAIL",
      notes: envSet("API_FOOTBALL_KEY") ? "Configured server-side only." : "Add API_FOOTBALL_KEY to .env.local and Vercel.",
    },
    {
      service: "API-Football",
      check: "World Cup league ID",
      status: envSet("API_FOOTBALL_WORLD_CUP_LEAGUE_ID") ? "PASS" : "WARNING",
      notes: process.env.API_FOOTBALL_WORLD_CUP_LEAGUE_ID || "Resolve through /api/leagues/resolve-world-cup.",
    },
    {
      service: "Supabase",
      check: "Project URL",
      status: envSet("NEXT_PUBLIC_SUPABASE_URL") ? "PASS" : "FAIL",
      notes: envSet("NEXT_PUBLIC_SUPABASE_URL") ? "Project URL is configured." : "Add NEXT_PUBLIC_SUPABASE_URL.",
    },
    {
      service: "Supabase",
      check: "Service role key",
      status: envSet("SUPABASE_SERVICE_ROLE_KEY") ? "PASS" : "MANUAL REQUIRED",
      notes: envSet("SUPABASE_SERVICE_ROLE_KEY") ? "Server admin operations enabled." : "Copy this manually from Supabase dashboard API keys.",
    },
    {
      service: "Vercel",
      check: "Project linked locally",
      status: existsSync(".vercel/project.json") ? "PASS" : "WARNING",
      notes: existsSync(".vercel/project.json") ? "Local project link exists." : "Run vercel link or create the project.",
    },
    {
      service: "Cron",
      check: "CRON_SECRET",
      status: envSet("CRON_SECRET") ? "PASS" : "FAIL",
      notes: envSet("CRON_SECRET") ? "Cron route can reject unauthorized calls." : "Generate CRON_SECRET.",
    },
  ];
}
