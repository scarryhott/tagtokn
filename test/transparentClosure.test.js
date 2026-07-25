import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildTransparentRecord,
  canTransitionContract,
  canonicalJson,
  hmacSha256,
  normalizeConnectorEvent,
  normalizeContractTransition,
  normalizeStripeEvent,
  sha256,
  verifyConnectorSignature,
  verifyStripeSignature,
  verifyTransparentRecord,
} from '../api/_closure.js'

test('canonical JSON and hashes are independent of object key order', () => {
  const left = { b: 2, a: { d: 4, c: 3 } }
  const right = { a: { c: 3, d: 4 }, b: 2 }
  assert.equal(canonicalJson(left), canonicalJson(right))
  assert.equal(sha256(left), sha256(right))
})

test('Stripe verification binds the raw body and timestamp', () => {
  const rawBody = JSON.stringify({ id: 'evt_1', type: 'payment_intent.succeeded' })
  const secret = 'whsec_test'
  const timestamp = 1_800_000_000
  const signature = hmacSha256(secret, `${timestamp}.${rawBody}`)
  const header = `t=${timestamp},v1=${signature}`
  assert.equal(verifyStripeSignature(rawBody, header, secret, { nowSeconds: timestamp }).verified, true)
  assert.equal(verifyStripeSignature(`${rawBody} `, header, secret, { nowSeconds: timestamp }).verified, false)
})

test('generic connector verification rejects payload mutation', () => {
  const secret = 'connector-secret'
  const rawBody = JSON.stringify({ sourceEventId: 'event-1' })
  const header = `sha256=${hmacSha256(secret, rawBody)}`
  assert.equal(verifyConnectorSignature(rawBody, header, secret).verified, true)
  assert.equal(verifyConnectorSignature(`${rawBody}\n`, header, secret).verified, false)
})

test('Stripe normalization preserves observations and marks contract effect as evidence-only', () => {
  const normalized = normalizeStripeEvent({
    id: 'evt_paid',
    type: 'payment_intent.succeeded',
    created: 1_800_000_000,
    livemode: false,
    data: {
      object: {
        id: 'pi_1',
        object: 'payment_intent',
        amount_received: 2500,
        currency: 'usd',
        status: 'succeeded',
        metadata: {
          contract_id: 'contract-1',
          payer_basis_id: 'basis-a',
          recipient_basis_id: 'basis-b',
        },
      },
    },
  })
  assert.equal(normalized.observed.amountMinor, 2500)
  assert.equal(normalized.observed.currency, 'USD')
  assert.equal(normalized.inferred.contractId, 'contract-1')
  assert.equal(normalized.contractEvidence.advancesContractState, false)
  assert.equal(normalized.contractEvidence.effect, 'evidence-only')
})

test('platform normalization requires observed facts and keeps inference separate', () => {
  const normalized = normalizeConnectorEvent({
    sourceSystem: 'github',
    sourceEventId: 'delivery-1',
    sourceEventType: 'pull_request.merged',
    observed: { repository: 'owner/repo', pullRequest: 12, merged: true },
    inferred: { relationType: 'collaboration-continued' },
  })
  assert.deepEqual(normalized.observed, { merged: true, pullRequest: 12, repository: 'owner/repo' })
  assert.deepEqual(normalized.inferred, { relationType: 'collaboration-continued' })
  assert.throws(() => normalizeConnectorEvent({ sourceSystem: 'x', sourceEventId: '1', sourceEventType: 'post' }))
})

test('internal contract transitions are explicit and state checked', () => {
  assert.equal(canTransitionContract(null, 'proposed'), true)
  assert.equal(canTransitionContract('proposed', 'accepted'), true)
  assert.equal(canTransitionContract('proposed', 'fulfilled'), false)
  const normalized = normalizeContractTransition(
    {
      contractId: 'contract-1',
      sourceEventId: 'transition-2',
      nextState: 'accepted',
      participants: [{ id: 'basis-a' }, { id: 'basis-b' }],
      evidence: ['proposal-digest', 'signature-digest'],
    },
    'proposed',
  )
  assert.equal(normalized.contractTransition.previousState, 'proposed')
  assert.equal(normalized.contractTransition.nextState, 'accepted')
  assert.throws(() => normalizeContractTransition({ contractId: 'c', sourceEventId: 't', nextState: 'fulfilled' }, 'proposed'))
})

test('transparent records are deterministic and independently verifiable', () => {
  const normalized = normalizeConnectorEvent({
    sourceSystem: 'platform-x',
    sourceEventId: 'event-9',
    sourceEventType: 'share.created',
    occurredAt: '2026-07-25T12:00:00.000Z',
    observed: { objectId: 'post-1', action: 'shared' },
    inferred: { context: 'local-project', inferenceBasis: ['adapter-rule'] },
  })
  const input = {
    normalized,
    rawBody: JSON.stringify({ sourceEventId: 'event-9' }),
    signatureVerification: { verified: true, scheme: 'test', reason: 'verified' },
    adapter: { id: 'platform-adapter', version: '1.0.0', rules: ['separate facts from inference'] },
    previousClosureDigest: 'a'.repeat(64),
    receivedAt: '2026-07-25T12:00:01.000Z',
  }
  const first = buildTransparentRecord(input)
  const second = buildTransparentRecord(input)
  assert.equal(first.chain.resultingClosureDigest, second.chain.resultingClosureDigest)
  assert.equal(verifyTransparentRecord(first).valid, true)
  const mutated = structuredClone(first)
  mutated.observed.action = 'deleted'
  assert.equal(verifyTransparentRecord(mutated).valid, false)
})
