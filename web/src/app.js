import './index.css'
import {watchPosition, watchHeading} from './geo'
import {createHud} from './hud'
import {ArScene} from './ar'
import {distanceMeters, offsetGps} from './coords'

const hud = createHud()
const ar = new ArScene()

let lastHeading = null
let origin = null
let testItem = null

ar.onCollect = (item) => {
  if (item === testItem) hud.markCollected()
}

watchHeading(data => {
  hud.setHeading(data)
  if (data.heading !== null) lastHeading = data.heading
})

watchPosition(data => {
  hud.setPosition(data)
  if (data.error) return

  if (!origin && lastHeading !== null) {
    origin = {lat: data.lat, lng: data.lng, headingDeg: lastHeading}
    ar.setOrigin(origin)
    hud.setOrigin(origin)

    // 起点から 10m 北にテストアイテムを配置
    const itemPos = offsetGps(data.lat, data.lng, 10, 0)
    testItem = ar.addItem({id: 'test', lat: itemPos.lat, lng: itemPos.lng})
    hud.setItem({lat: itemPos.lat, lng: itemPos.lng})
  }

  if (testItem && !testItem.collected) {
    const dist = distanceMeters(data.lat, data.lng, testItem.lat, testItem.lng)
    hud.setItemDistance(dist)
  }

  ar.updatePlayerPosition(data.lat, data.lng)
})
