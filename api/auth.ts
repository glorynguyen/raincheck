import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server'

const CHALLENGE_TTL_MS = 5 * 60 * 1000
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const SESSION_COOKIE = 'raincheck_session'

export interface AuthEnv {
  AUTH_DB: D1Database
}

type StoredCredential = {
  id: string
  user_id: string
  public_key: ArrayBuffer
  counter: number
  transports: string
}

type StoredChallenge = {
  challenge: string
  user_id: string | null
}

export async function handleAuthRequest(
  request: Request,
  env: AuthEnv,
  pathname: string,
): Promise<Response | null> {
  if (pathname === '/api/auth/session' && request.method === 'GET') {
    const userId = await getSessionUserId(request, env)
    return noStoreJson({ authenticated: userId !== null })
  }

  if (pathname === '/api/auth/logout' && request.method === 'POST') {
    const token = getCookie(request, SESSION_COOKIE)
    if (token) {
      await env.AUTH_DB.prepare('DELETE FROM sessions WHERE token_hash = ?')
        .bind(await hashToken(token))
        .run()
    }
    return noStoreJson({ authenticated: false }, { 'Set-Cookie': expiredCookie() })
  }

  if (pathname === '/api/auth/register/options' && request.method === 'POST') {
    const userId = crypto.randomUUID()
    const options = await generateRegistrationOptions({
      rpName: 'Raincheck',
      rpID: new URL(request.url).hostname,
      userName: userId,
      userID: new TextEncoder().encode(userId),
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
      supportedAlgorithmIDs: [-7, -257],
    })
    const now = Date.now()
    const challengeId = crypto.randomUUID()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare('INSERT INTO users (id, created_at) VALUES (?, ?)')
        .bind(userId, now),
      env.AUTH_DB.prepare(
        'INSERT INTO webauthn_challenges (id, challenge, type, user_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      ).bind(challengeId, options.challenge, 'registration', userId, now + CHALLENGE_TTL_MS, now),
    ])
    return noStoreJson({ challengeId, options })
  }

  if (pathname === '/api/auth/register/verify' && request.method === 'POST') {
    const body = await requestJson<{ challengeId?: string; credential?: RegistrationResponseJSON }>(request)
    if (!body?.challengeId || !body.credential) return invalidRequest()
    const challenge = await takeChallenge(env, body.challengeId, 'registration')
    if (!challenge?.user_id) return authenticationFailed()

    try {
      const verification = await verifyRegistrationResponse({
        response: body.credential,
        expectedChallenge: challenge.challenge,
        expectedOrigin: new URL(request.url).origin,
        expectedRPID: new URL(request.url).hostname,
        requireUserVerification: true,
      })
      if (!verification.verified || !verification.registrationInfo) return authenticationFailed()
      const credential = verification.registrationInfo.credential
      await env.AUTH_DB.prepare(
        'INSERT INTO passkey_credentials (id, user_id, public_key, counter, transports, device_type, backed_up, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).bind(
        credential.id,
        challenge.user_id,
        credential.publicKey,
        credential.counter,
        JSON.stringify(credential.transports ?? []),
        verification.registrationInfo.credentialDeviceType,
        Number(verification.registrationInfo.credentialBackedUp),
        Date.now(),
      ).run()
      return createSessionResponse(env, challenge.user_id)
    } catch {
      return authenticationFailed()
    }
  }

  if (pathname === '/api/auth/login/options' && request.method === 'POST') {
    const options = await generateAuthenticationOptions({
      rpID: new URL(request.url).hostname,
      userVerification: 'required',
    })
    const now = Date.now()
    const challengeId = crypto.randomUUID()
    await env.AUTH_DB.prepare(
      'INSERT INTO webauthn_challenges (id, challenge, type, user_id, expires_at, created_at) VALUES (?, ?, ?, NULL, ?, ?)',
    ).bind(challengeId, options.challenge, 'authentication', now + CHALLENGE_TTL_MS, now).run()
    return noStoreJson({ challengeId, options })
  }

  if (pathname === '/api/auth/login/verify' && request.method === 'POST') {
    const body = await requestJson<{ challengeId?: string; credential?: AuthenticationResponseJSON }>(request)
    if (!body?.challengeId || !body.credential) return invalidRequest()
    const challenge = await takeChallenge(env, body.challengeId, 'authentication')
    if (!challenge) return authenticationFailed()
    const stored = await env.AUTH_DB.prepare(
      'SELECT id, user_id, public_key, counter, transports FROM passkey_credentials WHERE id = ?',
    ).bind(body.credential.id).first<StoredCredential>()
    if (!stored) return authenticationFailed()

    try {
      const verification = await verifyAuthenticationResponse({
        response: body.credential,
        expectedChallenge: challenge.challenge,
        expectedOrigin: new URL(request.url).origin,
        expectedRPID: new URL(request.url).hostname,
        credential: {
          id: stored.id,
          publicKey: new Uint8Array(stored.public_key),
          counter: stored.counter,
          transports: JSON.parse(stored.transports) as AuthenticatorTransport[],
        },
        requireUserVerification: true,
      })
      if (!verification.verified) return authenticationFailed()
      await env.AUTH_DB.prepare('UPDATE passkey_credentials SET counter = ? WHERE id = ? AND counter = ?')
        .bind(verification.authenticationInfo.newCounter, stored.id, stored.counter)
        .run()
      return createSessionResponse(env, stored.user_id)
    } catch {
      return authenticationFailed()
    }
  }

  return null
}

export async function getSessionUserId(request: Request, env: AuthEnv): Promise<string | null> {
  const token = getCookie(request, SESSION_COOKIE)
  if (!token) return null
  const session = await env.AUTH_DB.prepare(
    'SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?',
  ).bind(await hashToken(token), Date.now()).first<{ user_id: string }>()
  return session?.user_id ?? null
}

async function takeChallenge(env: AuthEnv, id: string, type: string): Promise<StoredChallenge | null> {
  const challenge = await env.AUTH_DB.prepare(
    'DELETE FROM webauthn_challenges WHERE id = ? AND type = ? AND expires_at > ? RETURNING challenge, user_id',
  ).bind(id, type, Date.now()).first<StoredChallenge>()
  return challenge ?? null
}

async function createSessionResponse(env: AuthEnv, userId: string): Promise<Response> {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)))
  const now = Date.now()
  await env.AUTH_DB.prepare(
    'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).bind(await hashToken(token), userId, now + SESSION_TTL_MS, now).run()
  return noStoreJson({ authenticated: true }, { 'Set-Cookie': sessionCookie(token) })
}

async function requestJson<T>(request: Request): Promise<T | null> {
  try {
    return await request.json() as T
  } catch {
    return null
  }
}

function getCookie(request: Request, name: string): string | null {
  const match = request.headers.get('Cookie')?.match(new RegExp(`(?:^|; )${name}=([^;]+)`))
  return match?.[1] ?? null
}

function sessionCookie(token: string) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`
}

function expiredCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}

async function hashToken(token: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return toBase64Url(new Uint8Array(hash))
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function noStoreJson(body: unknown, headers?: HeadersInit) {
  return Response.json(body, { headers: { 'Cache-Control': 'no-store', ...headers } })
}

function invalidRequest() {
  return Response.json({ error: { code: 'invalid_request', message: 'The request was invalid.' } }, { status: 400 })
}

function authenticationFailed() {
  return Response.json({ error: { code: 'authentication_failed', message: 'Passkey verification failed.' } }, { status: 401 })
}