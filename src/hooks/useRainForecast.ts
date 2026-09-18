import { useEffect, useRef, useState } from 'react'
import { fetchRainForecast } from '../lib/api'
import type { Coordinates, RainForecast } from '../types/weather'

type ForecastState =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: RainForecast | null; error: null }
  | { status: 'success'; data: RainForecast; error: null }
  | { status: 'error'; data: RainForecast | null; error: string }

export function useRainForecast() {
  const [state, setState] = useState<ForecastState>({
    status: 'idle',
    data: null,
    error: null,
  })
  const activeRequest = useRef<AbortController | null>(null)

  useEffect(() => () => activeRequest.current?.abort(), [])

  async function loadForecast(coordinates: Coordinates) {
    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller
    setState((current) => ({
      status: 'loading',
      data: current.data,
      error: null,
    }))

    try {
      const data = await fetchRainForecast(coordinates, controller.signal)
      if (!controller.signal.aborted) {
        setState({ status: 'success', data, error: null })
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        const message =
          error instanceof DOMException && error.name === 'TimeoutError'
            ? 'The forecast request took too long. Please try again.'
            : error instanceof Error
              ? error.message
              : 'Unable to load the rain forecast right now.'
        setState((current) => ({
          status: 'error',
          data: current.data,
          error: message,
        }))
      }
    }
  }

  return { ...state, loadForecast }
}