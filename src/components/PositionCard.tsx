import { useEffect, useRef, useState } from 'react'
import { AnimatedNumber } from './AnimatedNumber'
import { formatOmni, formatOmniCompact } from '../lib/money'
import type { Position } from '../lib/appStore'
import { unrealizedPnl } from '../lib/positions'

type Props = {
  position: Position
  markCents: number
  canExit: boolean
  onExit: () => void
  justOpened?: boolean
}

export function PositionCard({ position, markCents, canExit, onExit, justOpened }: Props) {
  const pnl = unrealizedPnl(position, markCents)
  const proceeds = position.shares * (markCents / 100)
  const up = pnl >= 0
  const prevSign = useRef(up)
  const [tick, setTick] = useState<'up' | 'dn' | null>(null)

  useEffect(() => {
    if (prevSign.current === up) return
    prevSign.current = up
    setTick(up ? 'up' : 'dn')
    const t = window.setTimeout(() => setTick(null), 520)
    return () => window.clearTimeout(t)
  }, [up])

  return (
    <div
      className={`ob-pos ${position.side === 'up' ? 'is-up' : 'is-dn'} ${justOpened ? 'is-enter' : ''} ${tick ? `is-tick-${tick}` : ''}`}
    >
      <div className="ob-pos-top">
        <span className="ob-pos-side">{position.side === 'up' ? 'Up' : 'Down'}</span>
        <span className="ob-pos-stake">{formatOmni(position.stake, { decimals: 0 })} open</span>
      </div>

      <div className="ob-pos-grid">
        <div>
          <span className="ob-pos-label">Entry</span>
          <span className="ob-pos-val">{position.entryCents}¢</span>
        </div>
        <div>
          <span className="ob-pos-label">Mark</span>
          <span className={`ob-pos-val ${up ? 'is-mark-up' : 'is-mark-dn'}`}>{markCents}¢</span>
        </div>
        <div>
          <span className="ob-pos-label">Shares</span>
          <span className="ob-pos-val">{Math.round(position.shares)}</span>
        </div>
      </div>

      <div className={`ob-pos-pnl ${up ? 'is-up' : 'is-dn'} ${tick ? 'is-pulse' : ''}`}>
        <span>{up ? 'Unrealized' : 'Under water'}</span>
        <strong>
          {up ? '+' : '−'}
          <AnimatedNumber
            value={Math.abs(pnl)}
            format={(n) => formatOmniCompact(n)}
            durationMs={500}
            quiet
          />
        </strong>
      </div>

      <button
        type="button"
        className={`ob-pos-exit ${up ? 'is-profit' : 'is-loss'}`}
        disabled={!canExit}
        onClick={onExit}
      >
        Exit · {formatOmni(proceeds)}
      </button>
    </div>
  )
}
