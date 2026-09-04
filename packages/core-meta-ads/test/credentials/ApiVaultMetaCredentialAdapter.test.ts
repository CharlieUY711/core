// test/credentials/ApiVaultMetaCredentialAdapter.test.ts
//
// Tests de ../../src/credentials/ApiVaultMetaCredentialAdapter.ts contra el
// CONTRATO REAL de API Vault (DEC-011): el fake implementa la firma de
// `resolveCredential` ya ligada a su cliente Supabase — mismos nombres de
// campo, mismo `value` opaco (JSON string), mismo `null` cuando no hay
// credencial. Ningún test usa credenciales reales, hace red real, ni
// importa `core-apivault` ni Supabase.
//
// Cobertura:
// 1. Credenciales válidas
// 2. Credencial inexistente (RESOLVE devuelve null)
// 3. Campo obligatorio faltante
// 4. Formato inválido (incluye `value` que no es JSON)
// 5. Error del Vault
// 6. Los secretos no aparecen en errores
// 7. El input de RESOLVE es el del contrato real

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ApiVaultMetaCredentialAdapter,
  META_ADS_VAULT_PLATFORM,
} from '../../src/credentials/ApiVaultMetaCredentialAdapter'
import type { MetaVaultValue } from '../../src/credentials/ApiVaultMetaCredentialAdapter'
import type {
  ResolvedVaultCredential,
  VaultReportInput,
  VaultResolveInput,
} from '../../src/credentials/apiVaultContract'
import { MetaModuleError } from '../../src/errors/MetaModuleError'
import type { MetaAccountRef } from '../../src/types/credentials.types'

const APP_SECRET = 'super-secret-value-que-no-debe-aparecer-en-ningun-lado'
const ACCESS_TOKEN = 'token-vigente-que-no-debe-aparecer-en-ningun-lado'
const PLATFORM = META_ADS_VAULT_PLATFORM

const VALID_VALUE: MetaVaultValue = {
  appId: '1234567890',
  appSecret: APP_SECRET,
  accessToken: ACCESS_TOKEN,
  adAccountId: 'act_998877',
  businessId: '5566778899',
}

const REF: MetaAccountRef = { adAccountId: 'act_998877', tenantId: 'tenant-1' }

/** Fila resuelta con la forma exacta de `ResolvedCredential` del contrato real. */
function resolvedRow(
  value: string,
  overrides: Partial<ResolvedVaultCredential['metadata']> = {}
): ResolvedVaultCredential {
  return {
    credentialId: 'cred-uuid-1',
    value,
    metadata: {
      platform: PLATFORM,
      tenantId: 'tenant-1',
      type: 'oauth',
      env: 'production',
      expiresAt: '2026-12-31T00:00:00.000Z',
      status: 'active',
      resolvedAsGlobal: false,
      ...overrides,
    },
  }
}

/** Fake de la operación RESOLVE real, ya ligada a su cliente Supabase. */
class FakeResolve {
  public readonly calls: VaultResolveInput[] = []

  constructor(private readonly handler: () => Promise<ResolvedVaultCredential | null>) {}

  readonly fn = async (input: VaultResolveInput): Promise<ResolvedVaultCredential | null> => {
    this.calls.push(input)
    return this.handler()
  }

  static returning(row: ResolvedVaultCredential): FakeResolve {
    return new FakeResolve(async () => row)
  }

  static returningValue(value: MetaVaultValue): FakeResolve {
    return FakeResolve.returning(resolvedRow(JSON.stringify(value)))
  }

  /** El RESOLVE real devuelve null (no lanza) cuando no hay credencial. */
  static notFound(): FakeResolve {
    return new FakeResolve(async () => null)
  }

  static throwing(err: unknown): FakeResolve {
    return new FakeResolve(async () => {
      throw err
    })
  }
}

function adapterFor(fake: FakeResolve): ApiVaultMetaCredentialAdapter {
  return new ApiVaultMetaCredentialAdapter(fake.fn)
}

/** Fake de REPORT (`reportCredentialOutcome` real, ya ligado a su cliente). */
class FakeReport {
  public readonly calls: VaultReportInput[] = []
  private impl: (input: VaultReportInput) => Promise<void> = async () => {}

  readonly fn = async (input: VaultReportInput): Promise<void> => {
    this.calls.push(input)
    await this.impl(input)
  }

  failingWith(err: unknown): this {
    this.impl = async () => {
      throw err
    }
    return this
  }
}

function isMetaModuleErrorOfCategory(category: string) {
  return (err: unknown) => err instanceof MetaModuleError && err.category === category
}

describe('ApiVaultMetaCredentialAdapter', () => {
  // 1. Credenciales válidas
  it('resuelve MetaAdsCredentials a partir de una fila válida del Vault', async () => {
    const fake = FakeResolve.returningValue(VALID_VALUE)

    const credentials = await adapterFor(fake).getCredentials(REF)

    assert.deepEqual(credentials, {
      appId: '1234567890',
      appSecret: APP_SECRET,
      accessToken: ACCESS_TOKEN,
      adAccountId: 'act_998877',
      businessId: '5566778899',
      expiresAt: '2026-12-31T00:00:00.000Z',
    })
  })

  // 7. Input de RESOLVE con la forma del contrato real
  it('llama a RESOLVE con { platform, tenantId, type } del contrato real', async () => {
    const fake = FakeResolve.returningValue(VALID_VALUE)

    await adapterFor(fake).getCredentials(REF)

    assert.equal(fake.calls.length, 1)
    assert.deepEqual(fake.calls[0], {
      platform: PLATFORM,
      tenantId: 'tenant-1',
      type: 'oauth',
    })
  })

  it('propaga tenantId null cuando el ref no trae tenant (fallback global del Vault)', async () => {
    const fake = FakeResolve.returningValue(VALID_VALUE)

    await adapterFor(fake).getCredentials({ adAccountId: 'act_998877' })

    assert.equal(fake.calls[0]?.tenantId, null)
  })

  it('incluye env en el input de RESOLVE solo si se configuró', async () => {
    const fake = FakeResolve.returningValue(VALID_VALUE)
    const adapter = new ApiVaultMetaCredentialAdapter(fake.fn, {
      platform: PLATFORM,
      type: 'token',
      env: 'production',
    })

    await adapter.getCredentials(REF)

    assert.deepEqual(fake.calls[0], {
      platform: PLATFORM,
      tenantId: 'tenant-1',
      type: 'token',
      env: 'production',
    })
  })

  it('prefiere metadata.expiresAt (columna expires_at) sobre el del value opaco', async () => {
    const fake = FakeResolve.returning(
      resolvedRow(JSON.stringify({ ...VALID_VALUE, expiresAt: '2020-01-01T00:00:00.000Z' }))
    )

    const credentials = await adapterFor(fake).getCredentials(REF)

    assert.equal(credentials.expiresAt, '2026-12-31T00:00:00.000Z')
  })

  it('usa el expiresAt del value cuando la columna expires_at es null', async () => {
    const fake = FakeResolve.returning(
      resolvedRow(JSON.stringify({ ...VALID_VALUE, expiresAt: '2027-01-01T00:00:00.000Z' }), {
        expiresAt: null,
      })
    )

    const credentials = await adapterFor(fake).getCredentials(REF)

    assert.equal(credentials.expiresAt, '2027-01-01T00:00:00.000Z')
  })

  it('resuelve correctamente cuando businessId y expiresAt están ausentes', async () => {
    const fake = FakeResolve.returning(
      resolvedRow(
        JSON.stringify({
          appId: '1234567890',
          appSecret: APP_SECRET,
          accessToken: ACCESS_TOKEN,
          adAccountId: 'act_998877',
        }),
        { expiresAt: null }
      )
    )

    const credentials = await adapterFor(fake).getCredentials(REF)

    assert.equal(credentials.businessId, null)
    assert.equal(credentials.expiresAt, null)
  })

  it('usa el adAccountId del ref cuando el value no lo fija', async () => {
    const fake = FakeResolve.returningValue({ ...VALID_VALUE, adAccountId: null })

    const credentials = await adapterFor(fake).getCredentials(REF)

    assert.equal(credentials.adAccountId, 'act_998877')
  })

  it('rechaza si la credencial resuelta está fijada a otra cuenta publicitaria', async () => {
    const fake = FakeResolve.returningValue({ ...VALID_VALUE, adAccountId: 'act_111222' })

    await assert.rejects(
      () => adapterFor(fake).getCredentials(REF),
      isMetaModuleErrorOfCategory('authorization')
    )
  })

  // 2. Credencial inexistente
  it('rechaza con MetaModuleError "credentials" si RESOLVE devuelve null', async () => {
    const fake = FakeResolve.notFound()

    await assert.rejects(
      () => adapterFor(fake).getCredentials(REF),
      isMetaModuleErrorOfCategory('credentials')
    )
  })

  // 3. Campo obligatorio faltante
  it('rechaza si falta un campo obligatorio (appSecret ausente)', async () => {
    const fake = FakeResolve.returningValue({ ...VALID_VALUE, appSecret: null })

    await assert.rejects(
      () => adapterFor(fake).getCredentials(REF),
      isMetaModuleErrorOfCategory('credentials')
    )
  })

  it('rechaza si falta un campo obligatorio (accessToken vacío)', async () => {
    const fake = FakeResolve.returningValue({ ...VALID_VALUE, accessToken: '' })

    await assert.rejects(
      () => adapterFor(fake).getCredentials(REF),
      isMetaModuleErrorOfCategory('credentials')
    )
  })

  // 4. Formato inválido
  it('rechaza si el ref pide un adAccountId sin el formato esperado', async () => {
    const fake = FakeResolve.returningValue({ ...VALID_VALUE, adAccountId: null })

    await assert.rejects(
      () => adapterFor(fake).getCredentials({ adAccountId: '998877', tenantId: 'tenant-1' }),
      isMetaModuleErrorOfCategory('credentials')
    )
  })

  it('rechaza si appId no es numérico', async () => {
    const fake = FakeResolve.returningValue({ ...VALID_VALUE, appId: 'abc123' })

    await assert.rejects(
      () => adapterFor(fake).getCredentials(REF),
      isMetaModuleErrorOfCategory('credentials')
    )
  })

  it('rechaza si expiresAt no es una fecha ISO-8601 válida', async () => {
    const fake = FakeResolve.returning(
      resolvedRow(JSON.stringify(VALID_VALUE), { expiresAt: 'no-es-una-fecha' })
    )

    await assert.rejects(
      () => adapterFor(fake).getCredentials(REF),
      isMetaModuleErrorOfCategory('credentials')
    )
  })

  it('rechaza si el value opaco no es JSON válido', async () => {
    const fake = FakeResolve.returning(resolvedRow('no-es-json'))

    await assert.rejects(
      () => adapterFor(fake).getCredentials(REF),
      isMetaModuleErrorOfCategory('credentials')
    )
  })

  it('rechaza si el value opaco es JSON pero no un objeto', async () => {
    const fake = FakeResolve.returning(resolvedRow('["no","es","un","objeto"]'))

    await assert.rejects(
      () => adapterFor(fake).getCredentials(REF),
      isMetaModuleErrorOfCategory('credentials')
    )
  })

  // Configuración
  it('usa "meta_ads" como platform por default, sin aliases', async () => {
    const fake = FakeResolve.returningValue(VALID_VALUE)

    await new ApiVaultMetaCredentialAdapter(fake.fn).getCredentials(REF)

    assert.equal(META_ADS_VAULT_PLATFORM, 'meta_ads')
    assert.equal(fake.calls[0]?.platform, 'meta_ads')
  })

  it('rechaza con MetaModuleError "configuration" si se pasa un platform vacío', async () => {
    const fake = FakeResolve.returningValue(VALID_VALUE)

    assert.throws(
      () => new ApiVaultMetaCredentialAdapter(fake.fn, { platform: '  ' }),
      isMetaModuleErrorOfCategory('configuration')
    )
  })

  // 5. Error del Vault
  it('envuelve un error inesperado del Vault en un MetaModuleError "credentials"', async () => {
    const fake = FakeResolve.throwing(new Error('connection refused'))

    await assert.rejects(
      () => adapterFor(fake).getCredentials(REF),
      isMetaModuleErrorOfCategory('credentials')
    )
  })

  it('conserva el error original del Vault en "cause" para diagnóstico', async () => {
    const originalError = new Error('vault unavailable')
    const fake = FakeResolve.throwing(originalError)

    try {
      await adapterFor(fake).getCredentials(REF)
      assert.fail('se esperaba que getCredentials lanzara')
    } catch (err) {
      assert.ok(err instanceof MetaModuleError)
      assert.equal((err as MetaModuleError).cause, originalError)
    }
  })

  // 6. Ningún secreto en errores
  it('nunca incluye appSecret ni accessToken en el mensaje de error cuando el Vault falla', async () => {
    const fake = FakeResolve.throwing(
      new Error(`upstream failure while resolving token ${ACCESS_TOKEN} for app secret ${APP_SECRET}`)
    )

    try {
      await adapterFor(fake).getCredentials(REF)
      assert.fail('se esperaba que getCredentials lanzara')
    } catch (err) {
      const message = (err as Error).message
      assert.ok(!message.includes(APP_SECRET), 'el mensaje no debe incluir appSecret')
      assert.ok(!message.includes(ACCESS_TOKEN), 'el mensaje no debe incluir accessToken')
    }
  })

  it('nunca incluye appSecret ni accessToken en el mensaje de error de validación', async () => {
    const fake = FakeResolve.returningValue({ ...VALID_VALUE, appId: 'no-numerico' })

    try {
      await adapterFor(fake).getCredentials(REF)
      assert.fail('se esperaba que getCredentials lanzara')
    } catch (err) {
      const message = (err as Error).message
      assert.ok(!message.includes(APP_SECRET), 'el mensaje no debe incluir appSecret')
      assert.ok(!message.includes(ACCESS_TOKEN), 'el mensaje no debe incluir accessToken')
    }
  })

  it('nunca filtra el value opaco en el error cuando el JSON es inválido', async () => {
    const brokenValue = `{"appSecret":"${APP_SECRET}","accessToken":"${ACCESS_TOKEN}"`
    const fake = FakeResolve.returning(resolvedRow(brokenValue))

    try {
      await adapterFor(fake).getCredentials(REF)
      assert.fail('se esperaba que getCredentials lanzara')
    } catch (err) {
      const asMetaError = err as MetaModuleError
      assert.ok(!asMetaError.message.includes(APP_SECRET))
      assert.ok(!asMetaError.message.includes(ACCESS_TOKEN))
      // Tampoco debe quedar el value crudo colgado como `cause`.
      assert.equal(asMetaError.cause, undefined)
    }
  })

  // ---- REPORT / HEALTH (F8E) ---------------------------------------------

  describe('reportCredentialOutcome', () => {
    it('reporta el credentialId resuelto tras un getCredentials exitoso', async () => {
      const fakeResolve = FakeResolve.returningValue(VALID_VALUE)
      const fakeReport = new FakeReport()
      const adapter = new ApiVaultMetaCredentialAdapter(fakeResolve.fn, {}, fakeReport.fn)

      await adapter.getCredentials(REF)
      await adapter.reportCredentialOutcome(REF, 'active')

      assert.equal(fakeReport.calls.length, 1)
      assert.deepEqual(fakeReport.calls[0], {
        credentialId: 'cred-uuid-1',
        outcome: 'active',
        error: null,
      })
    })

    it('propaga el mensaje de error opcional en el REPORT', async () => {
      const fakeResolve = FakeResolve.returningValue(VALID_VALUE)
      const fakeReport = new FakeReport()
      const adapter = new ApiVaultMetaCredentialAdapter(fakeResolve.fn, {}, fakeReport.fn)

      await adapter.getCredentials(REF)
      await adapter.reportCredentialOutcome(REF, 'invalid', 'Meta rechazó el access token.')

      assert.equal(fakeReport.calls[0]?.outcome, 'invalid')
      assert.equal(fakeReport.calls[0]?.error, 'Meta rechazó el access token.')
    })

    it('reporta contra el credentialId correcto aunque getCredentials termine fallando por value malformado', async () => {
      // Fila SI existe (credentialId real) pero el value no es JSON valido:
      // getCredentials lanza, pero el credentialId ya fue identificado por
      // RESOLVE y debe quedar disponible para reportar 'invalid'.
      const fakeResolve = FakeResolve.returning(resolvedRow('no-es-json'))
      const fakeReport = new FakeReport()
      const adapter = new ApiVaultMetaCredentialAdapter(fakeResolve.fn, {}, fakeReport.fn)

      await assert.rejects(() => adapter.getCredentials(REF))
      await adapter.reportCredentialOutcome(REF, 'invalid', 'value malformado')

      assert.equal(fakeReport.calls.length, 1)
      assert.equal(fakeReport.calls[0]?.credentialId, 'cred-uuid-1')
    })

    it('reporta contra el credentialId correcto aunque getCredentials termine fallando por campo obligatorio faltante', async () => {
      const fakeResolve = FakeResolve.returningValue({ ...VALID_VALUE, appSecret: null })
      const fakeReport = new FakeReport()
      const adapter = new ApiVaultMetaCredentialAdapter(fakeResolve.fn, {}, fakeReport.fn)

      await assert.rejects(() => adapter.getCredentials(REF))
      await adapter.reportCredentialOutcome(REF, 'invalid', 'falta appSecret')

      assert.equal(fakeReport.calls.length, 1)
      assert.equal(fakeReport.calls[0]?.credentialId, 'cred-uuid-1')
    })

    it('NO reporta cuando RESOLVE nunca encontró una fila (no hay credentialId)', async () => {
      const fakeResolve = FakeResolve.notFound()
      const fakeReport = new FakeReport()
      const adapter = new ApiVaultMetaCredentialAdapter(fakeResolve.fn, {}, fakeReport.fn)

      await assert.rejects(() => adapter.getCredentials(REF))
      await adapter.reportCredentialOutcome(REF, 'invalid', 'no deberia llegar a reportarse')

      assert.equal(fakeReport.calls.length, 0)
    })

    it('NO reporta cuando el adapter se construyó sin función report (no-op)', async () => {
      const fakeResolve = FakeResolve.returningValue(VALID_VALUE)
      const adapter = new ApiVaultMetaCredentialAdapter(fakeResolve.fn) // sin 3er argumento

      await adapter.getCredentials(REF)
      // No debe lanzar aunque no haya report configurado.
      await adapter.reportCredentialOutcome(REF, 'active')
    })

    it('NO reporta si nunca se llamó a getCredentials para ese ref', async () => {
      const fakeResolve = FakeResolve.returningValue(VALID_VALUE)
      const fakeReport = new FakeReport()
      const adapter = new ApiVaultMetaCredentialAdapter(fakeResolve.fn, {}, fakeReport.fn)

      // Ningún getCredentials previo: no hay credentialId cacheado.
      await adapter.reportCredentialOutcome(REF, 'active')

      assert.equal(fakeReport.calls.length, 0)
    })

    it('distingue por tenant: reportar para un ref no reporta contra el credentialId de otro ref', async () => {
      const rowA = resolvedRow(JSON.stringify(VALID_VALUE), { tenantId: 'tenant-A' })
      const rowB = { ...resolvedRow(JSON.stringify(VALID_VALUE), { tenantId: 'tenant-B' }), credentialId: 'cred-uuid-2' }
      let call = 0
      const fakeResolve = new FakeResolve(async () => (call++ === 0 ? rowA : rowB))
      const fakeReport = new FakeReport()
      const adapter = new ApiVaultMetaCredentialAdapter(fakeResolve.fn, {}, fakeReport.fn)

      const refA: MetaAccountRef = { adAccountId: 'act_998877', tenantId: 'tenant-A' }
      const refB: MetaAccountRef = { adAccountId: 'act_998877', tenantId: 'tenant-B' }

      await adapter.getCredentials(refA)
      await adapter.getCredentials(refB)
      await adapter.reportCredentialOutcome(refB, 'active')

      assert.equal(fakeReport.calls.length, 1)
      assert.equal(fakeReport.calls[0]?.credentialId, 'cred-uuid-2')
    })

    // No debe lanzar: REPORT es best-effort.
    it('no propaga un error de la función report subyacente (best-effort)', async () => {
      const fakeResolve = FakeResolve.returningValue(VALID_VALUE)
      const fakeReport = new FakeReport().failingWith(new Error('vault unavailable'))
      const adapter = new ApiVaultMetaCredentialAdapter(fakeResolve.fn, {}, fakeReport.fn)

      await adapter.getCredentials(REF)
      // No debe rechazar ni lanzar.
      await adapter.reportCredentialOutcome(REF, 'active')
    })

    // Ningún secreto en el input de REPORT.
    it('el input de REPORT nunca incluye appSecret ni accessToken', async () => {
      const fakeResolve = FakeResolve.returningValue(VALID_VALUE)
      const fakeReport = new FakeReport()
      const adapter = new ApiVaultMetaCredentialAdapter(fakeResolve.fn, {}, fakeReport.fn)

      await adapter.getCredentials(REF)
      await adapter.reportCredentialOutcome(REF, 'invalid', 'algo falló')

      const serialized = JSON.stringify(fakeReport.calls[0])
      assert.ok(!serialized.includes(APP_SECRET))
      assert.ok(!serialized.includes(ACCESS_TOKEN))
      // El shape es exactamente { credentialId, outcome, error }: nada mas.
      assert.deepEqual(Object.keys(fakeReport.calls[0]!).sort(), ['credentialId', 'error', 'outcome'])
    })
  })
})
