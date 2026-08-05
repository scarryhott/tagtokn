import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { gunzipSync } from 'node:zlib'
import {
  CLOSURE_STATUS,
  resolveReturnCandidate,
  isAdmittedStatus,
  applyOwnershipTransfer,
  makeOpenClaimVerification,
  makePhysicalProjection,
  raffleWeight,
} from '../src/lib/returnUnified.js'

const root = resolve(import.meta.dirname, '..')
const chunks = Array.from({ length: 8 }, (_, index) => {
  const name = `${String(index).padStart(2, '0')}.b64`
  return readFileSync(resolve(root, 'src/app-source-v7', name), 'utf8').trim()
})
const source = gunzipSync(Buffer.from(chunks.join(''), 'base64')).toString('utf8')

test('independent recoverable return closes and can write back', () => {
  const result = resolveReturnCandidate('independent')
  assert.equal(result.status, CLOSURE_STATUS.CLOSED)
  assert.equal(result.independent, true)
  assert.equal(result.recoverable, true)
  assert.equal(isAdmittedStatus(result.status), true)
})

test('residual return closes parent while preserving a new opening', () => {
  const result = resolveReturnCandidate('residual')
  assert.equal(result.status, CLOSURE_STATUS.CLOSED_TO_NEW_OPENING)
  assert.equal(result.residual, true)
  assert.equal(isAdmittedStatus(result.status), true)
})

test('missing return and self-authored replay remain OPEN', () => {
  assert.equal(resolveReturnCandidate('missing').status, CLOSURE_STATUS.OPEN)
  assert.equal(resolveReturnCandidate('replay').status, CLOSURE_STATUS.OPEN)
  assert.equal(resolveReturnCandidate('independent', { duplicate: true }).status, CLOSURE_STATUS.OPEN)
})

test('witnessed contradiction is FALSE_COLLAPSE, not missing evidence', () => {
  const result = resolveReturnCandidate('contradiction')
  assert.equal(result.status, CLOSURE_STATUS.FALSE_COLLAPSE)
  assert.equal(result.contradictory, true)
  assert.equal(isAdmittedStatus(result.status), false)
})

test('marketplace transfer preserves native supply', () => {
  const before = {
    marketplaceBought: 4,
    totalSupply: 7,
    tokenPoolValue: 21,
    totalFeesGenerated: 1,
  }
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

test('physical card is a projection of an existing receipt', () => {
  const projection = makePhysicalProjection({
    receiptId: 'receipt-1',
    creatorId: 2,
    uniqueId: 'physical-1',
    requestDate: 'now',
  })
  assert.equal(projection.receiptId, 'receipt-1')
  assert.equal(projection.createsNativeSupply, false)
})

test('raffle weight comes only from admitted native supply', () => {
  assert.equal(raffleWeight({ totalSupply: 0, marketplaceBought: 500 }), 0)
  assert.equal(raffleWeight({ totalSupply: 3, marketplaceBought: 0 }), 3)
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
  ]) assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
})

test('framework, verification, evidence, projections, and network share one app', () => {
  for (const page of ['Network', 'Framework', 'Unified Verification', 'Evidence', 'Projections']) {
    assert.match(source, new RegExp(page))
  }
  for (const state of ['closureEpisodes', 'currentBasis', 'userTokens', 'marketplaceListings', 'tradeHistory']) {
    assert.match(source, new RegExp(state))
  }
})

test('classical Firebase and Instagram runtime connections are absent', () => {
  assert.doesNotMatch(source, /firebase\/|initializeApp\(|getFirestore\(|signInWithPopup\(|instagram\.com/i)
})

test('UI exposes the full ternary-plus-residual admission boundary', () => {
  for (const status of ['OPEN', 'CLOSED', 'CLOSED_TO_NEW_OPENING', 'FALSE_COLLAPSE']) {
    assert.match(source, new RegExp(status))
  }
})
