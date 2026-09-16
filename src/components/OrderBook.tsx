import { useMemo } from 'react'
import type { BookLevel, Side } from '../lib/marketEngine'
import { buildLadder } from '../lib/marketEngine'
import { formatOmni } from '../lib/money'

type Props = {
  yesCents: number
  bookUp: BookLevel[]
  bookDn: BookLevel[]
  side: Side
  onPickSide: (side: Side) => void
}

export function OrderBook({ yesCents, bookUp, bookDn, side, onPickSide }: Props) {
  const view = side === 'up' ? 'yes' : 'no'

  const ladder = useMemo(
    () => buildLadder(yesCents, bookUp, bookDn, view),
    [yesCents, bookUp, bookDn, view],
  )

  const maxSize = Math.max(
    1,
    ...ladder.asks.map((l) => l.size),
    ...ladder.bids.map((l) => l.size),
  )

  return (
    <section className={`ob-obook ${side === 'down' ? 'is-dn' : 'is-up'}`} aria-label="Order book">
      <div className="ob-obook-head">
        <div className="ob-obook-tabs" role="tablist" aria-label="Book side">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'yes'}
            className={`ob-obook-tab ${view === 'yes' ? 'is-on' : ''}`}
            onClick={() => onPickSide('up')}
          >
            Yes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'no'}
            className={`ob-obook-tab ${view === 'no' ? 'is-on' : ''}`}
            onClick={() => onPickSide('down')}
          >
            No
          </button>
        </div>
        <span className="ob-obook-badge">50% rebate</span>
      </div>

      <div className="ob-obook-cols" aria-hidden="true">
        <span>Price</span>
        <span>Shares</span>
        <span>Total</span>
      </div>

      <div className="ob-obook-asks" aria-label="Asks">
        {ladder.asks.map((row) => (
          <div key={`a-${row.px}-${row.size}`} className="ob-obook-row is-ask">
            <span
              className="ob-obook-bar"
              style={{ width: `${Math.round((row.size / maxSize) * 100)}%` }}
              aria-hidden="true"
            />
            <span className="ob-obook-px">{row.px}¢</span>
            <span className="ob-obook-sz">{Math.round(row.size)}</span>
            <span className="ob-obook-tot">{formatOmni(row.total)}</span>
          </div>
        ))}
      </div>

      <div className="ob-obook-mid">
        <span>Last · {ladder.last}¢</span>
        <span>Spread · {ladder.spread}¢</span>
      </div>

      <div className="ob-obook-bids" aria-label="Bids">
        {ladder.bids.map((row) => (
          <div key={`b-${row.px}-${row.size}`} className="ob-obook-row is-bid">
            <span
              className="ob-obook-bar"
              style={{ width: `${Math.round((row.size / maxSize) * 100)}%` }}
              aria-hidden="true"
            />
            <span className="ob-obook-px">{row.px}¢</span>
            <span className="ob-obook-sz">{Math.round(row.size)}</span>
            <span className="ob-obook-tot">{formatOmni(row.total)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
