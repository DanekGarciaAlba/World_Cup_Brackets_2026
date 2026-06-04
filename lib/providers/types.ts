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
