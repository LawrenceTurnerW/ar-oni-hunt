import {isInPolygon, chooseItemCount} from './field'

// グラフのエッジ上から、フィールド多角形に含まれるものを使って
// ランダム配置。MVP では perpendicular offset 無し（道の真上に置く）。
export function placeItems(field, graph) {
  const count = chooseItemCount(field)

  const candidateEdges = graph.edges.filter(e => {
    const na = graph.nodes.get(e.from)
    const nb = graph.nodes.get(e.to)
    if (!na || !nb) return false
    const mid = {
      lat: (na.lat + nb.lat) / 2,
      lng: (na.lng + nb.lng) / 2,
    }
    return isInPolygon(mid, field)
  })

  if (candidateEdges.length === 0) return []

  const items = []
  for (let i = 0; i < count; i++) {
    const edge = candidateEdges[Math.floor(Math.random() * candidateEdges.length)]
    const na = graph.nodes.get(edge.from)
    const nb = graph.nodes.get(edge.to)
    const t = Math.random()
    items.push({
      id: `item-${i}`,
      lat: na.lat + (nb.lat - na.lat) * t,
      lng: na.lng + (nb.lng - na.lng) * t,
    })
  }
  return items
}
