import test from 'node:test'
import assert from 'node:assert/strict'
import {
  allowedResponses,
  appendTagEvent,
  createRelationalTag,
  decodeTag,
  encodeTag,
  reduceTag,
} from '../src/domain/relationalTag.js'

const creator = { id: 'creator', displayName: 'Creator', handle: '@creator' }
const responder = { id: 'responder', displayName: 'Responder', handle: '@responder' }

test('creates a relational proposal without fetching external data', async () => {
  const tag = await createRelationalTag({
    creator,
    targetLabel: 'A public project',
    targetReferenceUrl: 'https://example.com/project',
    relationType: 'collaborate',
    statement: 'Contribute one interface sketch.',
  })

  const state = reduceTag(tag)
  assert.equal(state.status, 'open')
  assert.equal(state.target.referenceUrl, 'https://example.com/project')
  assert.deepEqual(allowedResponses(tag), ['accept', 'reframe', 'decline'])
})

test('maintains an append-only response chain', async () => {
  const tag = await createRelationalTag({
    creator,
    targetLabel: 'Responder',
    relationType: 'connect',
    statement: 'Connect around a bounded question.',
  })
  const accepted = await appendTagEvent(tag, {
    actor: responder,
    action: 'accept',
    statement: 'Accepted in this context.',
  })
  const completed = await appendTagEvent(accepted, {
    actor: creator,
    action: 'complete',
    statement: 'The introduction occurred.',
  })

  assert.equal(reduceTag(completed).status, 'completed')
  assert.equal(completed.events[1].previousDigest, completed.events[0].digest)
  assert.equal(completed.events[2].previousDigest, completed.events[1].digest)
})

test('round trips through a shareable URL payload', async () => {
  const tag = await createRelationalTag({
    creator,
    targetLabel: 'A local business',
    relationType: 'offer',
    statement: 'Offer a small service in context.',
    amountUsd: 15,
    checkoutUrl: 'https://example.com/pay',
  })

  const decoded = decodeTag(encodeTag(tag))
  assert.equal(decoded.id, tag.id)
  assert.equal(reduceTag(decoded).commerce.amountUsd, 15)
})
