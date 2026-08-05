export function basisPrice(externalSupport, circulatingSupply) {
  if (!Number.isFinite(externalSupport) || !Number.isFinite(circulatingSupply)) {
    throw new TypeError('support and supply must be finite numbers')
  }
  if (circulatingSupply <= 0) {
    throw new RangeError('circulating supply must be positive')
  }
  return externalSupport / circulatingSupply
}

export function networkIntegration({ externalSupport, internalTransfers = [] }) {
  if (!Number.isFinite(externalSupport) || externalSupport < 0) {
    throw new RangeError('external support must be a non-negative finite number')
  }
  for (const transfer of internalTransfers) {
    if (!Number.isFinite(transfer.amount) || transfer.amount < 0) {
      throw new RangeError('internal transfer amounts must be non-negative finite numbers')
    }
  }
  return externalSupport
}

export function classifyReturn({ independent, recoverable, contradictory, residual }) {
  if (contradictory) return 'FALSE_COLLAPSE'
  if (!independent || !recoverable) return 'OPEN'
  return residual ? 'CLOSED_TO_NEW_OPENING' : 'CLOSED_EMERGENT_TOPOLOGY'
}

export function evidenceTotals(rows) {
  return rows.reduce(
    (acc, row) => {
      acc.total += 1
      acc[row.status] = (acc[row.status] || 0) + 1
      return acc
    },
    { total: 0 },
  )
}
