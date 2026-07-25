import { createLocalId, normalizeIdentity } from '../domain/relationalTag.js'

const PROFILE_KEY = 'tagtokn.profile.v1'
const TAGS_KEY = 'tagtokn.tags.v1'

function readJson(key, fallback) {
  try {
    const value = globalThis.localStorage?.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value))
  } catch {
    // The URL remains the transport even when local storage is unavailable.
  }
}

export function loadProfile() {
  const existing = readJson(PROFILE_KEY, null)
  return existing ? normalizeIdentity(existing) : null
}

export function saveProfile(profile) {
  const normalized = normalizeIdentity({ ...profile, id: profile.id || createLocalId() })
  writeJson(PROFILE_KEY, normalized)
  return normalized
}

export function loadTags() {
  const tags = readJson(TAGS_KEY, [])
  return Array.isArray(tags) ? tags : []
}

export function saveTag(tag) {
  const tags = loadTags()
  const existingIndex = tags.findIndex((item) => item.id === tag.id)
  if (existingIndex === -1) tags.unshift(tag)
  else if ((tag.events?.length || 0) >= (tags[existingIndex].events?.length || 0)) {
    tags.splice(existingIndex, 1, tag)
  }
  writeJson(TAGS_KEY, tags.slice(0, 100))
  return tags
}

export function removeTag(tagId) {
  const tags = loadTags().filter((tag) => tag.id !== tagId)
  writeJson(TAGS_KEY, tags)
  return tags
}
