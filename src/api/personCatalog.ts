import { catalogEntryKey, normalizeTitle, type PersonalShow } from './catalog'
import { queryClient } from './query'
import { findShowByImdbId, personCreditIndex } from './tmdb'

function creditMatchesCatalogTitle(titleKey: string, creditTitles: Set<string>) {
  if (creditTitles.has(titleKey)) return true
  for (const credit of creditTitles) {
    if (credit.length >= 8 && (titleKey.startsWith(credit) || credit.startsWith(titleKey))) {
      return true
    }
  }
  return false
}

/** Catalog entry keys for shows that person actually worked on (not just same title). */
export async function catalogKeysForPerson(query: string, shows: PersonalShow[]) {
  const { ids, titleKeys } = await personCreditIndex(query)
  const tmdbIds = new Set(ids)
  const titles = new Set(titleKeys)
  const matched: string[] = []

  for (const show of shows) {
    const imdbID = show.imdbID
    const titleKey = normalizeTitle(show.Title ?? '')
    if (!imdbID || !titleKey || !creditMatchesCatalogTitle(titleKey, titles)) continue
    const found = await queryClient.fetchQuery({
      queryKey: ['tmdb-find-tv', imdbID],
      queryFn: () => findShowByImdbId(imdbID),
    })
    if (found && tmdbIds.has(found.id)) matched.push(catalogEntryKey(show))
  }
  return matched
}

export function idSet(data: unknown) {
  if (Array.isArray(data)) {
    return new Set(data.filter((value): value is string => typeof value === 'string'))
  }
  return new Set<string>()
}
