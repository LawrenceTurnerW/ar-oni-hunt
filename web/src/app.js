import './index.css'
import {watchPosition, watchHeading} from './geo'
import {createHud} from './hud'

const hud = createHud()
watchPosition(hud.setPosition)
watchHeading(hud.setHeading)
