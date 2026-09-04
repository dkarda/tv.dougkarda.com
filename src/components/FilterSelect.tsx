export const selectClass =
  'rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white'

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  emptyLabel = 'All',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  emptyLabel?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-400">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClass}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
