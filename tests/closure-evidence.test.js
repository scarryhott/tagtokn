import test from 'node:test'
import assert from 'node:assert/strict'
import { basisPrice, classifyReturn, networkIntegration } from '../src/lib/closure.js'

test('unsupported supply dilutes the displayed basis price without changing support', () => {
  assert.equal(basisPrice(100, 10), 10)
  assert.equal(basisPrice(100, 20), 5)
})

test('internal circular transfers do not add external network integration', () => {
  const integration = networkIntegration({
    externalSupport: 100,
    internalTransfers: [
      { from: 'A', to: 'B', amount: 500 },
      { from: 'B', to: 'A', amount: 500 },
    ],
  })
  assert.equal(integration, 100)
})

test('an unsupported or self-referential return remains OPEN', () => {
  assert.equal(classifyReturn({ independent: false, recoverable: true, contradictory: false, residual: false }), 'OPEN')
  assert.equal(classifyReturn({ independent: true, recoverable: false, contradictory: false, residual: false }), 'OPEN')
})

test('contradiction is classified as collapse rather than OPEN', () => {
  assert.equal(classifyReturn({ independent: true, recoverable: true, contradictory: true, residual: false }), 'FALSE_COLLAPSE')
})

test('a recoverable independent return may close to a new opening', () => {
  assert.equal(classifyReturn({ independent: true, recoverable: true, contradictory: false, residual: true }), 'CLOSED_TO_NEW_OPENING')
})
