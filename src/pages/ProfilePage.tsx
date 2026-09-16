import { Link } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { useAppStore } from '../lib/appStore'
import { formatOmni, formatOmniCompact } from '../lib/money'
import { markCents, unrealizedPnl } from '../lib/positions'
import { createRound } from '../lib/marketEngine'

export function ProfilePage() {
  const { portfolio, position, history } = useAppStore()
  const snapshot = createRound()
  const mark = position ? markCents(snapshot, position.side) : 0
  const livePnl = position ? unrealizedPnl(position, mark) : 0
  const realized = history.reduce((s, t) => s + t.pnl, 0)
  const wins = history.filter((t) => t.pnl > 0).length

  return (
    <div className="ob-app">
      <Navbar />
      <main className="ob-page ob-subpage">
        <div className="ob-profile-grid is-2">
          <section className="ob-panel">
            <div className="ob-profile-user">
              <img src="/avatar.png" alt="" width={48} height={48} className="ob-profile-avatar" />
              <div>
                <strong>alphaDump59</strong>
                <p>#57821</p>
              </div>
            </div>
            <ul className="ob-stat-list">
              <li>
                <span>Balance</span>
                <strong>{formatOmni(portfolio)}</strong>
              </li>
              <li>
                <span>Session wins</span>
                <strong>
                  {wins}/{history.length || 0}
                </strong>
              </li>
            </ul>
          </section>

          <section className="ob-panel">
            <h2 className="ob-panel-title">Trading P&L</h2>
            <p className={`ob-pnl-hero ${realized >= 0 ? 'is-up' : 'is-dn'}`}>
              {realized >= 0 ? '+' : '−'}
              {formatOmni(Math.abs(realized))}
            </p>
            <p className="ob-panel-note">Session realized from exits & settles.</p>
          </section>
        </div>

        <section className="ob-panel">
          <div className="ob-panel-tabs">
            <span className="is-on">Positions</span>
            <span>History</span>
          </div>

          {position ? (
            <div className="ob-hist-row">
              <div>
                <strong>BTC 60s · {position.side === 'up' ? 'Up' : 'Down'}</strong>
                <p>
                  {position.entryCents}¢ → ~{mark}¢ · {formatOmni(position.stake, { decimals: 0 })}{' '}
                  traded
                </p>
              </div>
              <strong className={livePnl >= 0 ? 'is-up' : 'is-dn'}>
                {livePnl >= 0 ? '+' : '−'}
                {formatOmniCompact(Math.abs(livePnl))}
              </strong>
            </div>
          ) : (
            <p className="ob-empty">
              No open positions.{' '}
              <Link to="/">Trade now</Link>.
            </p>
          )}

          {history.length > 0 && (
            <div className="ob-hist-list">
              <h3 className="ob-panel-title">Recent history</h3>
              {history.map((t) => (
                <div key={t.id} className="ob-hist-row">
                  <div>
                    <strong>
                      {t.side === 'up' ? 'Up' : 'Down'} · {t.closeReason}
                    </strong>
                    <p>
                      {t.entryCents}¢ → {t.exitCents}¢
                    </p>
                  </div>
                  <strong className={t.pnl >= 0 ? 'is-up' : 'is-dn'}>
                    {t.pnl >= 0 ? '+' : '−'}
                    {formatOmniCompact(Math.abs(t.pnl))}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
