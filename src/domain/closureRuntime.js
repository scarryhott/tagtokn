export const MODALITIES = [
  { id: 'internal', label: 'Internal connection', description: 'Connect participants or communal objects inside the closure field.' },
  { id: 'money', label: 'Money transfer', description: 'Carry closure through a direct monetary transfer.' },
  { id: 'platform', label: 'Platform action', description: 'Carry closure across an external platform boundary by reference.' },
  { id: 'message', label: 'Message', description: 'Continue closure through written language.' },
  { id: 'image', label: 'Image', description: 'Continue closure through a visual carrier.' },
  { id: 'audio', label: 'Audio', description: 'Continue closure through voice or sound.' },
  { id: 'video', label: 'Video', description: 'Continue closure through moving image and sound.' },
  { id: 'event', label: 'Event', description: 'Continue closure through shared presence or participation.' },
  { id: 'collaboration', label: 'Collaboration', description: 'Continue closure through shared work.' },
]

const SCHEMA = 'tagtokn.closure-runtime/v1'

function cleanText(value, maxLength = 800) {
  return String(value ?? '').trim().slice(0, maxLength)
}

function normalizeUrl(value) {
  const raw = cleanText(value, 1800)
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

export function normalizeParticipant(participant = {}) {
  return {
    id: cleanText(participant.id, 120) || createId('participant'),
    name: cleanText(participant.name || participant.displayName, 100),
    handle: cleanText(participant.handle, 100),
    referenceUrl: normalizeUrl(participant.referenceUrl),
  }
}

export function normalizeField(field = {}) {
  const symbol = cleanText(field.symbol, 12).toUpperCase().replace(/[^A-Z0-9]/g, '')
  return {
    id: cleanText(field.id, 120) || createId('field'),
    name: cleanText(field.name, 120),
    symbol: symbol || 'TOKN',
    mission: cleanText(field.mission, 500),
  }
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = stableValue(value[key])
      return result
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
    const bytes = new TextEncoder().encode(text)
    return bytesToHex(await globalThis.crypto.subtle.digest('SHA-256', bytes))
  }
  return fallbackDigest(text)
}

function eventWithoutDigest(event) {
  const { digest, ...rest } = event
  return rest
}

function normalizeObject(object = {}) {
  const label = cleanText(object.label, 160)
  return {
    id: cleanText(object.id, 140) || `object:${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || createId('object')}`,
    label,
    kind: cleanText(object.kind, 40) || 'communal-object',
    referenceUrl: normalizeUrl(object.referenceUrl),
  }
}

function normalizeModalities(input = {}) {
  const requested = Array.isArray(input.modalities) ? input.modalities : []
  const allowed = new Set(MODALITIES.map((modality) => modality.id))
  const kinds = [...new Set(requested.map((value) => cleanText(value, 40)).filter((value) => allowed.has(value)))]
  if (!kinds.length) kinds.push('internal')
  return kinds.map((kind) => {
    if (kind === 'money') {
      return {
        kind,
        amount: Math.max(0, Number(input.moneyAmount) || 0),
        currency: cleanText(input.currency || 'USD', 8).toUpperCase(),
        reference: cleanText(input.moneyReference, 180),
      }
    }
    if (kind === 'platform') {
      return {
        kind,
        action: cleanText(input.platformAction, 120),
        referenceUrl: normalizeUrl(input.platformUrl),
      }
    }
    if (['image', 'audio', 'video'].includes(kind)) {
      return {
        kind,
        referenceUrl: normalizeUrl(input.mediaUrl),
        description: cleanText(input.mediaDescription, 300),
      }
    }
    return { kind }
  })
}

export async function createClosureRuntime(input) {
  const field = normalizeField(input.field)
  const participant = normalizeParticipant(input.participant)
  if (!field.name) throw new Error('Name the closure field.')
  if (!participant.name && !participant.handle) throw new Error('Name the first admitted participant basis.')

  const event = {
    index: 0,
    kind: 'admit',
    actor: participant,
    at: new Date().toISOString(),
    previousDigest: null,
    payload: {
      field,
      intent: cleanText(input.intent || field.mission, 700),
      participants: [participant],
      objects: [],
      modalities: [{ kind: 'internal' }],
      meaning: cleanText(input.meaning || 'The participant enters through the closure field rather than as an isolated account.', 800),
    },
  }
  event.digest = await digestValue(eventWithoutDigest(event))
  return {
    schema: SCHEMA,
    id: event.digest.slice(0, 24),
    field,
    events: [event],
  }
}

export function assertRuntimeShape(runtime) {
  if (!runtime || runtime.schema !== SCHEMA || !runtime.field || !Array.isArray(runtime.events) || !runtime.events.length) {
    throw new Error('This is not a supported TagTokn closure runtime.')
  }
  if (runtime.events[0]?.kind !== 'admit') throw new Error('The closure runtime has no admission event.')
  return true
}

export async function integrateInteraction(runtime, input) {
  assertRuntimeShape(runtime)
  const actor = normalizeParticipant(input.actor)
  if (!actor.name && !actor.handle) throw new Error('The interaction needs an admitted participant basis.')

  const participants = [actor, ...(Array.isArray(input.participants) ? input.participants : [])]
    .map(normalizeParticipant)
    .filter((participant) => participant.name || participant.handle)
  const uniqueParticipants = [...new Map(participants.map((participant) => [participant.id, participant])).values()]
  const objects = (Array.isArray(input.objects) ? input.objects : [input.object]).filter(Boolean).map(normalizeObject).filter((object) => object.label)
  const modalities = normalizeModalities(input)
  const meaning = cleanText(input.meaning, 1200)
  const intent = cleanText(input.intent, 600)

  if (!meaning) throw new Error('State how this interaction continues the closure field.')
  if (uniqueParticipants.length < 1 && objects.length < 1) throw new Error('Connect the interaction to at least one participant or communal object.')

  const previous = runtime.events[runtime.events.length - 1]
  const event = {
    index: runtime.events.length,
    kind: 'integrate',
    actor,
    at: new Date().toISOString(),
    previousDigest: previous.digest,
    payload: {
      intent,
      meaning,
      participants: uniqueParticipants,
      objects,
      modalities,
    },
  }
  event.digest = await digestValue(eventWithoutDigest(event))
  return { ...runtime, events: [...runtime.events, event] }
}

export async function verifyRuntime(runtime) {
  assertRuntimeShape(runtime)
  for (let index = 0; index < runtime.events.length; index += 1) {
    const event = runtime.events[index]
    const expectedPrevious = index === 0 ? null : runtime.events[index - 1].digest
    if (event.index !== index || event.previousDigest !== expectedPrevious) return false
    const expectedDigest = await digestValue(eventWithoutDigest(event))
    if (event.digest !== expectedDigest) return false
  }
  return true
}

function eventNodeIds(event) {
  const participantIds = (event.payload.participants || []).map((participant) => `participant:${participant.id}`)
  const objectIds = (event.payload.objects || []).map((object) => `object:${object.id}`)
  return [...new Set([`participant:${event.actor.id}`, ...participantIds, ...objectIds])]
}

function pairKey(left, right) {
  return `${left}→${right}`
}

function unorderedPairKey(left, right) {
  return [left, right].sort().join('↔')
}

function moneyShadow(modalities = []) {
  return modalities.filter((modality) => modality.kind === 'money').reduce((total, modality) => total + (Number(modality.amount) || 0), 0)
}

export function deriveRuntime(runtime) {
  assertRuntimeShape(runtime)
  const participants = new Map()
  const objects = new Map()
  const surfaces = new Map()
  const edges = []
  const edgeSet = new Set()
  const directedSet = new Set()
  const modalityCounts = new Map()
  const coins = []
  const latestCoinByNode = new Map()
  let moneyVolume = 0
  const moneyByCurrency = new Map()

  for (const event of runtime.events) {
    participants.set(event.actor.id, event.actor)
    for (const participant of event.payload.participants || []) participants.set(participant.id, participant)
    for (const object of event.payload.objects || []) objects.set(object.id, object)

    const nodeIds = eventNodeIds(event)
    const fieldNodeId = `field:${runtime.field.id}`
    const connectionTargets = nodeIds.filter((nodeId) => nodeId !== `participant:${event.actor.id}`)
    const actorNodeId = `participant:${event.actor.id}`
    const candidateEdges = connectionTargets.length ? connectionTargets.map((target) => [actorNodeId, target]) : [[fieldNodeId, actorNodeId]]

    let novelConnections = 0
    let reciprocalConnections = 0
    for (const [from, to] of candidateEdges) {
      const key = unorderedPairKey(from, to)
      const directed = pairKey(from, to)
      if (!edgeSet.has(key)) novelConnections += 1
      if (directedSet.has(pairKey(to, from))) reciprocalConnections += 1
      edgeSet.add(key)
      directedSet.add(directed)
      edges.push({ eventDigest: event.digest, from, to, modalities: (event.payload.modalities || []).map((modality) => modality.kind) })
    }

    const modalityKinds = [...new Set((event.payload.modalities || []).map((modality) => modality.kind))]
    let newModalities = 0
    for (const kind of modalityKinds) {
      if (!modalityCounts.has(kind)) newModalities += 1
      modalityCounts.set(kind, (modalityCounts.get(kind) || 0) + 1)
    }

    for (const modality of event.payload.modalities || []) {
      if (modality.kind === 'platform' && modality.referenceUrl) surfaces.set(modality.referenceUrl, modality)
      if (['image', 'audio', 'video'].includes(modality.kind) && modality.referenceUrl) surfaces.set(modality.referenceUrl, modality)
    }

    const parentCoinIds = [...new Set(nodeIds.map((nodeId) => latestCoinByNode.get(nodeId)).filter(Boolean))]
    const units = Math.max(1, novelConnections + reciprocalConnections + newModalities)
    const coin = {
      id: `coin-${event.digest.slice(0, 20)}`,
      closureId: runtime.id,
      eventDigest: event.digest,
      index: event.index,
      at: event.at,
      units,
      parents: parentCoinIds,
      nodes: nodeIds,
      carriers: modalityKinds,
      meaning: event.payload.meaning,
      money: (event.payload.modalities || []).filter((modality) => modality.kind === 'money'),
      externalSurfaces: (event.payload.modalities || []).filter((modality) => modality.referenceUrl).map((modality) => modality.referenceUrl),
    }
    coins.push(coin)
    for (const nodeId of nodeIds) latestCoinByNode.set(nodeId, coin.id)
    moneyVolume += moneyShadow(event.payload.modalities)
    for (const modality of event.payload.modalities || []) {
      if (modality.kind === 'money' && modality.amount > 0) {
        const currency = modality.currency || 'USD'
        moneyByCurrency.set(currency, (moneyByCurrency.get(currency) || 0) + modality.amount)
      }
    }
  }

  return {
    field: runtime.field,
    participants: [...participants.values()],
    objects: [...objects.values()],
    surfaces: [...surfaces.entries()].map(([referenceUrl, modality]) => ({ referenceUrl, modality })),
    edges,
    coins,
    modalityCounts: Object.fromEntries(modalityCounts),
    moneyVolume,
    moneyByCurrency: Object.fromEntries(moneyByCurrency),
    internalConnectionCount: edgeSet.size,
  }
}

export function deriveGuidance(runtime) {
  const state = deriveRuntime(runtime)
  const guidance = []
  const degree = new Map()
  for (const edge of state.edges) {
    degree.set(edge.from, (degree.get(edge.from) || 0) + 1)
    degree.set(edge.to, (degree.get(edge.to) || 0) + 1)
  }

  for (const participant of state.participants) {
    const nodeId = `participant:${participant.id}`
    if ((degree.get(nodeId) || 0) <= 1 && state.participants.length > 1) {
      guidance.push({
        id: `connect-${participant.id}`,
        kind: 'internal-connection',
        title: `Connect ${participant.name || participant.handle} deeper into the field`,
        reason: 'This participant currently touches only one known internal path.',
      })
    }
  }

  const latestEvent = runtime.events[runtime.events.length - 1]
  const latestKinds = new Set((latestEvent.payload.modalities || []).map((modality) => modality.kind))
  if (latestKinds.has('platform') && !latestKinds.has('internal')) {
    guidance.push({ id: 'return-platform', kind: 'boundary-return', title: 'Return the platform action into an internal connection', reason: 'The latest external boundary action has not yet been paired with an explicit internal relation.' })
  }
  if (latestKinds.has('money') && !['message', 'image', 'audio', 'video', 'collaboration', 'event'].some((kind) => latestKinds.has(kind))) {
    guidance.push({ id: 'context-money', kind: 'multimodal-context', title: 'Continue the money transfer with social or multimodal context', reason: 'The monetary carrier is present, but the network meaning has only one visible modality.' })
  }

  const childCount = new Map()
  for (const coin of state.coins) for (const parent of coin.parents) childCount.set(parent, (childCount.get(parent) || 0) + 1)
  for (const coin of state.coins.slice(0, -1)) {
    if (!childCount.has(coin.id)) {
      guidance.push({ id: `continue-${coin.id}`, kind: 'coin-continuation', title: `Continue closure coin ${coin.id.slice(-8)}`, reason: 'This instantiated closure unit has not yet been carried into a later interaction.' })
    }
  }

  if (!guidance.length) {
    guidance.push({ id: 'continue-field', kind: 'field-continuation', title: 'Continue the strongest existing relation through another modality', reason: 'The field is internally connected; the next step is a non-isolated continuation rather than a terminal close.' })
  }
  return guidance.slice(0, 8)
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

export function encodeRuntime(runtime) {
  assertRuntimeShape(runtime)
  return toBase64Url(canonicalStringify(runtime))
}

export function decodeRuntime(encoded) {
  const runtime = JSON.parse(fromBase64Url(cleanText(encoded, 30000)))
  assertRuntimeShape(runtime)
  return runtime
}

export function buildRuntimeUrl(runtime, locationLike = globalThis.location) {
  const origin = locationLike?.origin || 'https://tagtokn.vercel.app'
  const pathname = locationLike?.pathname || '/'
  return `${origin}${pathname}?runtime=${encodeURIComponent(encodeRuntime(runtime))}`
}
