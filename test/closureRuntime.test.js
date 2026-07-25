import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildRuntimeUrl,
  createClosureRuntime,
  decodeRuntime,
  deriveGuidance,
  deriveIdentity,
  deriveRuntime,
  encodeRuntime,
  inferObservationModalities,
  integrateObservation,
  verifyRuntime,
} from '../src/domain/closureRuntime.js'

const field = { id: 'field-1', name: 'Local Learning Field', symbol: 'LEARN', mission: 'Connect local teaching, media, and exchange.' }
const basis = { id: 'basis-local' }
const otherBasis = { id: 'basis-other' }

test('runtime opens with an anonymous basis and no declared profile', async () => {
  const runtime = await createClosureRuntime({ field, participant: basis })
  assert.equal(runtime.events[0].actor.id, basis.id)
  assert.equal(runtime.events[0].actor.name, '')
  assert.equal(await verifyRuntime(runtime), true)
})

test('network observation infers socioeconomic and multimodal carriers automatically', () => {
  const modalities = inferObservationModalities({
    amount: 25,
    currency: 'USD',
    platformUrl: 'https://example.com/post',
    message: 'A local learning purchase was shared with the network.',
    imageUrl: 'https://example.com/image.png',
    participants: [otherBasis],
  })
  assert.deepEqual(new Set(modalities), new Set(['money', 'platform', 'message', 'image', 'internal']))
})

test('closure field integrates connector observation and instantiates coin without a user action menu', async () => {
  let runtime = await createClosureRuntime({ field, participant: basis })
  runtime = await integrateObservation(runtime, {
    basis,
    observation: {
      source: 'payment-and-platform-connector',
      amount: 25,
      currency: 'USD',
      transactionId: 'tx-1',
      platformUrl: 'https://example.com/post',
      platformAction: 'shared purchase context',
      message: 'The exchange continued through community discussion.',
      participants: [otherBasis],
      context: 'Shared learning context',
      contextKind: 'project',
    },
  })

  const state = deriveRuntime(runtime)
  const latest = state.coins.at(-1)
  assert.equal(state.coins.length, 2)
  assert.equal(latest.money[0].amount, 25)
  assert.ok(latest.carriers.includes('money'))
  assert.ok(latest.carriers.includes('platform'))
  assert.ok(latest.carriers.includes('message'))
  assert.equal(latest.source, 'payment-and-platform-connector')
  assert.equal(await verifyRuntime(runtime), true)
})

test('identity remains a learned relational pattern', async () => {
  let runtime = await createClosureRuntime({ field, participant: basis })
  runtime = await integrateObservation(runtime, {
    basis,
    observation: {
      source: 'network',
      participants: [otherBasis],
      message: 'Shared work continued through language.',
      collaboration: true,
      context: 'Shared work',
    },
  })
  runtime = await integrateObservation(runtime, {
    basis,
    observation: {
      source: 'media-connector',
      audioUrl: 'https://example.com/audio',
      platformUrl: 'https://example.com/post',
    },
  })

  const identity = deriveIdentity(runtime, basis.id)
  assert.ok(identity.eventCount >= 3)
  assert.ok(identity.relationCount >= 2)
  assert.match(identity.label, /(connector|language carrier|collaborator|voice carrier|boundary linker)/)
})

test('guidance interprets network carriers rather than requesting isolated user input', async () => {
  let runtime = await createClosureRuntime({ field, participant: basis })
  runtime = await integrateObservation(runtime, {
    basis,
    observation: {
      source: 'payment-connector',
      amount: 18,
      currency: 'USD',
      platformUrl: 'https://example.com/store',
    },
  })
  const guidance = deriveGuidance(runtime)
  assert.match(guidance[0].title, /(internal network connection|social and multimodal context)/)
})

test('runtime round trips through portable transport', async () => {
  const runtime = await createClosureRuntime({ field, participant: basis })
  const encoded = encodeRuntime(runtime)
  assert.deepEqual(decodeRuntime(encoded), runtime)
  assert.match(buildRuntimeUrl(runtime, { origin: 'https://tagtokn.vercel.app', pathname: '/' }), /\?runtime=/)
})
