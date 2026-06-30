export function watchPosition(onUpdate) {
  if (!navigator.geolocation) {
    onUpdate({error: 'Geolocation API not available'})
    return () => {}
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => {
      onUpdate({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      })
    },
    (err) => {
      onUpdate({error: `${err.message} (code ${err.code})`})
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    }
  )
  return () => navigator.geolocation.clearWatch(id)
}

export function watchHeading(onUpdate) {
  const handler = (event) => {
    onUpdate({
      alpha: event.alpha,
      beta: event.beta,
      gamma: event.gamma,
      absolute: event.absolute,
      // alpha は Z 軸まわりの反時計回り回転 (deg)。コンパスヘディング
      // (時計回り、北=0) に変換: (360 - alpha) % 360。
      // 端末を上向き portrait で保持する前提。傾き補正は後日。
      heading: event.alpha !== null ? (360 - event.alpha + 360) % 360 : null,
    })
  }

  if ('ondeviceorientationabsolute' in window) {
    window.addEventListener('deviceorientationabsolute', handler)
    return () => window.removeEventListener('deviceorientationabsolute', handler)
  }

  window.addEventListener('deviceorientation', handler)
  return () => window.removeEventListener('deviceorientation', handler)
}
