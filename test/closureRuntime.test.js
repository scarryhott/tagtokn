import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildRuntimeUrl,
  createClosureRuntime,
  decodeRuntime,
  deriveGuidance,
  deriveRuntime,
  encodeRuntime,
  integrateInteraction,
  verifyRuntime,
} from '../src/domain/closureRuntime.js'

const field = { id: 'field-1', name: 'Local Learning Field', symbol: 'LEARN', mission: 'Connect local teaching, media, and exchange.' }
const harry = { id: 'p-harry', name: 'Harry' }
const tutor = { id: 'p-tutor', name: 'Tutor' }

test('closure runtime integrates multimodal interaction and instantiates coin automatically', async () => {
  let runtime = await createClosureRuntime({ field, participant: harry })
  runtime = await integrateInteraction(runtime, {
    actor: harry,
    participants: [tutor],
    object: { id: 'obj-course', label: 'Free vector course', kind: 'project' },
    modalities: ['internal', 'message', 'platform', 'money'],
    meaning: 'A social post, message, and payment all continue one learning closure.',
    platformUrl: 'https://example.com/post',
    platformAction: 'shared',
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

test('coin lineage follows relational continuity without manual minting', async () => {
  let runtime = await createClosureRuntime({ field, participant: harry })
  runtime = await integrateInteraction(runtime, {
    actor: harry,
    participants: [tutor],
    modalities: ['internal', 'message'],
    meaning: 'Harry connects with the tutor.',
  })
  runtime = await integrateInteraction(runtime, {
    actor: tutor,
    participants: [harry],
    modalities: ['internal', 'audio'],
    meaning: 'The tutor answers with an audio explanation.',
  })
  const coins = deriveRuntime(runtime).coins
  assert.ok(coins[2].parents.includes(coins[1].id))
  assert.ok(coins[2].units >= 1)
})

test('guidance points external or monetary carriers back toward internal multimodal connection', async () => {
  let runtime = await createClosureRuntime({ field, participant: harry })
  runtime = await integrateInteraction(runtime, {
    actor: harry,
    object: { id: 'obj-store', label: 'Local bookstore', kind: 'business' },
    modalities: ['money', 'platform'],
    meaning: 'A purchase follows a platform link.',
    moneyAmount: 18,
    currency: 'USD',
    platformUrl: 'https://example.com/store',
  })
  const guidance = deriveGuidance(runtime)
  assert.ok(guidance.some((item) => item.kind === 'boundary-return'))
  assert.ok(guidance.some((item) => item.kind === 'multimodal-context'))
})

test('runtime round trips through portable URL transport', async () => {
  const runtime = await createClosureRuntime({ field, participant: harry })
  const encoded = encodeRuntime(runtime)
  assert.deepEqual(decodeRuntime(encoded), runtime)
  assert.match(buildRuntimeUrl(runtime, { origin: 'https://tagtokn.vercel.app', pathname: '/' }), /\?runtime=/)
})
