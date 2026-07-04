/**
 * Servicio de etiquetas de envío - Supabase
 * CRUD completo + generación de PDF
 */

import { supabase } from '@/lib/supabase'
import type { ShippingLabelRow } from '@/lib/supabase'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import type {
  ShippingLabel,
  ShippingLabelFormData,
  ShippingLabelStatus,
  Carrier,
  ShippingStats,
} from '@/types/shipping.types'

const TABLE = 'shipping_labels'

// ──────────────────────────────────────────────
// Helpers de conversión DB ↔ App
// ──────────────────────────────────────────────

function rowToLabel(row: ShippingLabelRow): ShippingLabel {
  return {
    id: row.id,
    orderId: row.order_id,
    carrier: row.carrier as Carrier,
    trackingNumber: row.tracking_number,
    recipientName: row.recipient_name,
    recipientPhone: row.recipient_phone ?? undefined,
    recipientEmail: row.recipient_email ?? undefined,
    recipientAddress: row.recipient_address as ShippingLabel['recipientAddress'],
    senderAddress: row.sender_address as ShippingLabel['senderAddress'] ?? undefined,
    weight: row.weight,
    dimensions: row.dimensions as ShippingLabel['dimensions'],
    labelUrl: row.label_url ?? undefined,
    status: row.status as ShippingLabelStatus,
    userId: row.user_id,
    notes: row.notes ?? undefined,
    declaredValue: row.declared_value ?? undefined,
    insurance: row.insurance,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

// ──────────────────────────────────────────────
// Tracking number
// ──────────────────────────────────────────────

function generateTrackingNumber(carrier: Carrier): string {
  const prefixes: Record<Carrier, string> = {
    correos: 'ES',
    dhl: 'DHL',
    fedex: 'FX',
    seur: 'SE',
    ups: 'UP',
    otro: 'OD',
  }
  const ts = Date.now().toString(36).toUpperCase()
  const rnd = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefixes[carrier]}${ts}${rnd}`
}

// ──────────────────────────────────────────────
// QR de datos de entrega
// ──────────────────────────────────────────────
// El QR lleva los datos necesarios para la entrega (no solo el número de
// pedido), para que cualquier lector estándar -la agencia, un repartidor, o
// más adelante el flujo de cierre de entrega- pueda leerlos sin re-teclear
// nada. Se genera en el mismo momento en que se crea la etiqueta.

function buildDeliveryQRPayload(labelData: Omit<ShippingLabel, 'id' | 'labelUrl'>): string {
  const addr = labelData.recipientAddress
  const direccion = [
    `${addr.street} ${addr.number}${addr.floor ? `, ${addr.floor}` : ''}${addr.door ? ` ${addr.door}` : ''}`,
    `${addr.postalCode} ${addr.city}, ${addr.province}`,
    addr.country,
  ].filter(Boolean).join(' - ')

  return JSON.stringify({
    pedido: labelData.orderId,
    tracking: labelData.trackingNumber,
    nombre: labelData.recipientName,
    telefono: labelData.recipientPhone ?? null,
    direccion,
  })
}

async function generateQRDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
  })
}

// ──────────────────────────────────────────────
// Generación de PDF (local, sin storage por ahora)
// ──────────────────────────────────────────────

async function generateLabelPDF(labelData: Omit<ShippingLabel, 'id' | 'labelUrl'>): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] })

  const W = doc.internal.pageSize.getWidth()
  const margin = 6
  let y = margin

  // Transportista header
  doc.setFillColor(0, 169, 206)
  doc.rect(0, 0, W, 14, 'F')
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  const carrierName = labelData.carrier.charAt(0).toUpperCase() + labelData.carrier.slice(1)
  doc.text(carrierName, W / 2, 9, { align: 'center' })

  y = 18
  doc.setTextColor(0, 0, 0)

  // Tracking
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('NÚMERO DE TRACKING', margin, y)
  y += 4
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(labelData.trackingNumber, margin, y)
  y += 2

  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(margin, y + 2, W - margin, y + 2)
  y += 6

  // Destinatario
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('DESTINATARIO', margin, y)
  y += 4

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(labelData.recipientName, margin, y)
  y += 5

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const addr = labelData.recipientAddress
  const addressLines = [
    `${addr.street}, ${addr.number}${addr.floor ? `, ${addr.floor}` : ''}${addr.door ? ` ${addr.door}` : ''}`,
    `${addr.postalCode} ${addr.city}`,
    addr.province,
    addr.country,
  ].filter(Boolean)

  addressLines.forEach(line => {
    doc.text(line, margin, y)
    y += 4
  })

  if (labelData.recipientPhone) {
    doc.text(`Tel: ${labelData.recipientPhone}`, margin, y)
    y += 4
  }

  y += 1
  doc.line(margin, y, W - margin, y)
  y += 5

  // Peso y dimensiones
  doc.setFontSize(7)
  doc.setTextColor(100, 100, 100)
  doc.text('PESO Y DIMENSIONES', margin, y)
  y += 4
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(8)
  doc.text(
    `${labelData.weight} kg  |  ${labelData.dimensions.length}×${labelData.dimensions.width}×${labelData.dimensions.height} cm`,
    margin,
    y
  )
  y += 5

  // Pedido
  doc.line(margin, y, W - margin, y)
  y += 5
  doc.setFontSize(7)
  doc.setTextColor(100, 100, 100)
  doc.text('PEDIDO', margin, y)
  y += 4
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(labelData.orderId, margin, y)

  if (labelData.insurance) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 150, 80)
    doc.text('✓ Seguro incluido', W - margin - 25, y)
  }

  // QR con los datos de entrega (pedido, tracking, destinatario, dirección)
  const qrPayload = buildDeliveryQRPayload(labelData)
  const qrDataUrl = await generateQRDataUrl(qrPayload)
  const qrSize = 26 // mm
  const qrX = W - margin - qrSize
  const qrY = y + 4
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
  doc.setFontSize(5.5)
  doc.setTextColor(150, 150, 150)
  doc.text('Datos de entrega', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' })

  // Footer
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150, 150, 150)
  const date = new Date().toLocaleDateString('es-ES')
  doc.text(`Generado: ${date}`, margin, pageH - 4)
  doc.text('core-etiquetas', W - margin, pageH - 4, { align: 'right' })

  return doc.output('blob')
}

// ──────────────────────────────────────────────
// CRUD
// ──────────────────────────────────────────────

export async function createShippingLabel(
  formData: ShippingLabelFormData,
  userId: string
): Promise<ShippingLabel> {
  const trackingNumber = generateTrackingNumber(formData.carrier)

  const insertData = {
    order_id: formData.orderId,
    carrier: formData.carrier,
    tracking_number: trackingNumber,
    recipient_name: formData.recipientName,
    recipient_phone: formData.recipientPhone || null,
    recipient_email: formData.recipientEmail || null,
    recipient_address: formData.recipientAddress,
    weight: formData.weight,
    dimensions: formData.dimensions,
    status: 'printed' as ShippingLabelStatus,
    user_id: userId,
    notes: formData.notes || null,
    declared_value: formData.declaredValue || null,
    insurance: formData.insurance || false,
    label_url: null,
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert(insertData)
    .select()
    .single()

  if (error) throw new Error(`Error al crear etiqueta: ${error.message}`)

  const label = rowToLabel(data as ShippingLabelRow)

  // Generar PDF y subirlo a Supabase Storage
  try {
    const pdfBlob = await generateLabelPDF(label)
    const filePath = `${userId}/${label.id}.pdf`

    const { error: storageError } = await supabase.storage
      .from('shipping-labels')
      .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true })

    if (!storageError) {
      const { data: urlData } = supabase.storage
        .from('shipping-labels')
        .getPublicUrl(filePath)

      const labelUrl = urlData.publicUrl
      await supabase.from(TABLE).update({ label_url: labelUrl }).eq('id', label.id)
      label.labelUrl = labelUrl
    }
  } catch (pdfError) {
    console.warn('PDF generado pero no subido al storage:', pdfError)
  }

  return label
}

export async function getShippingLabels(userId: string): Promise<ShippingLabel[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Error al obtener etiquetas: ${error.message}`)
  return (data as ShippingLabelRow[]).map(rowToLabel)
}

export async function getShippingLabelById(id: string): Promise<ShippingLabel | null> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Error al obtener etiqueta: ${error.message}`)
  return data ? rowToLabel(data as ShippingLabelRow) : null
}

export async function getShippingLabelsByOrderId(
  orderId: string,
  userId: string
): Promise<ShippingLabel[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('order_id', orderId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as ShippingLabelRow[]).map(rowToLabel)
}

export async function updateShippingLabelStatus(
  id: string,
  status: ShippingLabelStatus
): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ status }).eq('id', id)
  if (error) throw new Error(`Error al actualizar estado: ${error.message}`)
}

export async function updateShippingLabel(
  id: string,
  data: Partial<ShippingLabel>
): Promise<void> {
  const updateData: Record<string, unknown> = {}
  if (data.status !== undefined) updateData.status = data.status
  if (data.notes !== undefined) updateData.notes = data.notes
  if (data.declaredValue !== undefined) updateData.declared_value = data.declaredValue
  if (data.insurance !== undefined) updateData.insurance = data.insurance
  if (data.labelUrl !== undefined) updateData.label_url = data.labelUrl

  const { error } = await supabase.from(TABLE).update(updateData).eq('id', id)
  if (error) throw new Error(`Error al actualizar etiqueta: ${error.message}`)
}

export async function deleteShippingLabel(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw new Error(`Error al eliminar etiqueta: ${error.message}`)
}

export async function searchShippingLabels(
  searchTerm: string,
  userId: string
): Promise<ShippingLabel[]> {
  const all = await getShippingLabels(userId)
  const term = searchTerm.toLowerCase()
  return all.filter(
    l =>
      l.trackingNumber.toLowerCase().includes(term) ||
      l.orderId.toLowerCase().includes(term) ||
      l.recipientName.toLowerCase().includes(term) ||
      l.recipientAddress.city.toLowerCase().includes(term) ||
      l.carrier.toLowerCase().includes(term)
  )
}

export async function getShippingStats(userId: string): Promise<ShippingStats> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('status')
    .eq('user_id', userId)

  if (error) throw new Error(error.message)

  const labels = data as { status: string }[]
  return {
    total: labels.length,
    pending: labels.filter(l => l.status === 'pending').length,
    printed: labels.filter(l => l.status === 'printed').length,
    shipped: labels.filter(l => l.status === 'shipped').length,
    delivered: labels.filter(l => l.status === 'delivered').length,
    cancelled: labels.filter(l => l.status === 'cancelled').length,
  }
}

export { generateLabelPDF }
