import { useQuery } from '@tanstack/react-query'
import {
  fetchPersonalCatalog,
  pickTestCatalogShows,
  PERSONAL_SHOW_LIMIT,
} from '../api/catalog'

export const personalCatalogQueryKey = ['personal-catalog', PERSONAL_SHOW_LIMIT, 'local-json'] as const

export function usePersonalCatalog(enabled: boolean) {
  return useQuery({
    queryKey: personalCatalogQueryKey,
    queryFn: async () => pickTestCatalogShows(await fetchPersonalCatalog()),
    enabled,
  })
}
