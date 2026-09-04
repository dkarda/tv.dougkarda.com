import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router-dom'
import { catalogCdnPosterUrl, catalogCount, catalogYear, formatPersonalScore, normalizeTitle } from '../api/catalog'
import { getShow, posterUrl, tmdbShowUrl, youtubeTrailer, yearFromDate } from '../api/tmdb'
import { EmptyState, ErrorMessage, Spinner } from '../components/Status'
import { usePersonalCatalog } from '../hooks/usePersonalCatalog'
import { hasPublicAuth } from '../lib/config'

const BACK_LABELS: Record<string, string> = {
  '/': 'Home',
  '/browse': 'Browse',
  '/ratings': 'Ratings',
  '/stats': 'Stats',
  '/watchlist': 'Watchlist',
  '/stopped': 'Stopped',
}

function backLink(from: unknown) {
  const path = typeof from === 'string' ? from : ''
  const pathname = path.split('?')[0]
  if (!pathname || pathname.startsWith('/show/')) {
    return { to: '/', label: 'Home' }
  }
  return { to: path, label: BACK_LABELS[pathname] ?? 'Back' }
}

export function ShowPage() {
  const { id } = useParams()
  const { state } = useLocation()
  const showId = Number(id)
  const back = backLink(
    state && typeof state === 'object' && 'from' in state ? state.from : undefined,
  )

  const showQuery = useQuery({
    queryKey: ['tv', showId],
    queryFn: () => getShow(showId),
    enabled: hasPublicAuth() && Number.isFinite(showId) && showId > 0,
  })

  const catalogQuery = usePersonalCatalog(hasPublicAuth())

  if (!hasPublicAuth()) {
    return (
      <EmptyState title="TMDB key required">
        <p>Add credentials to .env to load show details.</p>
      </EmptyState>
    )
  }

  if (!Number.isFinite(showId)) {
    return <EmptyState title="Invalid show">That URL is not a show id.</EmptyState>
  }

  if (showQuery.isPending) return <Spinner />
  if (showQuery.isError) return <ErrorMessage error={showQuery.error} />

  const catalogTitle =
    state && typeof state === 'object' && 'catalogTitle' in state && typeof state.catalogTitle === 'string'
      ? state.catalogTitle
      : undefined
  const show = showQuery.data
  const imdbId = show.external_ids?.imdb_id
  const yours = catalogQuery.data?.find((entry) => {
    if (entry.imdbID !== imdbId) return false
    if (!catalogTitle) return true
    return normalizeTitle(entry.Title ?? '') === normalizeTitle(catalogTitle)
  })
  const displayName = yours?.Title?.trim() || show.name
  const poster = catalogCdnPosterUrl(yours) || posterUrl(show.poster_path, 'w500')
  const trailer = youtubeTrailer(show)
  const creators =
    (show.created_by ?? []).map((person) => person.name).filter(Boolean).join(', ') ||
    show.credits?.crew
      .filter((c) => c.job === 'Creator')
      .map((c) => c.name)
      .join(', ')
  const cast = (show.credits?.cast ?? []).slice(0, 8)
  const year = (yours ? catalogYear(yours) : '') || yearFromDate(show.first_air_date)
  const runtime = show.episode_run_time?.[0]
  const seasons = yours ? catalogCount(yours.totalSeasons) : show.number_of_seasons
  const episodes = yours ? catalogCount(yours.totalEpisodes) : show.number_of_episodes

  return (
    <article className="grid gap-8 md:grid-cols-[240px_1fr]">
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        {poster ? (
          <img src={poster} alt="" className="w-full" />
        ) : (
          <div className="flex aspect-[2/3] items-center justify-center text-sm text-zinc-500">
            No poster
          </div>
        )}
      </div>
      <div className="space-y-4">
        <p>
          <Link to={back.to} className="text-sm text-zinc-400 hover:text-amber-300">
            ← {back.label}
          </Link>
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {displayName}{' '}
          {year ? <span className="text-xl font-normal text-zinc-500">({year})</span> : null}
        </h1>
        {show.tagline ? <p className="italic text-zinc-400">{show.tagline}</p> : null}
        <dl className="flex flex-wrap gap-3 text-sm">
          {yours ? (
            <div className="rounded-full bg-amber-300 px-3 py-1 font-medium text-zinc-950">
              Your rating {formatPersonalScore(yours.score)}
            </div>
          ) : null}
          <div className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300">
            TMDB {show.vote_average.toFixed(1)} ({show.vote_count} votes)
          </div>
          {seasons ? (
            <div className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300">
              {seasons} season{seasons === 1 ? '' : 's'}
            </div>
          ) : null}
          {episodes ? (
            <div className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300">
              {episodes} episode{episodes === 1 ? '' : 's'}
            </div>
          ) : null}
          {runtime ? (
            <div className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300">
              {runtime} min
            </div>
          ) : null}
        </dl>
        <p className="max-w-3xl text-sm leading-7 text-zinc-300">{show.overview}</p>
        {creators ? <p className="text-sm text-zinc-400">Created by: {creators}</p> : null}
        {show.genres?.length ? (
          <p className="text-sm text-zinc-400">{show.genres.map((g) => g.name).join(' · ')}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {trailer ? (
            <a
              href={trailer}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full bg-amber-300 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-200"
            >
              Watch trailer
            </a>
          ) : null}
          <a
            href={tmdbShowUrl(show.id)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:border-amber-300 hover:text-amber-300"
          >
            More on TMDB
          </a>
        </div>
        {cast.length > 0 ? (
          <div>
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
              Cast
            </h2>
            <ul className="flex flex-wrap gap-2 text-sm text-zinc-300">
              {cast.map((person) => (
                <li key={person.id} className="rounded-full border border-zinc-800 px-3 py-1">
                  {person.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  )
}
