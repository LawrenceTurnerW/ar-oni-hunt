import './setup.css'
import {fetchRoadGraph, buildGraph} from './osm'
import {fieldBbox} from './field'
import {placeItems} from './items'
import {saveSetup} from './storage'

const DEFAULT_CENTER = [35.6762, 139.6503] // 東京駅。GPS が取れなければここから
const DEFAULT_ZOOM = 17

const state = {
  map: null,
  polygon: [],
  polygonLayer: null,
  vertexLayer: null,
  graph: null,
  graphLayer: null,
  itemLayer: null,
  items: [],
  phase: 'editing', // 'editing' | 'fetching' | 'ready'
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
    if (state.phase !== 'editing') return
    addVertex(e.latlng.lat, e.latlng.lng)
  })

  document.getElementById('reset').addEventListener('click', reset)
  document.getElementById('confirm').addEventListener('click', confirmField)
  document.getElementById('start').addEventListener('click', startGame)
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
  state.polygon = []
  state.graph = null
  state.items = []
  state.phase = 'editing'
  state.vertexLayer.clearLayers()
  if (state.polygonLayer) {
    state.map.removeLayer(state.polygonLayer)
    state.polygonLayer = null
  }
  if (state.graphLayer) {
    state.map.removeLayer(state.graphLayer)
    state.graphLayer = null
  }
  if (state.itemLayer) {
    state.map.removeLayer(state.itemLayer)
    state.itemLayer = null
  }
  setStatus('')
  updateUI()
}

function startGame() {
  saveSetup({field: state.polygon, graph: state.graph, items: state.items})
  window.location.href = './index.html'
}

function updateUI() {
  const confirmBtn = document.getElementById('confirm')
  const startBtn = document.getElementById('start')
  const stats = document.getElementById('stats')
  confirmBtn.disabled = state.phase !== 'editing' || state.polygon.length < 3
  startBtn.hidden = state.phase !== 'ready'
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
