// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocationControls } from '../src/components/LocationControls'

afterEach(cleanup)

const defaultProps = {
  coordinates: { lat: 10.7846326, lng: 106.7026198 },
  isLoading: false,
  isLocating: false,
  locationError: null,
  onCoordinatesChange: vi.fn(),
  onLocate: vi.fn(),
  onSubmit: vi.fn(),
}

describe('LocationControls', () => {
  it('submits valid zero coordinates explicitly', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<LocationControls {...defaultProps} onSubmit={onSubmit} />)

    const latitude = screen.getByLabelText('Latitude')
    const longitude = screen.getByLabelText('Longitude')
    await user.clear(latitude)
    await user.type(latitude, '0')
    await user.clear(longitude)
    await user.type(longitude, '0')
    await user.click(screen.getByRole('button', { name: 'Check rain' }))

    expect(onSubmit).toHaveBeenCalledWith({ lat: 0, lng: 0 })
  })

  it('blocks coordinates outside valid bounds', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<LocationControls {...defaultProps} onSubmit={onSubmit} />)

    const latitude = screen.getByLabelText('Latitude')
    await user.clear(latitude)
    await user.type(latitude, '91')
    await user.click(screen.getByRole('button', { name: 'Check rain' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('latitude from -90 to 90')
  })
})