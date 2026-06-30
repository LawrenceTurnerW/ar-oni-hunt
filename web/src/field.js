import {distanceMeters} from './coords'

export function fieldBbox(polygon) {
  let south = Infinity
  let west = Infinity
  let north = -Infinity
  let east = -Infinity
  for (const p of polygon) {
    if (p.lat < south) south = p.lat
    if (p.lat > north) north = p.lat
    if (p.lng < west) west = p.lng
    if (p.lng > east) east = p.lng
  }
  return {south, west, north, east}
}

export function fieldCentroid(polygon) {
  let lat = 0
  let lng = 0
  for (const p of polygon) {
    lat += p.lat
    lng += p.lng
  }
  return {lat: lat / polygon.length, lng: lng / polygon.length}
}

export function maxRadiusMeters(polygon) {
  const c = fieldCentroid(polygon)
  let max = 0
  for (const p of polygon) {
    const d = distanceMeters(c.lat, c.lng, p.lat, p.lng)
    if (d > max) max = d
  }
  return max
}

// プロット用のしきい値とアイテム数。
export function chooseItemCount(polygon) {
  const r = maxRadiusMeters(polygon)
  if (r < 100) return 5
  if (r < 300) return 12
  return 25
}

// 点 (lat/lng) が多角形内にあるか。ray casting。
export function isInPolygon(point, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng
    const yi = polygon[i].lat
    const xj = polygon[j].lng
    const yj = polygon[j].lat
    const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
      (point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}
