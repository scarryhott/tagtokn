import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import test from 'node:test'
import {
  CLOSURE_STATUS,
  DISCLOSURE_LEVEL,
  PARTICIPANT_DECISION,
  PATH_INTEGRITY,
  SEMANTIC_PROFILE_FIELDS,
  resolveReturnCandidate,
  evaluateReturnAdmission,
  isAdmittedStatus,
  applyOwnershipTransfer,
  makeOpenClaimVerification,
  makePhysicalProjection,
  makeSemanticReceipt,
  makeChildOpening,
  semanticPathIdentity,
  summarizeNetworkAdmissibility,
  raffleWeight,
} from '../src/lib/returnUnified.js'

const root = resolve(import.meta.dirname, '..')
const chunks = Array.from({ length: 8 }, (_, index) => {
  const name = `${String(index).padStart(2, '0')}.b64`
  return readFileSync(resolve(root, 'src/app-source-v8', name), 'utf8').trim()
})
const appSource = gunzipSync(Buffer.from(chunks.join(''), 'base64')).toString('utf8')
const helperSource = readFileSync(resolve(root, 'src/lib/returnUnified.js'), 'utf8')
const source = `${appSource}\n${helperSource}`

const admissibleInput = {
  gateOpen: true,
  pointings: [{ actorType: 'Human', author: 'local-user', content: 'preserve this goal' }],
  actorId: 'local-user',
  witnessId: 'world-return-1',
  boundaryAttested: true,
  mandateConfirmed: true,
  participantDecision: PARTICIPANT_DECISION.ACCEPT,
  pathIntegrity: PATH_INTEGRITY.PRESERVED,
  evidenceReference: 'evidence://return/1',
}

test('independent recoverable return closes only under joint admissibility', () => {
  const result = evaluateReturnAdmission('independent', admissibleInput)
  assert.equal(result.status, CLOSURE_STATUS.CLOSED)
  assert.equal(result.independent, true)
  assert.equal(result.recoverable, true)
  assert.equal(result.witnessIndependent, true)
  assert.equal(isAdmittedStatus(result.status), true)
})

test('residual return closes parent while preserving a new opening', () => {
  const result = evaluateReturnAdmission('residual', admissibleInput)
  assert.equal(result.status, CLOSURE_STATUS.CLOSED_TO_NEW_OPENING)
  assert.equal(result.residual, true)
  assert.equal(isAdmittedStatus(result.status), true)
})

test('Potential Gate and ordered semantic pointings are required', () => {
  const noGate = evaluateReturnAdmission('independent', { ...admissibleInput, gateOpen: false })
  const noPointings = evaluateReturnAdmission('independent', { ...admissibleInput, pointings: [] })
  assert.equal(noGate.status, CLOSURE_STATUS.OPEN)
  assert.match(noGate.reasons.join(' '), /Potential Gate/)
  assert.equal(noPointings.status, CLOSURE_STATUS.OPEN)
  assert.match(noPointings.reasons.join(' '), /semantic pointing/)
})

test('participant mandate and consent boundary are required', () => {
  const result = evaluateReturnAdmission('independent', { ...admissibleInput, mandateConfirmed: false })
  assert.equal(result.status, CLOSURE_STATUS.OPEN)
  assert.match(result.reasons.join(' '), /mandate/)
})

test('independent witness must be distinct and boundary-attested', () => {
  const sameActor = evaluateReturnAdmission('independent', { ...admissibleInput, witnessId: 'local-user' })
  const unattested = evaluateReturnAdmission('independent', { ...admissibleInput, boundaryAttested: false })
  assert.equal(sameActor.status, CLOSURE_STATUS.OPEN)
  assert.equal(unattested.status, CLOSURE_STATUS.OPEN)
  assert.match(sameActor.reasons.join(' '), /independent boundary/)
})

test('participant refusal remains OPEN and blocks write-back', () => {
  const result = evaluateReturnAdmission('independent', {
    ...admissibleInput,
    participantDecision: PARTICIPANT_DECISION.REFUSE,
  })
  assert.equal(result.status, CLOSURE_STATUS.OPEN)
  assert.equal(result.refused, true)
  assert.match(result.reasons.join(' '), /refused/)
})

test('participant correction requires a corrected basis', () => {
  const missingCorrection = evaluateReturnAdmission('independent', {
    ...admissibleInput,
    participantDecision: PARTICIPANT_DECISION.CORRECT,
    correctedBasis: '',
  })
  const corrected = evaluateReturnAdmission('independent', {
    ...admissibleInput,
    participantDecision: PARTICIPANT_DECISION.CORRECT,
    correctedBasis: 'participant-authorized basis',
  })
  assert.equal(missingCorrection.status, CLOSURE_STATUS.OPEN)
  assert.equal(corrected.status, CLOSURE_STATUS.CLOSED)
})

test('unknown path remains OPEN and positively corrupted order collapses', () => {
  const unknown = evaluateReturnAdmission('independent', { ...admissibleInput, pathIntegrity: PATH_INTEGRITY.UNKNOWN })
  const corrupted = evaluateReturnAdmission('independent', { ...admissibleInput, pathIntegrity: PATH_INTEGRITY.CORRUPTED })
  assert.equal(unknown.status, CLOSURE_STATUS.OPEN)
  assert.equal(corrupted.status, CLOSURE_STATUS.FALSE_COLLAPSE)
})

test('independent return requires recoverable evidence reference', () => {
  const result = evaluateReturnAdmission('independent', { ...admissibleInput, evidenceReference: '' })
  assert.equal(result.status, CLOSURE_STATUS.OPEN)
  assert.match(result.reasons.join(' '), /evidence reference/)
})

test('missing return, replay, and duplicate witness cannot mint', () => {
  assert.equal(resolveReturnCandidate('missing').status, CLOSURE_STATUS.OPEN)
  assert.equal(resolveReturnCandidate('replay').status, CLOSURE_STATUS.OPEN)
  assert.equal(evaluateReturnAdmission('independent', { ...admissibleInput, duplicate: true }).status, CLOSURE_STATUS.OPEN)
})

test('witnessed contradiction is FALSE_COLLAPSE, not missing evidence', () => {
  const result = evaluateReturnAdmission('contradiction', admissibleInput)
  assert.equal(result.status, CLOSURE_STATUS.FALSE_COLLAPSE)
  assert.equal(result.contradictory, true)
  assert.equal(isAdmittedStatus(result.status), false)
})

test('semantic receipt preserves the complete returned relation bundle', () => {
  const gate = {
    id: 'gate-1',
    parentGateId: null,
    localGoal: 'local commitment',
    mandate: 'retain only accepted learning',
    disclosure: DISCLOSURE_LEVEL.SELECTIVE,
    pointings: [
      { actorType: 'Human', author: 'local-user', content: 'first distinction' },
      { actorType: 'AGI', author: 'agent-1', content: 'possible continuation' },
    ],
  }
  const profile = Object.fromEntries(SEMANTIC_PROFILE_FIELDS.map(([key], index) => [key, 20 + index]))
  const episode = {
    gateId: gate.id,
    returnedConsequence: 'independent consequence',
    resolvedSemanticBasis: 'accepted relation',
    evidence: { status: 'RERUNNABLE DATA', reference: 'evidence://1' },
    witness: { id: 'world-return-1', carrier: 'Environment', independent: true },
    participantDecision: PARTICIPANT_DECISION.ACCEPT,
    pathIntegrity: PATH_INTEGRITY.PRESERVED,
    candidateTopology: 'V:gate-1',
  }
  const receipt = makeSemanticReceipt({ receiptId: 'receipt-1', episode, gate, profile, childOpeningId: 'gate-child' })
  assert.equal(receipt.localCommitment, 'local commitment')
  assert.equal(receipt.foldedPointings.length, 2)
  assert.equal(receipt.transformedGlobalContinuation, 'independent consequence')
  assert.equal(receipt.resolvedSemanticBasis, 'accepted relation')
  assert.equal(receipt.witness.id, 'world-return-1')
  assert.equal(receipt.evidence.reference, 'evidence://1')
  assert.equal(receipt.childOpeningId, 'gate-child')
  assert.deepEqual(Object.keys(receipt.semanticProfile), SEMANTIC_PROFILE_FIELDS.map(([key]) => key))
})

test('semantic path identity changes when order changes', () => {
  const a = [
    { actorType: 'Human', author: 'u', content: 'first' },
    { actorType: 'AGI', author: 'a', content: 'second' },
  ]
  const b = [a[1], a[0]]
  assert.notEqual(semanticPathIdentity(a), semanticPathIdentity(b))
  assert.equal(semanticPathIdentity(a), semanticPathIdentity(a))
})

test('child opening carries parent linkage and remains OPEN', () => {
  const child = makeChildOpening({
    parentGate: { id: 'gate-parent', mandate: 'participant mandate', disclosure: DISCLOSURE_LEVEL.MINIMAL, createdBy: 'user' },
    title: 'residual question',
  })
  assert.equal(child.parentGateId, 'gate-parent')
  assert.equal(child.status, CLOSURE_STATUS.OPEN)
  assert.equal(child.mandate, 'participant mandate')
})

test('marketplace transfer preserves native supply', () => {
  const before = { marketplaceBought: 4, totalSupply: 7, tokenPoolValue: 21, totalFeesGenerated: 1 }
  const after = applyOwnershipTransfer(before, 3, 0.02)
  assert.equal(after.totalSupply, 7)
  assert.equal(after.marketplaceBought, 5)
  assert.equal(after.tokenPoolValue, 24)
  assert.equal(after.totalFeesGenerated, 1.06)
})

test('self-authored publication is an OPEN claim, not native supply', () => {
  const verification = makeOpenClaimVerification()
  assert.equal(verification.status, CLOSURE_STATUS.OPEN)
  assert.equal(verification.independent, false)
  assert.equal(verification.recoverable, false)
})

test('physical card preserves receipt semantics without creating supply', () => {
  const semanticReceipt = { receiptId: 'receipt-1', gateId: 'gate-1' }
  const verification = { status: CLOSURE_STATUS.CLOSED }
  const projection = makePhysicalProjection({
    receiptId: 'receipt-1',
    creatorId: 2,
    uniqueId: 'physical-1',
    requestDate: 'now',
    semanticReceipt,
    verification,
  })
  assert.equal(projection.receiptId, 'receipt-1')
  assert.equal(projection.semanticReceipt.gateId, 'gate-1')
  assert.equal(projection.verification.status, CLOSURE_STATUS.CLOSED)
  assert.equal(projection.createsNativeSupply, false)
})

test('raffle weight comes only from admitted native supply', () => {
  assert.equal(raffleWeight({ totalSupply: 0, marketplaceBought: 500 }), 0)
  assert.equal(raffleWeight({ totalSupply: 3, marketplaceBought: 0 }), 3)
})

test('network admissibility separates external return from gross transfer volume', () => {
  const summary = summarizeNetworkAdmissibility({
    episodes: [
      { status: CLOSURE_STATUS.CLOSED, localBall: 'user-a', witness: { id: 'world-a', carrier: 'Environment', independent: true } },
      { status: CLOSURE_STATUS.OPEN, localBall: 'user-a', participantDecision: PARTICIPANT_DECISION.REFUSE, witness: {} },
      { status: CLOSURE_STATUS.FALSE_COLLAPSE, localBall: 'user-b', witness: {} },
    ],
    trades: [{ price: 500 }, { price: 500 }],
    tokens: [{ verification: { status: CLOSURE_STATUS.CLOSED } }],
    listings: [{ verification: { status: CLOSURE_STATUS.OPEN } }],
  })
  assert.equal(summary.externalIntegration, 1)
  assert.equal(summary.grossTransferVolume, 1000)
  assert.equal(summary.nativeSupply, 1)
  assert.equal(summary.refused, 1)
})

test('original marketplace visual surfaces remain present', () => {
  for (const marker of [
    'Your Receipt Inventory',
    'Receipt Marketplace',
    'Receipt-Weighted Raffle',
    'ActivityFeedPanel',
    'TradeNetworkPanel',
    'TokenDetailModal',
    'CreatorDashboardModal',
    'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
  ]) assert.match(appSource, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
})

test('all paper-required pages share one application state', () => {
  for (const page of ['Network', 'Potential Gate', 'Admissibility', 'Framework', 'Unified Verification', 'Evidence', 'Projections', 'Mandate & Governance']) {
    assert.match(source, new RegExp(page))
  }
  for (const state of ['potentialGates', 'closureEpisodes', 'currentBasis', 'userTokens', 'marketplaceListings', 'tradeHistory', 'adapterPermissions', 'appeals']) {
    assert.match(appSource, new RegExp(state))
  }
})

test('UI exposes mandate, witness, decision, path, evidence, privacy, and seven-field semantics', () => {
  for (const marker of [
    'Participant mandate',
    'Independent witness boundary',
    'Participant decision',
    'Path integrity',
    'Evidence status',
    'Disclosure level',
    'Appeal or correction request',
    'Semantic Receipt Bundles',
  ]) assert.match(source, new RegExp(marker))
  for (const [, label] of SEMANTIC_PROFILE_FIELDS) assert.match(source, new RegExp(label.replace('/', '\\/')))
})

test('classical Firebase and Instagram runtime connections are absent', () => {
  assert.doesNotMatch(source, /firebase\/|initializeApp\(|getFirestore\(|signInWithPopup\(|instagram\.com/i)
})

test('UI exposes OPEN, admitted, residual-opening, refusal, and collapse boundaries', () => {
  for (const status of ['OPEN', 'CLOSED', 'CLOSED_TO_NEW_OPENING', 'FALSE_COLLAPSE', 'REFUSE']) {
    assert.match(source, new RegExp(status))
  }
})
