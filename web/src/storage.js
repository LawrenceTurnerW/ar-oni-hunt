const KEY = 'ar-oni-hunt:setup'

export function saveSetup(setup) {
  const serialized = {
    field: setup.field,
    graph: {
      nodes: Array.from(setup.graph.nodes.entries()),
      edges: setup.graph.edges,
    },
    items: setup.items,
    savedAt: Date.now(),
  }
  localStorage.setItem(KEY, JSON.stringify(serialized))
}

export function loadSetup() {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    data.graph.nodes = new Map(data.graph.nodes)
    return data
  } catch (err) {
    console.error('Failed to load setup:', err)
    return null
  }
}

export function clearSetup() {
  localStorage.removeItem(KEY)
}
