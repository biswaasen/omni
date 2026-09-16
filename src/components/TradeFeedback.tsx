import { useEffect } from 'react'
import { formatOmniCompact } from '../lib/money'

export type TradeFlashKind = 'open' | 'win' | 'loss'

export type TradeFlash = {
  id: number
  kind: TradeFlashKind
  title: string
  detail: string
}

type Props = {
  flash: TradeFlash | null
  onDone: () => void
}

export function TradeFeedback({ flash, onDone }: Props) {
  useEffect(() => {
    if (!flash) return
    const ms = flash.kind === 'win' ? 2200 : flash.kind === 'loss' ? 1800 : 1200
    const t = window.setTimeout(onDone, ms)
    return () => window.clearTimeout(t)
  }, [flash, onDone])

  if (!flash) return null

  return (
    <div className={`ob-flash ob-flash-${flash.kind}`} role="status" aria-live="polite">
      {flash.kind === 'win' && (
        <div className="ob-confetti" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} className={`ob-confetti-bit bit-${i % 6}`} />
          ))}
        </div>
      )}
      <div className={`ob-flash-card is-${flash.kind}`}>
        <div className="ob-flash-emoji" aria-hidden="true">
          {flash.kind === 'win' ? '✦' : flash.kind === 'loss' ? '↓' : '↑'}
        </div>
        <div className="ob-flash-title">{flash.title}</div>
        <div className="ob-flash-detail">{flash.detail}</div>
      </div>
    </div>
  )
}

export function flashFromClose(pnl: number, reason: 'exit' | 'settle'): Omit<TradeFlash, 'id'> {
  const won = pnl >= 0
  const amt = formatOmniCompact(Math.abs(pnl))
  if (won) {
    return {
      kind: 'win',
      title: reason === 'settle' ? 'Round won' : 'Nice exit',
      detail: `+${amt} credited to your balance`,
    }
  }
  return {
    kind: 'loss',
    title: reason === 'settle' ? 'Round lost' : 'Closed at a loss',
    detail: `−${amt} · next round is live`,
  }
}
