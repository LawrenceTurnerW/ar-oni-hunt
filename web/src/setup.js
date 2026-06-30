import './setup.css'
import {fetchRoadGraph, buildGraph} from './osm'
import {fieldBbox, fieldCentroid} from './field'
import {placeItems} from './items'
import {saveSetup} from './storage'
import {buildAdjacency} from './graph'
import {createOni, tickOni, PHASE} from './oni'
import {distanceMeters} from './coords'

const DEFAULT_CENTER = [35.6762, 139.6503]
const DEFAULT_ZOOM = 17
const SIM_TICK_MS = 250

const state = {
  map: null,
  polygon: [],
  polygonLayer: null,
  vertexLayer: null,
  graph: null,
  adjacency: null,
  graphLayer: null,
  itemLayer: null,
  items: [],
  phase: 'editing', // 'editing' | 'fetching' | 'ready' | 'simulating'
  // sim
  oni: null,
  oniMarker: null,
  player: null,
  playerMarker: null,
  detectCircle: null,
  simIntervalId: null,
  simElapsed: 0,
}

function init() {
  state.map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(state.map)

  state.vertexLayer = L.layerGroup().addTo(state.map)

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        state.map.setView([pos.coords.latitude, pos.coords.longitude], 18)
      },
      err => console.warn('GPS unavailable:', err),
      {enableHighAccuracy: true, maximumAge: 60000, timeout: 8000},
    )
  }

  state.map.on('click', e => {
    if (state.phase === 'editing') {
      addVertex(e.latlng.lat, e.latlng.lng)
    } else if (state.phase === 'simulating') {
      movePlayer(e.latlng.lat, e.latlng.lng)
    }
  })

  document.getElementById('reset').addEventListener('click', reset)
  document.getElementById('confirm').addEventListener('click', confirmField)
  document.getElementById('start').addEventListener('click', startGame)
  document.getElementById('simulate').addEventListener('click', startSim)
  document.getElementById('stopSim').addEventListener('click', stopSim)
}

function addVertex(lat, lng) {
  state.polygon.push({lat, lng})
  redrawPolygon()
  updateUI()
}

function redrawPolygon() {
  state.vertexLayer.clearLayers()
  for (const v of state.polygon) {
    L.circleMarker([v.lat, v.lng], {color: '#f33', radius: 6, fillColor: '#f33', fillOpacity: 1})
      .addTo(state.vertexLayer)
  }
  if (state.polygonLayer) {
    state.map.removeLayer(state.polygonLayer)
    state.polygonLayer = null
  }
  if (state.polygon.length >= 3) {
    state.polygonLayer = L.polygon(state.polygon.map(v => [v.lat, v.lng]), {
      color: '#f33',
      fillOpacity: 0.1,
      weight: 2,
    }).addTo(state.map)
  } else if (state.polygon.length === 2) {
    state.polygonLayer = L.polyline(state.polygon.map(v => [v.lat, v.lng]), {color: '#f33', weight: 2})
      .addTo(state.map)
  }
}

function drawGraph(graph) {
  if (state.graphLayer) state.map.removeLayer(state.graphLayer)
  state.graphLayer = L.layerGroup().addTo(state.map)
  for (const edge of graph.edges) {
    const a = graph.nodes.get(edge.from)
    const b = graph.nodes.get(edge.to)
    if (!a || !b) continue
    L.polyline([[a.lat, a.lng], [b.lat, b.lng]], {color: '#36f', weight: 3, opacity: 0.6})
      .addTo(state.graphLayer)
  }
}

function drawItems(items) {
  if (state.itemLayer) state.map.removeLayer(state.itemLayer)
  state.itemLayer = L.layerGroup().addTo(state.map)
  for (const item of items) {
    L.circleMarker([item.lat, item.lng], {
      color: '#c70',
      fillColor: '#fa0',
      fillOpacity: 1,
      radius: 6,
      weight: 2,
    }).addTo(state.itemLayer)
  }
}

async function confirmField() {
  if (state.polygon.length < 3) return
  state.phase = 'fetching'
  setStatus('道路グラフを取得中…')
  updateUI()

  try {
    const bbox = fieldBbox(state.polygon)
    const osm = await fetchRoadGraph(bbox)
    const graph = buildGraph(osm)
    state.graph = graph
    state.adjacency = buildAdjacency(graph)
    drawGraph(graph)

    const items = placeItems(state.polygon, graph)
    state.items = items
    drawItems(items)

    setStatus(`道路: ${graph.nodes.size} ノード / ${graph.edges.length} エッジ, アイテム: ${items.length}`)
    state.phase = 'ready'
  } catch (err) {
    console.error(err)
    setStatus(`エラー: ${err.message}`)
    state.phase = 'editing'
  }
  updateUI()
}

function reset() {
  if (state.simIntervalId !== null) stopSim()
  state.polygon = []
  state.graph = null
  state.adjacency = null
  state.items = []
  state.phase = 'editing'
  state.vertexLayer.clearLayers()
  if (state.polygonLayer) { state.map.removeLayer(state.polygonLayer); state.polygonLayer = null }
  if (state.graphLayer) { state.map.removeLayer(state.graphLayer); state.graphLayer = null }
  if (state.itemLayer) { state.map.removeLayer(state.itemLayer); state.itemLayer = null }
  setStatus('')
  updateUI()
}

function startGame() {
  saveSetup({field: state.polygon, graph: state.graph, items: state.items})
  window.location.href = './index.html'
}

function startSim() {
  if (!state.graph || state.graph.nodes.size === 0) {
    setStatus('道路が無いのでシミュレーション不可')
    return
  }
  state.phase = 'simulating'
  state.simElapsed = 0
  state.oni = createOni({graph: state.graph, adjacency: state.adjacency})
  state.player = fieldCentroid(state.polygon)

  state.playerMarker = L.circleMarker([state.player.lat, state.player.lng], {
    color: '#06f', fillColor: '#39f', fillOpacity: 0.9, radius: 9, weight: 3,
  }).addTo(state.map)

  state.oniMarker = L.circleMarker([state.oni.lat, state.oni.lng], {
    color: '#700', fillColor: '#c00', fillOpacity: 1, radius: 8, weight: 3,
  }).addTo(state.map)

  state.detectCircle = L.circle([state.oni.lat, state.oni.lng], {
    radius: 15, color: '#c00', weight: 1, fill: false, opacity: 0.3,
  }).addTo(state.map)

  state.simIntervalId = setInterval(simTick, SIM_TICK_MS)
  updateSimStatus()
  updateUI()
}

function stopSim() {
  if (state.simIntervalId !== null) {
    clearInterval(state.simIntervalId)
    state.simIntervalId = null
  }
  if (state.oniMarker) { state.map.removeLayer(state.oniMarker); state.oniMarker = null }
  if (state.playerMarker) { state.map.removeLayer(state.playerMarker); state.playerMarker = null }
  if (state.detectCircle) { state.map.removeLayer(state.detectCircle); state.detectCircle = null }
  state.oni = null
  state.player = null
  state.phase = 'ready'
  document.getElementById('simStatus').hidden = true
  updateUI()
}

function movePlayer(lat, lng) {
  state.player = {lat, lng}
  state.playerMarker.setLatLng([lat, lng])
}

function simTick() {
  if (!state.oni || !state.player) return
  const dt = SIM_TICK_MS / 1000
  state.simElapsed += dt
  tickOni(state.oni, state.player, dt)
  state.oniMarker.setLatLng([state.oni.lat, state.oni.lng])
  state.detectCircle.setLatLng([state.oni.lat, state.oni.lng])

  if (state.oni.phase === PHASE.CHASE) {
    state.oniMarker.setStyle({fillColor: '#f00', color: '#900', radius: 10})
  } else if (state.oni.phase === PHASE.CAUGHT) {
    state.oniMarker.setStyle({fillColor: '#666', color: '#222'})
    clearInterval(state.simIntervalId)
    state.simIntervalId = null
  } else {
    state.oniMarker.setStyle({fillColor: '#c00', color: '#700', radius: 8})
  }
  updateSimStatus()
}

function updateSimStatus() {
  if (!state.oni || !state.player) return
  const el = document.getElementById('simStatus')
  const dist = distanceMeters(state.oni.lat, state.oni.lng, state.player.lat, state.player.lng)
  const phase = state.oni.phase
  const phaseLabel = {patrol: 'Patrol', chase: 'CHASE', caught: 'CAUGHT'}[phase]
  el.hidden = false
  el.innerHTML = `
    <div>経過: ${state.simElapsed.toFixed(1)}s</div>
    <div>鬼: <span class="phase-${phase}">${phaseLabel}</span></div>
    <div>距離: ${dist.toFixed(1)}m</div>
    <div style="color:#666;margin-top:4px">マップタップでプレイヤー移動</div>
  `
}

function updateUI() {
  const confirmBtn = document.getElementById('confirm')
  const startBtn = document.getElementById('start')
  const simulateBtn = document.getElementById('simulate')
  const stopBtn = document.getElementById('stopSim')
  const stats = document.getElementById('stats')

  confirmBtn.disabled = state.phase !== 'editing' || state.polygon.length < 3
  startBtn.hidden = state.phase !== 'ready'
  simulateBtn.hidden = state.phase !== 'ready'
  stopBtn.hidden = state.phase !== 'simulating'
  stats.textContent = `頂点: ${state.polygon.length}`
}

function setStatus(msg) {
  document.getElementById('status').textContent = msg
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
