import type { Coordinates } from './weather.js'

export type FavoritePlace = {
  id: string
  name: string
  coordinates: Coordinates
  createdAt: number
  updatedAt: number
}

export type AuthSession = {
  authenticated: boolean
}