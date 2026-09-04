import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  catalogEntryKey,
  catalogFilterOptions,
  EMPTY_CATALOG_FILTERS,
  filterCatalog,
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

export function RatingsPage() {
  const enabled = hasPublicAuth()
  const catalogQuery = usePersonalCatalog(enabled)
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_CATALOG_FILTERS)
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(filters.query.trim())
    }, 300)
    return () => window.clearTimeout(timer)
  }, [filters.query])

  const shows = useMemo(
    () =>
      (catalogQuery.data ?? EMPTY_SHOWS).filter((show) => show.status !== 'towatch'),
    [catalogQuery.data],
  )
  const options = useMemo(() => catalogFilterOptions(shows), [shows])
  const genresQuery = useQuery({
    queryKey: ['genres-tv'],
    queryFn: getGenres,
    enabled,
  })
  const personQuery = useQuery({
    queryKey: ['tmdb-person-catalog-imdb', debouncedQuery.toLowerCase(), shows.length],
    queryFn: () => catalogKeysForPerson(debouncedQuery, shows),
    enabled: enabled && debouncedQuery.length >= 2 && shows.length > 0,
    staleTime: 30 * 60 * 1000,
  })
  const constrained = useMemo(
    () =>
      filterCatalog(shows, {
        ...filters,
        query: '',
        genre: '',
        sort: 'title',
      }),
    [shows, filters.collection, filters.own, filters.toplist, filters.year],
  )
  const genreScan = useTmdbGenreMatchIds(constrained, filters.genre)
  const yearScan = useTmdbAirYears(
    constrained,
    filters.sort === 'year-desc' || filters.sort === 'year-asc',
  )

  const visible = useMemo(() => {
    const byGenre = filters.genre
      ? constrained.filter((show) => genreScan.matchIds.has(catalogEntryKey(show)))
      : constrained
    const needle = filters.query.trim()
    const personKeys = idSet(personQuery.data)
    const hits = needle
      ? byGenre.filter((show) => {
          if (matchesTextQuery(show, needle)) return true
          return personKeys.has(catalogEntryKey(show))
        })
      : byGenre
    return sortCatalog(hits, filters, yearScan.years)
  }, [constrained, filters, genreScan.matchIds, personQuery.data, yearScan.years])
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(EMPTY_CATALOG_FILTERS)

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
        <h1 className="text-3xl font-semibold tracking-tight">TheDoug ratings</h1>
      </div>

      {catalogQuery.isSuccess ? (
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
          <FilterSelect
            label="Collection"
            value={filters.collection}
            onChange={(collection) => setFilters((current) => ({ ...current, collection }))}
            options={options.collections.map((value) => ({ value, label: value }))}
          />
          <FilterSelect
            label="Top list"
            value={filters.toplist}
            onChange={(toplist) => setFilters((current) => ({ ...current, toplist }))}
            options={options.toplists.map((list) => ({
              value: list.name,
              label: `Top ${list.count} ${list.name}`,
            }))}
          />
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Sort
            <select
              value={filters.toplist ? 'list-rank' : filters.sort}
              disabled={Boolean(filters.toplist)}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  sort: event.target.value as CatalogFilters['sort'],
                }))
              }
              className={`${selectClass} disabled:opacity-50`}
            >
              {filters.toplist ? (
                <option value="list-rank">List rank high–low</option>
              ) : null}
              <option value="title">Title A-Z</option>
              <option value="score-desc">Score high-low</option>
              <option value="score-asc">Score low-high</option>
              <option value="year-desc">Year newest</option>
              <option value="year-asc">Year oldest</option>
            </select>
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="button"
              className="rounded-full border border-zinc-600 px-4 py-2 text-sm disabled:opacity-40"
              disabled={!filtersActive}
              onClick={() => setFilters(EMPTY_CATALOG_FILTERS)}
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
        <EmptyState title="No titles yet">
          <p>Could not find catalog entries with a title and an IMDb or TMDB id.</p>
        </EmptyState>
      ) : null}
      {catalogQuery.isSuccess && shows.length > 0 && visible.length === 0 && genreScan.scanning ? (
        <Spinner />
      ) : null}
      {catalogQuery.isSuccess && shows.length > 0 && visible.length === 0 && !genreScan.scanning ? (
        <EmptyState title="No matches">
          <p>Nothing in this batch fits those filters. Clear them or pick another value.</p>
        </EmptyState>
      ) : null}
      {visible.length > 0 ? (
        <LazyShowGrid entries={visible} listName={filters.toplist || undefined} />
      ) : null}
    </section>
  )
}
