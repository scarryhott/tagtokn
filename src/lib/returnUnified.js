export const CLOSURE_STATUS = Object.freeze({
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  CLOSED_TO_NEW_OPENING: 'CLOSED_TO_NEW_OPENING',
  FALSE_COLLAPSE: 'FALSE_COLLAPSE',
})

export const PARTICIPANT_DECISION = Object.freeze({
  PENDING: 'PENDING',
  ACCEPT: 'ACCEPT',
  CORRECT: 'CORRECT',
  REFUSE: 'REFUSE',
})

export const PATH_INTEGRITY = Object.freeze({
  PRESERVED: 'PRESERVED',
  UNKNOWN: 'UNKNOWN',
  CORRUPTED: 'CORRUPTED',
})

export const EVIDENCE_STATUS = Object.freeze({
  TRANSCRIPT_BASIS: 'TRANSCRIPT BASIS',
  RERUNNABLE_DATA: 'RERUNNABLE DATA',
  REPORTED_ARTIFACT: 'REPORTED ARTIFACT',
  PUBLISHED_DATA: 'PUBLISHED DATA',
  DESIGN_TRANSLATION: 'DESIGN TRANSLATION',
  COMPARATIVE_LITERATURE: 'COMPARATIVE LITERATURE',
  OPEN_BOUNDARY: 'OPEN BOUNDARY',
})

export const DISCLOSURE_LEVEL = Object.freeze({
  MINIMAL: 'MINIMAL',
  SELECTIVE: 'SELECTIVE',
  FULL_AUDIT: 'FULL_AUDIT',
})

export const SEMANTIC_PROFILE_FIELDS = Object.freeze([
  ['reciprocalIdentification', 'Reciprocal identification'],
  ['differencePreservation', 'Difference preservation'],
  ['localDurability', 'Local durability'],
  ['globalResolution', 'Global resolution'],
  ['teachingGain', 'Teaching gain'],
  ['witnessFidelity', 'Witness fidelity'],
  ['noveltyNonRepetition', 'Novelty / non-repetition'],
])

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

export const isIndependentWitness = ({ actorId, witnessId, boundaryAttested = false } = {}) => (
  Boolean(actorId && witnessId && actorId !== witnessId && boundaryAttested)
)

export const foldSemanticPointings = (pointings = []) => pointings.map((pointing, index) => ({
  ordinal: index + 1,
  actorType: pointing.actorType || 'Human',
  author: pointing.author || null,
  content: String(pointing.content || '').trim(),
})).filter(pointing => pointing.content)

export const semanticPathIdentity = (pointings = []) => {
  const serialized = foldSemanticPointings(pointings)
    .map(pointing => `${pointing.ordinal}|${pointing.actorType}|${pointing.author || ''}|${pointing.content}`)
    .join('→')
  let hash = 2166136261
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `path:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export const evaluateReturnAdmission = (modeId, {
  duplicate = false,
  gateOpen = false,
  pointings = [],
  actorId = null,
  witnessId = null,
  boundaryAttested = false,
  mandateConfirmed = false,
  participantDecision = PARTICIPANT_DECISION.PENDING,
  correctedBasis = '',
  pathIntegrity = PATH_INTEGRITY.UNKNOWN,
  evidenceReference = '',
} = {}) => {
  const base = resolveReturnCandidate(modeId, { duplicate })
  const reasons = []

  if (base.status === CLOSURE_STATUS.FALSE_COLLAPSE || pathIntegrity === PATH_INTEGRITY.CORRUPTED) {
    return {
      ...RETURN_MODE_META.contradiction,
      reasons: [base.status === CLOSURE_STATUS.FALSE_COLLAPSE ? 'Witnessed contradiction.' : 'Ordered causal path was positively corrupted.'],
      participantDecision,
      witnessIndependent: isIndependentWitness({ actorId, witnessId, boundaryAttested }),
    }
  }

  if (!gateOpen) reasons.push('No OPEN Potential Gate anchors the episode.')
  if (foldSemanticPointings(pointings).length === 0) reasons.push('No ordered semantic pointing has been authored.')
  if (!mandateConfirmed) reasons.push('Participant mandate was not confirmed for this return.')
  if (participantDecision === PARTICIPANT_DECISION.PENDING) reasons.push('Participant acceptance, correction, or refusal is unresolved.')
  if (participantDecision === PARTICIPANT_DECISION.REFUSE) reasons.push('Participant refused write-back and learning.')
  if (participantDecision === PARTICIPANT_DECISION.CORRECT && !String(correctedBasis).trim()) reasons.push('Correction was selected without a corrected basis.')
  if (pathIntegrity === PATH_INTEGRITY.UNKNOWN) reasons.push('Path order and causal continuity remain unverified.')

  const witnessIndependent = isIndependentWitness({ actorId, witnessId, boundaryAttested })
  if (base.independent && !witnessIndependent) reasons.push('The returned witness does not establish an independent boundary.')
  if (base.independent && !String(evidenceReference).trim()) reasons.push('Independent return lacks a recoverable evidence reference.')
  if (duplicate) reasons.push('The returned consequence duplicates a prior episode or receipt.')

  if (reasons.length > 0 || base.status === CLOSURE_STATUS.OPEN) {
    return {
      ...RETURN_MODE_META.missing,
      status: CLOSURE_STATUS.OPEN,
      residual: false,
      reasons: reasons.length > 0 ? reasons : ['Return remains OPEN.'],
      participantDecision,
      witnessIndependent,
      refused: participantDecision === PARTICIPANT_DECISION.REFUSE,
    }
  }

  return {
    ...base,
    reasons: ['Independent return, mandate, path, evidence, and participant decision are jointly admissible.'],
    participantDecision,
    witnessIndependent,
    refused: false,
  }
}

export const normalizeSemanticProfile = (profile = {}) => Object.fromEntries(
  SEMANTIC_PROFILE_FIELDS.map(([key]) => {
    const raw = Number(profile[key] ?? 0)
    const value = Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 0
    return [key, value]
  }),
)

export const makeSemanticReceipt = ({
  receiptId,
  episode,
  gate,
  profile,
  childOpeningId = null,
} = {}) => ({
  receiptId,
  gateId: gate?.id || episode?.gateId || null,
  parentGateId: gate?.parentGateId || null,
  localCommitment: gate?.localGoal || episode?.localCommitment || '',
  mandate: gate?.mandate || episode?.mandate || '',
  disclosure: gate?.disclosure || episode?.disclosure || DISCLOSURE_LEVEL.SELECTIVE,
  foldedPointings: foldSemanticPointings(gate?.pointings || episode?.pointings || []),
  pathIdentity: episode?.pathIdentity || semanticPathIdentity(gate?.pointings || episode?.pointings || []),
  transformedGlobalContinuation: episode?.returnedConsequence || '',
  resolvedSemanticBasis: episode?.resolvedSemanticBasis || episode?.returnedConsequence || '',
  evidence: episode?.evidence || null,
  witness: episode?.witness || null,
  participantDecision: episode?.participantDecision || PARTICIPANT_DECISION.PENDING,
  pathIntegrity: episode?.pathIntegrity || PATH_INTEGRITY.UNKNOWN,
  candidateTopology: episode?.candidateTopology || null,
  childOpeningId,
  semanticProfile: normalizeSemanticProfile(profile || episode?.semanticProfile || {}),
})

export const makeChildOpening = ({ parentGate, title, createdBy, disclosure } = {}) => ({
  id: `gate_child_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  title: String(title || 'Residual opening').trim(),
  localGoal: '',
  mandate: parentGate?.mandate || '',
  disclosure: disclosure || parentGate?.disclosure || DISCLOSURE_LEVEL.SELECTIVE,
  status: CLOSURE_STATUS.OPEN,
  createdBy: createdBy || parentGate?.createdBy || null,
  parentGateId: parentGate?.id || null,
  pointings: [],
  createdAt: new Date().toISOString(),
})

export const summarizeNetworkAdmissibility = ({ episodes = [], trades = [], tokens = [], listings = [] } = {}) => {
  const admitted = episodes.filter(episode => isAdmittedStatus(episode.status))
  const open = episodes.filter(episode => episode.status === CLOSURE_STATUS.OPEN)
  const collapsed = episodes.filter(episode => episode.status === CLOSURE_STATUS.FALSE_COLLAPSE)
  const refused = episodes.filter(episode => episode.participantDecision === PARTICIPANT_DECISION.REFUSE)
  const witnesses = new Set(admitted.map(episode => episode.witness?.id).filter(Boolean))
  const participants = new Set(episodes.map(episode => episode.localBall).filter(Boolean))
  const carriers = new Set(admitted.map(episode => episode.witness?.carrier).filter(Boolean))
  const nativeSupply = [...tokens, ...listings].filter(item => isAdmittedVerification(item.verification)).length
  const grossTransferVolume = trades.reduce((sum, trade) => sum + Number(trade.price || 0), 0)
  return {
    admitted: admitted.length,
    open: open.length,
    collapsed: collapsed.length,
    refused: refused.length,
    independentWitnesses: witnesses.size,
    participants: participants.size,
    carriers: carriers.size,
    nativeSupply,
    grossTransferVolume,
    externalIntegration: admitted.filter(episode => episode.witness?.independent).length,
  }
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

export const makePhysicalProjection = ({
  receiptId,
  creatorId,
  uniqueId,
  requestDate,
  semanticReceipt = null,
  verification = null,
}) => ({
  uniqueId,
  receiptId,
  creatorId,
  status: 'requested',
  requestDate,
  semanticReceipt,
  verification,
  createsNativeSupply: false,
})

export const raffleWeight = (creator) => Math.max(0, creator.totalSupply || 0)