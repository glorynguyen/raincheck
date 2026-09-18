import { useEffect, useState } from 'react'
import { createFavorite, deleteFavorite, getFavorites, updateFavorite } from '../lib/api'
import type { FavoritePlace } from '../types/auth'
import type { Coordinates } from '../types/weather'

export function useFavorites(authenticated: boolean) {
  const [favorites, setFavorites] = useState<FavoritePlace[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authenticated) return
    getFavorites().then(setFavorites).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load saved places.'))
  }, [authenticated])

  async function save(name: string, coordinates: Coordinates, id?: string) {
    setError(null)
    const favorite = id ? await updateFavorite(id, name, coordinates) : await createFavorite(name, coordinates)
    setFavorites((current) => id ? current.map((item) => item.id === id ? favorite : item) : [favorite, ...current])
    return favorite
  }

  async function remove(id: string) {
    setError(null)
    await deleteFavorite(id)
    setFavorites((current) => current.filter((item) => item.id !== id))
  }

  return { favorites, error, isLoading: false, save, remove }
}