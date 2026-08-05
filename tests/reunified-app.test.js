import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { gunzipSync } from 'node:zlib'

const root = resolve(import.meta.dirname, '..')
const chunks = Array.from({ length: 8 }, (_, index) => {
  const name = `${String(index).padStart(2, '0')}.b64`
  return readFileSync(resolve(root, 'src/app-source-v7', name), 'utf8').trim()
})
const sourceBuffer = gunzipSync(Buffer.from(chunks.join(''), 'base64'))
const source = sourceBuffer.toString('utf8')
const digest = createHash('sha256').update(sourceBuffer).digest('hex')

test('return-unified source has the pinned closure identity', () => {
  assert.equal(digest, '10de7fc7bb5d57eb9e5b6d3823652d86e82717b14115b8e41b834bdfb6c4c030')
})

test('the supplied marketplace visual system remains the Network page', () => {
  assert.match(source, /Tagtokn Closure Exchange/)
  assert.match(source, /Your Receipt Inventory/)
  assert.match(source, /Receipt Marketplace/)
  assert.match(source, /Receipt-Weighted Raffle/)
  assert.match(source, /TokenDetailModal/)
  assert.match(source, /CreatorDashboardModal/)
})

test('the broader framework and verifier remain separate linked pages', () => {
  for (const marker of ['FrameworkPage', 'VerificationPage', 'EvidencePage', 'ProjectionsPage']) {
    assert.match(source, new RegExp(marker))
  }
  for (const page of ["['network', 'Network']", "['framework', 'Framework']", "['verification', 'Unified Verification']", "['evidence', 'Evidence']", "['projections', 'Projections']"]) {
    assert.ok(source.includes(page), `missing page declaration ${page}`)
  }
})

test('one closure state is projected across network, verification, evidence, and economics', () => {
  for (const state of ['closureEpisodes', 'currentBasis', 'activityEvents', 'tradeHistory', 'userTokens', 'marketplaceListings', 'globalStats', 'dailyRevenue', 'prizePool']) {
    assert.match(source, new RegExp(state))
  }
})

test('classical Firebase and Instagram verification are absent', () => {
  assert.doesNotMatch(source, /from ['"]firebase\//)
  assert.doesNotMatch(source, /signInWithPopup|GoogleAuthProvider|onAuthStateChanged|instagram\.com/i)
  assert.match(source, /Black Mirror Identity/)
  assert.match(source, /Open Connected Return/)
})

test('unified verification keeps OPEN, admitted return, residual opening, and contradiction distinct', () => {
  assert.match(source, /Return still missing/)
  assert.match(source, /Self-authored replay/)
  assert.match(source, /FALSE_COLLAPSE/)
  assert.match(source, /Independent recoverable return/)
  assert.match(source, /CLOSED_TO_NEW_OPENING/)
})
