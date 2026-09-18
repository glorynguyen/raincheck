import { z } from 'zod'

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export const rainForecastSchema = z.object({
  location: z.object({
    name: z.string().nullable(),
    coordinates: coordinatesSchema,
  }),
  hours: z.array(
    z.object({
      time: z.iso.datetime({ offset: true }),
      precipitationProbability: z.number().min(0).max(100),
      rainIntensity: z.number().min(0),
      temperature: z.number().nullable(),
      weatherCode: z.number().nullable(),
    }),
  ),
  generatedAt: z.iso.datetime({ offset: true }),
})

const nullableNumber = z.number().nullable().optional()

export const tomorrowForecastSchema = z.object({
  location: z.object({
    lat: z.number(),
    lon: z.number(),
    name: z.string().nullable().optional(),
  }),
  timelines: z.object({
    hourly: z.array(
      z.object({
        time: z.iso.datetime({ offset: true }),
        values: z.object({
          precipitationProbability: z.number().min(0).max(100),
          rainIntensity: z.number().min(0),
          temperature: nullableNumber,
          weatherCode: nullableNumber,
        }),
      }),
    ),
  }),
})

export type TomorrowForecast = z.infer<typeof tomorrowForecastSchema>

export function parseQueryCoordinate(value: string | string[] | undefined) {
  if (Array.isArray(value) || value === undefined || value.trim() === '') {
    return Number.NaN
  }

  return Number(value)
}