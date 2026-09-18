import { describe, expect, it } from 'vitest'
import { findNextRain, normalizeForecast } from '../src/lib/forecast'
import { coordinatesSchema, parseQueryCoordinate } from '../src/lib/validation'

function providerForecast(hourCount = 26) {
  return {
    location: { lat: 10.78, lon: 106.7, name: 'Ho Chi Minh City' },
    timelines: {
      hourly: Array.from({ length: hourCount }, (_, index) => ({
        time: new Date(Date.UTC(2026, 8, 17, hourCount - index)).toISOString(),
        values: {
          precipitationProbability: index,
          rainIntensity: index === 4 ? 1.2 : 0,
          temperature: 30,
          weatherCode: 1000,
        },
      })),
    },
  }
}

describe('forecast normalization', () => {
  it('sorts and limits the provider forecast to 24 hours', () => {
    const result = normalizeForecast(providerForecast())

    expect(result.hours).toHaveLength(24)
    expect(result.hours[0].time < result.hours[23].time).toBe(true)
    expect(result.location.coordinates).toEqual({ lat: 10.78, lng: 106.7 })
  })

  it('finds the first hour with predicted rain', () => {
    const result = normalizeForecast(providerForecast(8))

    expect(findNextRain(result.hours)?.rainIntensity).toBe(1.2)
  })

  it('rejects an empty hourly timeline', () => {
    expect(() => normalizeForecast(providerForecast(0))).toThrow(
      'no hourly forecast data',
    )
  })
})

describe('coordinate validation', () => {
  it('accepts zero and valid boundary coordinates', () => {
    expect(coordinatesSchema.safeParse({ lat: 0, lng: 0 }).success).toBe(true)
    expect(coordinatesSchema.safeParse({ lat: -90, lng: 180 }).success).toBe(
      true,
    )
  })

  it('rejects coordinates outside their bounds', () => {
    expect(coordinatesSchema.safeParse({ lat: 90.1, lng: 0 }).success).toBe(
      false,
    )
    expect(coordinatesSchema.safeParse({ lat: 0, lng: -180.1 }).success).toBe(
      false,
    )
  })

  it('does not treat an empty query value as zero', () => {
    expect(parseQueryCoordinate('')).toBeNaN()
    expect(parseQueryCoordinate('0')).toBe(0)
  })
})