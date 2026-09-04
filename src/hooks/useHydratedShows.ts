import { useQueries } from '@tanstack/react-query'
import {
  catalogCdnPosterUrl,
  catalogYear,
  hasCatalogLookupId,
  listRankFor,
  type PersonalShow,
} from '../api/catalog'
import { catalogShowQueryKey, hydrateCatalogShow } from '../api/tmdb'

export function useHydratedShows(
  entries: PersonalShow[],
  enabled: boolean,
  listName?: string,
) {
  const results = useQueries({
    queries: entries.map((entry) => ({
      queryKey: catalogShowQueryKey(entry),
      queryFn: () => hydrateCatalogShow(entry),
      enabled: enabled && hasCatalogLookupId(entry),
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
            note: entry.note?.trim() || undefined,
          }
        : undefined,
      isPending: query?.status === 'pending',
      isError: Boolean(query?.isError),
    }
  })
}
