import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IntensityWheel } from './IntensityWheel'

describe('IntensityWheel', () => {
  it('offers the blank value plus three rating levels', () => {
    render(
      <IntensityWheel
        id="flow"
        label="Flux"
        emptyLabel="Non renseigné"
        emptyOptionLabel="Pas noté"
        onChange={vi.fn()}
      />,
    )

    const wheel = screen.getByRole('spinbutton', { name: 'Flux' })
    expect(wheel).toHaveAttribute('aria-valuemin', '0')
    expect(wheel).toHaveAttribute('aria-valuemax', '3')
    expect(Array.from(wheel.children, (item) => item.textContent)).toEqual(['—', '1', '2', '3'])
    expect(wheel).toHaveAttribute('aria-valuetext', 'Non renseigné')
  })

  it('moves to the highest level with End and announces the new scale', () => {
    const onChange = vi.fn()
    render(
      <IntensityWheel
        id="fatigue"
        label="Fatigue"
        value={2}
        emptyLabel="Non renseigné"
        emptyOptionLabel="Pas noté"
        onChange={onChange}
      />,
    )

    const wheel = screen.getByRole('spinbutton', { name: 'Fatigue' })
    expect(wheel).toHaveAttribute('aria-valuenow', '2')
    expect(wheel).toHaveAttribute('aria-valuetext', '2 / 3')
    fireEvent.keyDown(wheel, { key: 'End' })
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('maps the native select empty option back to an unrecorded value', () => {
    const onChange = vi.fn()
    render(
      <IntensityWheel
        id="flow"
        label="Flux"
        emptyLabel="Non renseigné"
        emptyOptionLabel="Pas noté"
        onChange={onChange}
      />,
    )

    const select = screen.getByRole('combobox', { name: 'Flux' })
    fireEvent.change(select, { target: { value: '3' } })
    expect(onChange).toHaveBeenLastCalledWith(3)
    fireEvent.change(select, { target: { value: '0' } })
    expect(onChange).toHaveBeenLastCalledWith(undefined)
  })
})
