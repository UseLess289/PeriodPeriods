import { useLayoutEffect, useRef } from 'react'
import type { Intensity } from '../../domain/periods'

const levels = [0, 1, 2, 3] as const
type WheelValue = (typeof levels)[number]

type Props = {
  id: string
  label: string
  value?: Intensity
  emptyLabel: string
  previousValue?: string
  onChange: (value: Intensity | undefined) => void
}

export function IntensityWheel({ id, label, value, emptyLabel, previousValue, onChange }: Props) {
  const wheelRef = useRef<HTMLDivElement>(null)
  const current = value ?? 0
  const initialValue = useRef(current)

  function position(wheel: HTMLDivElement, index: number) {
    const row = wheel.children[index] as HTMLElement
    const first = wheel.firstElementChild as HTMLElement
    if (!row || !first) return
    wheel.scrollTop = row.offsetTop - first.offsetTop
  }

  useLayoutEffect(() => {
    const wheel = wheelRef.current
    if (!wheel) return
    if (wheel.clientHeight) position(wheel, initialValue.current)
    else {
      const frame = requestAnimationFrame(() => position(wheel, initialValue.current))
      return () => cancelAnimationFrame(frame)
    }
  }, [])

  function choose(wheel: HTMLDivElement, next: WheelValue) {
    position(wheel, next)
    if (next !== current) onChange(next || undefined)
  }

  return (
    <div className="intensity-tile" data-rated={value !== undefined}>
      <label id={`${id}-label`} htmlFor={`${id}-select`}>
        {label}
      </label>
      <div className="intensity-wheel-frame">
        <div
          className="intensity-wheel"
          ref={wheelRef}
          role="spinbutton"
          tabIndex={0}
          aria-labelledby={`${id}-label`}
          aria-describedby="event-intensity-hint"
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={current}
          aria-valuetext={value ? `${value} / 3` : (previousValue ?? emptyLabel)}
          onScroll={({ currentTarget: wheel }) => {
            const rowHeight = (wheel.firstElementChild as HTMLElement).getBoundingClientRect().height
            if (!rowHeight) return
            const next = levels[Math.max(0, Math.min(3, Math.round(wheel.scrollTop / rowHeight)))]
            if (next !== current) onChange(next || undefined)
          }}
          onKeyDown={(event) => {
            let next: number
            switch (event.key) {
              case 'ArrowUp':
              case 'ArrowRight':
                next = current + 1
                break
              case 'ArrowDown':
              case 'ArrowLeft':
                next = current - 1
                break
              case 'Home':
                next = 0
                break
              case 'End':
                next = 3
                break
              case 'Enter':
                event.preventDefault()
                return
              default:
                return
            }
            event.preventDefault()
            choose(event.currentTarget, levels[Math.max(0, Math.min(levels.length - 1, next))])
          }}
          onClick={(event) => {
            const row = (event.target as HTMLElement).closest<HTMLElement>('[data-level]')
            if (!row) return
            choose(event.currentTarget, levels[Number(row.dataset.level)])
          }}
        >
          {levels.map((level) => (
            <span
              key={level}
              className="intensity-value"
              data-level={level}
              data-current={level === current}
              aria-hidden="true"
            >
              {level || '—'}
            </span>
          ))}
        </div>
      </div>
      <select
        id={`${id}-select`}
        className="intensity-native-select"
        aria-describedby="event-intensity-hint"
        value={current}
        onChange={(event) => {
          const next = Number(event.target.value)
          onChange(next === 0 ? undefined : (next as Intensity))
        }}
      >
        <option value={0}>{emptyLabel}</option>
        {levels.slice(1).map((level) => (
          <option key={level} value={level}>
            {level} / 3
          </option>
        ))}
      </select>
      {previousValue && value === undefined && <p className="intensity-previous">{previousValue}</p>}
    </div>
  )
}
