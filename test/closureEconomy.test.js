import test from 'node:test'
import assert from 'node:assert/strict'
import {
  appendWrapEvent,
  buildWrapUrl,
  calculateSettlement,
  createSocialWrap,
  decodeWrap,
  encodeWrap,
  reduceWrap,
  verifyWrap,
} from '../src/domain/closureEconomy.js'

const creator = { id: 'curator-1', name: 'Curator' }
const provider = { id: 'provider-1', name: 'Provider' }
const participant = { id: 'participant-1', name: 'Participant' }
const community = { id: 'community-1', name: 'Local Commons', symbol: 'LOCAL' }

test('social wrap closes through claim and direct interaction', async () => {
  let wrap = await createSocialWrap({
    creator,
    community,
    representedLabel: 'Community Bookstore',
    interactionType: 'purchase',
    appreciation: 'This store sustains local reading groups.',
    guidance: 'Route the next book purchase here.',
    suggestedAmount: 20,
  })

  assert.equal(reduceWrap(wrap).status, 'open')
  wrap = await appendWrapEvent(wrap, { action: 'claim', actor: provider, statement: 'We accept this representation.' })
  assert.equal(reduceWrap(wrap).status, 'guided')
  wrap = await appendWrapEvent(wrap, { action: 'close', actor: participant, amount: 20, statement: 'Purchased two books.' })

  const state = reduceWrap(wrap)
  assert.equal(state.status, 'closed')
  assert.equal(state.settlement.communityContribution, 0.4)
  assert.equal(state.settlement.providerTransfer, 19.6)
  assert.equal(state.settlement.rewardTotal, 3)
  assert.equal(await verifyWrap(wrap), true)
})

test('transferred NFT custody receives curator reward', async () => {
  let wrap = await createSocialWrap({
    creator,
    community,
    representedLabel: 'Neighborhood Workshop',
    interactionType: 'service',
    appreciation: 'This workshop makes repair knowledge public.',
  })
  const holder = { id: 'holder-1', name: 'Holder' }
  wrap = await appendWrapEvent(wrap, { action: 'transfer', actor: creator, to: holder })
  wrap = await appendWrapEvent(wrap, { action: 'claim', actor: provider, statement: 'Claimed by the workshop.' })
  wrap = await appendWrapEvent(wrap, { action: 'close', actor: participant, amount: 12 })
  assert.equal(reduceWrap(wrap).settlement.allocations.curator.actor.id, holder.id)
})

test('settlement preserves direct value and rewards indirect appreciation', () => {
  const settlement = calculateSettlement({
    amount: 50,
    interactionWeight: 2,
    participant,
    provider,
    curator: creator,
    community,
  })
  assert.equal(settlement.providerTransfer + settlement.communityContribution, 50)
  assert.equal(
    settlement.allocations.provider.reward + settlement.allocations.participant.reward + settlement.allocations.curator.reward,
    settlement.rewardTotal,
  )
})

test('shareable wrap round trips through URL encoding', async () => {
  const wrap = await createSocialWrap({
    creator,
    community,
    representedLabel: 'Local Project',
    interactionType: 'collaboration',
    appreciation: 'This project connects local skills.',
  })
  const encoded = encodeWrap(wrap)
  assert.deepEqual(decodeWrap(encoded), wrap)
  const url = buildWrapUrl(wrap, { origin: 'https://tagtokn.vercel.app', pathname: '/' })
  assert.match(url, /\?wrap=/)
})
