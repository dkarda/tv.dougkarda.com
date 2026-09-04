export function tmdbEnv() {
  return {
    apiKey: import.meta.env.VITE_TMDB_API_KEY?.trim() ?? '',
    token: import.meta.env.VITE_TMDB_ACCESS_TOKEN?.trim() ?? '',
  }
}

export function hasPublicAuth() {
  const { apiKey, token } = tmdbEnv()
  return Boolean(apiKey || token)
}
