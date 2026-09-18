import { lazy, Suspense, useState } from 'react'
import { Droplets } from 'lucide-react'
import { ApiKeyControls } from './components/ApiKeyControls'
import { HourlyForecast } from './components/HourlyForecast'
import { LocationControls } from './components/LocationControls'
import { RainSummary } from './components/RainSummary'
import { useGeolocation } from './hooks/useGeolocation'
import { useRainForecast } from './hooks/useRainForecast'
import type { Coordinates } from './types/weather'

const LazyLocationMap = lazy(() =>
  import('./components/LocationMap').then((module) => ({
    default: module.LocationMap,
  })),
)

const DEFAULT_COORDINATES: Coordinates = {
  lat: 10.7846326,
  lng: 106.7026198,
}

function App() {
  const [coordinates, setCoordinates] = useState(DEFAULT_COORDINATES)
  const forecast = useRainForecast()
  const geolocation = useGeolocation()

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#top" aria-label="Raincheck home">
          <span className="brand-mark"><Droplets size={20} /></span>
          Raincheck
        </a>
        <p>Tomorrow.io hourly forecast · Metric</p>
      </header>

      <main id="top">
        <section className="intro">
          <p className="eyebrow">Coordinate weather desk</p>
          <h1>Know when the rain finds you.</h1>
          <p className="intro-copy">
            Place a point, check the next 24 hours, and make the call before
            heading out.
          </p>
        </section>

        <div className="work-grid">
          <section className="control-panel" aria-labelledby="location-heading">
            <div className="panel-heading">
              <span>01</span>
              <div>
                <p className="eyebrow">Forecast point</p>
                <h2 id="location-heading">Choose a location</h2>
              </div>
            </div>
            <LocationControls
              key={`${coordinates.lat.toFixed(6)},${coordinates.lng.toFixed(6)}`}
              coordinates={coordinates}
              isLoading={forecast.status === 'loading'}
              isLocating={geolocation.isLocating}
              locationError={geolocation.locationError}
              onCoordinatesChange={setCoordinates}
              onLocate={() => geolocation.requestLocation(setCoordinates)}
              onSubmit={forecast.loadForecast}
            />
            <p className="map-instruction">Or click the map to place the point.</p>
            <ApiKeyControls />
          </section>

          <Suspense fallback={<div className="map-placeholder">Loading map…</div>}>
            <LazyLocationMap
              coordinates={coordinates}
              onCoordinatesChange={setCoordinates}
            />
          </Suspense>
        </div>

        <div
          className="forecast-region"
          aria-live="polite"
          aria-busy={forecast.status === 'loading'}
        >
          {forecast.status === 'idle' && (
            <section className="empty-state">
              <span>02</span>
              <div>
                <p className="eyebrow">Rain signal</p>
                <h2>Your 24-hour outlook will appear here.</h2>
              </div>
            </section>
          )}
          {forecast.status === 'loading' && !forecast.data && (
            <div className="forecast-loading">Reading the next 24 hours…</div>
          )}
          {forecast.error && (
            <p className="forecast-error" role="alert">{forecast.error}</p>
          )}
          {forecast.data && (
            <div className={forecast.status === 'loading' ? 'is-stale' : ''}>
              <RainSummary forecast={forecast.data} />
              <HourlyForecast hours={forecast.data.hours} />
            </div>
          )}
        </div>
      </main>

      <footer>
        Forecasts are probabilistic. Check local advisories for severe weather.
      </footer>
    </div>
  )
}

export default App