import { KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { clearStoredApiKey, getStoredApiKey, setStoredApiKey } from '../lib/apiKey'

export function ApiKeyControls() {
  const [apiKey, setApiKey] = useState('')
  const [hasStoredKey, setHasStoredKey] = useState(() => getStoredApiKey() !== null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (apiKey.trim() === '') return
    setStoredApiKey(apiKey)
    setApiKey('')
    setHasStoredKey(true)
  }

  function clear() {
    clearStoredApiKey()
    setHasStoredKey(false)
  }

  return (
    <form className="location-form api-key-form" onSubmit={submit}>
      <label>
        <span>
          <KeyRound aria-hidden="true" size={14} /> Tomorrow.io API key (dev only)
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
        Stored only in this browser&apos;s local storage. Calls Tomorrow.io
        directly from the browser, bypassing the server function - for local
        development only, never for shared or production use.
      </p>

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
