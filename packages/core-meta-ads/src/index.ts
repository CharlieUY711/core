// src/index.ts
//
// Punto de entrada de @core/core-meta. Módulo funcional standalone de
// integración con Meta Ads (Marketing API). No contiene UI, no depende de
// ningún consumidor (Market u otro), no accede directamente a Supabase ni
// a api_vault, y no contiene secretos ni credenciales reales.

export * from './types'
export * from './errors'
export * from './credentials'
export * from './client'
export * from './auth'
export * from './ads'
