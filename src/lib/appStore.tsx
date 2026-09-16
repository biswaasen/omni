import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Side } from '../lib/marketEngine'

export type PositionStatus = 'open' | 'closed'

export type Position = {
  id: string
  side: Side
  stake: number
  shares: number
  entryCents: number
  openedAt: number
  status: PositionStatus
  exitCents?: number
  pnl?: number
  closeReason?: 'exit' | 'settle'
  closedAt?: number
}

export type ClosedTrade = Position & {
  status: 'closed'
  exitCents: number
  pnl: number
  closeReason: 'exit' | 'settle'
  closedAt: number
}

type AppStore = {
  theme: 'light' | 'dark'
  setTheme: (t: 'light' | 'dark') => void
  toggleTheme: () => void
  portfolio: number
  setPortfolio: (n: number | ((p: number) => number)) => void
  position: Position | null
  setPosition: (p: Position | null | ((prev: Position | null) => Position | null)) => void
  history: ClosedTrade[]
  pushHistory: (t: ClosedTrade) => void
  deskMode: 'simple' | 'pro'
  setDeskMode: (m: 'simple' | 'pro') => void
}

const Ctx = createContext<AppStore | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [portfolio, setPortfolio] = useState(365.61)
  const [position, setPosition] = useState<Position | null>(null)
  const [history, setHistory] = useState<ClosedTrade[]>([])
  const [deskMode, setDeskMode] = useState<'simple' | 'pro'>('simple')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff')
  }, [theme])

  const value = useMemo<AppStore>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
      portfolio,
      setPortfolio,
      position,
      setPosition,
      history,
      pushHistory: (t) => setHistory((h) => [t, ...h].slice(0, 20)),
      deskMode,
      setDeskMode,
    }),
    [theme, portfolio, position, history, deskMode],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAppStore must be used within AppProvider')
  return ctx
}
