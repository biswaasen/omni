import type { RoundState, Side } from './marketEngine'
import { bestAsk, takeFromBook } from './marketEngine'
import type { ClosedTrade, Position } from './appStore'

export function bestBid(state: RoundState, side: Side) {
  const ask = bestAsk(state, side)
  return Math.max(1, ask - 1)
}

export function markCents(state: RoundState, side: Side) {
  return bestBid(state, side)
}

export function positionValue(shares: number, cents: number) {
  return shares * (cents / 100)
}

export function unrealizedPnl(pos: Position, mark: number) {
  return positionValue(pos.shares, mark) - positionValue(pos.shares, pos.entryCents)
}

export function openFromFill(side: Side, stake: number, shares: number, cost: number): Position {
  const entryCents = Math.round((cost / shares) * 100)
  return {
    id: `pos-${Date.now()}`,
    side,
    stake,
    shares,
    entryCents,
    openedAt: Date.now(),
    status: 'open',
  }
}

export function exitPosition(
  state: RoundState,
  pos: Position,
): { draft: RoundState; closed: ClosedTrade; proceeds: number } {
  const draft = {
    ...state,
    bookUp: state.bookUp.map((l) => ({ ...l })),
    bookDn: state.bookDn.map((l) => ({ ...l })),
  }
  const exit = Math.max(1, bestBid(draft, pos.side) - 1)
  const proceeds = positionValue(pos.shares, exit)
  const pnl = proceeds - positionValue(pos.shares, pos.entryCents)
  draft.volume += Math.round(proceeds)

  const closed: ClosedTrade = {
    ...pos,
    status: 'closed',
    exitCents: exit,
    pnl,
    closeReason: 'exit',
    closedAt: Date.now(),
  }
  return { draft, closed, proceeds }
}

export function settlePosition(
  pos: Position,
  wonUp: boolean,
): { closed: ClosedTrade; proceeds: number } {
  const won = pos.side === 'up' ? wonUp : !wonUp
  const exitCents = won ? 100 : 0
  const proceeds = positionValue(pos.shares, exitCents)
  const pnl = proceeds - positionValue(pos.shares, pos.entryCents)
  const closed: ClosedTrade = {
    ...pos,
    status: 'closed',
    exitCents,
    pnl,
    closeReason: 'settle',
    closedAt: Date.now(),
  }
  return { closed, proceeds }
}

export function tryOpenTrade(
  state: RoundState,
  side: Side,
  amount: number,
): { ok: false; reason: string } | { ok: true; draft: RoundState; position: Position; cost: number } {
  const draft = {
    ...state,
    bookUp: state.bookUp.map((l) => ({ ...l })),
    bookDn: state.bookDn.map((l) => ({ ...l })),
  }
  const fill = takeFromBook(draft, side, amount)
  if (!fill.filled || fill.shares < 0.01) {
    return { ok: false, reason: 'Book empty — try again in a moment' }
  }
  draft.volume += Math.round(fill.cost)
  draft.people += 1
  return {
    ok: true,
    draft,
    position: openFromFill(side, amount, fill.shares, fill.cost),
    cost: fill.cost,
  }
}
