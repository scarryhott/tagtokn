export const RELATION_TYPES = [
  {
    id: 'connect',
    label: 'Connect',
    description: 'Propose a specific relationship or introduction.',
  },
  {
    id: 'collaborate',
    label: 'Collaborate',
    description: 'Open a bounded invitation to work together.',
  },
  {
    id: 'recommend',
    label: 'Recommend',
    description: 'Relate a person or object to a contextual reason.',
  },
  {
    id: 'offer',
    label: 'Offer',
    description: 'Open a commercial relation without making payment the identity.',
  },
]

export const RESPONSE_ACTIONS = ['accept', 'reframe', 'decline', 'complete']

const SCHEMA = 'tagtokn.relational-tag/v1'
const TERMINAL_STATES = new Set(['declined', 'completed'])

function cleanText(value, maxLength = 500) {
  return String(value ?? '').trim().slice(0, maxLength)
}

function normalizeReferenceUrl(value) {
  const raw = cleanText(value, 1500)
  if (!raw) return ''
  try {
    const url = new URL(raw)
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    return url.toString()
  } catch {
    return ''
  }
}

export function normalizeIdentity(identity = {}) {
  return {
    id: cleanText(identity.id, 80) || createLocalId(),
    displayName: cleanText(identity.displayName, 80),
    handle: cleanText(identity.handle, 80),
    referenceUrl: normalizeReferenceUrl(identity.referenceUrl),
  }
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
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
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function fallbackDigest(text) {
  let hashA = 2166136261
  let hashB = 2246822519
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index)
    hashA = Math.imul(hashA ^ code, 16777619)
    hashB = Math.imul(hashB ^ code, 3266489917)
  }
  return `${(hashA >>> 0).toString(16).padStart(8, '0')}${(hashB >>> 0)
    .toString(16)
    .padStart(8, '0')}`.repeat(4)
}

export async function digestValue(value) {
  const text = canonicalStringify(value)
  if (globalThis.crypto?.subtle) {
    const encoded = new TextEncoder().encode(text)
    return bytesToHex(await globalThis.crypto.subtle.digest('SHA-256', encoded))
  }
  return fallbackDigest(text)
}

export function createLocalId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function eventWithoutDigest(event) {
  const { digest, ...rest } = event
  return rest
}

export async function createRelationalTag(input) {
  const creator = normalizeIdentity(input.creator)
  const relationType = cleanText(input.relationType, 32)
  const validType = RELATION_TYPES.some((type) => type.id === relationType)
  const targetLabel = cleanText(input.targetLabel, 120)
  const statement = cleanText(input.statement, 900)

  if (!creator.displayName && !creator.handle) {
    throw new Error('Create a local TagTokn identity before proposing a relation.')
  }
  if (!targetLabel) throw new Error('Name the person, project, post, or object being tagged.')
  if (!validType) throw new Error('Choose a valid relation type.')
  if (!statement) throw new Error('State why this relation is being proposed.')

  const event = {
    index: 0,
    kind: 'propose',
    actor: creator,
    at: new Date().toISOString(),
    previousDigest: null,
    payload: {
      target: {
        label: targetLabel,
        referenceUrl: normalizeReferenceUrl(input.targetReferenceUrl),
      },
      relation: {
        type: relationType,
        statement,
        requestedResponse: cleanText(
          input.requestedResponse || 'Accept, reframe, or decline this relation.',
          280,
        ),
      },
      commerce:
        relationType === 'offer'
          ? {
              amountUsd: Math.max(0, Number(input.amountUsd) || 0),
              checkoutUrl: normalizeReferenceUrl(input.checkoutUrl),
            }
          : null,
    },
  }
  event.digest = await digestValue(eventWithoutDigest(event))

  return {
    schema: SCHEMA,
    id: event.digest.slice(0, 20),
    events: [event],
  }
}

export function reduceTag(tag) {
  assertTagShape(tag)
  const proposal = tag.events[0]
  let status = 'open'
  let response = ''
  let responder = null

  for (const event of tag.events.slice(1)) {
    if (event.kind === 'accept') status = 'accepted'
    if (event.kind === 'reframe') status = 'reframed'
    if (event.kind === 'decline') status = 'declined'
    if (event.kind === 'complete') status = 'completed'
    if (event.payload?.statement) response = event.payload.statement
    responder = event.actor || responder
  }

  return {
    id: tag.id,
    status,
    proposal,
    creator: proposal.actor,
    target: proposal.payload.target,
    relation: proposal.payload.relation,
    commerce: proposal.payload.commerce,
    response,
    responder,
    eventCount: tag.events.length,
    latestEvent: tag.events[tag.events.length - 1],
  }
}

export function allowedResponses(tag) {
  const { status } = reduceTag(tag)
  if (TERMINAL_STATES.has(status)) return []
  if (status === 'open') return ['accept', 'reframe', 'decline']
  return ['complete', 'reframe', 'decline']
}

export async function appendTagEvent(tag, input) {
  assertTagShape(tag)
  const action = cleanText(input.action, 32)
  if (!RESPONSE_ACTIONS.includes(action)) throw new Error('Invalid response action.')
  if (!allowedResponses(tag).includes(action)) {
    throw new Error(`The relation cannot transition to ${action} from its current state.`)
  }

  const actor = normalizeIdentity(input.actor)
  if (!actor.displayName && !actor.handle) {
    throw new Error('Create a local identity before responding.')
  }

  const previous = tag.events[tag.events.length - 1]
  const event = {
    index: tag.events.length,
    kind: action,
    actor,
    at: new Date().toISOString(),
    previousDigest: previous.digest,
    payload: {
      statement: cleanText(input.statement, 900),
    },
  }
  if (action === 'reframe' && !event.payload.statement) {
    throw new Error('A reframe must state the alternative relation.')
  }
  event.digest = await digestValue(eventWithoutDigest(event))

  return {
    ...tag,
    events: [...tag.events, event],
  }
}

export function assertTagShape(tag) {
  if (!tag || tag.schema !== SCHEMA || !Array.isArray(tag.events) || !tag.events.length) {
    throw new Error('This is not a supported TagTokn relation.')
  }
  if (tag.events[0]?.kind !== 'propose') throw new Error('The relation has no proposal event.')
  return true
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return globalThis
    .btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function fromBase64Url(encoded) {
  const normalized = encoded.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = globalThis.atob(padded)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeTag(tag) {
  assertTagShape(tag)
  return toBase64Url(canonicalStringify(tag))
}

export function decodeTag(encoded) {
  const parsed = JSON.parse(fromBase64Url(cleanText(encoded, 12000)))
  assertTagShape(parsed)
  return parsed
}

export function buildTagUrl(tag, locationLike = globalThis.location) {
  const origin = locationLike?.origin || 'https://tagtokn.vercel.app'
  const pathname = locationLike?.pathname || '/'
  return `${origin}${pathname}?tag=${encodeURIComponent(encodeTag(tag))}`
}
