// src/app/admin/meta-social/services/waGateService.ts
//
// Lee y escribe la configuración del gate en Supabase (RLS: cada usuario ve lo
// suyo). Las imágenes van al bucket público `wa-gate`, en una carpeta con el
// id del usuario: WhatsApp descarga la imagen por URL, así que tiene que ser
// pública, pero sólo el dueño puede subir o borrar en su carpeta.

import { supabase } from '../../../../utils/supabase/client'
import type { WaGate, WaGateDraft, WaGateOption } from '../types/waGate.types'

/** Dominio base de las URLs predefinidas: op1.<base>, op2.<base>… */
export const BASE_URL_OPCIONES = 'market.core.com.uy'

export const urlPredefinida = (n: number) => `https://op${n}.${BASE_URL_OPCIONES}`

/**
 * "096800037" → "59896800037". Se acepta como lo escribe la gente (con 0
 * inicial, espacios, guiones o +) y se guarda como lo manda WhatsApp.
 */
export function normalizarNumero(entrada: string): string {
  let d = entrada.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('0') && d.length === 9) d = '598' + d.slice(1)   // Uruguay
  return d
}

/** Mensaje de lo que impide guardar, o null si está bien. */
export function validar(g: WaGateDraft): string | null {
  if (g.recipient.length < 8) return 'El número destinatario no parece válido.'
  if (g.options.length < 2) return 'Hacen falta al menos 2 opciones.'
  if (g.options.length > 10) return 'WhatsApp admite hasta 10 opciones.'
  if (g.options.some(o => !o.label.trim())) return 'Todas las opciones necesitan un texto.'
  if (g.options.some(o => o.label.length > 20)) return 'El texto de una opción admite hasta 20 caracteres.'
  if (g.options.filter(o => o.is_correct).length !== 1) return 'Marcá exactamente una opción como la correcta.'
  const sinUrl = g.options.find(o => !o.is_correct && !o.action_url?.trim())
  if (sinUrl) return `La opción "${sinUrl.label}" no es la correcta y necesita una URL.`
  const mala = g.options.find(o => o.action_url && !/^https:\/\//i.test(o.action_url))
  if (mala) return `La URL de "${mala.label}" tiene que empezar con https://`
  return null
}

export const waGateService = {

  async cargar(): Promise<WaGate[]> {
    const { data: gates, error } = await supabase
      .from('wa_gates').select('*').order('created_at')
    if (error) throw new Error(error.message)

    const ids = (gates ?? []).map(g => g.id)
    const { data: ops, error: e2 } = ids.length
      ? await supabase.from('wa_gate_options').select('*').in('gate_id', ids).order('position')
      : { data: [], error: null }
    if (e2) throw new Error(e2.message)

    return (gates ?? []).map(g => ({
      ...g,
      options: (ops ?? []).filter(o => o.gate_id === g.id) as WaGateOption[],
    })) as WaGate[]
  },

  /**
   * Guarda el gate y reemplaza sus opciones. Se borran y se vuelven a crear
   * en vez de comparar una por una: son diez filas como mucho, y evita que
   * una opción quede huérfana si cambió el orden.
   */
  async guardar(g: WaGateDraft): Promise<string> {
    const error = validar(g)
    if (error) throw new Error(error)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('La sesión venció. Volvé a entrar.')

    const fila = {
      user_id: user.id,
      recipient: g.recipient,
      recipient_label: g.recipient_label,
      prompt: g.prompt,
      success_text: g.success_text,
      enabled: g.enabled,
    }
    let id = g.id
    if (id) {
      const { error: e } = await supabase.from('wa_gates').update(fila).eq('id', id)
      if (e) throw new Error(e.message)
      const { error: d } = await supabase.from('wa_gate_options').delete().eq('gate_id', id)
      if (d) throw new Error(d.message)
    } else {
      const { data, error: e } = await supabase.from('wa_gates').insert(fila).select('id').single()
      if (e) throw new Error(e.message)
      id = data.id as string
    }

    const { error: o } = await supabase.from('wa_gate_options').insert(
      g.options.map((op, i) => ({
        gate_id: id, position: i, label: op.label.trim(),
        is_correct: op.is_correct,
        action_url: op.is_correct ? null : op.action_url?.trim() || null,
        image_url: op.image_url,
      })),
    )
    if (o) throw new Error(o.message)
    return id!
  },

  async borrar(id: string) {
    const { error } = await supabase.from('wa_gates').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  /** Vuelve a mostrar las opciones a quien ya había pasado o elegido. */
  async reiniciarConversaciones(gateId: string) {
    const { error } = await supabase.from('wa_gate_sessions').delete().eq('gate_id', gateId)
    if (error) throw new Error(error.message)
  },

  async subirImagen(file: File): Promise<string> {
    if (!/^image\/(jpeg|png)$/.test(file.type)) throw new Error('WhatsApp sólo admite imágenes JPG o PNG.')
    if (file.size > 5 * 1024 * 1024) throw new Error('La imagen pesa más de 5 MB, el máximo de WhatsApp.')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('La sesión venció. Volvé a entrar.')

    const ext = file.type === 'image/png' ? 'png' : 'jpg'
    const ruta = `${user.id}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('wa-gate').upload(ruta, file, { contentType: file.type })
    if (error) throw new Error(error.message)
    return supabase.storage.from('wa-gate').getPublicUrl(ruta).data.publicUrl
  },
}
