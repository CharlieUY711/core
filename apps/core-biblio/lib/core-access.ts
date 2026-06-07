// lib/core-access.ts
// HMAC-SHA256 con Web Crypto — funciona en el edge middleware.
// El secreto (CORE_ACCESS_SECRET) tiene que ser el MISMO en Workspace y en cada app.

function b64url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromB64url(s: string): Uint8Array {
  const t = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = t.length % 4 === 0 ? '' : '='.repeat(4 - (t.length % 4))
  const bin = atob(t + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export type CorePayload = { app: string; sub?: string; exp: number }

export async function signToken(payload: CorePayload, secret: string): Promise<string> {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)))
  const key = await getKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return `${body}.${b64url(new Uint8Array(sig))}`
}

export async function verifyToken(token: string, secret: string): Promise<CorePayload | null> {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  const key = await getKey(secret)
  let ok = false
  try {
    ok = await crypto.subtle.verify('HMAC', key, fromB64url(sig), new TextEncoder().encode(body))
  } catch {
    return null
  }
  if (!ok) return null
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as CorePayload
    if (!payload.exp || Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}
