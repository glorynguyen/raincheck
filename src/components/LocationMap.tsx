import { useEffect } from 'react'
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import type { Coordinates } from '../types/weather'

type Props = {
  coordinates: Coordinates
  onCoordinatesChange: (coordinates: Coordinates) => void
}

export function LocationMap({ coordinates, onCoordinatesChange }: Props) {
  return (
    <div className="map-shell" aria-label="Choose coordinates on the map">
      <MapContainer
        center={[coordinates.lat, coordinates.lng]}
        zoom={12}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapSelection
          coordinates={coordinates}
          onCoordinatesChange={onCoordinatesChange}
        />
      </MapContainer>
    </div>
  )
}

function MapSelection({ coordinates, onCoordinatesChange }: Props) {
  const map = useMap()

  useEffect(() => {
    map.flyTo([coordinates.lat, coordinates.lng], map.getZoom(), {
      duration: 0.6,
    })
  }, [coordinates, map])

  useMapEvents({
    click(event) {
      onCoordinatesChange({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })

  return (
    <CircleMarker
      center={[coordinates.lat, coordinates.lng]}
      radius={9}
      pathOptions={{ color: '#f7f5e8', fillColor: '#ef6f40', fillOpacity: 1 }}
    />
  )
}