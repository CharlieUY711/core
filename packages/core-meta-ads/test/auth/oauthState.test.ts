// test/auth/oauthState.test.ts
//
// Tests de ../../src/auth/oauthState.ts. Se ejecutan con el test runner
// nativo de Node (`node:test`), sin dependencias externas.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createOAuthState, verifyOAuthState } from '../../src/auth/oauthState'

const TEN_MINUTES_MS = 10 * 60 * 1000

describe('oauthState', () => {
  it('genera un state que se valida correctamente con el mismo secreto', async () => {
    const secret = 'test-app-secret-123'
    const state = await createOAuthState(secret)

    const isValid = await verifyOAuthState(state, secret, TEN_MINUTES_MS)

    assert.equal(isValid, true)
  })

  it('rechaza un state firmado con un secreto distinto', async () => {
    const state = await createOAuthState('secret-a')

    const isValid = await verifyOAuthState(state, 'secret-b', TEN_MINUTES_MS)

    assert.equal(isValid, false)
  })

  it('rechaza un state manipulado (tampering) en el payload', async () => {
    const secret = 'test-app-secret-123'
    const state = await createOAuthState(secret)
    const [nonce, issuedAt, signature] = state.split('.')
    const tampered = `${nonce}x.${issuedAt}.${signature}`

    const isValid = await verifyOAuthState(tampered, secret, TEN_MINUTES_MS)

    assert.equal(isValid, false)
  })

  it('rechaza un state con la firma alterada', async () => {
    const secret = 'test-app-secret-123'
    const state = await createOAuthState(secret)
    const [nonce, issuedAt, signature] = state.split('.')
    const flippedChar = signature[0] === 'a' ? 'b' : 'a'
    const tampered = `${nonce}.${issuedAt}.${flippedChar}${signature.slice(1)}`

    const isValid = await verifyOAuthState(tampered, secret, TEN_MINUTES_MS)

    assert.equal(isValid, false)
  })

  it('rechaza un state expirado según el ttl provisto', async () => {
    const secret = 'test-app-secret-123'
    const state = await createOAuthState(secret)

    const isValid = await verifyOAuthState(state, secret, -1)

    assert.equal(isValid, false)
  })

  it('rechaza un state con formato inválido', async () => {
    const isValid = await verifyOAuthState('esto-no-es-un-state-valido', 'cualquier-secreto', TEN_MINUTES_MS)

    assert.equal(isValid, false)
  })

  it('rechaza un state vacío', async () => {
    const isValid = await verifyOAuthState('', 'cualquier-secreto', TEN_MINUTES_MS)

    assert.equal(isValid, false)
  })
})
