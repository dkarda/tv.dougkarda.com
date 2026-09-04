import { catalogCount, catalogGenres, PERSONAL_SHOW_LIMIT } from '../api/catalog'
import { EmptyState, ErrorMessage, Spinner } from '../components/Status'
import { usePersonalCatalog } from '../hooks/usePersonalCatalog'

export function StatsPage() {
  const catalogQuery = usePersonalCatalog(true)

  if (catalogQuery.isPending) return <Spinner />
  if (catalogQuery.isError) return <ErrorMessage error={catalogQuery.error} />

  const shows = catalogQuery.data ?? []
  if (shows.length === 0) {
    return (
      <EmptyState title="No stats yet">
        <p>No catalog titles were found.</p>
      </EmptyState>
    )
  }

  const scored = shows.filter((show) => typeof show.score === 'number' && show.score > 0)
  const avg =
    scored.length > 0
      ? scored.reduce((sum, show) => sum + (show.score ?? 0), 0) / scored.length
      : 0
  const histogram = Array.from({ length: 10 }, (_, i) => {
    const score = i + 1
    return { score, count: shows.filter((show) => Math.round(show.score ?? 0) === score).length }
  })
  const maxBar = Math.max(...histogram.map((row) => row.count), 1)
  const genreCounts = new Map<string, number>()
  for (const show of shows) {
    for (const name of catalogGenres(show)) {
      genreCounts.set(name, (genreCounts.get(name) ?? 0) + 1)
    }
  }
  const genreRows = [...genreCounts.entries()].sort((a, b) => b[1] - a[1])
  const seasons = shows.reduce((sum, show) => sum + catalogCount(show.totalSeasons), 0)
  const episodes = shows.reduce((sum, show) => sum + catalogCount(show.totalEpisodes), 0)
  const byStatus = (status: string) => shows.filter((show) => show.status === status).length

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Stats</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Computed from your catalog JSON (no TMDB lookups). Capped at {PERSONAL_SHOW_LIMIT}{' '}
          titles while testing.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Shows" value={String(shows.length)} />
        <StatCard label="Average score" value={scored.length ? avg.toFixed(1) : '—'} />
        <StatCard label="Genres touched" value={String(genreRows.length)} />
        <StatCard label="Seasons" value={String(seasons)} />
        <StatCard label="Episodes" value={String(episodes)} />
        <StatCard label="Owned" value={String(shows.filter((show) => show.own === 'y').length)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Watched" value={String(byStatus('watched'))} />
        <StatCard label="Unwatched" value={String(byStatus('unwatched'))} />
        <StatCard label="Stopped" value={String(byStatus('stopped'))} />
        <StatCard label="To watch" value={String(byStatus('towatch'))} />
      </div>
      <div>
        <h2 className="mb-3 text-lg font-medium">Rating histogram</h2>
        <ul className="space-y-2">
          {histogram.map((row) => (
            <li key={row.score} className="flex items-center gap-3 text-sm">
              <span className="w-8 text-zinc-400">{row.score}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-amber-300"
                  style={{ width: `${(row.count / maxBar) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right text-zinc-400">{row.count}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="mb-3 text-lg font-medium">Genre breakdown</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {genreRows.map(([name, count]) => (
            <li
              key={name}
              className="flex justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm"
            >
              <span>{name}</span>
              <span className="text-zinc-400">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-amber-200">{value}</p>
    </div>
  )
}
