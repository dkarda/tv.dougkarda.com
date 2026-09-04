import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { discoverShows, getGenres, searchShows } from '../api/tmdb'
import { ShowGrid } from '../components/ShowCard'
import { EmptyState, ErrorMessage, Spinner } from '../components/Status'
import { hasPublicAuth } from '../lib/config'

const SORTS = [
  { value: 'popularity.desc', label: 'Popularity' },
  { value: 'vote_average.desc', label: 'TMDB rating' },
  { value: 'first_air_date.desc', label: 'Newest' },
]

export function BrowsePage() {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [genreId, setGenreId] = useState('')
  const [year, setYear] = useState('')
  const [sortBy, setSortBy] = useState('popularity.desc')
  const [page, setPage] = useState(1)

  const genresQuery = useQuery({
    queryKey: ['genres-tv'],
    queryFn: getGenres,
    enabled: hasPublicAuth(),
  })

  const searching = submitted.trim().length > 0

  const listQuery = useQuery({
    queryKey: searching
      ? ['search-tv', submitted, page]
      : ['discover-tv', genreId, year, sortBy, page],
    queryFn: () =>
      searching
        ? searchShows(submitted, page)
        : discoverShows({ page, genreId, year, sortBy }),
    enabled: hasPublicAuth(),
  })

  const years = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: 50 }, (_, i) => String(now - i))
  }, [])

  if (!hasPublicAuth()) {
    return (
      <EmptyState title="TMDB key required">
        <p>Add credentials to .env to search and filter shows.</p>
      </EmptyState>
    )
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Browse The Movie Database</h1>
      <form
        className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault()
          setPage(1)
          setSubmitted(query.trim())
        }}
      >
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Search
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            placeholder="Title"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Genre
          <select
            value={genreId}
            disabled={searching}
            onChange={(e) => {
              setGenreId(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            <option value="">All</option>
            {(genresQuery.data?.genres ?? []).map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Year
          <select
            value={year}
            disabled={searching}
            onChange={(e) => {
              setYear(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            <option value="">Any</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Sort
          <select
            value={sortBy}
            disabled={searching}
            onChange={(e) => {
              setSortBy(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="rounded-full bg-amber-300 px-4 py-2 text-sm font-medium text-zinc-950"
          >
            Search
          </button>
          <button
            type="button"
            className="rounded-full border border-zinc-600 px-4 py-2 text-sm"
            onClick={() => {
              setQuery('')
              setSubmitted('')
              setGenreId('')
              setYear('')
              setSortBy('popularity.desc')
              setPage(1)
            }}
          >
            Clear search
          </button>
        </div>
      </form>
      {searching ? (
        <p className="text-sm text-zinc-400">
          Showing search results. Clear search to use genre, year, and sort filters.
        </p>
      ) : null}
      {listQuery.isPending ? <Spinner /> : null}
      {listQuery.isError ? <ErrorMessage error={listQuery.error} /> : null}
      {listQuery.data ? <ShowGrid shows={listQuery.data.results} /> : null}
      {listQuery.data && listQuery.data.total_pages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="rounded-full border border-zinc-600 px-3 py-1 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="text-zinc-400">
            Page {page} of {listQuery.data.total_pages}
          </span>
          <button
            type="button"
            className="rounded-full border border-zinc-600 px-3 py-1 disabled:opacity-40"
            disabled={page >= listQuery.data.total_pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  )
}
