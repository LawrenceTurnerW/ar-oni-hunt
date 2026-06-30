import './index.css'
import {watchPosition, watchHeading} from './geo'
import {createHud, showFullscreenMessage} from './hud'
import {ArScene} from './ar'
import {distanceMeters, relativeBearing} from './coords'
import {loadSetup} from './storage'
import {buildAdjacency} from './graph'
import {createOni, tickOni, PHASE} from './oni'

const ONI_TICK_MS = 250

const setup = loadSetup()

if (!setup) {
  showFullscreenMessage({
    title: 'セットアップが必要です',
    body: 'フィールドと道路グラフをまだ用意していません。セットアップページから作成してください。',
    action: {
      label: 'セットアップへ',
      onClick: () => { window.location.href = './setup.html' },
    },
  })
} else {
  showFullscreenMessage({
    title: 'ar-oni-hunt',
    body: `
      ・周囲の交通・歩行者に注意してください<br>
      ・画面ばかり見ず、適宜顔を上げてください<br>
      ・走らないでください<br>
      <br>
      <b>開始時は北を向いてスマホを持ってください</b><br>
      (AR の座標系は起動時のヘディング基準で決まります)
    `,
    action: {
      label: 'ゲーム開始',
      onClick: () => {
        document.getElementById('overlay').remove()
        startGame(setup)
      },
    },
  })
}

function startGame(setup) {
  const hud = createHud()
  const ar = new ArScene()
  const adjacency = buildAdjacency(setup.graph)

  for (const item of setup.items) ar.addItem(item)
  hud.setItems({collected: 0, total: setup.items.length})

  const oni = createOni({graph: setup.graph, adjacency})
  ar.setOni(oni)

  let lastHeading = null
  let origin = null
  let playerPos = null
  let gameOver = false

  ar.onCollect = () => {
    const collected = setup.items.length - ar.remainingItems()
    hud.setItems({collected, total: setup.items.length})
    if (collected === setup.items.length && !gameOver) {
      gameOver = true
      showFullscreenMessage({
        title: 'クリア！',
        body: `${setup.items.length} 個のアイテムを全部回収しました。`,
        action: {label: 'もう一度', onClick: () => location.reload()},
      })
    }
  }

  watchHeading(data => {
    hud.setHeading(data)
    if (data.heading !== null) lastHeading = data.heading
  })

  watchPosition(data => {
    hud.setPosition(data)
    if (data.error) return

    playerPos = {lat: data.lat, lng: data.lng}

    if (!origin && lastHeading !== null) {
      origin = {lat: data.lat, lng: data.lng, headingDeg: lastHeading}
      ar.setOrigin(origin)
    }

    ar.updatePlayerPosition(data.lat, data.lng)
    updateOniHud()
  })

  function updateOniHud() {
    if (!playerPos) return
    const dist = distanceMeters(playerPos.lat, playerPos.lng, oni.lat, oni.lng)
    const rel = lastHeading !== null
      ? relativeBearing(playerPos.lat, playerPos.lng, lastHeading, oni.lat, oni.lng)
      : null
    hud.setOni({phase: oni.phase, distance: dist, relativeBearing: rel})
  }

  setInterval(() => {
    if (gameOver) return
    if (!playerPos) return
    tickOni(oni, playerPos, ONI_TICK_MS / 1000)
    ar.syncOni()
    updateOniHud()

    if (oni.phase === PHASE.CAUGHT && !gameOver) {
      gameOver = true
      const collected = setup.items.length - ar.remainingItems()
      showFullscreenMessage({
        title: '捕まった…',
        body: `回収アイテム: ${collected} / ${setup.items.length}`,
        action: {label: 'もう一度', onClick: () => location.reload()},
      })
    }
  }, ONI_TICK_MS)
}
