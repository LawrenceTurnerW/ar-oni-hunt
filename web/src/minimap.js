import {PHASE} from './oni'

const state = {
  setup: null,
  map: null,
  overlay: null,
  layers: null,
  visible: false,
}

export function initMiniMap(setup) {
  state.setup = setup
  state.overlay = document.createElement('div')
  state.overlay.id = 'minimap-overlay'
  state.overlay.hidden = true
  state.overlay.innerHTML = `
    <div id="minimap"></div>
    <button id="minimap-close">閉じる</button>
  `
  document.body.appendChild(state.overlay)
  document.getElementById('minimap-close').addEventListener('click', hideMiniMap)
}

export function showMiniMap() {
  if (!state.setup || !state.overlay) return
  state.overlay.hidden = false
  state.visible = true

  // AR シーンを裏で回し続けるとカメラ・SLAM が無駄に電力を食うので一時停止
  const scene = document.querySelector('a-scene')
  if (scene && scene.pause) scene.pause()

  // 地図ボタンと閉じるボタンが同位置・同 z-index で衝突するのを避ける
  const mapBtn = document.getElementById('map-btn')
  if (mapBtn) mapBtn.hidden = true

  if (!state.map) {
    const center = state.setup.field[0]
    state.map = L.map('minimap', {
      zoomControl: false,
      attributionControl: true,
    }).setView([center.lat, center.lng], 17)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OSM',
      maxZoom: 19,
    }).addTo(state.map)

    state.layers = {
      field: L.polygon(state.setup.field.map(p => [p.lat, p.lng]), {
        color: '#f33', fillOpacity: 0.1, weight: 2,
      }).addTo(state.map),
      items: L.layerGroup().addTo(state.map),
      player: null,
      oni: null,
    }
    const bounds = L.latLngBounds(state.setup.field.map(p => [p.lat, p.lng]))
    state.map.fitBounds(bounds, {padding: [20, 20]})
  } else {
    state.map.invalidateSize()
  }
  redrawItems()
}

export function hideMiniMap() {
  if (state.overlay) state.overlay.hidden = true
  state.visible = false
  const scene = document.querySelector('a-scene')
  if (scene && scene.play) scene.play()
  const mapBtn = document.getElementById('map-btn')
  if (mapBtn) mapBtn.hidden = false
}

export function isMiniMapVisible() {
  return state.visible
}

export function updateMiniMapPlayer(lat, lng) {
  if (!state.visible || !state.map) return
  if (!state.layers.player) {
    state.layers.player = L.circleMarker([lat, lng], {
      color: '#06f', fillColor: '#39f', fillOpacity: 0.9, radius: 8, weight: 3,
    }).addTo(state.map)
  } else {
    state.layers.player.setLatLng([lat, lng])
  }
}

export function updateMiniMapOni(lat, lng, phase) {
  if (!state.visible || !state.map) return
  const color =
    phase === PHASE.CHASE ? '#f00' :
    phase === PHASE.CAUGHT ? '#666' : '#900'
  if (!state.layers.oni) {
    state.layers.oni = L.circleMarker([lat, lng], {
      color: '#400', fillColor: color, fillOpacity: 1, radius: 8, weight: 3,
    }).addTo(state.map)
  } else {
    state.layers.oni.setLatLng([lat, lng])
    state.layers.oni.setStyle({fillColor: color})
  }
}

export function refreshMiniMapItems() {
  if (state.visible && state.map) redrawItems()
}

function redrawItems() {
  if (!state.layers) return
  state.layers.items.clearLayers()
  for (const item of state.setup.items) {
    L.circleMarker([item.lat, item.lng], {
      color: item.collected ? '#888' : '#c70',
      fillColor: item.collected ? '#aaa' : '#fa0',
      fillOpacity: item.collected ? 0.3 : 1,
      radius: 6,
      weight: 2,
    }).addTo(state.layers.items)
  }
}
