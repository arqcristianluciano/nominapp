import { supabase } from '@/lib/supabase'
import type { QualityControl } from '@/types/database'

type QCInsert = Omit<QualityControl, 'id' | 'status'>
type QCUpdate = Partial<Omit<QualityControl, 'id'>>

const COMPROBANTE_BUCKET = 'quality-attachments'

function computeStatus(actual?: number | null, expected?: number | null): 'passed' | 'failed' | null {
  if (actual == null || expected == null) return null
  return actual >= expected ? 'passed' : 'failed'
}

export const qualityControlService = {
  async getByProject(projectId: string): Promise<QualityControl[]> {
    const { data, error } = await supabase
      .from('quality_control')
      .select('*')
      .eq('project_id', projectId)
      .order('pour_date', { ascending: false })
    if (error) throw error
    return data as QualityControl[]
  },

  async create(qc: QCInsert): Promise<QualityControl> {
    const status = computeStatus(qc.actual_resistance, qc.expected_resistance)
    const { data, error } = await supabase
      .from('quality_control')
      .insert({ ...qc, status })
      .select()
      .single()
    if (error) throw error
    return data as QualityControl
  },

  async update(id: string, updates: QCUpdate): Promise<QualityControl> {
    // El estado (aprobado/fallido) se recalcula cuando la actualización TOCA
    // cualquiera de las dos resistencias (aunque sea para borrarla). Una edición
    // parcial que no las toca (p.ej. solo la fecha o las notas) conserva el
    // estado. Si se toca solo una, se combina con el valor actual de la otra.
    const payload: QCUpdate & { status?: 'passed' | 'failed' | null } = { ...updates }
    const touchesResistances = 'actual_resistance' in updates || 'expected_resistance' in updates
    if (touchesResistances) {
      let actual = updates.actual_resistance
      let expected = updates.expected_resistance
      // Si falta una de las dos en el payload, se lee la actual de la BD para no
      // dejar un estado "aprobado" viejo cuando se borró/cambió el resultado.
      if (!('actual_resistance' in updates) || !('expected_resistance' in updates)) {
        const { data: current } = await supabase
          .from('quality_control')
          .select('actual_resistance, expected_resistance')
          .eq('id', id)
          .single()
        if (!('actual_resistance' in updates)) actual = current?.actual_resistance ?? null
        if (!('expected_resistance' in updates)) expected = current?.expected_resistance ?? null
      }
      payload.status = computeStatus(actual, expected)
    }
    const { data, error } = await supabase.from('quality_control').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data as QualityControl
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('quality_control').delete().eq('id', id)
    if (error) throw error
  },

  // === COMPROBANTE DEL ENSAYO (bucket privado quality-attachments) ===

  // Sube el comprobante (foto o PDF) del ensayo. El path va prefijado por
  // <projectId> para que la RLS verifique el permiso al proyecto. Devuelve el
  // path almacenado, que se guarda luego en quality_control.comprobante_url.
  async uploadComprobante(projectId: string, file: File): Promise<string> {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${projectId}/${Date.now()}-${safeName}`
    const { error } = await supabase.storage
      .from(COMPROBANTE_BUCKET)
      .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
    if (error) throw error
    return path
  },

  // URL firmada (privada) para ver/descargar el comprobante.
  async getComprobanteUrl(path: string, expiresInSec = 60 * 60): Promise<string> {
    const { data, error } = await supabase.storage.from(COMPROBANTE_BUCKET).createSignedUrl(path, expiresInSec)
    if (error) throw error
    if (!data?.signedUrl) throw new Error('No signed URL returned')
    return data.signedUrl
  },

  // B4: Elimina un comprobante del bucket para evitar archivos huérfanos.
  async deleteComprobante(path: string): Promise<void> {
    const { error } = await supabase.storage.from(COMPROBANTE_BUCKET).remove([path])
    if (error) throw error
  },
}
