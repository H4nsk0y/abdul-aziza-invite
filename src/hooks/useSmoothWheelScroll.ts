import { useEffect } from 'react'

type ScrollImpulse = {
  distance: number
  last: number
  startedAt: number
}

const animationTime = 400
const stepSize = 100

function pulse(value: number) {
  let x = value * 4
  if (x < 1) return x - (1 - Math.exp(-x))

  const start = Math.exp(-1)
  x -= 1
  return start + (1 - Math.exp(-x)) * (1 - start)
}

const pulseNormalize = 1 / pulse(1)

function eased(value: number) {
  return pulse(value) * pulseNormalize
}

export function useSmoothWheelScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const impulses: ScrollImpulse[] = []
    let animationFrame = 0
    let lastWheelAt = 0

    function animate() {
      const now = performance.now()
      let scrollBy = 0

      for (let index = impulses.length - 1; index >= 0; index -= 1) {
        const impulse = impulses[index]
        const progress = Math.min(1, (now - impulse.startedAt) / animationTime)
        const position = eased(progress)
        scrollBy += impulse.distance * (position - impulse.last)
        impulse.last = position

        if (progress >= 1) impulses.splice(index, 1)
      }

      if (scrollBy) window.scrollBy(0, scrollBy)
      if (impulses.length) animationFrame = requestAnimationFrame(animate)
      else animationFrame = 0
    }

    function onWheel(event: WheelEvent) {
      if (event.defaultPrevented || event.ctrlKey || document.body.classList.contains('is-locked')) return

      const target = event.target as HTMLElement | null
      if (target?.closest('textarea, select, [data-native-scroll]')) return

      let delta = event.deltaY
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) delta *= 40
      if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) delta *= window.innerHeight
      if (!delta) return

      if (Math.abs(delta) > 1.2) delta *= stepSize / 120

      const now = performance.now()
      const elapsed = now - lastWheelAt
      if (elapsed < 50 && elapsed > 0) delta *= Math.min(3, (1 + 50 / elapsed) / 2)
      lastWheelAt = now

      impulses.push({ distance: delta, last: 0, startedAt: now })
      event.preventDefault()

      if (!animationFrame) animationFrame = requestAnimationFrame(animate)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', onWheel)
      if (animationFrame) cancelAnimationFrame(animationFrame)
    }
  }, [enabled])
}
