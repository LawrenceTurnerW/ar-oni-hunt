import {gpsToLocal, distanceMeters} from './coords'

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
    this.onCollect = null

    waitForScene().then(scene => {
      this.scene = scene
      for (const item of this.items) {
        this._attach(item)
      }
    })
  }

  setOrigin(origin) {
    this.origin = origin
    for (const item of this.items) {
      this._reposition(item)
    }
  }

  addItem({id, lat, lng}) {
    const item = {id, lat, lng, entity: null, collected: false}
    this.items.push(item)
    if (this.scene) this._attach(item)
    return item
  }

  updatePlayerPosition(lat, lng) {
    for (const item of this.items) {
      if (item.collected || !item.entity) continue
      const dist = distanceMeters(lat, lng, item.lat, item.lng)
      const visible = dist <= ITEM_VISIBLE_RADIUS
      item.entity.setAttribute('visible', visible)
    }
  }

  _attach(item) {
    const entity = document.createElement('a-box')
    entity.setAttribute('color', '#ff3030')
    entity.setAttribute('scale', '0.4 0.4 0.4')
    entity.setAttribute('visible', 'false')
    entity.classList.add('cantap')
    entity.addEventListener('click', () => this._collect(item))
    this.scene.appendChild(entity)
    item.entity = entity
    if (this.origin) this._reposition(item)
  }

  _reposition(item) {
    if (!item.entity || !this.origin) return
    const pos = gpsToLocal(this.origin, item.lat, item.lng)
    item.entity.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`)
  }

  _collect(item) {
    if (item.collected) return
    item.collected = true
    if (item.entity) item.entity.setAttribute('visible', 'false')
    if (this.onCollect) this.onCollect(item)
  }
}
