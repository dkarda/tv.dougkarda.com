import { useQueries } from '@tanstack/react-query'
import { catalogCdnPosterUrl, catalogYear, listRankFor, type PersonalShow } from '../api/catalog'
import { findShowByImdbId } from '../api/tmdb'

export function useHydratedShows(
  entries: PersonalShow[],
  enabled: boolean,
  listName?: string,
) {
  const results = useQueries({
    queries: entries.map((entry) => ({
      queryKey: ['tmdb-find-tv', entry.imdbID],
      queryFn: () => findShowByImdbId(entry.imdbID as string),
      enabled: enabled && Boolean(entry.imdbID),
    })),
  })

  return entries.map((entry, index) => {
    const query = results[index]
    const show = query?.data
    const listRank = listName ? listRankFor(entry, listName) : undefined
    return {
      entry,
      show: show
        ? {
            ...show,
            name: entry.Title?.trim() || show.name,
            first_air_date: catalogYear(entry)
              ? `${catalogYear(entry)}-01-01`
              : show.first_air_date,
            rating: entry.score as number,
            own: entry.own,
            listRank,
            catalogTitle: entry.Title,
            cdnPoster: catalogCdnPosterUrl(entry) ?? undefined,
          }
        : undefined,
      isPending: query?.status === 'pending',
      isError: Boolean(query?.isError),
    }
  })
}
