import { useMemo, useState } from 'react'
import type { PathPoint } from '../lib/marketEngine'
import { formatIndex, formatIndexAxis } from '../lib/money'

export type ChartMode = 'line' | 'candle'
export type ChartRange = '1m' | '15m' | '1h' | '1d'

type Candle = { t: number; o: number; h: number; l: number; c: number }

type Props = {
  path: PathPoint[]
  strike: number
  price: number
  secondsLeft: number
}

const W = 900
const H = 400
const PAD = { t: 28, r: 100, b: 48, l: 18 }

const RANGES: { id: ChartRange; label: string }[] = [
  { id: '1m', label: '1m' },
  { id: '15m', label: '15m' },
  { id: '1h', label: '1H' },
  { id: '1d', label: '1D' },
]

function niceTicks(min: number, max: number, count = 5) {
  const span = Math.max(1, max - min)
  const step = span / (count - 1)
  const ticks: number[] = []
  for (let i = 0; i < count; i++) ticks.push(min + step * i)
  return ticks
}

function hashSeed(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function buildLineSeries(
  path: PathPoint[],
  price: number,
  strike: number,
  range: ChartRange,
): PathPoint[] {
  if (range === '1m') {
    return path.length ? path : [{ t: 0, p: price }]
  }

  const seconds = range === '15m' ? 15 * 60 : range === '1h' ? 60 * 60 : 24 * 60 * 60
  const steps = range === '15m' ? 90 : range === '1h' ? 120 : 160
  const pts: PathPoint[] = []
  let p = strike
  const seed = Math.round(strike * 100)

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * seconds
    const n1 = hashSeed(seed + i * 17)
    const drift = (n1 - 0.48) * (range === '1d' ? 42 : range === '1h' ? 22 : 14)
    const mean = (strike - p) * 0.02
    p = Math.max(1000, p + drift + mean)
    pts.push({ t, p })
  }

  const last = pts[pts.length - 1]
  if (last) {
    last.p = price
    last.t = seconds
  }
  return pts
}

function toCandles(pts: PathPoint[], bucketCount: number): Candle[] {
  if (!pts.length) return []
  const t0 = pts[0].t
  const t1 = pts[pts.length - 1].t
  const span = Math.max(1e-6, t1 - t0)
  const buckets: PathPoint[][] = Array.from({ length: bucketCount }, () => [])

  for (const pt of pts) {
    const idx = Math.min(bucketCount - 1, Math.floor(((pt.t - t0) / span) * bucketCount))
    buckets[idx].push(pt)
  }

  const candles: Candle[] = []
  let prevClose = pts[0].p
  for (let i = 0; i < buckets.length; i++) {
    const group = buckets[i]
    if (!group.length) {
      candles.push({
        t: t0 + ((i + 0.5) / bucketCount) * span,
        o: prevClose,
        h: prevClose,
        l: prevClose,
        c: prevClose,
      })
      continue
    }
    const o = group[0].p
    const c = group[group.length - 1].p
    const h = Math.max(...group.map((g) => g.p), o, c)
    const l = Math.min(...group.map((g) => g.p), o, c)
    candles.push({ t: group[Math.floor(group.length / 2)].t, o, h, l, c })
    prevClose = c
  }
  return candles
}

function formatAxisTime(t: number, range: ChartRange) {
  if (range === '1m') {
    const s = Math.max(0, Math.round(t))
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }
  if (range === '15m' || range === '1h') {
    const m = Math.round(t / 60)
    return `${m}m`
  }
  const h = Math.round(t / 3600)
  return `${h}h`
}

export function PriceChart({ path, strike, price, secondsLeft }: Props) {
  const [mode, setMode] = useState<ChartMode>('line')
  const [range, setRange] = useState<ChartRange>('1m')

  const series = useMemo(
    () => buildLineSeries(path, price, strike, range),
    [path, price, strike, range],
  )

  const candles = useMemo(() => {
    const count = range === '1m' ? 24 : range === '15m' ? 30 : range === '1h' ? 36 : 48
    return toCandles(series, count)
  }, [series, range])

  const geom = useMemo(() => {
    const prices =
      mode === 'candle'
        ? candles.flatMap((c) => [c.o, c.h, c.l, c.c]).concat([strike, price])
        : series.map((d) => d.p).concat([strike, price])

    let min = Math.min(...prices)
    let max = Math.max(...prices)
    const padY = Math.max(8, (max - min) * 0.18)
    min -= padY
    max += padY

    const tMax = series[series.length - 1]?.t || 60
    const x = (t: number) => PAD.l + (Math.min(t, tMax) / Math.max(tMax, 1e-6)) * (W - PAD.l - PAD.r)
    const y = (p: number) => PAD.t + ((max - p) / Math.max(max - min, 1e-6)) * (H - PAD.t - PAD.b)

    let d = ''
    series.forEach((pt, i) => {
      d += `${i === 0 ? 'M' : 'L'}${x(pt.t).toFixed(2)} ${y(pt.p).toFixed(2)}`
    })

    const last = series[series.length - 1] ?? { t: 0, p: price }
    const ticks = niceTicks(min, max, 5)
    const diff = price - strike
    const above = price >= strike

    const timeMarks = [0, 0.5, 1].map((f) => {
      const t = f * tMax
      return { t, x: x(t), label: formatAxisTime(t, range) }
    })

    const candleW =
      candles.length > 1
        ? Math.max(2.5, ((W - PAD.l - PAD.r) / candles.length) * 0.62)
        : 6

    const liveY = y(price)
    const targetY = y(strike)
    const pillY =
      Math.abs(liveY - targetY) < 28
        ? liveY < targetY
          ? liveY - 18
          : liveY + 18
        : liveY

    return {
      d,
      sy: targetY,
      lastX: x(last.t),
      lastY: liveY,
      pillY,
      above,
      diff,
      ticks: ticks.map((p, i) => ({ p, y: y(p), i })),
      x0: PAD.l,
      x1: W - PAD.r,
      y0: PAD.t,
      y1: H - PAD.b,
      near: range === '1m' && Math.abs(diff) < 25 && secondsLeft <= 10,
      timeMarks,
      candleW,
      candles: candles.map((c) => ({
        ...c,
        x: x(c.t),
        yo: y(c.o),
        yh: y(c.h),
        yl: y(c.l),
        yc: y(c.c),
        up: c.c >= c.o,
      })),
    }
  }, [series, candles, strike, price, secondsLeft, mode, range])

  const liveLabel = formatIndex(price)

  return (
    <figure
      className="ob-chart-wrap"
      aria-label={`Live ${liveLabel} versus target ${formatIndex(strike)}`}
    >
      <div className="ob-chart-toolbar">
        <div className="ob-chart-ranges" role="tablist" aria-label="Chart range">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={range === r.id}
              className={`ob-chart-range ${range === r.id ? 'is-on' : ''}`}
              onClick={() => setRange(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="ob-chart-modes" role="group" aria-label="Chart type">
          <button
            type="button"
            className={`ob-chart-mode ${mode === 'line' ? 'is-on' : ''}`}
            aria-pressed={mode === 'line'}
            onClick={() => setMode('line')}
            title="Line"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M2 11.5 L5.5 7.5 L8.5 9.5 L14 3.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Line</span>
          </button>
          <button
            type="button"
            className={`ob-chart-mode ${mode === 'candle' ? 'is-on' : ''}`}
            aria-pressed={mode === 'candle'}
            onClick={() => setMode('candle')}
            title="Candlestick"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M5 2.5 V13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <rect x="3.2" y="5" width="3.6" height="5.5" rx="0.6" fill="currentColor" />
              <path d="M11 2.5 V13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <rect x="9.2" y="4" width="3.6" height="6.5" rx="0.6" fill="currentColor" />
            </svg>
            <span>Candle</span>
          </button>
        </div>
      </div>

      <svg
        className="ob-chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${mode === 'line' ? 'Line' : 'Candlestick'} Bitcoin price chart, ${range}`}
      >
        {geom.ticks.map((tick) => (
          <g key={tick.i}>
            <line
              x1={geom.x0}
              x2={geom.x1}
              y1={tick.y}
              y2={tick.y}
              className="ob-chart-grid"
            />
            <text x={W - 10} y={tick.y + 4} className="ob-chart-axis" textAnchor="end">
              {formatIndexAxis(tick.p)}
            </text>
          </g>
        ))}

        <line
          x1={geom.x0}
          x2={geom.x1}
          y1={geom.sy}
          y2={geom.sy}
          className="ob-chart-target-line"
        />

        <g transform={`translate(${geom.x1 - 62}, ${Math.max(geom.y0, Math.min(geom.y1 - 26, geom.sy - 13))})`}>
          <rect width="62" height="26" rx="13" className="ob-chart-target-bg" />
          <text x="31" y="17" className="ob-chart-target-text" textAnchor="middle">
            Target
          </text>
        </g>

        {mode === 'line' ? (
          <>
            <path
              d={geom.d || 'M0 0'}
              fill="none"
              className="ob-chart-line"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1={geom.lastX}
              y1={geom.lastY}
              x2={geom.x1}
              y2={geom.lastY}
              className="ob-chart-now-guide"
            />
            <circle cx={geom.lastX} cy={geom.lastY} r="7" className="ob-chart-now-ring" />
            <circle cx={geom.lastX} cy={geom.lastY} r="3.2" className="ob-chart-now-dot" />
          </>
        ) : (
          <g className="ob-chart-candles">
            {geom.candles.map((c, i) => {
              const bodyTop = Math.min(c.yo, c.yc)
              const bodyH = Math.max(1.5, Math.abs(c.yc - c.yo))
              return (
                <g key={i}>
                  <line
                    x1={c.x}
                    x2={c.x}
                    y1={c.yh}
                    y2={c.yl}
                    className={c.up ? 'ob-candle-wick is-up' : 'ob-candle-wick is-dn'}
                  />
                  <rect
                    x={c.x - geom.candleW / 2}
                    y={bodyTop}
                    width={geom.candleW}
                    height={bodyH}
                    rx={1}
                    className={c.up ? 'ob-candle-body is-up' : 'ob-candle-body is-dn'}
                  />
                </g>
              )
            })}
            <line
              x1={geom.lastX}
              y1={geom.lastY}
              x2={geom.x1}
              y2={geom.lastY}
              className="ob-chart-now-guide"
            />
          </g>
        )}

        <g
          transform={`translate(${geom.x1 - 88}, ${Math.max(geom.y0, Math.min(geom.y1 - 26, geom.pillY - 13))})`}
        >
          <rect width="88" height="26" rx="13" className="ob-chart-live-bg" />
          <text x="44" y="17" className="ob-chart-live-text" textAnchor="middle">
            {liveLabel}
          </text>
        </g>

        {geom.near && (
          <text
            x={(geom.x0 + geom.x1) / 2}
            y={geom.y0 + 6}
            className="ob-chart-caution"
            textAnchor="middle"
          >
            Near target · {Math.ceil(secondsLeft)}s left
          </text>
        )}

        {geom.timeMarks.map((m) => (
          <text
            key={m.t}
            x={m.x}
            y={H - 14}
            className="ob-chart-time"
            textAnchor={
              m.t === 0 ? 'start' : m.t === geom.timeMarks[geom.timeMarks.length - 1].t ? 'end' : 'middle'
            }
          >
            {m.label}
          </text>
        ))}
      </svg>
    </figure>
  )
}
