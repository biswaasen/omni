export const OMNI = 'Ø'

export function formatOmni(
  n: number,
  opts?: { decimals?: number; wholeUnder?: number },
) {
  const wholeUnder = opts?.wholeUnder
  if (wholeUnder != null && n < wholeUnder) {
    return `${OMNI}${Math.round(n)}`
  }
  const decimals = opts?.decimals ?? 2
  const body = n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${OMNI}${body}`
}

export function formatOmniCompact(n: number) {
  if (n < 15) return `${OMNI}${Math.round(n)}`
  return `${OMNI}${n.toFixed(2).replace(/\.00$/, '')}`
}

export function formatIndex(n: number) {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatIndexAxis(n: number) {
  return n.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  })
}
