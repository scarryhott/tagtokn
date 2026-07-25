export const MODALITIES = [
  { id: 'internal', label: 'Internal connection' },
  { id: 'money', label: 'Money transfer' },
  { id: 'platform', label: 'Platform action' },
  { id: 'message', label: 'Message' },
  { id: 'image', label: 'Image' },
  { id: 'audio', label: 'Audio' },
  { id: 'video', label: 'Video' },
  { id: 'event', label: 'Event' },
  { id: 'collaboration', label: 'Collaboration' },
]

const SCHEMA = 'tagtokn.closure-runtime/v3'
const SUPPORTED_SCHEMAS = new Set([SCHEMA, 'tagtokn.closure-runtime/v2'])
const MODALITY_IDS = new Set(MODALITIES.map((item) => item.id))

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
    id: cleanText(participant.id, 120) || createId('basis'),
    name: cleanText(participant.name || participant.displayName, 100),
    handle: cleanText(participant.handle, 100),
    referenceUrl: normalizeUrl(participant.referenceUrl),
  }
}

export function participantLabel(participant = {}) {
  return participant.name || participant.handle || `Emerging basis ${String(participant.id || '').slice(-6) || 'local'}`
}

export function normalizeField(field = {}) {
  const symbol = cleanText(field.symbol, 12).toUpperCase().replace(/[^A-Z0-9]/g, '')
  return {
    id: cleanText(field.id, 120) || createId('field'),
    name: cleanText(field.name, 120) || 'TagTokn closure field',
    symbol: symbol || 'TOKN',
    mission: cleanText(field.mission, 500) || 'Receive socioeconomic and multimodal network activity as one continuing relational field.',
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
  const label = cleanText(object.label || object.name, 160)
  return {
    id: cleanText(object.id, 140) || `object:${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || createId('object')}`,
    label,
    kind: cleanText(object.kind, 40) || 'communal-context',
    referenceUrl: normalizeUrl(object.referenceUrl || object.url),
  }
}

function normalizeModalities(input = {}) {
  const requested = Array.isArray(input.modalities) ? input.modalities : []
  const kinds = [...new Set(requested.map((value) => cleanText(typeof value === 'string' ? value : value?.kind, 40)).filter((value) => MODALITY_IDS.has(value)))]
  if (!kinds.length) kinds.push('internal')
  return kinds.map((kind) => {
    if (kind === 'money') {
      return {
        kind,
        amount: Math.max(0, Number(input.moneyAmount ?? input.amount) || 0),
        currency: cleanText(input.currency || 'USD', 8).toUpperCase(),
        reference: cleanText(input.moneyReference || input.transactionId, 180),
      }
    }
    if (kind === 'platform') {
      return {
        kind,
        action: cleanText(input.platformAction || input.action, 120),
        referenceUrl: normalizeUrl(input.platformUrl || input.url),
      }
    }
    if (['image', 'audio', 'video'].includes(kind)) {
      return {
        kind,
        referenceUrl: normalizeUrl(input[`${kind}Url`] || input.mediaUrl || input.url),
        description: cleanText(input.mediaDescription || input.description, 300),
      }
    }
    return { kind }
  })
}

export async function createClosureRuntime(input = {}) {
  const field = normalizeField(input.field)
  const participant = normalizeParticipant(input.participant)
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
      meaning: cleanText(input.meaning || 'A local basis is admitted without a declared identity. Its relation is learned from continuing network observations.', 800),
      source: 'runtime',
    },
  }
  event.digest = await digestValue(eventWithoutDigest(event))
  return { schema: SCHEMA, id: event.digest.slice(0, 24), field, events: [event] }
}

export function assertRuntimeShape(runtime) {
  if (!runtime || !SUPPORTED_SCHEMAS.has(runtime.schema) || !runtime.field || !Array.isArray(runtime.events) || !runtime.events.length) {
    throw new Error('This is not a supported TagTokn closure runtime.')
  }
  if (runtime.events[0]?.kind !== 'admit') throw new Error('The closure runtime has no admission event.')
  return true
}

export async function integrateInteraction(runtime, input = {}) {
  assertRuntimeShape(runtime)
  const actor = normalizeParticipant(input.actor || runtime.events[0].actor)
  const participants = [actor, ...(Array.isArray(input.participants) ? input.participants : [])]
    .map(normalizeParticipant)
    .filter((participant) => participant.id)
  const uniqueParticipants = [...new Map(participants.map((participant) => [participant.id, participant])).values()]
  const objects = (Array.isArray(input.objects) ? input.objects : [input.object]).filter(Boolean).map(normalizeObject).filter((object) => object.label)
  const modalities = normalizeModalities(input)
  const previous = runtime.events[runtime.events.length - 1]
  const event = {
    index: runtime.events.length,
    kind: 'integrate',
    actor,
    at: new Date().toISOString(),
    previousDigest: previous.digest,
    payload: {
      intent: cleanText(input.intent, 600),
      meaning: cleanText(input.meaning, 1200) || `The closure field continued through ${modalities.map((item) => item.kind).join(', ')}.`,
      participants: uniqueParticipants,
      objects,
      modalities,
      source: cleanText(input.source, 120) || 'network',
    },
  }
  event.digest = await digestValue(eventWithoutDigest(event))
  return { ...runtime, schema: SCHEMA, events: [...runtime.events, event] }
}

export function inferObservationModalities(observation = {}) {
  const inferred = new Set(
    (Array.isArray(observation.modalities) ? observation.modalities : [])
      .map((item) => cleanText(typeof item === 'string' ? item : item?.kind, 40))
      .filter((item) => MODALITY_IDS.has(item)),
  )

  if (observation.amount != null || observation.moneyAmount != null || observation.transactionId || observation.payment) inferred.add('money')
  if (observation.platformUrl || observation.platformAction || observation.actionUrl || observation.platform) inferred.add('platform')
  if (observation.message || observation.text || observation.caption) inferred.add('message')
  if (observation.imageUrl || observation.image) inferred.add('image')
  if (observation.audioUrl || observation.audio) inferred.add('audio')
  if (observation.videoUrl || observation.video) inferred.add('video')
  if (observation.eventId || observation.eventName || observation.event) inferred.add('event')
  if (observation.collaboration || observation.project || observation.task) inferred.add('collaboration')
  if (observation.participants?.length || observation.relation || observation.internal) inferred.add('internal')
  if (!inferred.size) inferred.add('internal')
  return [...inferred]
}

function inferredObjects(observation, modalities) {
  const explicit = (Array.isArray(observation.objects) ? observation.objects : [observation.object]).filter(Boolean)
  if (explicit.length) return explicit

  const label = cleanText(observation.context || observation.contextLabel || observation.objectLabel, 160)
  if (label) return [{ id: observation.contextId, label, kind: observation.contextKind || 'communal-context', referenceUrl: observation.contextUrl }]

  const map = {
    money: ['economic-context', 'Economic exchange context', 'exchange'],
    platform: ['platform-boundary', 'Platform boundary', 'boundary'],
    message: ['shared-language', 'Shared language context', 'communication'],
    image: ['shared-visual', 'Shared visual context', 'media'],
    audio: ['shared-audio', 'Shared audio context', 'media'],
    video: ['shared-video', 'Shared video context', 'media'],
    event: ['shared-event', 'Shared event context', 'event'],
    collaboration: ['shared-work', 'Collaborative work', 'project'],
  }
  return modalities.map((kind) => map[kind]).filter(Boolean).map(([id, objectLabel, kind]) => ({ id, label: objectLabel, kind }))
}

export async function integrateObservation(runtime, input = {}) {
  const observation = input.observation || input
  const modalities = inferObservationModalities(observation)
  const source = cleanText(observation.source || observation.connector || input.source, 120) || 'network'
  const actor = observation.actor || input.basis || runtime.events[0].actor
  const participants = Array.isArray(observation.participants) ? observation.participants : []
  const modalityLabels = modalities.map((kind) => MODALITIES.find((item) => item.id === kind)?.label || kind)
  const suppliedMeaning = cleanText(observation.meaning || observation.summary || observation.description, 1200)

  return integrateInteraction(runtime, {
    actor,
    participants,
    objects: inferredObjects(observation, modalities),
    modalities,
    source,
    intent: observation.intent || 'Continue the network relation through its available carriers.',
    meaning: suppliedMeaning || `${source} supplied ${modalityLabels.join(', ')} as one socioeconomic closure observation.`,
    moneyAmount: observation.moneyAmount ?? observation.amount,
    currency: observation.currency,
    transactionId: observation.transactionId,
    platformAction: observation.platformAction || observation.action,
    platformUrl: observation.platformUrl || observation.actionUrl || observation.url,
    imageUrl: observation.imageUrl,
    audioUrl: observation.audioUrl,
    videoUrl: observation.videoUrl,
    mediaUrl: observation.mediaUrl,
    mediaDescription: observation.mediaDescription,
  })
}

export async function verifyRuntime(runtime) {
  assertRuntimeShape(runtime)
  for (let index = 0; index < runtime.events.length; index += 1) {
    const event = runtime.events[index]
    const expectedPrevious = index === 0 ? null : runtime.events[index - 1].digest
    if (event.index !== index || event.previousDigest !== expectedPrevious) return false
    if (event.digest !== await digestValue(eventWithoutDigest(event))) return false
  }
  return true
}

function eventNodeIds(event) {
  const participantIds = (event.payload.participants || []).map((participant) => `participant:${participant.id}`)
  const objectIds = (event.payload.objects || []).map((object) => `object:${object.id}`)
  return [...new Set([`participant:${event.actor.id}`, ...participantIds, ...objectIds])]
}

function unorderedPairKey(left, right) {
  return [left, right].sort().join('↔')
}

export function deriveRuntime(runtime) {
  assertRuntimeShape(runtime)
  const participants = new Map()
  const objects = new Map()
  const surfaces = new Map()
  const edges = []
  const edgeSet = new Set()
  const modalityCounts = new Map()
  const coins = []
  const latestCoinByNode = new Map()
  const moneyByCurrency = new Map()

  for (const event of runtime.events) {
    participants.set(event.actor.id, event.actor)
    for (const participant of event.payload.participants || []) participants.set(participant.id, participant)
    for (const object of event.payload.objects || []) objects.set(object.id, object)

    const nodeIds = eventNodeIds(event)
    const fieldNodeId = `field:${runtime.field.id}`
    const actorNodeId = `participant:${event.actor.id}`
    const targets = nodeIds.filter((nodeId) => nodeId !== actorNodeId)
    const candidateEdges = targets.length ? targets.map((target) => [actorNodeId, target]) : [[fieldNodeId, actorNodeId]]
    let novelConnections = 0
    for (const [from, to] of candidateEdges) {
      const key = unorderedPairKey(from, to)
      if (!edgeSet.has(key)) novelConnections += 1
      edgeSet.add(key)
      edges.push({ eventDigest: event.digest, from, to, modalities: (event.payload.modalities || []).map((item) => item.kind) })
    }

    const modalityKinds = [...new Set((event.payload.modalities || []).map((item) => item.kind))]
    let newModalities = 0
    for (const kind of modalityKinds) {
      if (!modalityCounts.has(kind)) newModalities += 1
      modalityCounts.set(kind, (modalityCounts.get(kind) || 0) + 1)
    }

    for (const modality of event.payload.modalities || []) {
      if (modality.referenceUrl) surfaces.set(modality.referenceUrl, modality)
      if (modality.kind === 'money' && modality.amount > 0) {
        const currency = modality.currency || 'USD'
        moneyByCurrency.set(currency, (moneyByCurrency.get(currency) || 0) + modality.amount)
      }
    }

    const parents = [...new Set(nodeIds.map((nodeId) => latestCoinByNode.get(nodeId)).filter(Boolean))]
    const coin = {
      id: `coin-${event.digest.slice(0, 20)}`,
      closureId: runtime.id,
      eventDigest: event.digest,
      index: event.index,
      at: event.at,
      units: Math.max(1, novelConnections + newModalities),
      parents,
      nodes: nodeIds,
      carriers: modalityKinds,
      meaning: event.payload.meaning,
      source: event.payload.source || 'network',
      money: (event.payload.modalities || []).filter((item) => item.kind === 'money'),
    }
    coins.push(coin)
    for (const nodeId of nodeIds) latestCoinByNode.set(nodeId, coin.id)
  }

  return {
    field: runtime.field,
    participants: [...participants.values()],
    objects: [...objects.values()],
    surfaces: [...surfaces.entries()].map(([referenceUrl, modality]) => ({ referenceUrl, modality })),
    edges,
    coins,
    modalityCounts: Object.fromEntries(modalityCounts),
    moneyByCurrency: Object.fromEntries(moneyByCurrency),
  }
}

const IDENTITY_SIGNALS = {
  internal: 'connector', money: 'economic carrier', platform: 'boundary linker', message: 'language carrier',
  image: 'visual communicator', audio: 'voice carrier', video: 'multimodal communicator', event: 'convener', collaboration: 'collaborator',
}

export function deriveIdentity(runtime, participantId) {
  const relevantEvents = runtime.events.filter((event) => event.actor.id === participantId || (event.payload.participants || []).some((participant) => participant.id === participantId))
  const modalityCounts = new Map()
  const relationNodes = new Set()
  for (const event of relevantEvents) {
    for (const modality of event.payload.modalities || []) modalityCounts.set(modality.kind, (modalityCounts.get(modality.kind) || 0) + 1)
    for (const object of event.payload.objects || []) relationNodes.add(`object:${object.id}`)
    for (const participant of event.payload.participants || []) if (participant.id !== participantId) relationNodes.add(`participant:${participant.id}`)
  }
  const signals = [...modalityCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([kind]) => IDENTITY_SIGNALS[kind] || kind)
  return {
    participantId,
    label: signals.join(' · ') || 'emerging relational basis',
    eventCount: relevantEvents.length,
    relationCount: relationNodes.size,
    modalityCounts: Object.fromEntries(modalityCounts),
  }
}

export function deriveGuidance(runtime) {
  const latest = runtime.events[runtime.events.length - 1]
  const kinds = new Set((latest.payload.modalities || []).map((item) => item.kind))
  if (kinds.has('platform') && !kinds.has('internal')) return [{ id: 'boundary-return', title: 'The external action tends toward an internal network connection.' }]
  if (kinds.has('money') && !['message', 'image', 'audio', 'video', 'event', 'collaboration'].some((kind) => kinds.has(kind))) {
    return [{ id: 'money-context', title: 'The monetary carrier tends toward wider social and multimodal context.' }]
  }
  return [{ id: 'continuation', title: 'The field tends toward the next internally connected multimodal continuation.' }]
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
  const runtime = JSON.parse(fromBase64Url(cleanText(encoded, 60000)))
  assertRuntimeShape(runtime)
  return runtime
}

export function buildRuntimeUrl(runtime, locationLike = globalThis.location) {
  const origin = locationLike?.origin || 'https://tagtokn.vercel.app'
  const pathname = locationLike?.pathname || '/'
  return `${origin}${pathname}?runtime=${encodeURIComponent(encodeRuntime(runtime))}`
}
