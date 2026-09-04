/** Live file is television.json (the path without .json 404s). */
export const PERSONAL_CATALOG_URL = 'https://assets.dougkarda.com/data/television.json'

/** Cap TMDB lookups while catalog import is under test. Raise this after QA. */
export const PERSONAL_SHOW_LIMIT = 10000

/**
 * Cards (and TMDB finds) loaded per scroll page. 24 fills about 5 rows on a
 * 5-column desktop grid, or 12 rows on a phone, without a huge first paint.
 */
export const SHOW_PAGE_SIZE = 24

/** TMDB ~40 requests / 10s; stay well under that while hydrating a page. */
export const TMDB_FIND_CONCURRENCY = 4

export type PersonalShow = {
  note?: string
  Title?: string
  Year?: string
  Rated?: string
  Genre?: string
  Director?: string
  Writer?: string
  Actors?: string
  imdbID?: string
  tmdbID?: string
  score?: number
  status?: string
  own?: string
  totalSeasons?: string
  totalEpisodes?: string
  poster?: string
  collections?: { collection: string }[]
  toplists?: { listName: string; listRank?: number }[]
}

export async function fetchPersonalCatalog(): Promise<PersonalShow[]> {
  const res = await fetch(PERSONAL_CATALOG_URL)
  if (!res.ok) {
    throw new Error(`Personal catalog request failed (${res.status})`)
  }
  const data: unknown = await res.json()
  if (!Array.isArray(data)) {
    throw new Error('Personal catalog JSON is not an array')
  }
  return data as PersonalShow[]
}

export function catalogImdbId(show: Pick<PersonalShow, 'imdbID'>): string | undefined {
  const id = show.imdbID?.trim()
  if (!id || id === 'N/A' || !id.startsWith('tt')) return undefined
  return id
}

export function catalogTmdbId(show: Pick<PersonalShow, 'tmdbID'>): string | undefined {
  const id = show.tmdbID?.trim()
  if (!id || id === 'N/A' || !/^\d+$/.test(id)) return undefined
  return id
}

export function hasCatalogLookupId(show: PersonalShow) {
  return Boolean(catalogImdbId(show) || catalogTmdbId(show))
}

export function pickTestCatalogShows(catalog: PersonalShow[]): PersonalShow[] {
  return catalog
    .filter(
      (show) =>
        typeof show.Title === 'string' &&
        show.Title.trim().length > 0 &&
        hasCatalogLookupId(show),
    )
    .slice(0, PERSONAL_SHOW_LIMIT)
}

export function catalogGenres(show: PersonalShow): string[] {
  const names = (show.Genre ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
  return names.length > 0 ? names : ['Uncategorized']
}

export function catalogYear(show: PersonalShow): string {
  const match = show.Year?.match(/\d{4}/)
  return match?.[0] ?? ''
}

const CDN_POSTER_BASE = 'https://assets.dougkarda.com/images/posters'

export function usesCatalogCdnPoster(show: Pick<PersonalShow, 'poster' | 'collections'>) {
  if (show.poster?.startsWith('ahs-')) return true
  return (show.collections ?? []).some(
    (item) => item.collection === 'AHS' || item.collection === 'American Horror Story',
  )
}

/** Season-specific posters for anthology rows that share one IMDb id. */
export function catalogCdnPosterUrl(show: PersonalShow | null | undefined) {
  if (!show || !usesCatalogCdnPoster(show)) return null
  const slug = show.poster?.trim()
  const year = catalogYear(show)
  if (!slug || !year) return null
  return `${CDN_POSTER_BASE}/${encodeURIComponent(slug)}-${year}-poster.webp`
}

export function catalogCount(value: string | undefined) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function formatPersonalScore(score: number | null | undefined) {
  if (typeof score !== 'number' || score === 0) return 'TBD'
  return `${score}/10`
}

export function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '')
}

/** Anthology seasons often share one IMDb id; title keeps the row unique. */
export function catalogEntryKey(show: Pick<PersonalShow, 'Title' | 'imdbID' | 'tmdbID'>) {
  const imdb = catalogImdbId(show)
  const tmdb = catalogTmdbId(show)
  const id = imdb ?? (tmdb != null ? `tmdb:${tmdb}` : '')
  return `${id}::${normalizeTitle(show.Title ?? '')}`
}

export function matchesTextQuery(show: PersonalShow, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const haystack = [
    show.Title,
    show.Director,
    show.Writer,
    show.Actors,
    ...(show.toplists ?? []).map((item) => item.listName),
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase()
  return haystack.includes(needle)
}

export function listRankFor(show: PersonalShow, listName: string) {
  const rank = show.toplists?.find((item) => item.listName === listName)?.listRank
  return typeof rank === 'number' ? rank : undefined
}

export type CatalogFilters = {
  query: string
  genre: string
  year: string
  collection: string
  toplist: string
  own: string
  status: string
  sort: 'title' | 'score-desc' | 'score-asc' | 'year-desc' | 'year-asc'
}

export const EMPTY_CATALOG_FILTERS: CatalogFilters = {
  query: '',
  genre: '',
  year: '',
  collection: '',
  toplist: '',
  own: '',
  status: '',
  sort: 'title',
}

function uniqueSorted(values: Iterable<string>) {
  return [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b))
}

export function catalogFilterOptions(shows: PersonalShow[]) {
  const genres = new Set<string>()
  const years = new Set<string>()
  const collections = new Set<string>()
  const toplistCounts = new Map<string, number>()
  const owns = new Set<string>()

  for (const show of shows) {
    for (const genre of catalogGenres(show)) genres.add(genre)
    const year = catalogYear(show)
    if (year) years.add(year)
    if (show.own) owns.add(show.own)
    for (const item of show.collections ?? []) {
      if (item.collection) collections.add(item.collection)
    }
    for (const item of show.toplists ?? []) {
      if (item.listName && item.listName.toLowerCase() !== 'default') {
        toplistCounts.set(item.listName, (toplistCounts.get(item.listName) ?? 0) + 1)
      }
    }
  }

  return {
    genres: uniqueSorted(genres),
    years: [...years].sort((a, b) => Number(b) - Number(a)),
    collections: uniqueSorted(collections),
    toplists: [...toplistCounts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count })),
    owns: uniqueSorted(owns),
  }
}

export function filterCatalog(shows: PersonalShow[], filters: CatalogFilters) {
  const needle = filters.query.trim().toLowerCase()
  const filtered = shows.filter((show) => {
    if (needle && !matchesTextQuery(show, needle)) return false
    if (filters.genre && !catalogGenres(show).includes(filters.genre)) return false
    if (filters.year && catalogYear(show) !== filters.year) return false
    if (filters.own && show.own !== filters.own) return false
    if (filters.status) {
      const status = (show.status ?? '').trim().toLowerCase()
      if (filters.status === 'stopped') {
        if (!status.startsWith('stopped')) return false
      } else if (status !== filters.status) {
        return false
      }
    }
    if (filters.collection) {
      const names = (show.collections ?? []).map((item) => item.collection)
      if (!names.includes(filters.collection)) return false
    }
    if (filters.toplist) {
      const names = (show.toplists ?? []).map((item) => item.listName)
      if (!names.includes(filters.toplist)) return false
    }
    return true
  })

  return sortCatalog(filtered, filters)
}

function sortYear(show: PersonalShow, airYearByKey?: Map<string, string>) {
  const fromTmdb = airYearByKey?.get(catalogEntryKey(show))
  return Number(fromTmdb || catalogYear(show) || 0)
}

export function sortCatalog(
  shows: PersonalShow[],
  filters: CatalogFilters,
  airYearByKey?: Map<string, string>,
) {
  const sorted = [...shows]
  if (filters.toplist) {
    sorted.sort((a, b) => {
      const rankA = listRankFor(a, filters.toplist) ?? -Infinity
      const rankB = listRankFor(b, filters.toplist) ?? -Infinity
      return rankB - rankA || (a.Title ?? '').localeCompare(b.Title ?? '')
    })
  } else if (filters.sort === 'score-desc') {
    sorted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.Title ?? '').localeCompare(b.Title ?? ''))
  } else if (filters.sort === 'score-asc') {
    sorted.sort((a, b) => (a.score ?? 0) - (b.score ?? 0) || (a.Title ?? '').localeCompare(b.Title ?? ''))
  } else if (filters.sort === 'year-desc') {
    sorted.sort(
      (a, b) =>
        sortYear(b, airYearByKey) - sortYear(a, airYearByKey) ||
        (a.Title ?? '').localeCompare(b.Title ?? ''),
    )
  } else if (filters.sort === 'year-asc') {
    sorted.sort((a, b) => {
      const yearA =         sortYear(a, airYearByKey) || Infinity
      const yearB = sortYear(b, airYearByKey) || Infinity
      return yearA - yearB || (a.Title ?? '').localeCompare(b.Title ?? '')
    })
  } else {
    sorted.sort((a, b) => (a.Title ?? '').localeCompare(b.Title ?? ''))
  }
  return sorted
}

export const DAILY_SUGGESTION_COUNT = 10
export const DAILY_SUGGESTION_MIN_SCORE = 7
const DAILY_SUGGESTION_KEY = 'tv-daily-suggestions'

export function localDateKey(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function hashString(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleWithSeed<T>(items: T[], seed: string) {
  const rng = mulberry32(hashString(seed))
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function readStoredIds(today: string): string[] | null {
  try {
    const raw = localStorage.getItem(DAILY_SUGGESTION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { date?: string; ids?: string[] }
    if (parsed.date !== today || !Array.isArray(parsed.ids)) return null
    return parsed.ids.filter((id) => typeof id === 'string')
  } catch {
    return null
  }
}

function writeStoredIds(today: string, ids: string[]) {
  try {
    localStorage.setItem(DAILY_SUGGESTION_KEY, JSON.stringify({ date: today, ids }))
  } catch {
    // Ignore quota / private-mode failures; date-seeded shuffle still holds for the day.
  }
}

export function pickDailySuggestions(
  shows: PersonalShow[],
  count = DAILY_SUGGESTION_COUNT,
): PersonalShow[] {
  const pool = shows.filter(
    (show) =>
      typeof show.score === 'number' &&
      show.score >= DAILY_SUGGESTION_MIN_SCORE &&
      hasCatalogLookupId(show),
  )
  if (pool.length === 0) return []

  const today = localDateKey()
  const byKey = new Map(pool.map((show) => [catalogEntryKey(show), show]))
  const stored = readStoredIds(today)
    ?.map((id) => byKey.get(id))
    .filter((show): show is PersonalShow => Boolean(show))

  if (stored && stored.length > 0) {
    if (stored.length >= Math.min(count, pool.length)) {
      return stored.slice(0, count)
    }
  }

  const picked = shuffleWithSeed(pool, today).slice(0, Math.min(count, pool.length))
  writeStoredIds(
    today,
    picked.map((show) => catalogEntryKey(show)),
  )
  return picked
}
