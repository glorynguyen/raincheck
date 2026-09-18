import { useState } from 'react'
import type { Coordinates } from '../types/weather'

export function useGeolocation() {
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  function requestLocation(onSuccess: (coordinates: Coordinates) => void) {
    if (!navigator.geolocation) {
      setLocationError('This browser does not support location access.')
      return
    }

    setIsLocating(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onSuccess({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setIsLocating(false)
      },
      (error) => {
        const messages: Record<number, string> = {
          1: 'Location permission was denied. You can enter coordinates instead.',
          2: 'Your location is currently unavailable.',
          3: 'Finding your location took too long. Please try again.',
        }
        setLocationError(messages[error.code] ?? 'Unable to find your location.')
        setIsLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }

  return { isLocating, locationError, requestLocation }
}