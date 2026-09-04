/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TMDB_API_KEY: string
  readonly VITE_TMDB_ACCESS_TOKEN: string
  readonly VITE_TMDB_ACCOUNT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
