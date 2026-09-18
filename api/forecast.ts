import { ZodError } from 'zod'
import { normalizeForecast } from '../src/lib/forecast.js'
import {
  coordinatesSchema,
  parseQueryCoordinate,
} from '../src/lib/validation.js'
import type { ApiError } from '../src/types/weather.js'
import { handleAuthRequest, type AuthEnv } from './auth.js'
import { handleFavoriteRequest } from './favorites.js'

const TOMORROW_FORECAST_URL = 'https://api.tomorrow.io/v4/weather/forecast'
const UPSTREAM_TIMEOUT_MS = 10_000

interface Env extends AuthEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response>
  }
  TOMORROW_IO_API_KEY?: string
}

function sendError(
  status: number,
  code: string,
  message: string,
) {
  const body: ApiError = { error: { code, message } }
  return Response.json(body, { status })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestUrl = new URL(request.url)

    if (!requestUrl.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    const authResponse = await handleAuthRequest(request, env, requestUrl.pathname)
    if (authResponse) return authResponse

    const favoriteResponse = await handleFavoriteRequest(request, env, requestUrl.pathname)
    if (favoriteResponse) return favoriteResponse

    if (requestUrl.pathname !== '/api/forecast' || request.method !== 'GET') {
      return new Response(
        JSON.stringify({
          error: { code: 'method_not_allowed', message: 'Use a GET request.' },
        } satisfies ApiError),
        { status: 405, headers: { Allow: 'GET', 'Content-Type': 'application/json' } },
      )
  }

  const parsedCoordinates = coordinatesSchema.safeParse({
      lat: parseQueryCoordinate(requestUrl.searchParams.get('lat') ?? undefined),
      lng: parseQueryCoordinate(requestUrl.searchParams.get('lng') ?? undefined),
  })

  if (!parsedCoordinates.success) {
      return sendError(
      400,
      'invalid_coordinates',
      'Latitude must be between -90 and 90 and longitude between -180 and 180.',
    )
  }

    const apiKey = env.TOMORROW_IO_API_KEY
  if (!apiKey) {
    return sendError(
      503,
      'service_not_configured',
      'The weather service is not configured.',
    )
  }

  const url = new URL(TOMORROW_FORECAST_URL)
  url.searchParams.set(
    'location',
    `${parsedCoordinates.data.lat},${parsedCoordinates.data.lng}`,
  )
  url.searchParams.set('timesteps', '1h')
  url.searchParams.set('units', 'metric')
  url.searchParams.set('apikey', apiKey)

  try {
    const upstreamResponse = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })

    if (upstreamResponse.status === 429) {
        return sendError(
        429,
        'rate_limited',
        'The weather service is busy. Please try again in a minute.',
      )
    }

    if (!upstreamResponse.ok) {
      return sendError(
        502,
        'provider_error',
        'The weather forecast is temporarily unavailable.',
      )
    }

    const forecast = normalizeForecast(await upstreamResponse.json())
      return Response.json(forecast, {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
        },
      })
  } catch (error) {
    if (error instanceof ZodError) {
      return sendError(
        502,
        'invalid_provider_response',
        'The weather service returned an unexpected response.',
      )
    }

    const timedOut =
      error instanceof DOMException && error.name === 'TimeoutError'
    return sendError(
      timedOut ? 504 : 502,
      timedOut ? 'provider_timeout' : 'provider_error',
      timedOut
        ? 'The weather service took too long to respond.'
        : 'The weather forecast is temporarily unavailable.',
    )
    }
  }
}