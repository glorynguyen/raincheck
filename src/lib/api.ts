import type { ApiError, Coordinates, RainForecast } from '../types/weather'
import { getStoredApiKey } from './apiKey'
import { normalizeForecast } from './forecast'
import { rainForecastSchema } from './validation'

const CLIENT_TIMEOUT_MS = 12_000
const TOMORROW_FORECAST_URL = 'https://api.tomorrow.io/v4/weather/forecast'

export class ForecastApiError extends Error {
  readonly code: string

  constructor(
    message: string,
    code: string,
  ) {
    super(message)
    this.name = 'ForecastApiError'
    this.code = code
  }
}

export async function fetchRainForecast(
  coordinates: Coordinates,
  signal?: AbortSignal,
  options?: { useStoredKey?: boolean },
): Promise<RainForecast> {
  const timeoutSignal = AbortSignal.timeout(CLIENT_TIMEOUT_MS)
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal

  if (options?.useStoredKey) {
    const apiKey = getStoredApiKey()
    if (!apiKey) {
      throw new ForecastApiError(
        'Enter a Tomorrow.io API key to retry the forecast.',
        'byok_required',
      )
    }
    return fetchDirectFromTomorrow(coordinates, apiKey, combinedSignal)
  }

  try {
    return await fetchFromApiRoute(coordinates, combinedSignal)
  } catch (error) {
    const apiKey = getStoredApiKey()
    const canUseStoredKey =
      apiKey &&
      (error instanceof TypeError ||
        (error instanceof ForecastApiError &&
          error.code === 'service_not_configured'))

    return canUseStoredKey
      ? fetchDirectFromTomorrow(coordinates, apiKey, combinedSignal)
      : Promise.reject(error)
  }
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
    throw new ForecastApiError(
      body?.error.message ?? 'Unable to load the rain forecast right now.',
      body?.error.code ?? 'api_error',
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