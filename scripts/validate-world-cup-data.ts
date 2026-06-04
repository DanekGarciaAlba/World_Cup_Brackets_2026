import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getWorldCupDataQuality } from "@/lib/data/worldCupValidation";

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

const env = {
  ...process.env,
  ...loadEnvFile(join(process.cwd(), ".env.local")),
} as Record<string, string>;

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const result = await getWorldCupDataQuality(supabase);

console.table(result.rows);
console.log(
  JSON.stringify(
    {
      counts: result.counts,
      lastValidationStatus: result.lastValidationStatus,
      lastSync: result.lastSync,
    },
    null,
    2,
  ),
);

if (result.lastValidationStatus === "FAIL") {
  process.exitCode = 1;
}
