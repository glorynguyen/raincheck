import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { useEffect, useState } from 'react'
import {
  getAuthSession,
  getPasskeyAuthenticationOptions,
  getPasskeyRegistrationOptions,
  logout,
  verifyPasskeyAuthentication,
  verifyPasskeyRegistration,
} from '../lib/api'

type AuthStatus = 'checking' | 'signed_out' | 'busy' | 'signed_in' | 'error' | 'unsupported'

export function usePasskeyAuth() {
  const [status, setStatus] = useState<AuthStatus>(browserSupportsWebAuthn() ? 'checking' : 'unsupported')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!browserSupportsWebAuthn()) return
    getAuthSession()
      .then((session) => setStatus(session.authenticated ? 'signed_in' : 'signed_out'))
      .catch(() => setStatus('signed_out'))
  }, [])

  async function register() {
    await runCeremony(async () => {
      const { challengeId, options } = await getPasskeyRegistrationOptions()
      const credential = await startRegistration({ optionsJSON: options as Parameters<typeof startRegistration>[0]['optionsJSON'] })
      return verifyPasskeyRegistration(challengeId, credential)
    })
  }

  async function signIn() {
    await runCeremony(async () => {
      const { challengeId, options } = await getPasskeyAuthenticationOptions()
      const credential = await startAuthentication({ optionsJSON: options as Parameters<typeof startAuthentication>[0]['optionsJSON'] })
      return verifyPasskeyAuthentication(challengeId, credential)
    })
  }

  async function signOut() {
    setStatus('busy')
    setError(null)
    try {
      await logout()
      setStatus('signed_out')
    } catch (reason) {
      setStatus('signed_in')
      setError(reason instanceof Error ? reason.message : 'Unable to sign out.')
    }
  }

  async function runCeremony(ceremony: () => Promise<{ authenticated: boolean }>) {
    setStatus('busy')
    setError(null)
    try {
      const session = await ceremony()
      setStatus(session.authenticated ? 'signed_in' : 'signed_out')
    } catch (reason) {
      setStatus('signed_out')
      setError(reason instanceof Error ? reason.message : 'Passkey action was cancelled.')
    }
  }

  return { authenticated: status === 'signed_in', error, isBusy: status === 'busy' || status === 'checking', isUnsupported: status === 'unsupported', register, signIn, signOut }
}