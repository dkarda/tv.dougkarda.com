import type { ReactNode } from 'react'

export function EmptyState({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-zinc-300">
      <h2 className="mb-2 text-lg font-medium text-white">{title}</h2>
      <div className="space-y-2 text-sm leading-6">{children}</div>
    </div>
  )
}

export function Spinner() {
  return (
    <p className="text-sm text-zinc-400" role="status">
      Loading…
    </p>
  )
}

export function ErrorMessage({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Something went wrong.'
  return (
    <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-200">
      {message}
    </div>
  )
}
