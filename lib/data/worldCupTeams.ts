export type WorldCupConfederation = "AFC" | "CAF" | "CONCACAF" | "CONMEBOL" | "OFC" | "UEFA";

export type WorldCupTeam = {
  name: string;
  code: string;
  slug: string;
  flagPath: string;
  confederation: WorldCupConfederation;
};

const flagBasePath = "/flags/world-cup-2026";
const WORLD_CUP_2026_TEAM_DEFINITIONS = [
  { name: "Algeria", code: "ALG", slug: "algeria", confederation: "CAF" },
  { name: "Argentina", code: "ARG", slug: "argentina", confederation: "CONMEBOL" },
  { name: "Australia", code: "AUS", slug: "australia", confederation: "AFC" },
  { name: "Austria", code: "AUT", slug: "austria", confederation: "UEFA" },
  { name: "Belgium", code: "BEL", slug: "belgium", confederation: "UEFA" },
  { name: "Bosnia and Herzegovina", code: "BIH", slug: "bosnia-and-herzegovina", confederation: "UEFA" },
  { name: "Brazil", code: "BRA", slug: "brazil", confederation: "CONMEBOL" },
  { name: "Canada", code: "CAN", slug: "canada", confederation: "CONCACAF" },
  { name: "Cabo Verde", code: "CPV", slug: "cabo-verde", confederation: "CAF" },
  { name: "Colombia", code: "COL", slug: "colombia", confederation: "CONMEBOL" },
  { name: "Congo DR", code: "COD", slug: "congo-dr", confederation: "CAF" },
  { name: "Côte d'Ivoire", code: "CIV", slug: "cote-divoire", confederation: "CAF" },
  { name: "Croatia", code: "CRO", slug: "croatia", confederation: "UEFA" },
  { name: "Curaçao", code: "CUW", slug: "curacao", confederation: "CONCACAF" },
  { name: "Czechia", code: "CZE", slug: "czechia", confederation: "UEFA" },
  { name: "Ecuador", code: "ECU", slug: "ecuador", confederation: "CONMEBOL" },
  { name: "Egypt", code: "EGY", slug: "egypt", confederation: "CAF" },
  { name: "England", code: "ENG", slug: "england", confederation: "UEFA" },
  { name: "France", code: "FRA", slug: "france", confederation: "UEFA" },
  { name: "Germany", code: "GER", slug: "germany", confederation: "UEFA" },
  { name: "Ghana", code: "GHA", slug: "ghana", confederation: "CAF" },
  { name: "Haiti", code: "HAI", slug: "haiti", confederation: "CONCACAF" },
  { name: "IR Iran", code: "IRN", slug: "ir-iran", confederation: "AFC" },
  { name: "Iraq", code: "IRQ", slug: "iraq", confederation: "AFC" },
  { name: "Japan", code: "JPN", slug: "japan", confederation: "AFC" },
  { name: "Jordan", code: "JOR", slug: "jordan", confederation: "AFC" },
  { name: "Korea Republic", code: "KOR", slug: "korea-republic", confederation: "AFC" },
  { name: "Mexico", code: "MEX", slug: "mexico", confederation: "CONCACAF" },
  { name: "Morocco", code: "MAR", slug: "morocco", confederation: "CAF" },
  { name: "Netherlands", code: "NED", slug: "netherlands", confederation: "UEFA" },
  { name: "New Zealand", code: "NZL", slug: "new-zealand", confederation: "OFC" },
  { name: "Norway", code: "NOR", slug: "norway", confederation: "UEFA" },
  { name: "Panama", code: "PAN", slug: "panama", confederation: "CONCACAF" },
  { name: "Paraguay", code: "PAR", slug: "paraguay", confederation: "CONMEBOL" },
  { name: "Portugal", code: "POR", slug: "portugal", confederation: "UEFA" },
  { name: "Qatar", code: "QAT", slug: "qatar", confederation: "AFC" },
  { name: "Saudi Arabia", code: "KSA", slug: "saudi-arabia", confederation: "AFC" },
  { name: "Scotland", code: "SCO", slug: "scotland", confederation: "UEFA" },
  { name: "Senegal", code: "SEN", slug: "senegal", confederation: "CAF" },
  { name: "South Africa", code: "RSA", slug: "south-africa", confederation: "CAF" },
  { name: "Spain", code: "ESP", slug: "spain", confederation: "UEFA" },
  { name: "Sweden", code: "SWE", slug: "sweden", confederation: "UEFA" },
  { name: "Switzerland", code: "SUI", slug: "switzerland", confederation: "UEFA" },
  { name: "Tunisia", code: "TUN", slug: "tunisia", confederation: "CAF" },
  { name: "Türkiye", code: "TUR", slug: "turkiye", confederation: "UEFA" },
  { name: "United States", code: "USA", slug: "united-states", confederation: "CONCACAF" },
  { name: "Uruguay", code: "URU", slug: "uruguay", confederation: "CONMEBOL" },
  { name: "Uzbekistan", code: "UZB", slug: "uzbekistan", confederation: "AFC" },
] satisfies Array<Omit<WorldCupTeam, "flagPath">>;

export const WORLD_CUP_2026_TEAMS: WorldCupTeam[] = WORLD_CUP_2026_TEAM_DEFINITIONS.map((team) => ({
  ...team,
  flagPath: `${flagBasePath}/${team.slug}.png`,
}));

const TEAM_BY_SLUG = new Map(WORLD_CUP_2026_TEAMS.map((team) => [team.slug, team]));
const TEAM_BY_CODE = new Map(WORLD_CUP_2026_TEAMS.map((team) => [team.code, team]));

function normalizeTeamKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const TEAM_ALIASES = new Map<string, string>([
  ...WORLD_CUP_2026_TEAMS.map((team) => [normalizeTeamKey(team.name), team.slug] as const),
  ...WORLD_CUP_2026_TEAMS.map((team) => [normalizeTeamKey(team.slug), team.slug] as const),
  ["bosnia herzegovina", "bosnia-and-herzegovina"],
  ["bosnia and h", "bosnia-and-herzegovina"],
  ["cape verde", "cabo-verde"],
  ["cabo verde islands", "cabo-verde"],
  ["dr congo", "congo-dr"],
  ["democratic republic of congo", "congo-dr"],
  ["cote divoire", "cote-divoire"],
  ["cote d ivoire", "cote-divoire"],
  ["ivory coast", "cote-divoire"],
  ["curacao", "curacao"],
  ["czech republic", "czechia"],
  ["iran", "ir-iran"],
  ["islamic republic of iran", "ir-iran"],
  ["south korea", "korea-republic"],
  ["korea republic", "korea-republic"],
  ["turkey", "turkiye"],
  ["usa", "united-states"],
  ["us", "united-states"],
  ["u s a", "united-states"],
  ["united states of america", "united-states"],
]);

export function getWorldCupTeamBySlug(slug: string | null | undefined) {
  if (!slug) return null;
  return TEAM_BY_SLUG.get(slug) ?? null;
}

export function getWorldCupTeamFlagPath(
  team: string | { name?: string | null; country?: string | null; code?: string | null } | null | undefined,
) {
  if (!team) return null;

  const candidates =
    typeof team === "string" ? [team] : [team.name, team.country, team.code].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const byCode = TEAM_BY_CODE.get(candidate.toUpperCase());
    if (byCode) return byCode.flagPath;

    const slug = TEAM_ALIASES.get(normalizeTeamKey(candidate));
    if (slug) return TEAM_BY_SLUG.get(slug)?.flagPath ?? null;
  }

  return null;
}
