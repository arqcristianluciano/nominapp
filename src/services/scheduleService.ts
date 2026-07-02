import { supabase } from '@/lib/supabase'
import { todayISO } from '@/utils/dateLocal'

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export interface ScheduleTask {
  id: string
  project_id: string
  name: string
  start_date: string
  end_date: string
  progress: number
  color: string
  notes: string | null
  created_at: string
  // Hierarchy fields (added by migration 076)
  parent_task_id: string | null
  task_number: number | null
  predecessor_id: string | null
  is_milestone: boolean
}

export type ScheduleTaskFormData = Omit<ScheduleTask, 'id' | 'created_at'>

// ---------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------

/**
 * A task enriched with its resolved children (one level deep).
 */
export interface ScheduleTaskNode extends ScheduleTask {
  children: ScheduleTask[]
  /** Computed duration in days (from children if parent, else direct). */
  computedDays: number
  /** Computed progress (weighted average by duration when parent). */
  computedProgress: number
  /** Computed start_date (min of children when parent). */
  computedStart: string
  /** Computed end_date (max of children when parent). */
  computedEnd: string
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return Math.max(1, Math.ceil((e - s) / 86400000) + 1)
}

/**
 * Build a flat list of ScheduleTaskNode sorted by task_number ASC,
 * with subtasks embedded inside their parent.
 * Root tasks (parent_task_id IS NULL) are sorted first, then their children
 * appear as the "children" array on the parent.
 * The returned flat list preserves the interleaved order expected by the UI:
 * parent, child1, child2, ..., next-parent, ...
 */
export function buildTaskTree(tasks: ScheduleTask[]): ScheduleTaskNode[] {
  const byId = new Map<string, ScheduleTask>(tasks.map((t) => [t.id, t]))

  // Separate roots and children
  const roots = tasks
    .filter((t) => t.parent_task_id === null)
    .sort((a, b) => (a.task_number ?? 0) - (b.task_number ?? 0))

  const childrenByParent = new Map<string, ScheduleTask[]>()
  for (const t of tasks) {
    if (t.parent_task_id) {
      const arr = childrenByParent.get(t.parent_task_id) ?? []
      arr.push(t)
      childrenByParent.set(t.parent_task_id, arr)
    }
  }

  const nodes: ScheduleTaskNode[] = []

  for (const root of roots) {
    const children = (childrenByParent.get(root.id) ?? []).sort((a, b) => (a.task_number ?? 0) - (b.task_number ?? 0))

    let computedDays: number
    let computedProgress: number
    let computedStart: string
    let computedEnd: string

    if (children.length > 0) {
      // Derived values from children
      computedStart = children.reduce((min, c) => (c.start_date < min ? c.start_date : min), children[0].start_date)
      computedEnd = children.reduce((max, c) => (c.end_date > max ? c.end_date : max), children[0].end_date)
      const totalDays = children.reduce((sum, c) => sum + daysBetween(c.start_date, c.end_date), 0)
      computedDays = totalDays
      computedProgress =
        totalDays === 0
          ? 0
          : Math.round(
              children.reduce((sum, c) => sum + c.progress * daysBetween(c.start_date, c.end_date), 0) / totalDays,
            )
    } else {
      computedDays = daysBetween(root.start_date, root.end_date)
      computedProgress = root.progress
      computedStart = root.start_date
      computedEnd = root.end_date
    }

    nodes.push({
      ...root,
      children,
      computedDays,
      computedProgress,
      computedStart,
      computedEnd,
    })
  }

  // Also include orphan children (parent_task_id points to missing parent)
  // as root nodes so they're always visible
  for (const t of tasks) {
    if (t.parent_task_id && !byId.has(t.parent_task_id)) {
      nodes.push({
        ...t,
        children: [],
        computedDays: daysBetween(t.start_date, t.end_date),
        computedProgress: t.progress,
        computedStart: t.start_date,
        computedEnd: t.end_date,
      })
    }
  }

  return nodes
}

/**
 * Flatten task tree into an ordered list for rendering (parent then children).
 */
export function flattenTree(nodes: ScheduleTaskNode[]): Array<ScheduleTask & { depth: number; hasChildren: boolean }> {
  const result: Array<ScheduleTask & { depth: number; hasChildren: boolean }> = []
  for (const node of nodes) {
    result.push({ ...node, depth: 0, hasChildren: node.children.length > 0 })
    for (const child of node.children) {
      result.push({ ...child, depth: 1, hasChildren: false })
    }
  }
  return result
}

// ---------------------------------------------------------------
// Cycle detection helpers
// ---------------------------------------------------------------

/**
 * Returns true if setting `childId.parent_task_id = parentId` would create
 * a cycle in the parent→child tree.
 */
export function wouldCreateParentCycle(tasks: ScheduleTask[], childId: string, newParentId: string): boolean {
  if (childId === newParentId) return true
  // Traverse ancestors of newParentId; if we hit childId it's a cycle
  const parentOf = new Map<string, string | null>(tasks.map((t) => [t.id, t.parent_task_id]))
  let cursor: string | null | undefined = newParentId
  const visited = new Set<string>()
  while (cursor) {
    if (cursor === childId) return true
    if (visited.has(cursor)) break // existing cycle (shouldn't happen in valid data)
    visited.add(cursor)
    cursor = parentOf.get(cursor)
  }
  return false
}

/**
 * Returns true if setting `taskId.predecessor_id = predecessorId` would
 * create a cycle in the predecessor→task dependency graph.
 */
export function wouldCreatePredecessorCycle(tasks: ScheduleTask[], taskId: string, newPredId: string): boolean {
  if (taskId === newPredId) return true
  // Build adjacency: predecessor → dependents
  const predOf = new Map<string, string | null>(tasks.map((t) => [t.id, t.predecessor_id]))
  // If we follow predecessors starting from newPredId and find taskId, it's a cycle
  let cursor: string | null | undefined = newPredId
  const visited = new Set<string>()
  while (cursor) {
    if (cursor === taskId) return true
    if (visited.has(cursor)) break
    visited.add(cursor)
    cursor = predOf.get(cursor)
  }
  return false
}

// ---------------------------------------------------------------
// Service
// ---------------------------------------------------------------

export const scheduleService = {
  async getByProject(projectId: string): Promise<ScheduleTask[]> {
    const { data, error } = await supabase
      .from('schedule_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('task_number', { ascending: true, nullsFirst: false })
    if (error) throw error
    return data ?? []
  },

  async create(task: ScheduleTaskFormData): Promise<ScheduleTask> {
    // El número de tarea lo asigna la base de datos al insertar (migración 088),
    // serializado por proyecto: dos guardados a la vez nunca chocan.
    const { data, error } = await supabase
      .from('schedule_tasks')
      .insert({
        ...task,
        task_number: null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, task: Partial<ScheduleTaskFormData>): Promise<void> {
    const { error } = await supabase.from('schedule_tasks').update(task).eq('id', id)
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('schedule_tasks').delete().eq('id', id)
    if (error) throw error
  },

  getOverallProgress(tasks: ScheduleTask[]): number {
    // Solo tareas raíz para el resumen; el avance se pondera por duración computada
    // (que ya suma las subtareas), evitando contar dos veces padre + hijos.
    const roots = tasks.filter((t) => t.parent_task_id === null)
    if (!roots.length) return 0
    const nodes = buildTaskTree(tasks)
    const total = nodes.reduce((sum, n) => sum + n.computedDays, 0)
    if (total === 0) return 0
    return Math.round(nodes.reduce((sum, n) => sum + n.computedProgress * n.computedDays, 0) / total)
  },

  getDelayedTasks(tasks: ScheduleTask[]): ScheduleTask[] {
    const today = todayISO()
    // Only leaf tasks (no children) are checked for delay
    const parentIds = new Set(tasks.filter((t) => t.parent_task_id !== null).map((t) => t.parent_task_id!))
    return tasks.filter((t) => {
      const isLeaf = !parentIds.has(t.id)
      return isLeaf && t.end_date < today && t.progress < 100
    })
  },
}
