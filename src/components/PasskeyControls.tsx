import { KeyRound, LogOut } from 'lucide-react'

type Props = {
  authenticated: boolean
  error: string | null
  isBusy: boolean
  isUnsupported: boolean
  onRegister: () => void
  onSignIn: () => void
  onSignOut: () => void
}

export function PasskeyControls({ authenticated, error, isBusy, isUnsupported, onRegister, onSignIn, onSignOut }: Props) {
  if (isUnsupported) return <p className="form-message" role="status">Passkeys are not available in this browser.</p>
  if (authenticated) {
    return <div className="account-controls"><p>Passkey signed in. Your favorite places sync here.</p><button className="icon-button" type="button" onClick={onSignOut} disabled={isBusy}><LogOut aria-hidden="true" size={16} /> Sign out</button></div>
  }
  return <div className="account-controls"><p>Sign in with a passkey to keep favorite places.</p><div className="form-actions"><button className="primary-button" type="button" onClick={onSignIn} disabled={isBusy}><KeyRound aria-hidden="true" size={17} /> Sign in</button><button className="icon-button" type="button" onClick={onRegister} disabled={isBusy}>Create passkey</button></div>{error && <p className="form-message" role="alert">{error}</p>}</div>
}