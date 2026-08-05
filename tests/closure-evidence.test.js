import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ReturnStatus,
  basisPrice,
  classifyReturn,
  closureValueProfile,
  foldUserHistory,
  nativeTokenSupply,
  networkIntegration,
  openPotentialGate,
  projectMarket,
  runTokenomicsScenario,
  semanticDigest,
} from '../src/lib/closure.js'

test('unsupported supply dilutes a market projection without changing support', () => {
  assert.equal(basisPrice(100, 10), 10)
  assert.equal(basisPrice(100, 20), 5)
})

test('Potential Gate begins OPEN without a predefined topology or token', () => {
  const gate = openPotentialGate({ openingId: 'A', localPerspective: 'local' })
  assert.equal(gate.status, ReturnStatus.OPEN)
  assert.equal(gate.topology, null)
  assert.equal(gate.tokenIssued, false)
})

test('semantic history ignores formal timestamp and price shadows', () => {
  const shared = { actor: 'u1', relation: 'names', direction: 'local-to-global', target: 'network' }
  const first = foldUserHistory([{ ...shared, timestamp: 1, price: 10 }])
  const second = foldUserHistory([{ ...shared, timestamp: 999, price: 1000 }])
  assert.equal(first.foldedDigest, second.foldedDigest)
})

test('semantic digest is stable under object key order', () => {
  assert.equal(semanticDigest({ a: 1, b: 2 }), semanticDigest({ b: 2, a: 1 }))
})

test('self-authored replay remains OPEN', () => {
  assert.equal(classifyReturn({ independent: false, selfAuthored: true, recoverable: true, contradictory: false, residual: false }), ReturnStatus.OPEN_SELF_REFERENCE)
})

test('unrecoverable independent return remains OPEN', () => {
  assert.equal(classifyReturn({ independent: true, recoverable: false, contradictory: false, residual: false }), ReturnStatus.OPEN_NO_RECOVERY)
})

test('contradiction collapses without issuing a token', () => {
  const result = runTokenomicsScenario('contradiction')
  assert.equal(result.gate.status, ReturnStatus.FALSE_COLLAPSE)
  assert.equal(result.token, null)
})

test('independent recoverable return discloses topology and issues one token', () => {
  const result = runTokenomicsScenario('independent')
  assert.equal(result.gate.status, ReturnStatus.CLOSED)
  assert.ok(result.topology.topologyId.startsWith('TOPOLOGY:'))
  assert.ok(result.token.tokenId.startsWith('TAG:'))
  assert.equal(nativeTokenSupply([result]), 1)
})

test('closed-to-opening issues a parent token and preserves a child OPEN gate', () => {
  const result = runTokenomicsScenario('residual')
  assert.equal(result.gate.status, ReturnStatus.CLOSED_TO_NEW_OPENING)
  assert.ok(result.token)
  assert.equal(result.childGate.status, ReturnStatus.OPEN)
  assert.equal(result.childGate.tokenIssued, false)
})

test('open claims and circular volume cannot become native supply', () => {
  const market = projectMarket({ externalSupport: 100, receipts: [runTokenomicsScenario('open'), runTokenomicsScenario('replay')], openClaims: 40, internalVolume: 1000 })
  assert.equal(market.nativeSupply, 0)
  assert.equal(market.independentIntegration, 100)
  assert.ok(market.warning)
})

test('only closed receipts count toward native token supply', () => {
  const receipts = ['open', 'replay', 'contradiction', 'independent', 'residual'].map(runTokenomicsScenario)
  assert.equal(nativeTokenSupply(receipts), 2)
})

test('internal circular transfers do not increase independent network integration', () => {
  const integration = networkIntegration({
    externalSupport: 100,
    internalTransfers: [
      { from: 'A', to: 'B', amount: 500 },
      { from: 'B', to: 'A', amount: 500 },
    ],
  })
  assert.equal(integration, 100)
})

test('independent returns can add integration while loops remain neutral', () => {
  assert.equal(networkIntegration({ externalSupport: 100, internalTransfers: [{ from: 'A', to: 'A', amount: 9999 }], independentReturns: 4 }), 104)
})

test('closure value remains a non-scalar profile', () => {
  const profile = closureValueProfile({ historyThickness: 0.5, connectednessLength: 0.6, semanticResolution: 0.7, reciprocityQuality: 0.8, openingPotential: 0.9 })
  assert.deepEqual(Object.keys(profile), ['historyThickness', 'connectednessLength', 'semanticResolution', 'reciprocityQuality', 'openingPotential'])
  assert.equal('score' in profile, false)
})

test('formal market value and human worth are absent from native token identity', () => {
  const token = runTokenomicsScenario('independent').token
  assert.equal(token.marketValue, null)
  assert.equal(token.humanWorth, null)
})
