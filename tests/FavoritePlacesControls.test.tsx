// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FavoritePlacesControls } from '../src/components/FavoritePlacesControls'
import { PasskeyControls } from '../src/components/PasskeyControls'

afterEach(cleanup)

const favorite = {
  id: 'home',
  name: 'Home',
  coordinates: { lat: 10.78, lng: 106.7 },
  createdAt: 1,
  updatedAt: 1,
}

describe('FavoritePlacesControls', () => {
  it('saves a named favorite at the current coordinates', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(favorite)
    render(<FavoritePlacesControls coordinates={{ lat: 0, lng: 0 }} favorites={[]} error={null} isLoading={false} onSelect={vi.fn()} onSave={onSave} onRemove={vi.fn()} />)

    await user.type(screen.getByLabelText('Name'), 'Home')
    await user.click(screen.getByRole('button', { name: 'Save place' }))

    expect(onSave).toHaveBeenCalledWith('Home', { lat: 0, lng: 0 }, undefined)
  })

  it('loads the selected favorite and exposes delete', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<FavoritePlacesControls coordinates={{ lat: 0, lng: 0 }} favorites={[favorite]} error={null} isLoading={false} onSelect={onSelect} onSave={vi.fn()} onRemove={vi.fn()} />)

    await user.selectOptions(screen.getByLabelText('Saved place'), 'home')

    expect(onSelect).toHaveBeenCalledWith(favorite.coordinates)
    expect(screen.getByRole('button', { name: 'Delete saved place' })).toBeInTheDocument()
  })
})

describe('PasskeyControls', () => {
  it('offers registration and sign-in while signed out', () => {
    render(<PasskeyControls authenticated={false} error={null} isBusy={false} isUnsupported={false} onRegister={vi.fn()} onSignIn={vi.fn()} onSignOut={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create passkey' })).toBeInTheDocument()
  })
})