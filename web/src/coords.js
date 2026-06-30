const DEG_TO_RAD = Math.PI / 180
const METERS_PER_DEG_LAT = 111_320

function metersPerDegLng(lat0Deg) {
  return METERS_PER_DEG_LAT * Math.cos(lat0Deg * DEG_TO_RAD)
}

export function gpsToWorldOffset(lat0, lng0, lat, lng) {
  return {
    east: (lng - lng0) * metersPerDegLng(lat0),
    north: (lat - lat0) * METERS_PER_DEG_LAT,
  }
}

// 起点で heading 方向を向いていたユーザから見た、世界座標オフセット
// (east, north) のローカル AR 位置 (A-Frame の x: 右, z: 後方なので前方は -z)。
export function worldOffsetToLocal(east, north, headingDeg) {
  const distance = Math.hypot(east, north)
  if (distance === 0) return {x: 0, y: 0, z: 0}
  const bearing = Math.atan2(east, north) * 180 / Math.PI
  const relRad = (bearing - headingDeg) * DEG_TO_RAD
  return {
    x: distance * Math.sin(relRad),
    y: 0,
    z: -distance * Math.cos(relRad),
  }
}

export function gpsToLocal(origin, lat, lng) {
  const offset = gpsToWorldOffset(origin.lat, origin.lng, lat, lng)
  return worldOffsetToLocal(offset.east, offset.north, origin.headingDeg)
}

export function distanceMeters(lat0, lng0, lat, lng) {
  const offset = gpsToWorldOffset(lat0, lng0, lat, lng)
  return Math.hypot(offset.east, offset.north)
}

// 起点緯度 lat0 から north meters / east meters だけ離れた点の GPS 座標
export function offsetGps(lat0, lng0, northMeters, eastMeters) {
  return {
    lat: lat0 + northMeters / METERS_PER_DEG_LAT,
    lng: lng0 + eastMeters / metersPerDegLng(lat0),
  }
}

// (lat0, lng0) から (lat, lng) への方位角 (北=0、時計回り)
export function bearingFromNorth(lat0, lng0, lat, lng) {
  const offset = gpsToWorldOffset(lat0, lng0, lat, lng)
  return (Math.atan2(offset.east, offset.north) * 180 / Math.PI + 360) % 360
}

// プレイヤーが headingDeg を向いている時、target への相対方向 (-180〜180)。
// 負: 左、正: 右、0: 正面。
export function relativeBearing(lat0, lng0, headingDeg, lat, lng) {
  const abs = bearingFromNorth(lat0, lng0, lat, lng)
  let rel = abs - headingDeg
  while (rel > 180) rel -= 360
  while (rel < -180) rel += 360
  return rel
}
