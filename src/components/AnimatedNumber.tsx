import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

type Props = {
  value: number
  format?: (n: number) => string
  className?: string
  durationMs?: number
  throttleMs?: number
  quiet?: boolean
}

function defaultFormat(n: number) {
  return n.toFixed(2)
}

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', onStoreChange)
  return () => mq.removeEventListener('change', onStoreChange)
}

function getReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function AnimatedNumber({
  value,
  format = defaultFormat,
  className,
  durationMs = 600,
  throttleMs = 0,
  quiet = false,
}: Props) {
  const reduce = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false)
  const [display, setDisplay] = useState(value)
  const [flash, setFlash] = useState<'up' | 'dn' | null>(null)
  const displayRef = useRef(value)
  const targetRef = useRef(value)
  const lastCommitRef = useRef(0)
  const rafRef = useRef(0)
  const flashTimer = useRef(0)
  const throttleTimer = useRef(0)

  useEffect(() => {
    targetRef.current = value

    if (reduce) {
      displayRef.current = value
      return
    }

    const run = () => {
      const to = targetRef.current
      const from = displayRef.current
      if (Math.abs(from - to) < 1e-9) return

      const now = performance.now()
      if (throttleMs > 0 && now - lastCommitRef.current < throttleMs) {
        window.clearTimeout(throttleTimer.current)
        throttleTimer.current = window.setTimeout(run, throttleMs - (now - lastCommitRef.current))
        return
      }
      lastCommitRef.current = now

      const direction: 'up' | 'dn' = to > from ? 'up' : 'dn'
      if (!quiet) {
        setFlash(direction)
        window.clearTimeout(flashTimer.current)
      }
      const started = performance.now()
      cancelAnimationFrame(rafRef.current)

      const tick = (frame: number) => {
        const t = Math.min(1, (frame - started) / durationMs)
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        const next = from + (to - from) * eased
        displayRef.current = next
        setDisplay(next)
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          displayRef.current = to
          setDisplay(to)
          if (!quiet) {
            flashTimer.current = window.setTimeout(() => setFlash(null), 220)
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    run()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.clearTimeout(flashTimer.current)
      window.clearTimeout(throttleTimer.current)
    }
  }, [value, durationMs, throttleMs, reduce, quiet])

  const shown = reduce ? value : display

  return (
    <span
      className={`ob-anim-num ${!reduce && !quiet && flash ? `is-flash-${flash}` : ''} ${className ?? ''}`.trim()}
    >
      {format(shown)}
    </span>
  )
}
