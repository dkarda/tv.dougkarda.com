import { tmdbEnv } from '../lib/config'
import {
  catalogImdbId,
  catalogTmdbId,
  normalizeTitle,
  TMDB_FIND_CONCURRENCY,
  type PersonalShow,
} from './catalog'

const API_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'

export type PosterSize = 'w185' | 'w342' | 'w500' | 'original'

export type Show = {
  id: number
  name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  vote_average: number
  vote_count: number
  genre_ids?: number[]
  popularity?: number
}

export type Genre = {
  id: number
  name: string
}

export type Paginated<T> = {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

export type ShowDetails = Show & {
  tagline: string
  genres: Genre[]
  number_of_seasons: number | null
  number_of_episodes: number | null
  episode_run_time?: number[]
  created_by?: { id: number; name: string }[]
  external_ids?: { imdb_id?: string | null }
  credits?: {
    cast: { id: number; name: string; character: string; profile_path: string | null }[]
    crew: { id: number; name: string; job: string }[]
  }
  videos?: {
    results: { id: string; key: string; name: string; site: string; type: string }[]
  }
}

export function posterUrl(
  path: string | null | undefined,
  size: PosterSize = 'w342',
) {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}

export function yearFromDate(date: string | undefined) {
  if (!date) return ''
  return date.slice(0, 4)
}

export function tmdbShowUrl(id: number) {
  return `https://www.themoviedb.org/tv/${id}`
}

export class TmdbError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const { apiKey, token } = tmdbEnv()
  if (!apiKey && !token) {
    throw new Error(
      'Missing TMDB credentials. Add VITE_TMDB_API_KEY or VITE_TMDB_ACCESS_TOKEN to .env',
    )
  }

  const url = new URL(`${API_BASE}${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }
  if (!token && apiKey) {
    url.searchParams.set('api_key', apiKey)
  }

  const headers: HeadersInit = { Accept: 'application/json' }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new TmdbError(`TMDB request failed (${res.status})`, res.status)
  }
  return (await res.json()) as T
}

let activeFinds = 0
const findWaiters: Array<() => void> = []

async function withFindSlot<T>(fn: () => Promise<T>): Promise<T> {
  while (activeFinds >= TMDB_FIND_CONCURRENCY) {
    await new Promise<void>((resolve) => {
      findWaiters.push(resolve)
    })
  }
  activeFinds += 1
  try {
    return await fn()
  } finally {
    activeFinds -= 1
    findWaiters.shift()?.()
  }
}

export function searchShows(query: string, page = 1) {
  return tmdbFetch<Paginated<Show>>('/search/tv', {
    query,
    include_adult: 'false',
    page,
  })
}

export function discoverShows(options: {
  page?: number
  genreId?: string
  year?: string
  sortBy?: string
}) {
  return tmdbFetch<Paginated<Show>>('/discover/tv', {
    include_adult: 'false',
    language: 'en-US',
    page: options.page ?? 1,
    with_genres: options.genreId,
    first_air_date_year: options.year,
    sort_by: options.sortBy || 'popularity.desc',
  })
}

export function getShow(id: number) {
  return tmdbFetch<ShowDetails>(`/tv/${id}`, {
    append_to_response: 'credits,videos,external_ids',
    language: 'en-US',
  })
}

export function getGenres() {
  return tmdbFetch<{ genres: Genre[] }>('/genre/tv/list', {
    language: 'en-US',
  })
}

export async function findShowByImdbId(imdbId: string) {
  return withFindSlot(async () => {
    const data = await tmdbFetch<{ tv_results: Show[] }>(`/find/${imdbId}`, {
      external_source: 'imdb_id',
      language: 'en-US',
    })
    return data.tv_results[0] ?? null
  })
}

export async function getShowByTmdbId(id: string): Promise<Show | null> {
  return withFindSlot(async () => {
    try {
      const data = await tmdbFetch<ShowDetails>(`/tv/${id}`, { language: 'en-US' })
      return {
        id: data.id,
        name: data.name,
        overview: data.overview,
        poster_path: data.poster_path,
        backdrop_path: data.backdrop_path,
        first_air_date: data.first_air_date,
        vote_average: data.vote_average,
        vote_count: data.vote_count,
        genre_ids: data.genre_ids ?? data.genres?.map((genre) => genre.id),
        popularity: data.popularity,
      }
    } catch (error) {
      if (error instanceof TmdbError && error.status === 404) return null
      throw error
    }
  })
}

export function catalogShowQueryKey(entry: PersonalShow) {
  const imdb = catalogImdbId(entry)
  if (imdb) return ['tmdb-find-tv', imdb] as const
  return ['tmdb-tv', catalogTmdbId(entry) ?? ''] as const
}

export function hydrateCatalogShow(entry: PersonalShow) {
  const imdb = catalogImdbId(entry)
  if (imdb) return findShowByImdbId(imdb)
  const tmdb = catalogTmdbId(entry)
  if (tmdb) return getShowByTmdbId(tmdb)
  return Promise.resolve(null)
}

type PersonCredit = {
  id?: number
  name?: string
  original_name?: string
  job?: string
}

function addPersonCredit(
  row: PersonCredit,
  tmdbIds: Set<number>,
  titleKeys: Set<string>,
) {
  if (typeof row.id === 'number') tmdbIds.add(row.id)
  if (row.name) titleKeys.add(normalizeTitle(row.name))
  if (row.original_name) titleKeys.add(normalizeTitle(row.original_name))
}

export async function personCreditIndex(query: string) {
  const data = await tmdbFetch<{ results: { id: number }[] }>('/search/person', {
    query,
    include_adult: 'false',
    language: 'en-US',
  })
  const people = data.results.slice(0, 2)
  const tmdbIds = new Set<number>()
  const titleKeys = new Set<string>()

  for (const person of people) {
    const credits = await tmdbFetch<{
      cast?: PersonCredit[]
      crew?: PersonCredit[]
    }>(`/person/${person.id}/tv_credits`, { language: 'en-US' })

    for (const row of credits.cast ?? []) addPersonCredit(row, tmdbIds, titleKeys)
    for (const row of credits.crew ?? []) {
      if (row.job !== 'Creator' && row.job !== 'Director' && row.job !== 'Writer') continue
      addPersonCredit(row, tmdbIds, titleKeys)
    }
  }

  return { ids: [...tmdbIds], titleKeys: [...titleKeys] }
}

export function youtubeTrailer(details: ShowDetails) {
  const videos = details.videos?.results ?? []
  const trailer =
    videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ??
    videos.find((v) => v.site === 'YouTube')
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null
}
