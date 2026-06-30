import {distanceMeters} from './coords'
import {findNearestNode, shortestPath} from './graph'

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
  const nodeIds = Array.from(graph.nodes.keys())
  if (nodeIds.length === 0) {
    throw new Error('Cannot spawn oni: empty graph')
  }
  const startNodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)]
  const startNode = graph.nodes.get(startNodeId)
  return {
    lat: startNode.lat,
    lng: startNode.lng,
    phase: PHASE.PATROL,
    currentNodeId: startNodeId,
    pathQueue: [],
    awayTimer: 0,
    _graph: graph,
    _adjacency: adjacency,
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

  // Chase 中は player の最寄り node を毎 tick 目標にする (path が空 or 短い時のみ
  // 再計算するとパフォーマンス的に楽)
  if (oni.phase === PHASE.CHASE) {
    if (oni.pathQueue.length === 0) {
      const target = findNearestNode(player.lat, player.lng, oni._graph)
      if (target != null) {
        oni.pathQueue = shortestPath(oni._adjacency, oni.currentNodeId, target)
        if (oni.pathQueue[0] === oni.currentNodeId) oni.pathQueue.shift()
      }
    }
  } else if (oni.phase === PHASE.PATROL) {
    if (oni.pathQueue.length === 0) {
      const nodeIds = Array.from(oni._graph.nodes.keys())
      let attempts = 0
      while (oni.pathQueue.length === 0 && attempts < 5) {
        const target = nodeIds[Math.floor(Math.random() * nodeIds.length)]
        oni.pathQueue = shortestPath(oni._adjacency, oni.currentNodeId, target)
        if (oni.pathQueue[0] === oni.currentNodeId) oni.pathQueue.shift()
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
