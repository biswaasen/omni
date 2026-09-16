export type Side = 'up' | 'down'
export type BookLevel = { px: number; size: number }
export type PathPoint = { t: number; p: number }

export type RoundState = {
  seconds: number
  strike: number
  price: number
  path: PathPoint[]
  people: number
  volume: number
  yesCents: number
  bookUp: BookLevel[]
  bookDn: BookLevel[]
  lastResult: string | null
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

export function fairYesCents(price: number, strike: number) {
  const diff = price - strike
  const p = 1 / (1 + Math.exp(-diff / 28))
  return clamp(Math.round(p * 100), 8, 92)
}

export function seedBook(yesCents: number): { bookUp: BookLevel[]; bookDn: BookLevel[] } {
  const no = 100 - yesCents
  return {
    bookUp: [
      { px: yesCents, size: 420 },
      { px: Math.min(99, yesCents + 2), size: 310 },
      { px: Math.min(99, yesCents + 5), size: 180 },
      { px: Math.min(99, yesCents + 9), size: 95 },
    ],
    bookDn: [
      { px: no, size: 390 },
      { px: Math.min(99, no + 2), size: 260 },
      { px: Math.min(99, no + 4), size: 150 },
      { px: Math.min(99, no + 8), size: 80 },
    ],
  }
}

export function createRound(keepPrice?: number): RoundState {
  const price = keepPrice ?? 75000 + Math.random() * 1200
  const yesCents = fairYesCents(price, price)
  const book = seedBook(yesCents)
  return {
    seconds: 60,
    strike: price,
    price,
    path: [{ t: 0, p: price }],
    people: 90 + Math.floor(Math.random() * 50),
    volume: 1800 + Math.floor(Math.random() * 1800),
    yesCents,
    bookUp: book.bookUp,
    bookDn: book.bookDn,
    lastResult: null,
  }
}

export function bookTotals(bookUp: BookLevel[], bookDn: BookLevel[]) {
  const up = bookUp.reduce((s, l) => s + l.size, 0)
  const dn = bookDn.reduce((s, l) => s + l.size, 0)
  const total = Math.max(1, up + dn)
  return { up, dn, total, upPct: Math.round((up / total) * 100) }
}

export function bestAsk(state: RoundState, side: Side) {
  const levels = side === 'up' ? state.bookUp : state.bookDn
  if (!levels.length) return side === 'up' ? state.yesCents : 100 - state.yesCents
  return levels[0].px
}

export function takeFromBook(state: RoundState, side: Side, dollars: number) {
  const levels = side === 'up' ? state.bookUp : state.bookDn
  let spend = dollars
  let shares = 0
  let cost = 0

  while (spend > 0.009 && levels.length) {
    const lvl = levels[0]
    const px = lvl.px / 100
    const maxShares = spend / px
    const take = Math.min(lvl.size, maxShares)
    shares += take
    cost += take * px
    spend -= take * px
    lvl.size -= take
    if (lvl.size < 1) levels.shift()
  }

  return { shares, cost, filled: cost > 0.01 }
}

export function tickMarket(state: RoundState): RoundState {
  const next = { ...state, path: [...state.path], bookUp: state.bookUp.map((l) => ({ ...l })), bookDn: state.bookDn.map((l) => ({ ...l })) }
  const drift = (Math.random() - 0.48) * 7
  next.price = Math.max(1000, next.price + drift)
  const elapsed = 60 - next.seconds
  next.path.push({ t: elapsed, p: next.price })
  if (next.path.length > 120) next.path = next.path.slice(-120)

  next.yesCents = fairYesCents(next.price, next.strike)
  if (next.bookUp[0]) next.bookUp[0].px = next.yesCents
  if (next.bookDn[0]) next.bookDn[0].px = 100 - next.yesCents

  if (Math.random() < 0.35) {
    const side = Math.random() < 0.5 ? 'up' : 'down'
    const levels = side === 'up' ? next.bookUp : next.bookDn
    if (levels[0]) levels[0].size += 20 + Math.floor(Math.random() * 60)
  }

  if (Math.random() < 0.45) {
    const side = Math.random() < next.yesCents / 100 ? 'up' : 'down'
    const dollars = [5, 10, 25, 40][Math.floor(Math.random() * 4)]
    const fill = takeFromBook(next, side, dollars)
    if (fill.filled) {
      next.volume += Math.round(fill.cost)
      if (Math.random() < 0.4) next.people += 1
    }
  }

  if (!next.bookUp.length || !next.bookDn.length) {
    const book = seedBook(next.yesCents)
    next.bookUp = book.bookUp
    next.bookDn = book.bookDn
  }

  return next
}

export function settleRound(state: RoundState): RoundState {
  const wonUp = state.price > state.strike
  const label = wonUp ? 'Up' : 'Down'
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const lastResult = `Last round · ${label} won · close ${fmt(state.price)} vs ${fmt(state.strike)}`
  const next = createRound(state.price)
  next.lastResult = lastResult
  return next
}

export function formatTimer(seconds: number) {
  const sec = Math.max(0, Math.ceil(seconds))
  const m = Math.floor(sec / 60)
  const r = sec % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

export function winPreview(state: RoundState, side: Side, stake: number) {
  const ask = bestAsk(state, side)
  return (stake / (ask / 100)) * 1
}

export type LadderRow = { px: number; size: number; total: number }

export type Ladder = {
  asks: LadderRow[]
  bids: LadderRow[]
  last: number
  spread: number
}

export function buildLadder(
  yesCents: number,
  bookUp: BookLevel[],
  bookDn: BookLevel[],
  view: 'yes' | 'no',
): Ladder {
  const mid = view === 'yes' ? yesCents : 100 - yesCents
  const sell = view === 'yes' ? bookUp : bookDn
  const buy = view === 'yes' ? bookDn : bookUp

  const asks: LadderRow[] = sell
    .slice()
    .sort((a, b) => b.px - a.px)
    .slice(0, 6)
    .map((l) => ({
      px: l.px,
      size: l.size,
      total: (l.px / 100) * l.size,
    }))

  while (asks.length < 5) {
    const px = clamp(mid + asks.length + 1, 1, 99)
    const size = 40 + asks.length * 28
    asks.unshift({ px, size, total: (px / 100) * size })
  }

  const bids: LadderRow[] = []
  const bidBase = buy
    .slice()
    .sort((a, b) => b.px - a.px)
    .slice(0, 3)

  for (let i = 0; i < 5; i++) {
    const fromBook = bidBase[i]
    const px = fromBook
      ? clamp(100 - fromBook.px, 1, mid - 1)
      : clamp(mid - (i + 1), 1, 99)
    const size = fromBook?.size ?? 55 + i * 22
    bids.push({ px, size, total: (px / 100) * size })
  }

  const bestAskPx = asks.length ? Math.min(...asks.map((a) => a.px)) : mid
  const bestBidPx = bids.length ? Math.max(...bids.map((b) => b.px)) : mid - 1

  return {
    asks,
    bids,
    last: mid,
    spread: Math.max(1, bestAskPx - bestBidPx),
  }
}
