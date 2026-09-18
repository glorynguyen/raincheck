import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ZodError } from 'zod'
import { normalizeForecast } from '../src/lib/forecast.js'
import {
  coordinatesSchema,
  parseQueryCoordinate,
} from '../src/lib/validation.js'
import type { ApiError } from '../src/types/weather.js'

const TOMORROW_FORECAST_URL = 'https://api.tomorrow.io/v4/weather/forecast'
const UPSTREAM_TIMEOUT_MS = 10_000

function sendError(
  response: VercelResponse,
  status: number,
  code: string,
  message: string,
) {
  const body: ApiError = { error: { code, message } }
  return response.status(status).json(body)
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return sendError(response, 405, 'method_not_allowed', 'Use a GET request.')
  }

  const parsedCoordinates = coordinatesSchema.safeParse({
    lat: parseQueryCoordinate(request.query.lat),
    lng: parseQueryCoordinate(request.query.lng),
  })

  if (!parsedCoordinates.success) {
    return sendError(
      response,
      400,
      'invalid_coordinates',
      'Latitude must be between -90 and 90 and longitude between -180 and 180.',
    )
  }

  const apiKey = process.env.TOMORROW_IO_API_KEY
  if (!apiKey) {
    return sendError(
      response,
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
        response,
        429,
        'rate_limited',
        'The weather service is busy. Please try again in a minute.',
      )
    }

    if (!upstreamResponse.ok) {
      return sendError(
        response,
        502,
        'provider_error',
        'The weather forecast is temporarily unavailable.',
      )
    }

    const forecast = normalizeForecast(await upstreamResponse.json())
    response.setHeader(
      'Cache-Control',
      'public, s-maxage=600, stale-while-revalidate=300',
    )
    return response.status(200).json(forecast)
  } catch (error) {
    if (error instanceof ZodError) {
      return sendError(
        response,
        502,
        'invalid_provider_response',
        'The weather service returned an unexpected response.',
      )
    }

    const timedOut =
      error instanceof DOMException && error.name === 'TimeoutError'
    return sendError(
      response,
      timedOut ? 504 : 502,
      timedOut ? 'provider_timeout' : 'provider_error',
      timedOut
        ? 'The weather service took too long to respond.'
        : 'The weather forecast is temporarily unavailable.',
    )
  }
}