import { useEffect, useState } from 'react'
import type { PersonalShow } from '../api/catalog'
import { queryClient } from '../api/query'
import { findShowByImdbId, yearFromDate } from '../api/tmdb'

export function useTmdbAirYears(shows: PersonalShow[], enabled: boolean) {
  const [years, setYears] = useState<Map<string, string>>(() => new Map())
  const [scanned, setScanned] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setYears((current) => (current.size === 0 ? current : new Map()))
      setScanned((current) => (current === 0 ? current : 0))
      return
    }

    let cancelled = false
    const next = new Map<string, string>()
    setYears(new Map())
    setScanned(0)

    void (async () => {
      for (let index = 0; index < shows.length; index += 1) {
        if (cancelled) return
        const imdbID = shows[index]?.imdbID
        if (imdbID) {
          const show = await queryClient.fetchQuery({
            queryKey: ['tmdb-find-tv', imdbID],
            queryFn: () => findShowByImdbId(imdbID),
          })
          const year = yearFromDate(show?.first_air_date)
          if (year) next.set(imdbID, year)
        }
        if (index % 8 === 0 || index === shows.length - 1) {
          setYears(new Map(next))
          setScanned(index + 1)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, shows])

  return {
    years,
    scanned,
    total: shows.length,
    scanning: enabled && scanned < shows.length,
  }
}
