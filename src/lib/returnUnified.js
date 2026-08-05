export const CLOSURE_STATUS = Object.freeze({
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  CLOSED_TO_NEW_OPENING: 'CLOSED_TO_NEW_OPENING',
  FALSE_COLLAPSE: 'FALSE_COLLAPSE',
})

export const RETURN_MODE_META = Object.freeze({
  independent: {
    label: 'Independent recoverable return',
    status: CLOSURE_STATUS.CLOSED,
    independent: true,
    recoverable: true,
    contradictory: false,
    residual: false,
  },
  residual: {
    label: 'Recover relation and preserve a new opening',
    status: CLOSURE_STATUS.CLOSED_TO_NEW_OPENING,
    independent: true,
    recoverable: true,
    contradictory: false,
    residual: true,
  },
  replay: {
    label: 'Self-authored replay',
    status: CLOSURE_STATUS.OPEN,
    independent: false,
    recoverable: true,
    contradictory: false,
    residual: false,
  },
  missing: {
    label: 'Return still missing',
    status: CLOSURE_STATUS.OPEN,
    independent: false,
    recoverable: false,
    contradictory: false,
    residual: false,
  },
  contradiction: {
    label: 'Witnessed contradiction',
    status: CLOSURE_STATUS.FALSE_COLLAPSE,
    independent: true,
    recoverable: false,
    contradictory: true,
    residual: false,
  },
})

export const normalizeClosureStatus = (status) => {
  if (status === 'verified') return CLOSURE_STATUS.CLOSED
  if (status === 'rejected') return CLOSURE_STATUS.FALSE_COLLAPSE
  if (status === 'pending' || status === 'unverified' || !status) return CLOSURE_STATUS.OPEN
  return status
}

export const isAdmittedStatus = (status) => {
  const normalized = normalizeClosureStatus(status)
  return normalized === CLOSURE_STATUS.CLOSED || normalized === CLOSURE_STATUS.CLOSED_TO_NEW_OPENING
}

export const isAdmittedVerification = (verification) => isAdmittedStatus(verification?.status)

export const resolveReturnCandidate = (modeId, { duplicate = false } = {}) => {
  const candidate = RETURN_MODE_META[modeId] || RETURN_MODE_META.missing
  if (duplicate && candidate.status !== CLOSURE_STATUS.FALSE_COLLAPSE) {
    return RETURN_MODE_META.replay
  }
  return candidate
}

export const applyOwnershipTransfer = (creator, purchasePrice, commissionRate) => ({
  ...creator,
  marketplaceBought: creator.marketplaceBought + 1,
  totalSupply: creator.totalSupply,
  tokenPoolValue: creator.tokenPoolValue + purchasePrice,
  totalFeesGenerated: creator.totalFeesGenerated + purchasePrice * commissionRate,
})

export const makeOpenClaimVerification = () => ({
  status: CLOSURE_STATUS.OPEN,
  independent: false,
  recoverable: false,
  topology: null,
  reason: 'Self-authored publication is an OPEN claim, not a native receipt.',
})

export const makePhysicalProjection = ({ receiptId, creatorId, uniqueId, requestDate }) => ({
  uniqueId,
  receiptId,
  creatorId,
  status: 'requested',
  requestDate,
  createsNativeSupply: false,
})

export const raffleWeight = (creator) => Math.max(0, creator.totalSupply || 0)
