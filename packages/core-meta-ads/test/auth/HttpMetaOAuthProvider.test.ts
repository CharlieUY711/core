// test/auth/HttpMetaOAuthProvider.test.ts
//
// Tests de ../../src/auth/HttpMetaOAuthProvider.ts. El transporte HTTP se
// inyecta como fake (ver FakeOAuthHttp) — ningún test hace red real ni usa
// credenciales de Meta reales.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { HttpMetaOAuthProvider } from '../../src/auth/HttpMetaOAuthProvider'
import { MetaModuleError } from '../../src/errors/MetaModuleError'
import type { MetaOAuthHttpClient, MetaOAuthHttpResponse } from '../../src/auth/oauthHttp'

const APP_ID = '1234567890'
const APP_SECRET = 'super-secret-value-que-no-debe-aparecer-en-ningun-lado'
const REDIRECT_URI = 'https://app.example.com/integrations/meta/callback'

class FakeOAuthHttp implements MetaOAuthHttpClient {
  public readonly calls: string[] = []
  constructor(private readonly handler: (url: string) => MetaOAuthHttpResponse) {}

  async get(url: string): Promise<MetaOAuthHttpResponse> {
    this.calls.push(url)
    return this.handler(url)
  }
}

function buildProvider(http: MetaOAuthHttpClient): HttpMetaOAuthProvider {
  return new HttpMetaOAuthProvider(
    { appId: APP_ID, appSecret: APP_SECRET, apiVersion: 'v21.0', redirectUri: REDIRECT_URI },
    http
  )
}

function isMetaModuleErrorOfCategory(category: string) {
  return (err: unknown) => err instanceof MetaModuleError && err.category === category
}

describe('HttpMetaOAuthProvider', () => {
  // 1. Authorization URL
  it('genera la Authorization URL con los parámetros esperados', async () => {
    const provider = buildProvider(new FakeOAuthHttp(() => ({ status: 200, json: {} })))
    const state = await provider.createState()

    const { authorizationUrl } = provider.getAuthorizationUrl({
      redirectUri: REDIRECT_URI,
      state,
      scopes: ['ads_management', 'business_management'],
    })

    const url = new URL(authorizationUrl)
    assert.equal(url.hostname, 'www.facebook.com')
    assert.equal(url.pathname, '/v21.0/dialog/oauth')
    assert.equal(url.searchParams.get('client_id'), APP_ID)
    assert.equal(url.searchParams.get('redirect_uri'), REDIRECT_URI)
    assert.equal(url.searchParams.get('state'), state)
    assert.equal(url.searchParams.get('scope'), 'ads_management,business_management')
    assert.equal(url.searchParams.get('response_type'), 'code')
    assert.ok(!authorizationUrl.includes(APP_SECRET), 'appSecret nunca debe estar en la Authorization URL')
  })

  it('rechaza generar la Authorization URL si falta algún parámetro requerido', async () => {
    const provider = buildProvider(new FakeOAuthHttp(() => ({ status: 200, json: {} })))
    const state = await provider.createState()

    assert.throws(
      () => provider.getAuthorizationUrl({ redirectUri: '', state, scopes: ['ads_management'] }),
      isMetaModuleErrorOfCategory('validation')
    )
    assert.throws(
      () => provider.getAuthorizationUrl({ redirectUri: REDIRECT_URI, state: '', scopes: ['ads_management'] }),
      isMetaModuleErrorOfCategory('validation')
    )
    assert.throws(
      () => provider.getAuthorizationUrl({ redirectUri: REDIRECT_URI, state, scopes: [] }),
      isMetaModuleErrorOfCategory('validation')
    )
  })

  it('rechaza la Authorization URL si el redirectUri no coincide con el configurado', async () => {
    const provider = buildProvider(new FakeOAuthHttp(() => ({ status: 200, json: {} })))
    const state = await provider.createState()

    assert.throws(
      () =>
        provider.getAuthorizationUrl({
          redirectUri: 'https://otra-app.example.com/callback',
          state,
          scopes: ['ads_management'],
        }),
      isMetaModuleErrorOfCategory('configuration')
    )
  })

  // 2. State válido (dentro del flujo completo) + 4. Callback exitoso
  it('completa el callback exitosamente e intercambia el code por un access token', async () => {
    const http = new FakeOAuthHttp((url) => {
      assert.ok(url.startsWith(`https://graph.facebook.com/v21.0/oauth/access_token`))
      return {
        status: 200,
        json: { access_token: 'fake-access-token-abc', token_type: 'bearer', expires_in: 5183944 },
      }
    })
    const provider = buildProvider(http)
    const state = await provider.createState()

    const result = await provider.handleCallback({ code: 'auth-code-xyz', state })

    assert.equal(result.accessToken, 'fake-access-token-abc')
    assert.equal(result.tokenType, 'bearer')
    assert.equal(result.expiresIn, 5183944)
    assert.equal(http.calls.length, 1)
  })

  // 3. State inválido
  it('rechaza el callback si el state es inválido', async () => {
    const provider = buildProvider(new FakeOAuthHttp(() => ({ status: 200, json: { access_token: 'x' } })))

    await assert.rejects(
      () => provider.handleCallback({ code: 'auth-code-xyz', state: 'state-que-no-existe' }),
      isMetaModuleErrorOfCategory('authentication')
    )
  })

  it('rechaza el callback si el state fue firmado con otro secreto (otra app)', async () => {
    const otherProviderState = await new HttpMetaOAuthProvider(
      { appId: APP_ID, appSecret: 'otro-app-secret', apiVersion: 'v21.0', redirectUri: REDIRECT_URI },
      new FakeOAuthHttp(() => ({ status: 200, json: {} }))
    ).createState()

    const provider = buildProvider(new FakeOAuthHttp(() => ({ status: 200, json: { access_token: 'x' } })))

    await assert.rejects(
      () => provider.handleCallback({ code: 'auth-code-xyz', state: otherProviderState }),
      isMetaModuleErrorOfCategory('authentication')
    )
  })

  // 5. Error de callback (validación de input)
  it('rechaza el callback si falta el code', async () => {
    const provider = buildProvider(new FakeOAuthHttp(() => ({ status: 200, json: {} })))
    const state = await provider.createState()

    await assert.rejects(
      () => provider.handleCallback({ code: '', state }),
      isMetaModuleErrorOfCategory('validation')
    )
  })

  it('rechaza el callback si Meta responde sin access_token', async () => {
    const provider = buildProvider(new FakeOAuthHttp(() => ({ status: 200, json: {} })))
    const state = await provider.createState()

    await assert.rejects(
      () => provider.handleCallback({ code: 'auth-code-xyz', state }),
      isMetaModuleErrorOfCategory('authentication')
    )
  })

  // 6. Error de intercambio de código
  it('rechaza el callback si Meta devuelve un error en el intercambio de code', async () => {
    const http = new FakeOAuthHttp(() => ({
      status: 400,
      json: { error: { message: 'Invalid verification code format.', type: 'OAuthException', code: 100 } },
    }))
    const provider = buildProvider(http)
    const state = await provider.createState()

    await assert.rejects(
      () => provider.handleCallback({ code: 'codigo-invalido', state }),
      isMetaModuleErrorOfCategory('authentication')
    )
  })

  // 7. Refresh exitoso
  it('refresca el access token exitosamente', async () => {
    const http = new FakeOAuthHttp((url) => {
      assert.ok(url.includes('grant_type=fb_exchange_token'))
      return { status: 200, json: { access_token: 'nuevo-access-token', expires_in: 5183944 } }
    })
    const provider = buildProvider(http)

    const result = await provider.refresh('token-actual-vigente')

    assert.equal(result.accessToken, 'nuevo-access-token')
    assert.equal(result.expiresIn, 5183944)
  })

  it('rechaza el refresh si falta el token actual', async () => {
    const provider = buildProvider(new FakeOAuthHttp(() => ({ status: 200, json: {} })))

    await assert.rejects(() => provider.refresh(''), isMetaModuleErrorOfCategory('validation'))
  })

  // 8. Error de refresh
  it('rechaza el refresh si Meta devuelve un error', async () => {
    const http = new FakeOAuthHttp(() => ({
      status: 401,
      json: { error: { message: 'Error validating access token.', type: 'OAuthException', code: 190 } },
    }))
    const provider = buildProvider(http)

    await assert.rejects(() => provider.refresh('token-vencido'), isMetaModuleErrorOfCategory('authentication'))
  })

  // Desconexión lógica
  it('desconecta lógicamente validando la referencia de cuenta', async () => {
    const provider = buildProvider(new FakeOAuthHttp(() => ({ status: 200, json: {} })))

    await assert.doesNotReject(() => provider.disconnect({ adAccountId: 'act_123' }))
    await assert.rejects(
      () => provider.disconnect({ adAccountId: '' }),
      isMetaModuleErrorOfCategory('validation')
    )
  })

  // 9. Ningún secreto en errores/logs
  it('nunca expone appSecret ni el access token vigente en mensajes o causas de error', async () => {
    const currentToken = 'token-vigente-que-no-debe-aparecer'

    const failingExchange = buildProvider(
      new FakeOAuthHttp(() => ({
        status: 400,
        json: { error: { message: 'Invalid code.', type: 'OAuthException', code: 100 } },
      }))
    )
    const state = await failingExchange.createState()
    try {
      await failingExchange.handleCallback({ code: 'codigo-x', state })
      assert.fail('se esperaba que handleCallback lanzara por error de intercambio de code')
    } catch (err) {
      const serialized = JSON.stringify({ message: (err as Error).message, cause: (err as MetaModuleError).cause })
      assert.ok(!serialized.includes(APP_SECRET))
    }

    const invalidStateProvider = buildProvider(new FakeOAuthHttp(() => ({ status: 200, json: {} })))
    try {
      await invalidStateProvider.handleCallback({ code: 'x', state: 'state-invalido' })
      assert.fail('se esperaba que handleCallback lanzara por state inválido')
    } catch (err) {
      const serialized = JSON.stringify({ message: (err as Error).message, cause: (err as MetaModuleError).cause })
      assert.ok(!serialized.includes(APP_SECRET))
    }

    const failingRefresh = buildProvider(
      new FakeOAuthHttp(() => ({
        status: 401,
        json: { error: { message: 'Error validating access token.', type: 'OAuthException', code: 190 } },
      }))
    )
    try {
      await failingRefresh.refresh(currentToken)
      assert.fail('se esperaba que refresh lanzara un error')
    } catch (err) {
      const serialized = JSON.stringify({ message: (err as Error).message, cause: (err as MetaModuleError).cause })
      assert.ok(!serialized.includes(APP_SECRET))
      assert.ok(!serialized.includes(currentToken))
    }
  })
})
