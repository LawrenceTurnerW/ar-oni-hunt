import {gpsToLocal, distanceMeters} from './coords'
import {PHASE} from './oni'

const ITEM_VISIBLE_RADIUS = 7 // m

function waitForScene() {
  return new Promise(resolve => {
    const existing = document.querySelector('a-scene')
    if (existing) {
      resolve(existing)
      return
    }
    document.addEventListener('DOMContentLoaded', () => {
      resolve(document.querySelector('a-scene'))
    })
  })
}

export class ArScene {
  constructor() {
    this.scene = null
    this.origin = null
    this.items = []
    this.oni = null
    this.oniEntity = null
    this.onCollect = null

    waitForScene().then(scene => {
      this.scene = scene
      for (const item of this.items) this._attachItem(item)
      if (this.oni && !this.oniEntity) this._attachOni()
    })
  }

  setOrigin(origin) {
    this.origin = origin
    for (const item of this.items) this._repositionItem(item)
    if (this.oni) this._repositionOni()
  }

  addItem({id, lat, lng}) {
    const item = {id, lat, lng, entity: null, collected: false}
    this.items.push(item)
    if (this.scene) this._attachItem(item)
    return item
  }

  setOni(oni) {
    this.oni = oni
    if (this.scene && !this.oniEntity) this._attachOni()
  }

  updatePlayerPosition(lat, lng) {
    for (const item of this.items) {
      if (item.collected || !item.entity) continue
      const dist = distanceMeters(lat, lng, item.lat, item.lng)
      item.entity.setAttribute('visible', dist <= ITEM_VISIBLE_RADIUS)
    }
  }

  // 鬼の現在位置と phase を AR に反映
  syncOni() {
    if (!this.oni || !this.oniEntity) return
    this._repositionOni()
    const color =
      this.oni.phase === PHASE.CHASE ? '#ff2020' :
      this.oni.phase === PHASE.CAUGHT ? '#666' :
      '#a00000'
    this.oniEntity.setAttribute('color', color)
  }

  remainingItems() {
    return this.items.filter(i => !i.collected).length
  }

  _attachItem(item) {
    const entity = document.createElement('a-box')
    entity.setAttribute('color', '#ff3030')
    entity.setAttribute('scale', '0.4 0.4 0.4')
    entity.setAttribute('visible', 'false')
    entity.classList.add('cantap')
    entity.addEventListener('click', () => this._collect(item))
    this.scene.appendChild(entity)
    item.entity = entity
    if (this.origin) this._repositionItem(item)
  }

  _repositionItem(item) {
    if (!item.entity || !this.origin) return
    const pos = gpsToLocal(this.origin, item.lat, item.lng)
    item.entity.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`)
  }

  _attachOni() {
    const entity = document.createElement('a-box')
    entity.setAttribute('color', '#a00000')
    entity.setAttribute('scale', '1.5 2 1.5')
    entity.setAttribute('visible', 'true')
    this.scene.appendChild(entity)
    this.oniEntity = entity
    if (this.origin) this._repositionOni()
  }

  _repositionOni() {
    if (!this.oniEntity || !this.origin || !this.oni) return
    const pos = gpsToLocal(this.origin, this.oni.lat, this.oni.lng)
    // 鬼の中心を y=1 にしてカメラ高さ (1.5) と揃える
    this.oniEntity.setAttribute('position', `${pos.x} 1 ${pos.z}`)
  }

  _collect(item) {
    if (item.collected) return
    item.collected = true
    if (item.entity) item.entity.setAttribute('visible', 'false')
    if (this.onCollect) this.onCollect(item)
  }
}
