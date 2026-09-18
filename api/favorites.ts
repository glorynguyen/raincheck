import { z } from 'zod'
import { favoritePlaceInputSchema, favoritePlaceUpdateSchema } from '../src/lib/validation.js'
import type { AuthEnv } from './auth.js'
import { getSessionUserId } from './auth.js'

type FavoriteRow = {
  id: string
  name: string
  latitude: number
  longitude: number
  created_at: number
  updated_at: number
}

export async function handleFavoriteRequest(
  request: Request,
  env: AuthEnv,
  pathname: string,
): Promise<Response | null> {
  if (!pathname.startsWith('/api/favorites')) return null
  const userId = await getSessionUserId(request, env)
  if (!userId) return errorResponse(401, 'authentication_required', 'Sign in with a passkey to manage favorite places.')

  const id = pathname.match(/^\/api\/favorites\/([^/]+)$/)?.[1]
  if (pathname === '/api/favorites' && request.method === 'GET') {
    const favorites = await env.AUTH_DB.prepare(
      'SELECT id, name, latitude, longitude, created_at, updated_at FROM favorite_places WHERE user_id = ? ORDER BY updated_at DESC',
    ).bind(userId).all<FavoriteRow>()
    return noStoreJson({ favorites: favorites.results.map(toFavorite) })
  }

  if (pathname === '/api/favorites' && request.method === 'POST') {
    const input = await parseBody(request, favoritePlaceInputSchema)
    if (!input) return errorResponse(400, 'invalid_favorite', 'Provide a name and valid coordinates.')
    const favorite = { id: crypto.randomUUID(), ...input, createdAt: Date.now(), updatedAt: Date.now() }
    try {
      await env.AUTH_DB.prepare(
        'INSERT INTO favorite_places (id, user_id, name, latitude, longitude, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).bind(favorite.id, userId, favorite.name, favorite.coordinates.lat, favorite.coordinates.lng, favorite.createdAt, favorite.updatedAt).run()
      return noStoreJson({ favorite }, undefined, 201)
    } catch {
      return errorResponse(409, 'favorite_name_taken', 'A favorite with that name already exists.')
    }
  }

  if (id && request.method === 'PATCH') {
    const input = await parseBody(request, favoritePlaceUpdateSchema)
    if (!input) return errorResponse(400, 'invalid_favorite', 'Provide a valid name or coordinates.')
    const current = await env.AUTH_DB.prepare(
      'SELECT id, name, latitude, longitude, created_at, updated_at FROM favorite_places WHERE id = ? AND user_id = ?',
    ).bind(id, userId).first<FavoriteRow>()
    if (!current) return errorResponse(404, 'favorite_not_found', 'Favorite place not found.')
    const now = Date.now()
    const name = input.name ?? current.name
    const coordinates = input.coordinates ?? { lat: current.latitude, lng: current.longitude }
    try {
      await env.AUTH_DB.prepare(
        'UPDATE favorite_places SET name = ?, latitude = ?, longitude = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      ).bind(name, coordinates.lat, coordinates.lng, now, id, userId).run()
      return noStoreJson({ favorite: { id, name, coordinates, createdAt: current.created_at, updatedAt: now } })
    } catch {
      return errorResponse(409, 'favorite_name_taken', 'A favorite with that name already exists.')
    }
  }

  if (id && request.method === 'DELETE') {
    const deleted = await env.AUTH_DB.prepare(
      'DELETE FROM favorite_places WHERE id = ? AND user_id = ?',
    ).bind(id, userId).run()
    if (!deleted.meta.changes) return errorResponse(404, 'favorite_not_found', 'Favorite place not found.')
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
  }

  return errorResponse(405, 'method_not_allowed', 'Unsupported favorite-place request.')
}

async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.output<T> | null> {
  try {
    const result = schema.safeParse(await request.json())
    return result.success ? result.data : null
  } catch {
    return null
  }
}

function toFavorite(row: FavoriteRow) {
  return {
    id: row.id,
    name: row.name,
    coordinates: { lat: row.latitude, lng: row.longitude },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function noStoreJson(body: unknown, headers?: HeadersInit, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
}

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store' } })
}