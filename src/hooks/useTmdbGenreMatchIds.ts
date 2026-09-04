import { useEffect, useState } from 'react'
import { catalogEntryKey, type PersonalShow } from '../api/catalog'
import { queryClient } from '../api/query'
import { findShowByImdbId } from '../api/tmdb'

export function useTmdbGenreMatchIds(shows: PersonalShow[], genreId: string) {
  const [matchIds, setMatchIds] = useState<Set<string>>(() => new Set())
  const [scanned, setScanned] = useState(0)
  const wanted = Number(genreId)
  const active = Boolean(genreId) && Number.isFinite(wanted)

  useEffect(() => {
    if (!active) {
      setMatchIds((current) => (current.size === 0 ? current : new Set()))
      setScanned((current) => (current === 0 ? current : 0))
      return
    }

    let cancelled = false
    const matches = new Set<string>()
    setMatchIds(new Set())
    setScanned(0)

    void (async () => {
      for (let index = 0; index < shows.length; index += 1) {
        if (cancelled) return
        const entry = shows[index]
        const imdbID = entry?.imdbID
        if (imdbID) {
          const show = await queryClient.fetchQuery({
            queryKey: ['tmdb-find-tv', imdbID],
            queryFn: () => findShowByImdbId(imdbID),
          })
          if (show?.genre_ids?.includes(wanted)) matches.add(catalogEntryKey(entry))
        }
        if (index % 8 === 0 || index === shows.length - 1) {
          setMatchIds(new Set(matches))
          setScanned(index + 1)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [active, shows, wanted])

  return {
    matchIds,
    scanned,
    total: shows.length,
    scanning: active && scanned < shows.length,
  }
}
