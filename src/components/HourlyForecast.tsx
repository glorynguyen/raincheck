import type { HourlyRainForecast } from '../types/weather'

export function HourlyForecast({ hours }: { hours: HourlyRainForecast[] }) {
  return (
    <section className="hourly-section" aria-labelledby="hourly-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Local time</p>
          <h2 id="hourly-heading">Hourly rain signal</h2>
        </div>
        <div className="legend" aria-hidden="true">
          <span><i className="probability-key" /> Probability</span>
          <span><i className="intensity-key" /> Rain mm/h</span>
        </div>
      </div>

      <ol className="hourly-list">
        {hours.map((hour) => (
          <li key={hour.time} className="hour-item">
            <time dateTime={hour.time}>{formatHour(hour.time)}</time>
            <div className="probability-track" aria-hidden="true">
              <span
                style={{ height: `${Math.max(3, hour.precipitationProbability)}%` }}
              />
            </div>
            <strong>{Math.round(hour.precipitationProbability)}%</strong>
            <span className="intensity">{hour.rainIntensity.toFixed(1)} mm/h</span>
            <span className="sr-only">
              {Math.round(hour.precipitationProbability)} percent precipitation
              probability and {hour.rainIntensity.toFixed(1)} millimeters per hour
              rain intensity.
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function formatHour(time: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    weekday: 'short',
  }).format(new Date(time))
}