import { describe, it, expect } from 'vitest'
import {
  buildTaskTree,
  flattenTree,
  wouldCreateParentCycle,
  wouldCreatePredecessorCycle,
  type ScheduleTask,
} from './scheduleService'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(id: string, overrides: Partial<ScheduleTask> = {}): ScheduleTask {
  return {
    id,
    project_id: 'proj-1',
    name: `Task ${id}`,
    start_date: '2025-01-01',
    end_date: '2025-01-10',
    progress: 0,
    color: '#3b82f6',
    notes: null,
    created_at: '2025-01-01T00:00:00Z',
    parent_task_id: null,
    task_number: null,
    predecessor_id: null,
    is_milestone: false,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// buildTaskTree
// ---------------------------------------------------------------------------

describe('buildTaskTree', () => {
  it('returns empty array for empty input', () => {
    expect(buildTaskTree([])).toEqual([])
  })

  it('returns one root node with no children for a flat task list', () => {
    const tasks = [makeTask('a', { task_number: 1 }), makeTask('b', { task_number: 2 })]
    const tree = buildTaskTree(tasks)
    expect(tree).toHaveLength(2)
    expect(tree[0].children).toHaveLength(0)
    expect(tree[1].children).toHaveLength(0)
  })

  it('nests child tasks under their parent', () => {
    const parent = makeTask('p', { task_number: 1 })
    const child1 = makeTask('c1', { parent_task_id: 'p', task_number: 2 })
    const child2 = makeTask('c2', { parent_task_id: 'p', task_number: 3 })

    const tree = buildTaskTree([parent, child1, child2])
    expect(tree).toHaveLength(1)
    expect(tree[0].id).toBe('p')
    expect(tree[0].children).toHaveLength(2)
    expect(tree[0].children[0].id).toBe('c1')
    expect(tree[0].children[1].id).toBe('c2')
  })

  it('sorts roots by task_number ASC', () => {
    const tasks = [makeTask('b', { task_number: 2 }), makeTask('a', { task_number: 1 })]
    const tree = buildTaskTree(tasks)
    expect(tree[0].id).toBe('a')
    expect(tree[1].id).toBe('b')
  })

  it('computes derived start/end/progress for a parent with children', () => {
    const parent = makeTask('p', {
      task_number: 1,
      start_date: '2025-01-01',
      end_date: '2025-01-01',
      progress: 0,
    })
    const child1 = makeTask('c1', {
      parent_task_id: 'p',
      task_number: 2,
      start_date: '2025-01-05',
      end_date: '2025-01-10',
      progress: 100,
    })
    const child2 = makeTask('c2', {
      parent_task_id: 'p',
      task_number: 3,
      start_date: '2025-01-11',
      end_date: '2025-01-20',
      progress: 50,
    })

    const tree = buildTaskTree([parent, child1, child2])
    const node = tree[0]

    // Computed start = min child start
    expect(node.computedStart).toBe('2025-01-05')
    // Computed end = max child end
    expect(node.computedEnd).toBe('2025-01-20')
    // Days: child1 = 6 days (5..10 inclusive), child2 = 10 days
    // Weighted progress = (100*6 + 50*10) / 16 = (600+500)/16 = 68.75 ≈ 69
    expect(node.computedProgress).toBe(69)
  })

  it('orphan children (parent missing) appear as root nodes', () => {
    const orphan = makeTask('x', { parent_task_id: 'nonexistent', task_number: 1 })
    const tree = buildTaskTree([orphan])
    // Orphan should appear as a root node
    expect(tree.length).toBeGreaterThanOrEqual(1)
    const found = tree.find((n) => n.id === 'x')
    expect(found).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// flattenTree
// ---------------------------------------------------------------------------

describe('flattenTree', () => {
  it('flattens a tree: parent then children in order', () => {
    const parent = makeTask('p', { task_number: 1 })
    const child1 = makeTask('c1', { parent_task_id: 'p', task_number: 2 })
    const child2 = makeTask('c2', { parent_task_id: 'p', task_number: 3 })

    const tree = buildTaskTree([parent, child1, child2])
    const flat = flattenTree(tree)

    expect(flat).toHaveLength(3)
    expect(flat[0].id).toBe('p')
    expect(flat[0].depth).toBe(0)
    expect(flat[0].hasChildren).toBe(true)
    expect(flat[1].id).toBe('c1')
    expect(flat[1].depth).toBe(1)
    expect(flat[1].hasChildren).toBe(false)
    expect(flat[2].id).toBe('c2')
    expect(flat[2].depth).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// wouldCreateParentCycle
// ---------------------------------------------------------------------------

describe('wouldCreateParentCycle', () => {
  it('detects self-reference', () => {
    const tasks = [makeTask('a')]
    expect(wouldCreateParentCycle(tasks, 'a', 'a')).toBe(true)
  })

  it('detects a direct cycle: a → b and b trying to set parent = a', () => {
    const a = makeTask('a', { parent_task_id: 'b' })
    const b = makeTask('b')
    // If we set b.parent_task_id = a, we check: would a be an ancestor of b?
    // Starting from a: a.parent = b → b found = cycle
    expect(wouldCreateParentCycle([a, b], 'b', 'a')).toBe(true)
  })

  it('allows a valid parent assignment', () => {
    const a = makeTask('a')
    const b = makeTask('b')
    expect(wouldCreateParentCycle([a, b], 'b', 'a')).toBe(false)
  })

  it('detects a transitive cycle: a→b→c, c wants to be parent of a', () => {
    const a = makeTask('a', { parent_task_id: 'b' })
    const b = makeTask('b', { parent_task_id: 'c' })
    const c = makeTask('c')
    // Setting a.parent = c would create c→a→b→c
    // Check: would c be an ancestor of a? traverse from c: c has no parent → no cycle
    // Actually we test: child=a, newParent=c → traverse from c up. c.parent=null → false
    expect(wouldCreateParentCycle([a, b, c], 'a', 'c')).toBe(false)
    // Now check: child=c, newParent=a → traverse from a: a.parent=b → b.parent=c → c===childId cycle!
    expect(wouldCreateParentCycle([a, b, c], 'c', 'a')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// wouldCreatePredecessorCycle
// ---------------------------------------------------------------------------

describe('wouldCreatePredecessorCycle', () => {
  it('detects self-reference', () => {
    const tasks = [makeTask('a')]
    expect(wouldCreatePredecessorCycle(tasks, 'a', 'a')).toBe(true)
  })

  it('detects a direct predecessor cycle: a pred b, b trying to set pred = a', () => {
    const a = makeTask('a', { predecessor_id: 'b' })
    const b = makeTask('b')
    // setting b.pred = a: traverse from a → a.pred=b → b===taskId cycle
    expect(wouldCreatePredecessorCycle([a, b], 'b', 'a')).toBe(true)
  })

  it('allows a valid predecessor assignment', () => {
    const a = makeTask('a')
    const b = makeTask('b')
    expect(wouldCreatePredecessorCycle([a, b], 'b', 'a')).toBe(false)
  })

  it('detects a transitive predecessor cycle', () => {
    const a = makeTask('a', { predecessor_id: 'b' })
    const b = makeTask('b', { predecessor_id: 'c' })
    const c = makeTask('c')
    // setting c.pred = a: traverse from a → a.pred=b → b.pred=c → c===taskId cycle!
    expect(wouldCreatePredecessorCycle([a, b, c], 'c', 'a')).toBe(true)
    // setting a.pred = c is fine: traverse from c → c.pred=null → no cycle
    expect(wouldCreatePredecessorCycle([a, b, c], 'a', 'c')).toBe(false)
  })
})
