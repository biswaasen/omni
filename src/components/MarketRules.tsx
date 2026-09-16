export function MarketRules() {
  return (
    <section className="ob-rules" aria-label="Market information and rules">
      <div className="ob-rules-card">
        <p className="ob-rules-lead">
          <strong>Important information:</strong> The price used to settle this market is
          Omnibook&apos;s BTC oracle — the live median of Binance, Bybit, OKX, Kraken, and
          Bitget. The open is the oracle print at round start; the close is a 10s TWAP of that
          same feed (not the final tick). Trades settle in Omni coin ({'\u00D8'}).
        </p>
      </div>

      <div className="ob-rules-card">
        <div className="ob-rules-head">
          <span className="ob-rules-info" aria-hidden="true">
            i
          </span>
          <h2 className="ob-rules-title">Market rules</h2>
        </div>

        <p className="ob-rules-body">
          <strong>Resolves Up</strong> if the BTC index closes <strong>strictly above</strong>{' '}
          the open. Otherwise it resolves <strong>Down</strong> — a flat tie counts as Down.
          Close is the last 10s TWAP of the oracle.
        </p>

        <p className="ob-rules-body">
          Outcomes are verified from <strong>Omnibook&apos;s oracle</strong> — median of five
          major exchange feeds, published ~4×/sec with a ≥3-feed quorum.
        </p>

        <p className="ob-rules-note">
          Not all crypto price data is the same. Settlement uses Omnibook&apos;s sequenced
          oracle only — exchange UIs, aggregators, or delayed prints are not authoritative.
        </p>

        <div className="ob-rules-actions">
          <button type="button" className="ob-rules-link">
            View full rules
          </button>
          <button type="button" className="ob-rules-link">
            Help center
          </button>
        </div>
      </div>
    </section>
  )
}
