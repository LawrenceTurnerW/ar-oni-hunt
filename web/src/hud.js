function fmt(num, digits = 6) {
  if (num === null || num === undefined) return '—'
  if (typeof num !== 'number' || Number.isNaN(num)) return String(num)
  return num.toFixed(digits)
}

export function createHud() {
  const el = document.createElement('div')
  el.id = 'hud'
  document.body.appendChild(el)

  const state = {
    pos: null,
    posError: null,
    heading: null,
    origin: null,
    item: null,
    itemDistance: null,
    collected: false,
  }

  function render() {
    const lines = []

    lines.push('<b>GPS</b>')
    if (state.posError) {
      lines.push(`<span class="err">${state.posError}</span>`)
    } else if (state.pos) {
      lines.push(`lat: ${fmt(state.pos.lat, 6)}`)
      lines.push(`lng: ${fmt(state.pos.lng, 6)}`)
      lines.push(`±${fmt(state.pos.accuracy, 1)}m`)
    } else {
      lines.push('acquiring…')
    }

    lines.push('<b>Heading</b>')
    if (state.heading) {
      const h = state.heading.heading
      const mode = state.heading.absolute ? 'abs' : 'rel'
      lines.push(`${h === null ? '—' : fmt(h, 1) + '°'} (${mode})`)
    } else {
      lines.push('waiting…')
    }

    if (state.origin) {
      lines.push('<b>Origin</b>')
      lines.push(`lat: ${fmt(state.origin.lat, 6)}`)
      lines.push(`lng: ${fmt(state.origin.lng, 6)}`)
      lines.push(`heading: ${fmt(state.origin.headingDeg, 1)}°`)
    }

    if (state.item) {
      lines.push('<b>Item</b>')
      if (state.collected) {
        lines.push('<span class="ok">collected!</span>')
      } else {
        lines.push(`dist: ${fmt(state.itemDistance, 2)}m`)
      }
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
    setOrigin(origin) {
      state.origin = origin
      render()
    },
    setItem(item) {
      state.item = item
      state.collected = false
      render()
    },
    setItemDistance(distance) {
      state.itemDistance = distance
      render()
    },
    markCollected() {
      state.collected = true
      render()
    },
  }
}
