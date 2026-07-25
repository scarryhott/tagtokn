import { createId, normalizeActor, normalizeCommunity, reduceWrap } from '../domain/closureEconomy.js'

const KEY = 'tagtokn.closure-economy.local/v1'

export function emptyEconomyState() {
  return {
    profile: null,
    communities: [],
    wraps: [],
    balances: {},
    appliedCloseEvents: [],
  }
}

export function loadEconomyState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!parsed || typeof parsed !== 'object') return emptyEconomyState()
    return {
      ...emptyEconomyState(),
      ...parsed,
      communities: Array.isArray(parsed.communities) ? parsed.communities : [],
      wraps: Array.isArray(parsed.wraps) ? parsed.wraps : [],
      balances: parsed.balances && typeof parsed.balances === 'object' ? parsed.balances : {},
      appliedCloseEvents: Array.isArray(parsed.appliedCloseEvents) ? parsed.appliedCloseEvents : [],
    }
  } catch {
    return emptyEconomyState()
  }
}

export function saveEconomyState(state) {
  localStorage.setItem(KEY, JSON.stringify(state))
  return state
}

export function createProfileState(input) {
  const profile = normalizeActor({ ...input, id: input.id || createId('actor') })
  if (!profile.name && !profile.handle) throw new Error('Name your local network basis.')
  const community = normalizeCommunity({
    id: createId('community'),
    name: 'Local Commons',
    symbol: 'LOCAL',
    mission: 'Route indirect social appreciation into useful local interaction.',
  })
  return {
    ...emptyEconomyState(),
    profile,
    communities: [community],
    balances: { [community.id]: 100 },
  }
}

export function upsertCommunity(state, input, starterBalance = 100) {
  const community = normalizeCommunity({ ...input, id: input.id || createId('community') })
  if (!community.name) throw new Error('Name the community.')
  const communities = [...state.communities.filter((item) => item.id !== community.id), community]
  const balances = { ...state.balances }
  if (balances[community.id] == null) balances[community.id] = starterBalance
  return { ...state, communities, balances }
}

export function upsertWrap(state, wrap) {
  const wraps = [...state.wraps.filter((item) => item.id !== wrap.id), wrap]
  let next = { ...state, wraps }
  const community = reduceWrap(wrap).community
  if (!next.communities.some((item) => item.id === community.id)) {
    next = { ...next, communities: [...next.communities, community] }
  }
  return reconcileClosures(next)
}

export function removeWrap(state, wrapId) {
  return { ...state, wraps: state.wraps.filter((item) => item.id !== wrapId) }
}

export function walletBalance(state, communityId) {
  return Number(state.balances?.[communityId] || 0)
}

export function canSpend(state, communityId, amount) {
  return walletBalance(state, communityId) >= Number(amount || 0)
}

function addBalance(balances, communityId, amount) {
  balances[communityId] = Math.round(((Number(balances[communityId]) || 0) + Number(amount || 0)) * 10000) / 10000
}

export function reconcileClosures(state) {
  if (!state.profile) return state
  const applied = new Set(state.appliedCloseEvents || [])
  const balances = { ...state.balances }
  const newlyApplied = []

  for (const wrap of state.wraps) {
    const communityId = reduceWrap(wrap).community.id
    for (const event of wrap.events || []) {
      if (event.kind !== 'close' || applied.has(event.digest)) continue
      const settlement = event.payload?.settlement
      if (!settlement) continue
      const localId = state.profile.id
      const allocations = settlement.allocations
      if (allocations.participant.actor?.id === localId) {
        addBalance(balances, communityId, -settlement.gross + allocations.participant.reward)
      }
      if (allocations.provider.actor?.id === localId) {
        addBalance(balances, communityId, allocations.provider.amount + allocations.provider.reward)
      }
      if (allocations.curator.actor?.id === localId) {
        addBalance(balances, communityId, allocations.curator.reward)
      }
      newlyApplied.push(event.digest)
      applied.add(event.digest)
    }
  }

  return {
    ...state,
    balances,
    appliedCloseEvents: [...(state.appliedCloseEvents || []), ...newlyApplied],
  }
}

export function joinCommunity(state, communityId, starterBalance = 100) {
  if (state.balances[communityId] != null) return state
  return { ...state, balances: { ...state.balances, [communityId]: starterBalance } }
}
