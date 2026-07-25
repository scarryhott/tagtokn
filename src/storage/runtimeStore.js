import { createClosureRuntime, integrateInteraction, normalizeParticipant } from '../domain/closureRuntime.js'

const KEY = 'tagtokn.unified-closure-runtime.local/v1'

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

export async function createRuntimeState(input) {
  const basis = normalizeParticipant(input.participant)
  const runtime = await createClosureRuntime({ field: input.field, participant: basis, intent: input.intent })
  return { runtime, basis }
}

export async function admitBasis(state, input) {
  if (!state.runtime) throw new Error('Open a closure runtime before entering it.')
  const basis = normalizeParticipant(input)
  if (!basis.name && !basis.handle) throw new Error('Name the participant basis entering this closure field.')
  const firstActor = state.runtime.events[0].actor
  const alreadyPresent = state.runtime.events.some((event) =>
    event.actor?.id === basis.id || (event.payload?.participants || []).some((participant) => participant.id === basis.id),
  )
  const runtime = alreadyPresent
    ? state.runtime
    : await integrateInteraction(state.runtime, {
        actor: basis,
        participants: [firstActor],
        modalities: ['internal'],
        intent: 'Enter the active closure field.',
        meaning: `${basis.name || basis.handle} enters as a relational basis connected to the existing field.`,
      })
  return { runtime, basis }
}

export function replaceRuntime(state, runtime) {
  return { ...state, runtime }
}

export function clearRuntimeState() {
  localStorage.removeItem(KEY)
  return { runtime: null, basis: null }
}
