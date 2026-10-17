import { useId } from 'react'

/** "Guardar este destino para la próxima vez" (only shown with a session). */
export function SaveDestinationCheckbox({
  checked,
  onChange,
  label = 'Guardar este destino para la próxima vez'
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Use "Actualizar este destino guardado" when the destination already exists. */
  label?: string
}) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-brand-soft-active bg-white p-3 text-sm text-neutral-darker"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      />
      <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
    </label>
  )
}
