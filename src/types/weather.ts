export type Coordinates = {
  lat: number
  lng: number
}

export type HourlyRainForecast = {
  time: string
  precipitationProbability: number
  rainIntensity: number
  temperature: number | null
  weatherCode: number | null
}

export type RainForecast = {
  location: {
    name: string | null
    coordinates: Coordinates
  }
  hours: HourlyRainForecast[]
  generatedAt: string
}

export type ApiError = {
  error: {
    code: string
    message: string
  }
}