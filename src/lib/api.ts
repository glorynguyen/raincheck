import type { ApiError, Coordinates, RainForecast } from '../types/weather'
import { getStoredApiKey } from './apiKey'
import { normalizeForecast } from './forecast'
import { rainForecastSchema } from './validation'

const CLIENT_TIMEOUT_MS = 12_000
const TOMORROW_FORECAST_URL = 'https://api.tomorrow.io/v4/weather/forecast'

export async function fetchRainForecast(
  coordinates: Coordinates,
  signal?: AbortSignal,
): Promise<RainForecast> {
  const timeoutSignal = AbortSignal.timeout(CLIENT_TIMEOUT_MS)
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal

  const apiKey = getStoredApiKey()
  return apiKey
    ? fetchDirectFromTomorrow(coordinates, apiKey, combinedSignal)
    : fetchFromApiRoute(coordinates, combinedSignal)
}

async function fetchFromApiRoute(
  coordinates: Coordinates,
  signal: AbortSignal,
): Promise<RainForecast> {
  const url = new URL('/api/forecast', window.location.origin)
  url.searchParams.set('lat', String(coordinates.lat))
  url.searchParams.set('lng', String(coordinates.lng))

  const response = await fetch(url, { signal })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null
    throw new Error(
      body?.error.message ?? 'Unable to load the rain forecast right now.',
    )
  }

  return rainForecastSchema.parse(await response.json())
}

// Bring-your-own-key path: calls Tomorrow.io directly from the browser for local dev.
async function fetchDirectFromTomorrow(
  coordinates: Coordinates,
  apiKey: string,
  signal: AbortSignal,
): Promise<RainForecast> {
  const url = new URL(TOMORROW_FORECAST_URL)
  url.searchParams.set('location', `${coordinates.lat},${coordinates.lng}`)
  url.searchParams.set('timesteps', '1h')
  url.searchParams.set('units', 'metric')
  url.searchParams.set('apikey', apiKey)

  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal,
  })

  if (response.status === 429) {
    throw new Error(
      'The weather service is busy. Please try again in a minute.',
    )
  }

  if (!response.ok) {
    throw new Error(
      'The forecast provider rejected the request. Check your API key.',
    )
  }

  return normalizeForecast(await response.json())
}