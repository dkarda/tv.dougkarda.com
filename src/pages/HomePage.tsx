import { useMemo } from 'react'
import {
  catalogEntryKey,
  DAILY_SUGGESTION_COUNT,
  DAILY_SUGGESTION_MIN_SCORE,
  pickDailySuggestions,
} from '../api/catalog'
import { LazyShowGrid } from '../components/LazyShowGrid'
import { EmptyState, ErrorMessage, Spinner } from '../components/Status'
import { usePersonalCatalog } from '../hooks/usePersonalCatalog'
import { hasPublicAuth } from '../lib/config'

export function HomePage() {
  const enabled = hasPublicAuth()
  const catalogQuery = usePersonalCatalog(enabled)
  const shows = catalogQuery.data ?? []
  const suggestions = useMemo(() => pickDailySuggestions(shows), [shows])

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

  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Suggestions of the Day!</h1>
        <h2 className="text-2xl font-semibold tracking-tight">{todayLabel}</h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Ten random shows I&apos;ve scored {DAILY_SUGGESTION_MIN_SCORE} or higher. Come back
          tomorrow for a new lineup.
        </p>
      </div>
      {catalogQuery.isPending ? <Spinner /> : null}
      {catalogQuery.isError ? <ErrorMessage error={catalogQuery.error} /> : null}
      {catalogQuery.isSuccess && suggestions.length === 0 ? (
        <EmptyState title="No suggestions yet">
          <p>
            Need at least one title scored {DAILY_SUGGESTION_MIN_SCORE}+ with an IMDb id.
          </p>
        </EmptyState>
      ) : null}
      {suggestions.length > 0 ? (
        <LazyShowGrid
          key={suggestions.map((show) => catalogEntryKey(show)).join(',')}
          entries={suggestions}
        />
      ) : null}
      {suggestions.length > 0 && suggestions.length < DAILY_SUGGESTION_COUNT ? (
        <p className="text-sm text-zinc-500">
          Only {suggestions.length} titles met the score cutoff today.
        </p>
      ) : null}
    </section>
  )
}
