import { Link, useLocation } from 'react-router-dom'
import { formatPersonalScore } from '../api/catalog'
import { posterUrl, yearFromDate, type Show } from '../api/tmdb'

type Props = {
  show: Show & {
    rating?: number
    own?: string
    listRank?: number
    catalogTitle?: string
    cdnPoster?: string
  }
}

export function ShowCard({ show }: Props) {
  const location = useLocation()
  const poster = show.cdnPoster || posterUrl(show.poster_path, 'w342')
  const year = yearFromDate(show.first_air_date)
  const owned = show.own === 'y'

  return (
    <Link
      to={`/show/${show.id}`}
      state={{ from: `${location.pathname}${location.search}`, catalogTitle: show.catalogTitle }}
      className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 transition hover:border-amber-300/50 hover:shadow-lg hover:shadow-amber-300/5"
    >
      <div className="relative aspect-[2/3] bg-zinc-800">
        {poster ? (
          <img
            src={poster}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center text-xs text-zinc-500">
            No poster
          </div>
        )}
        {show.listRank != null ? (
          <span
            className="absolute left-2 top-2 rounded-lg bg-white px-3 py-1 text-2xl font-bold leading-none tabular-nums text-zinc-950"
            style={{
              filter: 'drop-shadow(0 2px 2px var(--tw-shadow-color, rgba(0,0,0,0.85)))',
            }}
            title={`List rank ${show.listRank}`}
          >
            {show.listRank}
          </span>
        ) : null}
        {owned ? (
          <span
            className="absolute right-2 top-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
            title="Owned"
            aria-label="Owned"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 fill-amber-300"
              aria-hidden="true"
            >
              <path d="M12 2.5 14.94 8.4l6.56.95-4.75 4.63 1.12 6.54L12 17.77 6.13 20.52l1.12-6.54L2.5 9.35l6.56-.95L12 2.5Z" />
            </svg>
          </span>
        ) : null}
      </div>
      <div className="space-y-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-white">{show.name}</h3>
        <p className="text-xs text-zinc-400">{year || '—'}</p>
        <p className="text-xs text-zinc-400">
          {[
            show.rating != null ? `DK score ${formatPersonalScore(show.rating)}` : null,
            Number.isFinite(show.vote_average)
              ? `TMDB score ${show.vote_average.toFixed(1)}`
              : null,
          ]
            .filter(Boolean)
            .join(' ··· ')}
        </p>
      </div>
    </Link>
  )
}

export function ShowGrid({
  shows,
}: {
  shows: Array<
    Show & {
      rating?: number
      own?: string
      listRank?: number
      catalogTitle?: string
      cdnPoster?: string
    }
  >
}) {
  if (shows.length === 0) {
    return <p className="text-sm text-zinc-400">No shows to show.</p>
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {shows.map((show) => (
        <li key={show.id}>
          <ShowCard show={show} />
        </li>
      ))}
    </ul>
  )
}
