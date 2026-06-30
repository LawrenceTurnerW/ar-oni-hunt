const KEY = 'ar-oni-hunt:setup'
const SLOTS_KEY = 'ar-oni-hunt:slots'

function serializeSetup(setup) {
  return {
    field: setup.field,
    graph: {
      nodes: Array.from(setup.graph.nodes.entries()),
      edges: setup.graph.edges,
    },
    items: setup.items,
  }
}

function deserializeSetup(data) {
  return {
    field: data.field,
    graph: {
      nodes: new Map(data.graph.nodes),
      edges: data.graph.edges,
    },
    items: data.items,
  }
}

export function saveSetup(setup) {
  localStorage.setItem(KEY, JSON.stringify({...serializeSetup(setup), savedAt: Date.now()}))
}

export function loadSetup() {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    return deserializeSetup(JSON.parse(raw))
  } catch (err) {
    console.error('Failed to load setup:', err)
    return null
  }
}

export function clearSetup() {
  localStorage.removeItem(KEY)
}

// 保存スロット (フィールド + グラフ + アイテムを名前付きで保管)

export function listSlots() {
  const raw = localStorage.getItem(SLOTS_KEY)
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function saveSlot(name, setup) {
  const all = listSlots()
  const id = `slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  all.push({
    id,
    name: name || '(no name)',
    savedAt: Date.now(),
    ...serializeSetup(setup),
  })
  try {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(all))
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      throw new Error('localStorage の容量が足りません。古いスロットを削除してください。')
    }
    throw err
  }
  return id
}

export function loadSlot(id) {
  const slot = listSlots().find(s => s.id === id)
  if (!slot) return null
  return {
    name: slot.name,
    ...deserializeSetup(slot),
  }
}

export function deleteSlot(id) {
  const all = listSlots().filter(s => s.id !== id)
  localStorage.setItem(SLOTS_KEY, JSON.stringify(all))
}
