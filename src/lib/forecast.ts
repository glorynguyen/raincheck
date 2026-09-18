import type {
  HourlyRainForecast,
  RainForecast,
} from '../types/weather.js'
import {
  tomorrowForecastSchema,
  type TomorrowForecast,
} from './validation.js'

const HOURS_TO_SHOW = 24

export function normalizeForecast(input: unknown): RainForecast {
  const forecast = tomorrowForecastSchema.parse(input)
  const hours = forecast.timelines.hourly
    .map(normalizeHour)
    .sort((left, right) => left.time.localeCompare(right.time))
    .slice(0, HOURS_TO_SHOW)

  if (hours.length === 0) {
    throw new Error('The weather provider returned no hourly forecast data.')
  }

  return {
    location: {
      name: forecast.location.name ?? null,
      coordinates: {
        lat: forecast.location.lat,
        lng: forecast.location.lon,
      },
    },
    hours,
    generatedAt: new Date().toISOString(),
  }
}

function normalizeHour(
  hour: TomorrowForecast['timelines']['hourly'][number],
): HourlyRainForecast {
  return {
    time: hour.time,
    precipitationProbability: hour.values.precipitationProbability,
    rainIntensity: hour.values.rainIntensity,
    temperature: hour.values.temperature ?? null,
    weatherCode: hour.values.weatherCode ?? null,
  }
}

export function findNextRain(hours: HourlyRainForecast[]) {
  return hours.find((hour) => hour.rainIntensity > 0) ?? null
}