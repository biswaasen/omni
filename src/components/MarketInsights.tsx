type Insight = {
  id: string
  source: string
  age: string
  headline: string
  blurb: string
  tone: 'bull' | 'bear' | 'neutral'
}

const INSIGHTS: Insight[] = [
  {
    id: '1',
    source: 'Bloomberg',
    age: '4m',
    headline: 'BTC holds firm as spot ETF desks stay net buyers into the hour',
    blurb: 'Flows concentrated on CME basis and US spot products; cash premium still positive.',
    tone: 'bull',
  },
  {
    id: '2',
    source: 'Reuters',
    age: '12m',
    headline: 'Dollar softens after CPI print; risk assets catch a brief bid',
    blurb: 'Crypto tracking equity futures higher — Bitcoin lagging eth slightly on the open.',
    tone: 'neutral',
  },
  {
    id: '3',
    source: 'CoinDesk',
    age: '19m',
    headline: 'Perp funding flips positive on Binance and Bybit as shorts cover',
    blurb: '1h funding back above zero; open interest flat — squeeze risk if spot breaks the local high.',
    tone: 'bull',
  },
  {
    id: '4',
    source: 'The Block',
    age: '28m',
    headline: 'Whale wallets move 1.2k BTC to exchanges; desks flag sale risk',
    blurb: 'On-chain alerts cluster near recent resistance — watch for liquidity near the oracle strike.',
    tone: 'bear',
  },
]

export function MarketInsights() {
  return (
    <section className="ob-insights" aria-label="Market news insights">
      <div className="ob-insights-head">
        <h2 className="ob-insights-title">Insights</h2>
        <span className="ob-insights-tag">BTC · 60s</span>
      </div>
      <p className="ob-insights-lead">Mock headlines from major wires — for demo context only.</p>

      <ul className="ob-insights-list">
        {INSIGHTS.map((item) => (
          <li key={item.id} className={`ob-insight is-${item.tone}`}>
            <div className="ob-insight-meta">
              <span className="ob-insight-source">{item.source}</span>
              <span className="ob-insight-age">{item.age}</span>
            </div>
            <p className="ob-insight-headline">{item.headline}</p>
            <p className="ob-insight-blurb">{item.blurb}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
