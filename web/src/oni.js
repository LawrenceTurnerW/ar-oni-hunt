import {distanceMeters} from './coords'
import {findNearestNodeIn, reachableNodes, shortestPath} from './graph'

export const PHASE = {
  PATROL: 'patrol',
  CHASE: 'chase',
  CAUGHT: 'caught',
}

export const PATROL_SPEED = 0.8 // m/s
export const CHASE_SPEED = 1.0
export const DETECT_RADIUS = 15 // m
export const CATCH_RADIUS = 5
export const RETURN_RADIUS = 20 // chase 解除距離
export const RETURN_DELAY = 5 // s

export function createOni({graph, adjacency}) {
  // 孤立ノード (edge を持たないもの) は除外して候補化。
  const candidateNodeIds = Array.from(adjacency.keys())
  if (candidateNodeIds.length === 0) {
    throw new Error('Cannot spawn oni: no connected nodes in graph')
  }

  // 「ある程度大きい連結成分」内のノードに spawn したい。
  // ランダム start を試して reachable.size が最大のものを採用 (最大10回試行)。
  let bestStart = null
  let bestReachable = null
  for (let i = 0; i < 10; i++) {
    const candidate = candidateNodeIds[Math.floor(Math.random() * candidateNodeIds.length)]
    const r = reachableNodes(adjacency, candidate)
    if (!bestReachable || r.size > bestReachable.size) {
      bestStart = candidate
      bestReachable = r
      if (r.size > 50) break
    }
  }

  const startNode = graph.nodes.get(bestStart)
  return {
    lat: startNode.lat,
    lng: startNode.lng,
    phase: PHASE.PATROL,
    currentNodeId: bestStart,
    pathQueue: [],
    awayTimer: 0,
    _graph: graph,
    _adjacency: adjacency,
    _reachable: bestReachable,
    _reachableArr: Array.from(bestReachable),
  }
}

// 状態と位置を進める。dt は秒。
export function tickOni(oni, player, dt) {
  if (oni.phase === PHASE.CAUGHT) return oni

  const distToPlayer = distanceMeters(oni.lat, oni.lng, player.lat, player.lng)

  // Phase 遷移
  if (oni.phase === PHASE.PATROL) {
    if (distToPlayer < DETECT_RADIUS) {
      oni.phase = PHASE.CHASE
      oni.pathQueue = []
      oni.awayTimer = 0
    }
  } else if (oni.phase === PHASE.CHASE) {
    if (distToPlayer < CATCH_RADIUS) {
      oni.phase = PHASE.CAUGHT
      return oni
    }
    if (distToPlayer > RETURN_RADIUS) {
      oni.awayTimer += dt
      if (oni.awayTimer >= RETURN_DELAY) {
        oni.phase = PHASE.PATROL
        oni.awayTimer = 0
        oni.pathQueue = []
      }
    } else {
      oni.awayTimer = 0
    }
  }

  // 目標選びは「自分の連結成分内」に限定。OSM の分断成分でハマるのを防ぐ。
  if (oni.phase === PHASE.CHASE) {
    if (oni.pathQueue.length === 0) {
      const target = findNearestNodeIn(player.lat, player.lng, oni._graph, oni._reachable)
      if (target != null && target !== oni.currentNodeId) {
        oni.pathQueue = shortestPath(oni._adjacency, oni.currentNodeId, target)
        if (oni.pathQueue[0] === oni.currentNodeId) oni.pathQueue.shift()
      }
    }
  } else if (oni.phase === PHASE.PATROL) {
    if (oni.pathQueue.length === 0 && oni._reachableArr.length > 1) {
      let attempts = 0
      while (oni.pathQueue.length === 0 && attempts < 5) {
        const target = oni._reachableArr[Math.floor(Math.random() * oni._reachableArr.length)]
        if (target !== oni.currentNodeId) {
          oni.pathQueue = shortestPath(oni._adjacency, oni.currentNodeId, target)
          if (oni.pathQueue[0] === oni.currentNodeId) oni.pathQueue.shift()
        }
        attempts++
      }
    }
  }

  const speed = oni.phase === PHASE.CHASE ? CHASE_SPEED : PATROL_SPEED
  let remaining = speed * dt

  // パスを辿りつつ remaining メートルだけ進める
  while (remaining > 0 && oni.pathQueue.length > 0) {
    const nextNodeId = oni.pathQueue[0]
    const nextNode = oni._graph.nodes.get(nextNodeId)
    if (!nextNode) {
      oni.pathQueue.shift()
      continue
    }
    const toNext = distanceMeters(oni.lat, oni.lng, nextNode.lat, nextNode.lng)
    if (remaining >= toNext) {
      oni.lat = nextNode.lat
      oni.lng = nextNode.lng
      oni.currentNodeId = nextNodeId
      oni.pathQueue.shift()
      remaining -= toNext
    } else {
      const t = remaining / toNext
      oni.lat += (nextNode.lat - oni.lat) * t
      oni.lng += (nextNode.lng - oni.lng) * t
      remaining = 0
    }
  }

  return oni
}
