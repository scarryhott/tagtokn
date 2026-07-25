export const INTERACTION_TYPES = [
  { id: 'service', label: 'Service', weight: 3, description: 'A useful service or product exchange.' },
  { id: 'purchase', label: 'Purchase', weight: 3, description: 'A purchase routed through social appreciation.' },
  { id: 'collaboration', label: 'Collaboration', weight: 2, description: 'Shared work that creates communal value.' },
  { id: 'donation', label: 'Donation', weight: 2, description: 'Support directed toward a communal need.' },
  { id: 'event', label: 'Event', weight: 1, description: 'Participation in a local or network event.' },
]

export const WRAP_ACTIONS = ['endorse', 'claim', 'transfer', 'close']

const SCHEMA = 'tagtokn.closure-wrap/v1'
const CLOSED = new Set(['closed'])

function cleanText(value, maxLength = 600) {
  return String(value ?? '').trim().slice(0, maxLength)
}

function normalizeUrl(value) {
  const raw = cleanText(value, 1500)
  if (!raw) return ''
  try {
    const url = new URL(raw)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''
  } catch {
    return ''
  }
}

export function createId(prefix = 'node') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function normalizeActor(actor = {}) {
  return {
    id: cleanText(actor.id, 120) || createId('actor'),
    name: cleanText(actor.name || actor.displayName, 100),
    handle: cleanText(actor.handle, 100),
    referenceUrl: normalizeUrl(actor.referenceUrl),
  }
}

export function normalizeCommunity(community = {}) {
  const name = cleanText(community.name, 100)
  const symbol = cleanText(community.symbol, 12).toUpperCase().replace(/[^A-Z0-9]/g, '')
  return {
    id: cleanText(community.id, 120) || createId('community'),
    name,
    symbol: symbol || 'TTK',
    mission: cleanText(community.mission, 300),
  }
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((out, key) => {
      out[key] = stableValue(value[key])
      return out
    }, {})
  }
  return value
}

export function canonicalStringify(value) {
  return JSON.stringify(stableValue(value))
}

function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function fallbackDigest(text) {
  let a = 2166136261
  let b = 2246822519
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index)
    a = Math.imul(a ^ code, 16777619)
    b = Math.imul(b ^ code, 3266489917)
  }
  return `${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`.repeat(4)
}

export async function digestValue(value) {
  const text = canonicalStringify(value)
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(text)
    return bytesToHex(await globalThis.crypto.subtle.digest('SHA-256', data))
  }
  return fallbackDigest(text)
}

function withoutDigest(event) {
  const { digest, ...rest } = event
  return rest
}

function typeDefinition(typeId) {
  return INTERACTION_TYPES.find((type) => type.id === typeId)
}

export async function createSocialWrap(input) {
  const creator = normalizeActor(input.creator)
  const community = normalizeCommunity(input.community)
  const interactionType = cleanText(input.interactionType, 40)
  const type = typeDefinition(interactionType)
  const representedLabel = cleanText(input.representedLabel, 140)
  const appreciation = cleanText(input.appreciation, 1000)
  const guidance = cleanText(input.guidance, 500)
  const suggestedAmount = Math.max(0, Number(input.suggestedAmount) || 0)

  if (!creator.name && !creator.handle) throw new Error('Create a local identity before wrapping appreciation.')
  if (!community.name) throw new Error('Choose or create a community.')
  if (!type) throw new Error('Choose a valid interaction type.')
  if (!representedLabel) throw new Error('Name the business, project, service, event, or communal object being represented.')
  if (!appreciation) throw new Error('State the indirect social appreciation being wrapped.')

  const event = {
    index: 0,
    kind: 'mint',
    actor: creator,
    at: new Date().toISOString(),
    previousDigest: null,
    payload: {
      community,
      represented: {
        label: representedLabel,
        referenceUrl: normalizeUrl(input.referenceUrl),
      },
      interaction: {
        type: interactionType,
        weight: type.weight,
        appreciation,
        guidance,
        suggestedAmount,
      },
      nft: {
        units: 1,
        currentCustodian: creator,
      },
    },
  }
  event.digest = await digestValue(withoutDigest(event))

  return {
    schema: SCHEMA,
    id: event.digest.slice(0, 20),
    events: [event],
  }
}

export function assertWrapShape(wrap) {
  if (!wrap || wrap.schema !== SCHEMA || !Array.isArray(wrap.events) || !wrap.events.length) {
    throw new Error('This is not a supported TagTokn closure wrap.')
  }
  if (wrap.events[0]?.kind !== 'mint') throw new Error('The closure wrap has no mint event.')
  return true
}

export function reduceWrap(wrap) {
  assertWrapShape(wrap)
  const mint = wrap.events[0]
  let status = 'open'
  let custodian = mint.payload.nft.currentCustodian
  let provider = null
  let settlement = null
  const endorsements = []

  for (const event of wrap.events.slice(1)) {
    if (event.kind === 'endorse') endorsements.push(event)
    if (event.kind === 'claim') {
      provider = event.actor
      status = 'guided'
    }
    if (event.kind === 'transfer') custodian = event.payload.to
    if (event.kind === 'close') {
      settlement = event.payload.settlement
      status = 'closed'
    }
  }

  return {
    id: wrap.id,
    status,
    mint,
    creator: mint.actor,
    community: mint.payload.community,
    represented: mint.payload.represented,
    interaction: mint.payload.interaction,
    custodian,
    provider,
    endorsements,
    settlement,
    latestEvent: wrap.events[wrap.events.length - 1],
    eventCount: wrap.events.length,
  }
}

export function allowedActions(wrap) {
  const state = reduceWrap(wrap)
  if (CLOSED.has(state.status)) return []
  if (state.status === 'open') return ['endorse', 'claim', 'transfer']
  return ['endorse', 'transfer', 'close']
}

function money(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10000) / 10000
}

export function calculateSettlement({ amount, interactionWeight, participant, provider, curator, community }) {
  const gross = money(Math.max(0, Number(amount) || 0))
  if (gross <= 0) throw new Error('The direct interaction amount must be greater than zero.')

  const communityContribution = money(gross * 0.02)
  const providerTransfer = money(gross - communityContribution)
  const rewardTotal = money(Math.max(1, Number(interactionWeight) || 1))
  const providerReward = money(rewardTotal * 0.5)
  const participantReward = money(rewardTotal * 0.25)
  const curatorReward = money(rewardTotal - providerReward - participantReward)

  return {
    coinSymbol: community.symbol,
    gross,
    providerTransfer,
    communityContribution,
    rewardTotal,
    allocations: {
      provider: { actor: provider, amount: providerTransfer, reward: providerReward },
      participant: { actor: participant, amount: 0, reward: participantReward },
      curator: { actor: curator, amount: 0, reward: curatorReward },
      community: { id: community.id, name: community.name, amount: communityContribution },
    },
  }
}

export async function appendWrapEvent(wrap, input) {
  assertWrapShape(wrap)
  const action = cleanText(input.action, 32)
  if (!WRAP_ACTIONS.includes(action)) throw new Error('Invalid closure action.')
  if (!allowedActions(wrap).includes(action)) {
    throw new Error(`The closure wrap cannot transition through ${action} from its current state.`)
  }

  const actor = normalizeActor(input.actor)
  if (!actor.name && !actor.handle) throw new Error('Create a local identity before continuing the network relation.')

  const state = reduceWrap(wrap)
  const previous = wrap.events[wrap.events.length - 1]
  const payload = {}

  if (action === 'endorse') {
    payload.statement = cleanText(input.statement, 600)
    if (!payload.statement) throw new Error('An endorsement must state the appreciation or guidance being added.')
  }

  if (action === 'claim') {
    payload.statement = cleanText(input.statement, 600)
    if (!payload.statement) throw new Error('A claim must state how this node accepts or reframes the representation.')
  }

  if (action === 'transfer') {
    if (state.custodian?.id !== actor.id) throw new Error('Only the current NFT custodian can transfer this social wrap.')
    payload.to = normalizeActor(input.to)
    if (!payload.to.name && !payload.to.handle) throw new Error('Name the receiving network participant.')
  }

  if (action === 'close') {
    if (!state.provider) throw new Error('The represented node must claim the wrap before a direct interaction can close it.')
    payload.statement = cleanText(input.statement, 600)
    payload.settlement = calculateSettlement({
      amount: input.amount,
      interactionWeight: state.interaction.weight,
      participant: actor,
      provider: state.provider,
      curator: state.custodian,
      community: state.community,
    })
  }

  const event = {
    index: wrap.events.length,
    kind: action,
    actor,
    at: new Date().toISOString(),
    previousDigest: previous.digest,
    payload,
  }
  event.digest = await digestValue(withoutDigest(event))

  return { ...wrap, events: [...wrap.events, event] }
}

export async function verifyWrap(wrap) {
  assertWrapShape(wrap)
  for (let index = 0; index < wrap.events.length; index += 1) {
    const event = wrap.events[index]
    const expectedPrevious = index === 0 ? null : wrap.events[index - 1].digest
    if (event.index !== index || event.previousDigest !== expectedPrevious) return false
    const expectedDigest = await digestValue(withoutDigest(event))
    if (event.digest !== expectedDigest) return false
  }
  return true
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return globalThis.btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function fromBase64Url(encoded) {
  const normalized = encoded.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = globalThis.atob(padded)
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)))
}

export function encodeWrap(wrap) {
  assertWrapShape(wrap)
  return toBase64Url(canonicalStringify(wrap))
}

export function decodeWrap(encoded) {
  const wrap = JSON.parse(fromBase64Url(cleanText(encoded, 20000)))
  assertWrapShape(wrap)
  return wrap
}

export function buildWrapUrl(wrap, locationLike = globalThis.location) {
  const origin = locationLike?.origin || 'https://tagtokn.vercel.app'
  const pathname = locationLike?.pathname || '/'
  return `${origin}${pathname}?wrap=${encodeURIComponent(encodeWrap(wrap))}`
}

export function deriveNetwork(wraps) {
  const actors = new Map()
  const communities = new Map()
  const represented = new Map()
  const edges = []

  for (const wrap of wraps) {
    const state = reduceWrap(wrap)
    actors.set(state.creator.id, state.creator)
    actors.set(state.custodian.id, state.custodian)
    if (state.provider) actors.set(state.provider.id, state.provider)
    for (const endorsement of state.endorsements) actors.set(endorsement.actor.id, endorsement.actor)
    communities.set(state.community.id, state.community)
    const representedId = `represented:${state.community.id}:${state.represented.label}`
    represented.set(representedId, { id: representedId, ...state.represented })
    edges.push({
      id: wrap.id,
      wrap,
      from: state.creator.id,
      to: representedId,
      communityId: state.community.id,
      status: state.status,
      interactionType: state.interaction.type,
    })
  }

  return {
    actors: [...actors.values()],
    communities: [...communities.values()],
    represented: [...represented.values()],
    edges,
  }
}

export function deriveEconomy(wraps) {
  const totals = { open: 0, guided: 0, closed: 0, circulation: 0, rewards: 0, communityPool: 0 }
  const byCommunity = new Map()

  for (const wrap of wraps) {
    const state = reduceWrap(wrap)
    totals[state.status] += 1
    if (!byCommunity.has(state.community.id)) {
      byCommunity.set(state.community.id, {
        community: state.community,
        open: 0,
        guided: 0,
        closed: 0,
        circulation: 0,
        rewards: 0,
        communityPool: 0,
      })
    }
    const row = byCommunity.get(state.community.id)
    row[state.status] += 1
    if (state.settlement) {
      const settlement = state.settlement
      totals.circulation = money(totals.circulation + settlement.gross)
      totals.rewards = money(totals.rewards + settlement.rewardTotal)
      totals.communityPool = money(totals.communityPool + settlement.communityContribution)
      row.circulation = money(row.circulation + settlement.gross)
      row.rewards = money(row.rewards + settlement.rewardTotal)
      row.communityPool = money(row.communityPool + settlement.communityContribution)
    }
  }

  return { totals, communities: [...byCommunity.values()] }
}
