import { config } from "./env";
import { kv } from "./kv";
import { memoryCache } from "./memory-cache";

const TMDB_API_KEY = config.tmdbApiKey;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export interface TMDBMetadata {
  id: number;
  title: string;
  name?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  media_type: "movie" | "tv";
  genres?: { id: number; name: string }[];
  cast?: {
    id: number;
    name: string;
    character: string;
    profile_path: string;
  }[];
}

interface TMDBSearchResult {
  id: number;
  media_type: "movie" | "tv" | string;
}

interface TMDBSearchResponse {
  results?: TMDBSearchResult[];
}

interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface TMDBDetailsResponse {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genres?: { id: number; name: string }[];
  credits?: {
    cast?: TMDBCastMember[];
  };
}

function isSupportedMediaType(
  mediaType: TMDBSearchResult["media_type"],
): mediaType is TMDBMetadata["media_type"] {
  return mediaType === "movie" || mediaType === "tv";
}

async function fetchTMDB(
  endpoint: string,
  params: Record<string, string> = {},
) {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  const isJwt = TMDB_API_KEY?.startsWith("ey");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (isJwt) {
    headers["Authorization"] = `Bearer ${TMDB_API_KEY}`;
  } else {
    url.searchParams.append("api_key", TMDB_API_KEY || "");
  }

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  console.log(
    `[TMDB] Fetching: ${endpoint} with params ${JSON.stringify(params)}`,
  );

  const response = await fetch(url.toString(), {
    headers,
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TMDB API Error: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function searchTMDB(
  query: string,
  year?: string,
): Promise<TMDBMetadata | null> {
  if (!TMDB_API_KEY) {
    console.warn("[TMDB] TMDB_API_KEY is not set");
    return null;
  }

  const cacheKey = `tmdb:search:${query}:${year || "any"}`;

  const cached = memoryCache.get<TMDBMetadata>(cacheKey);
  if (cached) return cached;

  try {
    const kvCached = await kv.get<TMDBMetadata>(cacheKey);
    if (kvCached) {
      memoryCache.set(cacheKey, kvCached, 3600);
      return kvCached;
    }
  } catch (err) {
    console.debug("[TMDB] KV Error:", err);
  }

  try {
    const searchParams: Record<string, string> = { query };
    if (year) {
      searchParams.year = year;
      searchParams.first_air_date_year = year;
    }

    const data = (await fetchTMDB(
      "/search/multi",
      searchParams,
    )) as TMDBSearchResponse;

    if (!data.results || data.results.length === 0) {
      console.log(`[TMDB] No results for query: ${query}`);
      return null;
    }

    const result = data.results.find(
      (item) => item.media_type === "movie" || item.media_type === "tv",
    );

    if (!result) {
      console.log(`[TMDB] No movie/tv results for query: ${query}`);
      return null;
    }

    const details = (await fetchTMDB(`/${result.media_type}/${result.id}`, {
      append_to_response: "credits",
    })) as TMDBDetailsResponse;

    const title = details.title || details.name || query;
    const mediaType = isSupportedMediaType(result.media_type)
      ? result.media_type
      : "movie";

    const metadata: TMDBMetadata = {
      id: details.id,
      title,
      overview: details.overview,
      poster_path: details.poster_path
        ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
        : "",
      backdrop_path: details.backdrop_path
        ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
        : "",
      release_date: details.release_date || details.first_air_date,
      vote_average: details.vote_average,
      vote_count: details.vote_count,
      media_type: mediaType,
      genres: details.genres,
      cast: details.credits?.cast?.slice(0, 10).map((castMember) => ({
        id: castMember.id,
        name: castMember.name,
        character: castMember.character,
        profile_path: castMember.profile_path
          ? `https://image.tmdb.org/t/p/w185${castMember.profile_path}`
          : "",
      })),
    };

    console.log(`[TMDB] Success fetching metadata for: ${metadata.title}`);

    memoryCache.set(cacheKey, metadata, 3600);
    await kv.set(cacheKey, metadata, { ex: 60 * 60 * 24 * 7 });

    return metadata;
  } catch (error) {
    console.error("[TMDB] Error fetching metadata:", error);
    return null;
  }
}
