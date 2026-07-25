import { createClosureRuntime, createId, integrateInteraction, normalizeParticipant } from '../domain/closureRuntime.js'

const KEY = 'tagtokn.unified-closure-runtime.local/v2'

function createAnonymousBasis(existingId) {
  return normalizeParticipant({ id: existingId || createId('basis') })
}

export function loadRuntimeState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!parsed || typeof parsed !== 'object') return { runtime: null, basis: null }
    return {
      runtime: parsed.runtime || null,
      basis: parsed.basis ? normalizeParticipant(parsed.basis) : null,
    }
  } catch {
    return { runtime: null, basis: null }
  }
}

export function saveRuntimeState(state) {
  localStorage.setItem(KEY, JSON.stringify(state))
  return state
}

export async function createRuntimeState() {
  const basis = createAnonymousBasis()
  const runtime = await createClosureRuntime({ participant: basis })
  return { runtime, basis }
}

function basisPresent(runtime, basisId) {
  return runtime.events.some((event) =>
    event.actor?.id === basisId || (event.payload?.participants || []).some((participant) => participant.id === basisId),
  )
}

export async function adoptRuntime(state, runtime) {
  const basis = state.basis || createAnonymousBasis()
  if (basisPresent(runtime, basis.id)) return { runtime, basis }
  const firstActor = runtime.events[0].actor
  const integrated = await integrateInteraction(runtime, {
    actor: basis,
    participants: [firstActor],
    modalities: ['internal'],
    intent: 'Admit a local basis through the existing field.',
    meaning: 'A previously unmodeled local basis enters without declaring an identity; its identity will be learned through future relations.',
  })
  return { runtime: integrated, basis }
}

export async function ensureRuntimeState(state = { runtime: null, basis: null }) {
  if (!state.runtime) return createRuntimeState()
  return adoptRuntime(state, state.runtime)
}

export function replaceRuntime(state, runtime) {
  return { ...state, runtime }
}

export function clearRuntimeState() {
  localStorage.removeItem(KEY)
  return { runtime: null, basis: null }
}
