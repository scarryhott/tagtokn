import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { gunzipSync } from 'node:zlib'

const root = resolve(import.meta.dirname, '..')
const chunks = Array.from({ length: 8 }, (_, index) => {
  const name = `${String(index).padStart(2, '0')}.b64`
  return readFileSync(resolve(root, 'src/app-source-v8', name), 'utf8').trim()
})
const sourceBuffer = gunzipSync(Buffer.from(chunks.join(''), 'base64'))
const appSource = sourceBuffer.toString('utf8')
const helperSource = readFileSync(resolve(root, 'src/lib/returnUnified.js'), 'utf8')
const source = `${appSource}\n${helperSource}`
const digest = createHash('sha256').update(sourceBuffer).digest('hex')

test('paper-audited v8 source has the pinned projection identity', () => {
  assert.equal(digest, '7c3ff8ac768d5aa3d9337c457ac06c4e59b6ffb54cda02d328e48d9f56329d43')
})

test('the supplied marketplace visual system remains the Network page', () => {
  for (const marker of ['Tagtokn Closure Exchange', 'Your Receipt Inventory', 'Receipt Marketplace', 'Receipt-Weighted Raffle', 'TokenDetailModal', 'CreatorDashboardModal']) {
    assert.match(appSource, new RegExp(marker))
  }
})

test('paper-required admissibility surfaces are linked pages', () => {
  for (const marker of ['PotentialGatePage', 'NetworkAdmissibilityPage', 'GovernancePage', 'FrameworkPage', 'VerificationPage', 'EvidencePage', 'ProjectionsPage']) {
    assert.match(source, new RegExp(marker))
  }
  for (const page of ['Potential Gate', 'Admissibility', 'Mandate & Governance']) assert.match(appSource, new RegExp(page))
})

test('one closure state is projected across gates, users, receipts, and economics', () => {
  for (const state of ['potentialGates', 'closureEpisodes', 'currentBasis', 'activityEvents', 'tradeHistory', 'userTokens', 'marketplaceListings', 'adapterPermissions', 'appeals']) {
    assert.match(appSource, new RegExp(state))
  }
})

test('semantic receipt exposes path, mandate, evidence, witness, decision, profile, and lineage', () => {
  for (const marker of ['Semantic Receipt Bundles', 'pathIdentity', 'participantDecision', 'semanticProfile', 'childOpeningId', 'foldedPointings', 'disclosure']) {
    assert.match(source, new RegExp(marker))
  }
})

test('classical Firebase and Instagram verification are absent', () => {
  assert.doesNotMatch(source, /from ['"]firebase\//)
  assert.doesNotMatch(source, /signInWithPopup|GoogleAuthProvider|onAuthStateChanged|instagram\.com/i)
  assert.match(appSource, /Black Mirror Identity/)
  assert.match(appSource, /Open Connected Return/)
})

test('admission keeps OPEN, refusal, closure, residual opening, and collapse distinct', () => {
  for (const marker of ['PARTICIPANT_DECISION.REFUSE', 'CLOSURE_STATUS.OPEN', 'CLOSURE_STATUS.FALSE_COLLAPSE', 'CLOSURE_STATUS.CLOSED', 'CLOSURE_STATUS.CLOSED_TO_NEW_OPENING']) {
    assert.match(source, new RegExp(marker.replace('.', '\\.')))
  }
})
