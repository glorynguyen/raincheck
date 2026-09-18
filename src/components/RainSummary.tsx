import { CloudRain, CloudSun } from 'lucide-react'
import { findNextRain } from '../lib/forecast'
import type { RainForecast } from '../types/weather'

export function RainSummary({ forecast }: { forecast: RainForecast }) {
  const nextRain = findNextRain(forecast.hours)
  const location =
    forecast.location.name ??
    `${forecast.location.coordinates.lat.toFixed(4)}, ${forecast.location.coordinates.lng.toFixed(4)}`

  return (
    <section className="rain-summary" aria-labelledby="rain-answer">
      <div className="summary-icon" aria-hidden="true">
        {nextRain ? <CloudRain size={32} /> : <CloudSun size={32} />}
      </div>
      <div>
        <p className="eyebrow">24-hour outlook for {location}</p>
        <h2 id="rain-answer">
          {nextRain
            ? `Rain forecast ${formatRelativeTime(nextRain.time)}`
            : 'No rain forecast in the next 24 hours'}
        </h2>
        {nextRain && (
          <p className="summary-detail">
            {Math.round(nextRain.precipitationProbability)}% probability ·{' '}
            {nextRain.rainIntensity.toFixed(1)} mm/h
          </p>
        )}
      </div>
    </section>
  )
}

function formatRelativeTime(time: string) {
  const minutes = Math.max(
    0,
    Math.round((new Date(time).getTime() - Date.now()) / 60_000),
  )

  if (minutes < 60) return minutes === 0 ? 'now' : `in ${minutes} min`
  const hours = Math.round(minutes / 60)
  return `in about ${hours} ${hours === 1 ? 'hour' : 'hours'}`
}