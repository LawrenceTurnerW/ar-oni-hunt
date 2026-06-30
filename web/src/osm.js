import {distanceMeters} from './coords'

// 安全のため除外する道路種別。大通り (歩道なし or 車多め) は遊ばせない。
// それ以外（residential / unclassified / service / living_street / tertiary /
// footway / path / pedestrian / cycleway / steps / track …）は全部 OK。
const EXCLUDED_HIGHWAYS = [
  'motorway', 'trunk', 'primary', 'secondary',
  'motorway_link', 'trunk_link', 'primary_link', 'secondary_link',
]
const EXCLUDED_REGEX = `^(${EXCLUDED_HIGHWAYS.join('|')})$`

// 公開 Overpass エンドポイントを順に試す。
// 主サーバ (overpass-api.de) は混雑して 504 を返すことが多いので、ミラーから先に。
const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
]

export async function fetchRoadGraph(bbox) {
  const query = `
[out:json][timeout:60];
(
  way["highway"]["highway"!~"${EXCLUDED_REGEX}"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
);
out body;
>;
out skel qt;
`.trim()

  const errors = []
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      })
      if (!res.ok) {
        errors.push(`${new URL(url).host}: HTTP ${res.status}`)
        continue
      }
      return await res.json()
    } catch (err) {
      errors.push(`${new URL(url).host}: ${err.message}`)
    }
  }
  throw new Error(`Overpass 全エンドポイント失敗 — ${errors.join(' / ')}`)
}

export function buildGraph(osmData) {
  const nodes = new Map()
  const edges = []

  for (const el of osmData.elements ?? []) {
    if (el.type === 'node') {
      nodes.set(el.id, {lat: el.lat, lng: el.lon})
    }
  }

  for (const el of osmData.elements ?? []) {
    if (el.type !== 'way' || !Array.isArray(el.nodes)) continue
    for (let i = 0; i < el.nodes.length - 1; i++) {
      const a = el.nodes[i]
      const b = el.nodes[i + 1]
      const na = nodes.get(a)
      const nb = nodes.get(b)
      if (!na || !nb) continue
      const w = distanceMeters(na.lat, na.lng, nb.lat, nb.lng)
      edges.push({from: a, to: b, weight: w})
    }
  }

  return {nodes, edges}
}
