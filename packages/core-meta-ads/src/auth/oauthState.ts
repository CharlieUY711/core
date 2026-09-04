// src/auth/oauthState.ts
//
// Generación y validación de `state` para el flujo OAuth de Meta.
//
// Diseño: `state` es un token *autoverificable* (nonce + timestamp +
// firma HMAC-SHA256 usando el `appSecret` de la app como clave), no un
// identificador que haya que guardar en una base de datos o sesión de
// servidor. Esto es deliberado: core-meta no implementa persistencia
// (ver README de la Fase 6), así que la validación de CSRF del flujo
// OAuth no puede depender de storage externo. Firmar el propio valor de
// `state` evita esa dependencia sin debilitar la protección: solo quien
// conoce el `appSecret` pudo haber emitido un `state` que valide.
//
// Se usa Web Crypto (`crypto.subtle`) en vez de `node:crypto` a propósito,
// siguiendo el mismo criterio que el resto del módulo (ver comentario en
// tsconfig.json sobre la lib "DOM"): son APIs estándar disponibles tanto
// en Node 18+ como en runtimes de browser/edge, sin acoplar el paquete a
// tipos específicos de Node.

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBuffer(hex: string): ArrayBuffer {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    throw new Error('invalid hex string')
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes.buffer
}

function randomNonceHex(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return toHex(bytes.buffer)
}

async function importHmacKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage]
  )
}

/**
 * Genera un `state` opaco y autoverificable, firmado con `secret`
 * (típicamente el `appSecret` de la app de Meta). No requiere guardar
 * nada en storage: `verifyOAuthState` puede validar el resultado más
 * tarde solo con el mismo `secret`.
 */
export async function createOAuthState(secret: string): Promise<string> {
  const nonce = randomNonceHex()
  const issuedAt = Date.now()
  const payload = `${nonce}.${issuedAt}`
  const key = await importHmacKey(secret, 'sign')
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return `${payload}.${toHex(signature)}`
}

/**
 * Valida un `state` generado por `createOAuthState`: verifica su firma
 * contra `secret` y que no haya expirado según `ttlMs`. Nunca lanza: ante
 * cualquier formato inesperado o firma inválida devuelve `false`.
 */
export async function verifyOAuthState(
  state: string,
  secret: string,
  ttlMs: number
): Promise<boolean> {
  if (!state || typeof state !== 'string') {
    return false
  }

  const parts = state.split('.')
  if (parts.length !== 3) {
    return false
  }

  const [nonce, issuedAtRaw, signatureHex] = parts
  if (!nonce || !issuedAtRaw || !signatureHex) {
    return false
  }

  const issuedAt = Number(issuedAtRaw)
  if (!Number.isFinite(issuedAt)) {
    return false
  }
  if (Date.now() - issuedAt > ttlMs) {
    return false
  }

  let signatureBuffer: ArrayBuffer
  try {
    signatureBuffer = hexToBuffer(signatureHex)
  } catch {
    return false
  }

  const key = await importHmacKey(secret, 'verify')
  const payload = `${nonce}.${issuedAtRaw}`
  return crypto.subtle.verify('HMAC', key, signatureBuffer, new TextEncoder().encode(payload))
}
