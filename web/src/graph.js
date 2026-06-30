import {distanceMeters} from './coords'

// 各 edge は from/to が双方向に通れる前提で adjacency を作る。
export function buildAdjacency(graph) {
  const adj = new Map()
  for (const edge of graph.edges) {
    if (!adj.has(edge.from)) adj.set(edge.from, [])
    if (!adj.has(edge.to)) adj.set(edge.to, [])
    adj.get(edge.from).push({to: edge.to, weight: edge.weight})
    adj.get(edge.to).push({to: edge.from, weight: edge.weight})
  }
  return adj
}

// 最寄り node (graph.nodes の中で、特定 lat/lng に最も近いもの)。
export function findNearestNode(lat, lng, graph) {
  let best = null
  let bestDist = Infinity
  for (const [id, node] of graph.nodes) {
    const d = distanceMeters(lat, lng, node.lat, node.lng)
    if (d < bestDist) {
      bestDist = d
      best = id
    }
  }
  return best
}

// 指定された node ID 集合内から最寄り node を選ぶ。
export function findNearestNodeIn(lat, lng, graph, nodeIdSet) {
  let best = null
  let bestDist = Infinity
  for (const id of nodeIdSet) {
    const node = graph.nodes.get(id)
    if (!node) continue
    const d = distanceMeters(lat, lng, node.lat, node.lng)
    if (d < bestDist) {
      bestDist = d
      best = id
    }
  }
  return best
}

// startId から到達可能な node ID 集合 (BFS)。
// OSM は分断成分が出やすいので、これで「同じ成分」だけ扱う前提にしておく。
export function reachableNodes(adjacency, startId) {
  const visited = new Set([startId])
  const queue = [startId]
  while (queue.length > 0) {
    const cur = queue.shift()
    for (const {to} of adjacency.get(cur) ?? []) {
      if (!visited.has(to)) {
        visited.add(to)
        queue.push(to)
      }
    }
  }
  return visited
}

// Dijkstra. ノード数が大きいと O(V²) で遅くなるが、鬼の path 更新は毎フレームでは
// ないので MVP では許容。必要になったらヒープ化する。
export function shortestPath(adjacency, startId, endId) {
  if (startId === endId) return [startId]

  const distances = new Map()
  const previous = new Map()
  distances.set(startId, 0)
  const visited = new Set()

  while (true) {
    let current = null
    let currentDist = Infinity
    for (const [id, d] of distances) {
      if (!visited.has(id) && d < currentDist) {
        current = id
        currentDist = d
      }
    }
    if (current === null) return [] // unreachable
    if (current === endId) break
    visited.add(current)

    for (const {to, weight} of adjacency.get(current) ?? []) {
      if (visited.has(to)) continue
      const newDist = currentDist + weight
      if (newDist < (distances.get(to) ?? Infinity)) {
        distances.set(to, newDist)
        previous.set(to, current)
      }
    }
  }

  const path = [endId]
  let cur = endId
  while (previous.has(cur)) {
    cur = previous.get(cur)
    path.unshift(cur)
  }
  return path
}
