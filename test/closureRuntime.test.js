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
  integrateInteraction,
  verifyRuntime,
} from '../src/domain/closureRuntime.js'

const field = { id: 'field-1', name: 'Local Learning Field', symbol: 'LEARN', mission: 'Connect local teaching, media, and exchange.' }
const basis = { id: 'basis-local' }
const otherBasis = { id: 'basis-other' }

test('runtime opens without declared identity fields', async () => {
  const runtime = await createClosureRuntime({ field, participant: basis })
  assert.equal(runtime.events[0].actor.id, basis.id)
  assert.equal(runtime.events[0].actor.name, '')
  assert.equal(await verifyRuntime(runtime), true)
})

test('closure runtime integrates multimodal interaction and instantiates coin automatically', async () => {
  let runtime = await createClosureRuntime({ field, participant: basis })
  runtime = await integrateInteraction(runtime, {
    actor: basis,
    participants: [otherBasis],
    object: { id: 'obj-course', label: 'Shared learning context', kind: 'project' },
    modalities: ['internal', 'message', 'platform', 'money'],
    platformUrl: 'https://example.com/post',
    moneyAmount: 25,
    currency: 'USD',
  })

  const state = deriveRuntime(runtime)
  assert.equal(state.coins.length, 2)
  assert.equal(state.coins[1].money[0].amount, 25)
  assert.ok(state.coins[1].carriers.includes('message'))
  assert.ok(state.coins[1].carriers.includes('platform'))
  assert.equal(state.moneyVolume, 25)
  assert.equal(await verifyRuntime(runtime), true)
})

test('identity is learned from relational history rather than profile input', async () => {
  let runtime = await createClosureRuntime({ field, participant: basis })
  runtime = await integrateInteraction(runtime, {
    actor: basis,
    participants: [otherBasis],
    modalities: ['internal', 'message', 'collaboration'],
    object: { id: 'obj-work', label: 'Shared work', kind: 'project' },
  })
  runtime = await integrateInteraction(runtime, {
    actor: basis,
    modalities: ['audio', 'platform'],
    platformUrl: 'https://example.com/audio',
  })

  const identity = deriveIdentity(runtime, basis.id)
  assert.ok(identity.eventCount >= 3)
  assert.ok(identity.relationCount >= 2)
  assert.match(identity.label, /(connector|language carrier|collaborator|voice carrier|boundary linker)/)
})

test('coin lineage follows relational continuity without manual minting', async () => {
  let runtime = await createClosureRuntime({ field, participant: basis })
  runtime = await integrateInteraction(runtime, {
    actor: basis,
    participants: [otherBasis],
    modalities: ['internal', 'message'],
  })
  runtime = await integrateInteraction(runtime, {
    actor: otherBasis,
    participants: [basis],
    modalities: ['internal', 'audio'],
  })
  const coins = deriveRuntime(runtime).coins
  assert.ok(coins[2].parents.includes(coins[1].id))
  assert.ok(coins[2].units >= 1)
})

test('guidance points external or monetary carriers back toward internal multimodal connection', async () => {
  let runtime = await createClosureRuntime({ field, participant: basis })
  runtime = await integrateInteraction(runtime, {
    actor: basis,
    object: { id: 'obj-store', label: 'Economic exchange', kind: 'exchange' },
    modalities: ['money', 'platform'],
    moneyAmount: 18,
    currency: 'USD',
    platformUrl: 'https://example.com/store',
  })
  const guidance = deriveGuidance(runtime)
  assert.ok(guidance.some((item) => item.kind === 'boundary-return'))
  assert.ok(guidance.some((item) => item.kind === 'multimodal-context'))
})

test('runtime round trips through portable URL transport', async () => {
  const runtime = await createClosureRuntime({ field, participant: basis })
  const encoded = encodeRuntime(runtime)
  assert.deepEqual(decodeRuntime(encoded), runtime)
  assert.match(buildRuntimeUrl(runtime, { origin: 'https://tagtokn.vercel.app', pathname: '/' }), /\?runtime=/)
})
