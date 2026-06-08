import { supabase } from '@/lib/supabase'

export interface GlobalSearchResult {
  type: 'proyecto' | 'contratista' | 'suplidor' | 'prestamo' | 'contrato'
  id: string
  name: string
  detail?: string
  url: string
}

/**
 * Carga el índice liviano para el buscador global.
 * Devuelve datos ya mapeados a GlobalSearchResult para facilitar el filtrado
 * en cliente (no se hacen N queries por búsqueda; se carga una vez al montar).
 *
 * Entidades incluidas:
 *  - Proyectos (nombre/código)
 *  - Contratistas (nombre/cédula)
 *  - Suplidores (nombre/RNC)
 *  - Préstamos a contratistas (nombre del contratista/notas)
 *  - Contratos de cubicación (nombre del contratista + nombre del proyecto)
 */
export async function loadSearchIndex(): Promise<{
  suppliers: Array<{ id: string; name: string; rnc: string | null }>
  contractors: Array<{ id: string; name: string; specialty: string | null; cedula: string | null }>
  loans: Array<{ id: string; contractorName: string; status: string; notes: string | null }>
  contracts: Array<{ id: string; projectId: string; projectName: string; contractorName: string }>
}> {
  const [suppliersRes, contractorsRes, loansRes, contractsRes] = await Promise.all([
    supabase.from('suppliers').select('id, name, rnc').order('name'),
    supabase.from('contractors').select('id, name, specialty, cedula').order('name'),
    supabase
      .from('contractor_loans')
      .select('id, status, notes, contractor:contractors(id, name)')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('adjustment_contracts')
      .select('id, project_id, contractor:contractors(id, name), project:projects(id, name)')
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  if (suppliersRes.error) throw suppliersRes.error
  if (contractorsRes.error) throw contractorsRes.error
  // Préstamos y contratos: errores no fatales — omitimos para no bloquear el buscador
  const rawLoans = loansRes.error ? [] : ((loansRes.data ?? []) as Array<Record<string, unknown>>)
  const rawContracts = contractsRes.error ? [] : ((contractsRes.data ?? []) as Array<Record<string, unknown>>)

  const loans = rawLoans.map((l) => {
    const c = l.contractor as { name?: string } | null
    return {
      id: String(l.id),
      contractorName: c?.name ?? '',
      status: String(l.status ?? ''),
      notes: (l.notes as string | null) ?? null,
    }
  })

  const contracts = rawContracts.map((c) => {
    const contractor = c.contractor as { name?: string } | null
    const project = c.project as { id?: string; name?: string } | null
    return {
      id: String(c.id),
      projectId: project?.id ?? String(c.project_id ?? ''),
      projectName: project?.name ?? '',
      contractorName: contractor?.name ?? '',
    }
  })

  return {
    suppliers: (suppliersRes.data ?? []) as Array<{ id: string; name: string; rnc: string | null }>,
    contractors: (contractorsRes.data ?? []) as Array<{
      id: string
      name: string
      specialty: string | null
      cedula: string | null
    }>,
    loans,
    contracts,
  }
}

/**
 * Filtra el índice en memoria según el texto buscado.
 * Devuelve resultados agrupados por tipo, hasta maxPerType por categoría.
 */
export function filterIndex(
  index: Awaited<ReturnType<typeof loadSearchIndex>>,
  projects: Array<{ id: string; name: string; code: string; location: string | null }>,
  query: string,
  maxPerType = 4,
): GlobalSearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const results: GlobalSearchResult[] = []

  // Proyectos
  for (const p of projects) {
    if (results.filter((r) => r.type === 'proyecto').length >= maxPerType) break
    if (p.name.toLowerCase().includes(q) || (p.code ?? '').toLowerCase().includes(q)) {
      results.push({
        type: 'proyecto',
        id: p.id,
        name: p.name,
        detail: p.location ?? p.code,
        url: `/proyectos/${p.id}`,
      })
    }
  }

  // Contratistas
  for (const c of index.contractors) {
    if (results.filter((r) => r.type === 'contratista').length >= maxPerType) break
    if (c.name.toLowerCase().includes(q) || (c.cedula ?? '').toLowerCase().includes(q)) {
      results.push({
        type: 'contratista',
        id: c.id,
        name: c.name,
        detail: c.specialty ?? c.cedula ?? undefined,
        url: `/contratistas/${c.id}`,
      })
    }
  }

  // Suplidores
  for (const s of index.suppliers) {
    if (results.filter((r) => r.type === 'suplidor').length >= maxPerType) break
    if (s.name.toLowerCase().includes(q) || (s.rnc ?? '').toLowerCase().includes(q)) {
      results.push({
        type: 'suplidor',
        id: s.id,
        name: s.name,
        detail: s.rnc ?? undefined,
        url: '/suplidores',
      })
    }
  }

  // Préstamos (busca por nombre de contratista o notas)
  for (const l of index.loans) {
    if (results.filter((r) => r.type === 'prestamo').length >= maxPerType) break
    if (l.contractorName.toLowerCase().includes(q) || (l.notes ?? '').toLowerCase().includes(q)) {
      results.push({
        type: 'prestamo',
        id: l.id,
        name: l.contractorName || 'Préstamo',
        detail: l.status === 'active' ? 'Activo' : l.status === 'paid' ? 'Pagado' : 'Cancelado',
        url: '/prestamos',
      })
    }
  }

  // Contratos de cubicación (busca por nombre del contratista o del proyecto)
  for (const c of index.contracts) {
    if (results.filter((r) => r.type === 'contrato').length >= maxPerType) break
    if (c.contractorName.toLowerCase().includes(q) || c.projectName.toLowerCase().includes(q)) {
      results.push({
        type: 'contrato',
        id: c.id,
        name: c.contractorName || 'Contrato',
        detail: c.projectName || undefined,
        url: `/proyectos/${c.projectId}/cubicaciones/${c.id}`,
      })
    }
  }

  return results
}
