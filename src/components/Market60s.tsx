import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatedNumber } from './AnimatedNumber'
import { MarketRules } from './MarketRules'
import { Navbar } from './Navbar'
import { OrderBook } from './OrderBook'
import { PositionCard } from './PositionCard'
import { PriceChart } from './PriceChart'
import { TradeFeedback, flashFromClose, type TradeFlash } from './TradeFeedback'
import { MarketInsights } from './MarketInsights'
import { formatIndex, formatOmni, formatOmniCompact, OMNI } from '../lib/money'
import { useAppStore } from '../lib/appStore'
import {
  exitPosition,
  markCents,
  settlePosition,
  tryOpenTrade,
} from '../lib/positions'
import {
  bestAsk,
  createRound,
  formatTimer,
  settleRound,
  tickMarket,
  winPreview,
  type PathPoint,
  type RoundState,
  type Side,
} from '../lib/marketEngine'

const stakes = [5, 25, 100] as const

export function Market60s() {
  const { portfolio, setPortfolio, position, setPosition, pushHistory } = useAppStore()

  const [side, setSide] = useState<Side>('up')
  const [round, setRound] = useState<RoundState>(() => createRound())
  const [displayPrice, setDisplayPrice] = useState(() => round.price)
  const [smoothPrice, setSmoothPrice] = useState(() => round.price)
  const [displayPct, setDisplayPct] = useState(() => round.yesCents)
  const [hint, setHint] = useState(`${OMNI} · locks until close`)
  const [flashAmt, setFlashAmt] = useState<number | null>(null)
  const [canExit, setCanExit] = useState(false)
  const [justOpened, setJustOpened] = useState(false)
  const [tradeFlash, setTradeFlash] = useState<TradeFlash | null>(null)
  const [bookOpen, setBookOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 901px)').matches : false,
  )

  const roundRef = useRef(round)
  const positionRef = useRef(position)
  const flashIdRef = useRef(0)
  const rafRef = useRef(0)
  const lastTickRef = useRef(0)
  const tickAccRef = useRef(0)
  const priceHoldRef = useRef(0)
  const pctHoldRef = useRef(0)
  const uiHoldRef = useRef(0)
  const smoothRef = useRef(round.price)

  const showFlash = useCallback((partial: Omit<TradeFlash, 'id'>) => {
    flashIdRef.current += 1
    setTradeFlash({ ...partial, id: flashIdRef.current })
  }, [])

  const clearFlash = useCallback(() => setTradeFlash(null), [])

  useEffect(() => {
    positionRef.current = position
  }, [position])

  useEffect(() => {
    if (position?.status !== 'open') {
      setCanExit(false)
      return
    }
    setCanExit(false)
    const t = window.setTimeout(() => setCanExit(true), 450)
    return () => window.clearTimeout(t)
  }, [position?.id, position?.status])

  useEffect(() => {
    if (!justOpened) return
    const t = window.setTimeout(() => setJustOpened(false), 900)
    return () => window.clearTimeout(t)
  }, [justOpened])

  useEffect(() => {
    const loop = (ts: number) => {
      if (!lastTickRef.current) lastTickRef.current = ts
      const dt = Math.min(48, ts - lastTickRef.current)
      lastTickRef.current = ts

      let next = { ...roundRef.current }
      next.seconds -= dt / 1000
      tickAccRef.current += dt
      priceHoldRef.current += dt
      pctHoldRef.current += dt
      uiHoldRef.current += dt

      let engineTick = false
      if (tickAccRef.current >= 550) {
        next = tickMarket({ ...next, seconds: next.seconds })
        tickAccRef.current = 0
        engineTick = true
      }

      roundRef.current = next

      const alpha = 1 - Math.exp(-dt / 420)
      smoothRef.current += (next.price - smoothRef.current) * alpha
      setSmoothPrice(smoothRef.current)

      if (priceHoldRef.current >= 800) {
        setDisplayPrice(smoothRef.current)
        priceHoldRef.current = 0
      }

      if (pctHoldRef.current >= 900) {
        setDisplayPct(next.yesCents)
        pctHoldRef.current = 0
      }

      if (next.seconds <= 0) {
        next.seconds = 0
        const wonUp = next.price > next.strike
        const openPos = positionRef.current
        if (openPos?.status === 'open') {
          const { closed, proceeds } = settlePosition(openPos, wonUp)
          setPortfolio((p) => p + proceeds)
          pushHistory(closed)
          setPosition(null)
          const f = flashFromClose(closed.pnl, 'settle')
          flashIdRef.current += 1
          setTradeFlash({ ...f, id: flashIdRef.current })
          setHint(
            `Settled ${closed.side === 'up' ? 'Up' : 'Down'} · ${closed.pnl >= 0 ? '+' : '−'}${formatOmniCompact(Math.abs(closed.pnl))}`,
          )
        }
        next = settleRound(next)
        roundRef.current = next
        smoothRef.current = next.price
        setSmoothPrice(next.price)
        setDisplayPrice(next.price)
        setDisplayPct(next.yesCents)
        priceHoldRef.current = 0
        pctHoldRef.current = 0
        uiHoldRef.current = 0
        setRound(next)
      } else if (engineTick || uiHoldRef.current >= 200) {
        uiHoldRef.current = 0
        setRound(next)
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    lastTickRef.current = 0
    smoothRef.current = roundRef.current.price
    setDisplayPrice(roundRef.current.price)
    setSmoothPrice(roundRef.current.price)
    setDisplayPct(roundRef.current.yesCents)
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [setPortfolio, setPosition, pushHistory])

  const chartPath: PathPoint[] = useMemo(() => {
    const pts = round.path.length ? [...round.path] : [{ t: 0, p: smoothPrice }]
    const last = pts[pts.length - 1]
    const elapsed = Math.max(last?.t ?? 0, 60 - round.seconds)
    if (last) {
      pts[pts.length - 1] = { t: elapsed, p: smoothPrice }
    } else {
      pts.push({ t: elapsed, p: smoothPrice })
    }
    return pts
  }, [round.path, round.seconds, smoothPrice])

  const ask = bestAsk(round, side)
  const above = displayPrice >= round.strike
  const diff = displayPrice - round.strike
  const showPct = displayPct
  const downPct = 100 - showPct
  const liveMark = position ? markCents(round, position.side) : ask

  function onBuy(amount: number) {
    if (position?.status === 'open') {
      setHint('Exit your open trade before opening another')
      return
    }
    if (portfolio < amount) {
      setHint('Insufficient Ø balance')
      return
    }
    const result = tryOpenTrade(roundRef.current, side, amount)
    if (!result.ok) {
      setHint(result.reason)
      return
    }
    roundRef.current = result.draft
    setRound(result.draft)
    setPortfolio((p) => Math.max(0, p - result.cost))
    setPosition(result.position)
    setJustOpened(true)
    setHint(
      `Opened ${side === 'up' ? 'Up' : 'Down'} · ${Math.round(result.position.shares)} shares @ ${result.position.entryCents}¢`,
    )
    setFlashAmt(amount)
    window.setTimeout(() => setFlashAmt(null), 180)
    showFlash({
      kind: 'open',
      title: side === 'up' ? 'Opened Up' : 'Opened Down',
      detail: `${formatOmni(amount, { decimals: 0 })} · ${result.position.entryCents}¢ entry`,
    })
  }

  function onExit() {
    if (!position || position.status !== 'open' || !canExit) return
    const { draft, closed, proceeds } = exitPosition(roundRef.current, position)
    roundRef.current = draft
    setRound(draft)
    setPortfolio((p) => p + proceeds)
    pushHistory(closed)
    setPosition(null)
    setHint(
      `Exited · ${closed.pnl >= 0 ? '+' : '−'}${formatOmniCompact(Math.abs(closed.pnl))}`,
    )
    showFlash(flashFromClose(closed.pnl, 'exit'))
  }

  return (
    <div className="ob-app">
      <Navbar />
      <TradeFeedback flash={tradeFlash} onDone={clearFlash} />

      <main className="ob-page">
        <header className="ob-market-head">
          <div className="ob-market-title">
            <div className="ob-asset" aria-hidden="true">
              ₿
            </div>
            <h1 id="ob-q" className="ob-q">
              Bitcoin up in the next 60 seconds?
            </h1>
          </div>
          <div className="ob-prices-inline" aria-live="polite">
            <div className="ob-price-item">
              <span className="ob-price-label">Price to beat</span>
              <span className="ob-price-num">{formatIndex(round.strike)}</span>
            </div>
            <div className="ob-price-item">
              <span className="ob-price-label">Current</span>
              <span className="ob-price-num is-live">
                <AnimatedNumber value={displayPrice} format={formatIndex} durationMs={800} />
              </span>
              <span className={`ob-price-gap ${above ? 'is-up' : 'is-dn'}`}>
                {above ? '▲' : '▼'} {above ? '+' : '−'}
                <AnimatedNumber value={Math.abs(diff)} format={formatIndex} durationMs={800} quiet />
              </span>
            </div>
            <div className="ob-price-item ob-price-timer">
              <span className="ob-price-label">Closes</span>
              <span className="ob-timer">{formatTimer(round.seconds)}</span>
            </div>
          </div>
        </header>

        <div className="ob-shell">
          <section className="ob-main" aria-labelledby="ob-q">
            <div className="ob-chart-slot">
              <PriceChart
                path={chartPath}
                strike={round.strike}
                price={smoothPrice}
                secondsLeft={round.seconds}
              />
              {round.lastResult && <p className="ob-last">{round.lastResult}</p>}
            </div>

            <div className="ob-book-slot">
              <details
                className="ob-book-fold"
                open={bookOpen}
                onToggle={(e) => setBookOpen((e.target as HTMLDetailsElement).open)}
              >
                <summary>
                  <span>Order book</span>
                  <span className="ob-book-fold-vol">
                    {formatOmni(round.volume, { decimals: 0 })} Vol
                  </span>
                </summary>
                <OrderBook
                  yesCents={showPct}
                  bookUp={round.bookUp}
                  bookDn={round.bookDn}
                  side={side}
                  onPickSide={setSide}
                />
              </details>

              <MarketRules />
            </div>
          </section>

          <div className="ob-rail">
            <aside className="ob-trade" aria-label="Place a trade">
              <div className="ob-trade-label">Buy</div>

              <div className="ob-sides" role="group" aria-label="Pick a side">
                <button
                  type="button"
                  className={`ob-side ob-side-up ${side === 'up' ? 'is-on' : ''}`}
                  aria-pressed={side === 'up'}
                  onClick={() => setSide('up')}
                >
                  <span className="ob-side-name">Up</span>
                  <span className="ob-side-price">{Math.round(showPct)}¢</span>
                </button>
                <button
                  type="button"
                  className={`ob-side ob-side-dn ${side === 'down' ? 'is-on' : ''}`}
                  aria-pressed={side === 'down'}
                  onClick={() => setSide('down')}
                >
                  <span className="ob-side-name">Down</span>
                  <span className="ob-side-price">{Math.round(downPct)}¢</span>
                </button>
              </div>

              {position?.status === 'open' ? (
                <PositionCard
                  position={position}
                  markCents={liveMark}
                  canExit={canExit}
                  onExit={onExit}
                  justOpened={justOpened}
                />
              ) : (
                <>
                  <div className="ob-onetap-label">One-tap buy</div>
                  <div className="ob-stakes" role="group" aria-label="One-tap buy amounts">
                    {stakes.map((amt) => {
                      const win = winPreview(round, side, amt)
                      return (
                        <button
                          key={amt}
                          type="button"
                          className={`ob-chip ${flashAmt === amt ? 'is-flash' : ''}`}
                          onClick={() => onBuy(amt)}
                        >
                          <span className="ob-chip-amt">{formatOmni(amt, { decimals: 0 })}</span>
                          <span className="ob-chip-win">win {formatOmniCompact(win)}</span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              <p className="ob-ask-note">
                Best ask {ask}¢ · closes in {formatTimer(round.seconds)}
                {hint ? ` · ${hint}` : ''}
              </p>
            </aside>

            <MarketInsights />
          </div>
        </div>
      </main>
    </div>
  )
}
