import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  catalogEntryKey,
  EMPTY_CATALOG_FILTERS,
  matchesTextQuery,
  sortCatalog,
  type CatalogFilters,
  type PersonalShow,
} from '../api/catalog'
import { catalogKeysForPerson, idSet } from '../api/personCatalog'
import { getGenres } from '../api/tmdb'
import { FilterSelect, selectClass } from '../components/FilterSelect'
import { LazyShowGrid } from '../components/LazyShowGrid'
import { EmptyState, ErrorMessage, Spinner } from '../components/Status'
import { usePersonalCatalog } from '../hooks/usePersonalCatalog'
import { useTmdbGenreMatchIds } from '../hooks/useTmdbGenreMatchIds'
import { useTmdbAirYears } from '../hooks/useTmdbAirYears'
import { hasPublicAuth } from '../lib/config'

const EMPTY_SHOWS: PersonalShow[] = []
const EMPTY_STATUS_FILTERS = {
  query: '',
  genre: '',
  sort: 'title' as CatalogFilters['sort'],
}

export function StatusCatalogPage({
  status,
  title,
  description,
  emptyTitle,
  emptyBody,
}: {
  status: string
  title: string
  description: string
  emptyTitle: string
  emptyBody: string
}) {
  const enabled = hasPublicAuth()
  const catalogQuery = usePersonalCatalog(enabled)
  const [filters, setFilters] = useState(EMPTY_STATUS_FILTERS)
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(filters.query.trim())
    }, 300)
    return () => window.clearTimeout(timer)
  }, [filters.query])

  const shows = useMemo(
    () => (catalogQuery.data ?? EMPTY_SHOWS).filter((show) => show.status === status),
    [catalogQuery.data, status],
  )
  const genresQuery = useQuery({
    queryKey: ['genres-tv'],
    queryFn: getGenres,
    enabled,
  })
  const personQuery = useQuery({
    queryKey: ['tmdb-person-catalog-imdb', debouncedQuery.toLowerCase(), status, shows.length],
    queryFn: () => catalogKeysForPerson(debouncedQuery, shows),
    enabled: enabled && debouncedQuery.length >= 2 && shows.length > 0,
    staleTime: 30 * 60 * 1000,
  })
  const genreScan = useTmdbGenreMatchIds(shows, filters.genre)
  const yearScan = useTmdbAirYears(
    shows,
    filters.sort === 'year-desc' || filters.sort === 'year-asc',
  )

  const visible = useMemo(() => {
    const byGenre = filters.genre
      ? shows.filter((show) => genreScan.matchIds.has(catalogEntryKey(show)))
      : shows
    const needle = filters.query.trim()
    const personKeys = idSet(personQuery.data)
    const hits = needle
      ? byGenre.filter((show) => {
          if (matchesTextQuery(show, needle)) return true
          return personKeys.has(catalogEntryKey(show))
        })
      : byGenre
    return sortCatalog(hits, { ...EMPTY_CATALOG_FILTERS, sort: filters.sort }, yearScan.years)
  }, [shows, filters, genreScan.matchIds, personQuery.data, yearScan.years])

  const filtersActive =
    filters.query.trim() !== '' || filters.genre !== '' || filters.sort !== 'title'

  if (!enabled) {
    return (
      <EmptyState title="Add your TMDB credentials">
        <p>
          Copy <code className="rounded bg-zinc-800 px-1">.env.example</code> to{' '}
          <code className="rounded bg-zinc-800 px-1">.env</code> and set{' '}
          <code className="rounded bg-zinc-800 px-1">VITE_TMDB_API_KEY</code> or{' '}
          <code className="rounded bg-zinc-800 px-1">VITE_TMDB_ACCESS_TOKEN</code>. Restart
          the dev server after saving.
        </p>
      </EmptyState>
    )
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-zinc-400">{description}</p>
      </div>

      {catalogQuery.isSuccess && shows.length > 0 ? (
        <form
          className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="flex flex-col gap-1 text-xs text-zinc-400 sm:col-span-2">
            Search
            <input
              value={filters.query}
              onChange={(event) =>
                setFilters((current) => ({ ...current, query: event.target.value }))
              }
              className={selectClass}
              placeholder="Title, creator, or actor"
            />
          </label>
          <FilterSelect
            label="Genre"
            value={filters.genre}
            onChange={(genre) => setFilters((current) => ({ ...current, genre }))}
            options={(genresQuery.data?.genres ?? []).map((genre) => ({
              value: String(genre.id),
              label: genre.name,
            }))}
          />
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Sort
            <select
              value={filters.sort}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  sort: event.target.value as CatalogFilters['sort'],
                }))
              }
              className={selectClass}
            >
              <option value="title">Title A-Z</option>
              <option value="year-desc">Year newest</option>
              <option value="year-asc">Year oldest</option>
            </select>
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="button"
              className="rounded-full border border-zinc-600 px-4 py-2 text-sm disabled:opacity-40"
              disabled={!filtersActive}
              onClick={() => setFilters(EMPTY_STATUS_FILTERS)}
            >
              Clear filters
            </button>
            <p className="text-sm text-zinc-400">
              Showing {visible.length} of {shows.length}
              {genreScan.scanning
                ? ` · matching genre ${genreScan.scanned}/${genreScan.total}`
                : ''}
              {yearScan.scanning
                ? ` · reading years ${yearScan.scanned}/${yearScan.total}`
                : ''}
            </p>
          </div>
        </form>
      ) : null}

      {catalogQuery.isPending ? <Spinner /> : null}
      {catalogQuery.isError ? <ErrorMessage error={catalogQuery.error} /> : null}
      {catalogQuery.isSuccess && shows.length === 0 ? (
        <EmptyState title={emptyTitle}>
          <p>{emptyBody}</p>
        </EmptyState>
      ) : null}
      {catalogQuery.isSuccess && shows.length > 0 && visible.length === 0 && genreScan.scanning ? (
        <Spinner />
      ) : null}
      {catalogQuery.isSuccess && shows.length > 0 && visible.length === 0 && !genreScan.scanning ? (
        <EmptyState title="No matches">
          <p>Nothing in this list fits those filters. Clear them or pick another value.</p>
        </EmptyState>
      ) : null}
      {visible.length > 0 ? <LazyShowGrid entries={visible} /> : null}
    </section>
  )
}

export function WatchlistPage() {
  return (
    <StatusCatalogPage
      status="unwatched"
      title="Watchlist"
      description="Shows in your catalog marked unwatched."
      emptyTitle="Watchlist is empty"
      emptyBody="Nothing in the catalog is marked unwatched yet."
    />
  )
}

export function StoppedPage() {
  return (
    <StatusCatalogPage
      status="stopped"
      title="Stopped"
      description="Shows you started and then stopped."
      emptyTitle="Nothing stopped"
      emptyBody="Nothing in the catalog is marked stopped yet."
    />
  )
}
