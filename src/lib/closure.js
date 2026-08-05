export const ReturnStatus = Object.freeze({
  OPEN: 'OPEN',
  OPEN_SELF_REFERENCE: 'OPEN_SELF_REFERENCE',
  OPEN_NO_RECOVERY: 'OPEN_NO_RECOVERY',
  FALSE_COLLAPSE: 'FALSE_COLLAPSE',
  CLOSED: 'CLOSED_EMERGENT_TOPOLOGY',
  CLOSED_TO_NEW_OPENING: 'CLOSED_TO_NEW_OPENING',
})

const CLOSED_STATUSES = new Set([
  ReturnStatus.CLOSED,
  ReturnStatus.CLOSED_TO_NEW_OPENING,
])

function assertFiniteNonNegative(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number`)
  }
}

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

// Deterministic UI identifier, not a cryptographic proof or chain commitment.
export function semanticDigest(value) {
  const input = stableSerialize(value)
  let hash = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index))
    hash = BigInt.asUintN(64, hash * prime)
  }
  return hash.toString(16).padStart(16, '0')
}

export function basisPrice(externalSupport, circulatingSupply) {
  assertFiniteNonNegative(externalSupport, 'external support')
  if (!Number.isFinite(circulatingSupply) || circulatingSupply <= 0) {
    throw new RangeError('circulating supply must be a positive finite number')
  }
  return externalSupport / circulatingSupply
}

export function classifyReturn({ independent, recoverable, contradictory, residual, selfAuthored = false }) {
  if (contradictory) return ReturnStatus.FALSE_COLLAPSE
  if (!independent || selfAuthored) return ReturnStatus.OPEN_SELF_REFERENCE
  if (!recoverable) return ReturnStatus.OPEN_NO_RECOVERY
  return residual ? ReturnStatus.CLOSED_TO_NEW_OPENING : ReturnStatus.CLOSED
}

export function openPotentialGate({ openingId, localPerspective, globalContinuation = 'UNRESOLVED' }) {
  if (!openingId || !localPerspective) throw new TypeError('openingId and localPerspective are required')
  return Object.freeze({
    gateId: `GATE:${semanticDigest({ openingId, localPerspective })}`,
    openingId,
    localPerspective,
    globalContinuation,
    topology: null,
    status: ReturnStatus.OPEN,
    tokenIssued: false,
  })
}

export function foldUserHistory(pointings = []) {
  const semanticPointings = pointings.map((pointing) => ({
    actor: pointing.actor,
    relation: pointing.relation,
    direction: pointing.direction,
    target: pointing.target,
  }))
  return Object.freeze({
    pointCount: semanticPointings.length,
    actors: [...new Set(semanticPointings.map((item) => item.actor))],
    foldedDigest: semanticDigest(semanticPointings),
  })
}

export function closureValueProfile({
  historyThickness = 0,
  connectednessLength = 0,
  semanticResolution = 0,
  reciprocityQuality = 0,
  openingPotential = 0,
} = {}) {
  const fields = { historyThickness, connectednessLength, semanticResolution, reciprocityQuality, openingPotential }
  Object.entries(fields).forEach(([key, value]) => {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError(`${key} must be between 0 and 1`)
    }
  })
  return Object.freeze(fields)
}

export function resolvePotentialGate({
  gate,
  pointings = [],
  returnWitness,
  valueProfile = closureValueProfile(),
}) {
  if (!gate || gate.status !== ReturnStatus.OPEN) throw new TypeError('an OPEN Potential Gate is required')
  if (!returnWitness) throw new TypeError('returnWitness is required')

  const status = classifyReturn(returnWitness)
  const history = foldUserHistory(pointings)
  const closed = CLOSED_STATUSES.has(status)
  const topology = closed
    ? Object.freeze({
      topologyId: `TOPOLOGY:${semanticDigest({
        gateId: gate.gateId,
        relation: returnWitness.relation,
        translation: returnWitness.translation,
        history: history.foldedDigest,
      })}`,
      relation: returnWitness.relation || 'connected-return',
      translation: returnWitness.translation || 'independent-return',
      recoveryContract: returnWitness.recoveryContract || 'mutual-recoverability',
    })
    : null

  const token = closed
    ? Object.freeze({
      tokenId: `TAG:${semanticDigest({ gateId: gate.gateId, topologyId: topology.topologyId })}`,
      gateId: gate.gateId,
      topologyId: topology.topologyId,
      closureClass: status,
      foldedHistory: history.foldedDigest,
      valueProfile,
      marketValue: null,
      humanWorth: null,
    })
    : null

  const childGate = status === ReturnStatus.CLOSED_TO_NEW_OPENING
    ? openPotentialGate({
      openingId: `${gate.openingId}:RETURN`,
      localPerspective: topology.topologyId,
      globalContinuation: 'NEW_OPENING',
    })
    : null

  return Object.freeze({
    gate: Object.freeze({ ...gate, status, topology, tokenIssued: Boolean(token) }),
    topology,
    token,
    childGate,
    history,
  })
}

export function nativeTokenSupply(receipts = []) {
  return receipts.filter((receipt) => receipt?.token && CLOSED_STATUSES.has(receipt.gate.status)).length
}

export function networkIntegration({ externalSupport, internalTransfers = [], independentReturns = 0 }) {
  assertFiniteNonNegative(externalSupport, 'external support')
  assertFiniteNonNegative(independentReturns, 'independent returns')
  for (const transfer of internalTransfers) {
    assertFiniteNonNegative(transfer.amount, 'internal transfer amount')
  }
  return externalSupport + independentReturns
}

export function projectMarket({
  externalSupport,
  receipts = [],
  openClaims = 0,
  internalVolume = 0,
  displaySupplyFloor = 1,
}) {
  assertFiniteNonNegative(externalSupport, 'external support')
  assertFiniteNonNegative(openClaims, 'open claims')
  assertFiniteNonNegative(internalVolume, 'internal volume')
  const nativeSupply = nativeTokenSupply(receipts)
  const pricedSupply = Math.max(displaySupplyFloor, nativeSupply)
  return Object.freeze({
    externalSupport,
    nativeSupply,
    openClaims,
    internalVolume,
    independentIntegration: externalSupport,
    displayedBasisPrice: basisPrice(externalSupport, pricedSupply),
    warning: openClaims > 0 || internalVolume > 0
      ? 'Open claims and circular volume are archived projections, not native supply.'
      : null,
  })
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

export const tokenomicsScenarios = Object.freeze({
  open: Object.freeze({
    label: 'Open gate',
    description: 'Semantic pointings accumulate, but no independent return has resolved the relation.',
    witness: null,
  }),
  independent: Object.freeze({
    label: 'Independent return',
    description: 'A non-self-authored return recovers the relation and issues one semantic receipt.',
    witness: Object.freeze({ independent: true, recoverable: true, contradictory: false, residual: false, relation: 'local-global-semantic-return', translation: 'connected-return' }),
  }),
  residual: Object.freeze({
    label: 'Close to opening',
    description: 'The current relation resolves while a residual continuation opens a child Potential Gate.',
    witness: Object.freeze({ independent: true, recoverable: true, contradictory: false, residual: true, relation: 'return-with-residual', translation: 'connected-return' }),
  }),
  replay: Object.freeze({
    label: 'Circular replay',
    description: 'A self-authored A→B→A loop is archived but remains OPEN and adds no native supply.',
    witness: Object.freeze({ independent: false, selfAuthored: true, recoverable: true, contradictory: false, residual: false, relation: 'self-reference', translation: 'replay' }),
  }),
  contradiction: Object.freeze({
    label: 'Contradictory return',
    description: 'The return conflicts with the maintained relation, so the gate collapses and issues nothing.',
    witness: Object.freeze({ independent: true, recoverable: true, contradictory: true, residual: false, relation: 'contradiction', translation: 'failed-return' }),
  }),
})

export function runTokenomicsScenario(name) {
  const scenario = tokenomicsScenarios[name]
  if (!scenario) throw new RangeError(`unknown tokenomics scenario: ${name}`)
  const gate = openPotentialGate({
    openingId: 'TAGTOKN-DEMO',
    localPerspective: 'USER-SEMANTIC-BALL',
    globalContinuation: 'NETWORK-HAIR',
  })
  const pointings = [
    { actor: 'human', relation: 'names-context', direction: 'local-to-global', target: 'network' },
    { actor: 'agi', relation: 'translates-context', direction: 'global-to-local', target: 'human' },
    { actor: 'community', relation: 'returns-support', direction: 'global-to-local', target: 'gate' },
  ]
  if (!scenario.witness) return Object.freeze({ gate, topology: null, token: null, childGate: null, history: foldUserHistory(pointings) })
  return resolvePotentialGate({
    gate,
    pointings,
    returnWitness: scenario.witness,
    valueProfile: closureValueProfile({
      historyThickness: 0.72,
      connectednessLength: 0.81,
      semanticResolution: scenario.witness.contradictory ? 0.08 : 0.76,
      reciprocityQuality: scenario.witness.independent ? 0.84 : 0.12,
      openingPotential: scenario.witness.residual ? 0.91 : 0.34,
    }),
  })
}
