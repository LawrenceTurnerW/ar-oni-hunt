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
      lines.push(`α:${fmt(state.heading.alpha, 1)} β:${fmt(state.heading.beta, 1)} γ:${fmt(state.heading.gamma, 1)}`)
    } else {
      lines.push('waiting…')
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
  }
}
