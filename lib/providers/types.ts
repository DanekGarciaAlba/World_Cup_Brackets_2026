export type ApiFootballLeague = {
  league: {
    id: number;
    name: string;
    type?: string;
    logo?: string;
  };
  country?: {
    name?: string;
    code?: string;
    flag?: string;
  };
  seasons?: Array<{
    year: number;
    start?: string;
    end?: string;
    current?: boolean;
  }>;
};

export type ApiFootballResponse<T> = {
  get: string;
  parameters: Record<string, string | number | boolean>;
  errors: unknown;
  results: number;
  paging?: {
    current: number;
    total: number;
  };
  response: T;
};

export type FixtureQuery = {
  league?: number | string;
  season?: number | string;
  date?: string;
  live?: "all";
  id?: number | string;
};

export type ApiFootballTeamResponse = {
  team?: {
    id?: number;
    name?: string;
    code?: string | null;
    country?: string | null;
    logo?: string | null;
    national?: boolean;
  };
  venue?: unknown;
};

export type ApiFootballFixtureResponse = {
  fixture?: {
    id?: number;
    date?: string;
    status?: {
      long?: string;
      short?: string;
      elapsed?: number | null;
    };
    venue?: {
      name?: string | null;
      city?: string | null;
    };
  };
  league?: {
    id?: number;
    season?: number;
    round?: string | null;
  };
  teams?: {
    home?: {
      id?: number | null;
      name?: string | null;
      logo?: string | null;
      winner?: boolean | null;
    };
    away?: {
      id?: number | null;
      name?: string | null;
      logo?: string | null;
      winner?: boolean | null;
    };
  };
  goals?: {
    home?: number | null;
    away?: number | null;
  };
  score?: {
    penalty?: {
      home?: number | null;
      away?: number | null;
    };
  };
};

export type ApiFootballStandingRow = {
  rank?: number;
  team?: {
    id?: number;
    name?: string;
    logo?: string | null;
  };
  points?: number;
  goalsDiff?: number;
  group?: string;
  all?: {
    played?: number;
    win?: number;
    draw?: number;
    lose?: number;
    goals?: {
      for?: number;
      against?: number;
    };
  };
};

export type ApiFootballStandingsResponse = {
  league?: {
    id?: number;
    season?: number;
    standings?: ApiFootballStandingRow[][];
  };
};
