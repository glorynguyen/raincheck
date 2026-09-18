import { LocateFixed, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { coordinatesSchema } from '../lib/validation'
import type { Coordinates } from '../types/weather'

type Props = {
  coordinates: Coordinates
  isLoading: boolean
  isLocating: boolean
  locationError: string | null
  onCoordinatesChange: (coordinates: Coordinates) => void
  onLocate: () => void
  onSubmit: (coordinates: Coordinates) => void
}

export function LocationControls({
  coordinates,
  isLoading,
  isLocating,
  locationError,
  onCoordinatesChange,
  onLocate,
  onSubmit,
}: Props) {
  const [latitude, setLatitude] = useState(String(coordinates.lat))
  const [longitude, setLongitude] = useState(String(coordinates.lng))
  const [formError, setFormError] = useState<string | null>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = coordinatesSchema.safeParse({
      lat: latitude.trim() === '' ? Number.NaN : Number(latitude),
      lng: longitude.trim() === '' ? Number.NaN : Number(longitude),
    })

    if (!parsed.success) {
      setFormError(
        'Enter a latitude from -90 to 90 and longitude from -180 to 180.',
      )
      return
    }

    setFormError(null)
    onCoordinatesChange(parsed.data)
    onSubmit(parsed.data)
  }

  return (
    <form className="location-form" onSubmit={submit} noValidate>
      <div className="field-grid">
        <label>
          <span>Latitude</span>
          <input
            name="latitude"
            type="number"
            inputMode="decimal"
            min="-90"
            max="90"
            step="any"
            value={latitude}
            aria-describedby="coordinate-error"
            onChange={(event) => setLatitude(event.target.value)}
          />
        </label>
        <label>
          <span>Longitude</span>
          <input
            name="longitude"
            type="number"
            inputMode="decimal"
            min="-180"
            max="180"
            step="any"
            value={longitude}
            aria-describedby="coordinate-error"
            onChange={(event) => setLongitude(event.target.value)}
          />
        </label>
      </div>

      <p id="coordinate-error" className="form-message" role="alert">
        {formError ?? locationError}
      </p>

      <div className="form-actions">
        <button className="primary-button" type="submit" disabled={isLoading}>
          <Search aria-hidden="true" size={18} />
          {isLoading ? 'Checking sky' : 'Check rain'}
        </button>
        <button
          className="icon-button"
          type="button"
          onClick={onLocate}
          disabled={isLocating}
          title="Use my current location"
        >
          <LocateFixed aria-hidden="true" size={19} />
          <span>{isLocating ? 'Locating' : 'Use my location'}</span>
        </button>
      </div>
    </form>
  )
}