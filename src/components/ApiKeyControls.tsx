import { KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { clearStoredApiKey, getStoredApiKey, setStoredApiKey } from '../lib/apiKey'

type ApiKeyControlsProps = {
  showRateLimitMessage?: boolean
  onKeySaved?: () => void
}

export function ApiKeyControls({
  showRateLimitMessage = false,
  onKeySaved,
}: ApiKeyControlsProps) {
  const [apiKey, setApiKey] = useState('')
  const [hasStoredKey, setHasStoredKey] = useState(() => getStoredApiKey() !== null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (apiKey.trim() === '') return
    setStoredApiKey(apiKey)
    setApiKey('')
    setHasStoredKey(true)
    onKeySaved?.()
  }

  function clear() {
    clearStoredApiKey()
    setHasStoredKey(false)
  }

  return (
    <form className="location-form api-key-form" onSubmit={submit}>
      <label>
        <span>
          <KeyRound aria-hidden="true" size={14} /> Tomorrow.io API key
        </span>
        <input
          name="apiKey"
          type="password"
          autoComplete="off"
          placeholder={hasStoredKey ? 'Key saved in this browser' : 'Paste your API key'}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
      </label>

      <p className="form-message">
        Stored only in this browser&apos;s local storage. It is used for local
        development or as a fallback when the managed weather service is unavailable.
      </p>
      {showRateLimitMessage && (
        <p className="form-message" role="status">
          Tomorrow.io is rate-limiting the managed service. Enter your own key
          to retry this forecast directly.
        </p>
      )}

      <div className="form-actions">
        <button className="primary-button" type="submit">
          Save key
        </button>
        {hasStoredKey && (
          <button className="icon-button" type="button" onClick={clear}>
            Clear key
          </button>
        )}
      </div>
    </form>
  )
}
