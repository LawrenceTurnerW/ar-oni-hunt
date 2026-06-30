import {PHASE} from './oni'

function fmt(num, digits = 6) {
  if (num === null || num === undefined) return '—'
  if (typeof num !== 'number' || Number.isNaN(num)) return String(num)
  return num.toFixed(digits)
}

function arrow(rel) {
  if (rel === null || rel === undefined) return ''
  if (Math.abs(rel) < 15) return '↑'
  if (Math.abs(rel) > 165) return '↓'
  return rel < 0 ? '←' : '→'
}

export function createHud() {
  const el = document.createElement('div')
  el.id = 'hud'
  document.body.appendChild(el)

  const state = {
    pos: null,
    posError: null,
    heading: null,
    oni: null,
    items: null,
    nearestItem: null,
  }

  function render() {
    const lines = []

    lines.push('<b>GPS</b>')
    if (state.posError) {
      lines.push(`<span class="err">${state.posError}</span>`)
    } else if (state.pos) {
      lines.push(`${fmt(state.pos.lat, 5)}, ${fmt(state.pos.lng, 5)} ±${fmt(state.pos.accuracy, 0)}m`)
    } else {
      lines.push('acquiring…')
    }

    if (state.heading) {
      const h = state.heading.heading
      const mode = state.heading.absolute ? 'abs' : 'rel'
      lines.push(`heading: ${h === null ? '—' : fmt(h, 0) + '°'} (${mode})`)
    }

    if (state.items) {
      lines.push(`<b>アイテム</b> ${state.items.collected}/${state.items.total}`)
    }

    if (state.nearestItem) {
      const {distance, relativeBearing: rel} = state.nearestItem
      const note = distance <= 7 ? ' <span class="ok">タップで回収</span>' : ''
      lines.push(`最寄り: ${fmt(distance, 1)}m ${arrow(rel)} ${rel === null ? '—' : fmt(rel, 0) + '°'}${note}`)
    }

    if (state.oni) {
      const phaseLabel = {
        [PHASE.PATROL]: 'patrol',
        [PHASE.CHASE]: '<span class="warn">CHASE!</span>',
        [PHASE.CAUGHT]: '<span class="err">CAUGHT</span>',
      }[state.oni.phase] ?? state.oni.phase
      lines.push(`<b>鬼</b> ${phaseLabel}`)
      lines.push(`dist: ${fmt(state.oni.distance, 1)}m ${arrow(state.oni.relativeBearing)} ${fmt(state.oni.relativeBearing, 0)}°`)
    }

    el.innerHTML = lines.join('<br>')
  }

  render()

  return {
    setPosition(data) {
      if (data.error) {
        state.posError = data.error
        state.pos = null
      } else {
        state.pos = data
        state.posError = null
      }
      render()
    },
    setHeading(data) {
      state.heading = data
      render()
    },
    setOni(data) {
      state.oni = data
      render()
    },
    setItems(data) {
      state.items = data
      render()
    },
    setNearestItem(data) {
      state.nearestItem = data
      render()
    },
  }
}

export function createMapButton(onClick) {
  const btn = document.createElement('button')
  btn.id = 'map-btn'
  btn.textContent = '🗺'
  btn.setAttribute('aria-label', '地図を開く')
  btn.addEventListener('click', onClick)
  document.body.appendChild(btn)
  return btn
}

export function showFullscreenMessage({title, body, action}) {
  document.getElementById('overlay')?.remove()
  const wrap = document.createElement('div')
  wrap.id = 'overlay'
  wrap.innerHTML = `
    <div class="overlay-card">
      <h1>${title}</h1>
      <p>${body}</p>
      ${action ? `<button id="overlay-action">${action.label}</button>` : ''}
    </div>
  `
  document.body.appendChild(wrap)
  if (action) {
    document.getElementById('overlay-action').addEventListener('click', action.onClick)
  }
  return () => wrap.remove()
}
