import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { gunzipSync } from 'node:zlib'

const root = resolve(import.meta.dirname, '..')
const chunks = Array.from({ length: 8 }, (_, index) => {
  const name = `${String(index).padStart(2, '0')}.b64`
  return readFileSync(resolve(root, 'src/app-source', name), 'utf8').trim()
})
const sourceBuffer = gunzipSync(Buffer.from(chunks.join(''), 'base64'))
const source = sourceBuffer.toString('utf8')
const digest = createHash('sha256').update(sourceBuffer).digest('hex')

test('reunified source has the pinned closure identity', () => {
  assert.equal(digest, '591782aaf3304b2f2e73b13f3aa6092876c1ebab66c83ce4e5bae87d92879767')
})

test('the original network visual application remains the primary page', () => {
  assert.match(source, /Tagtokn Closure Exchange/)
  assert.match(source, /Marketplace Listings/)
  assert.match(source, /Trade History/)
  assert.match(source, /Raffle/)
  assert.match(source, /Physical/)
})

test('the broader framework and verifier are separate linked pages', () => {
  for (const marker of ['FrameworkPage', 'VerificationPage', 'EvidencePage', 'ProjectionsPage']) {
    assert.match(source, new RegExp(marker))
  }
  for (const page of ["['network', 'Network']", "['framework', 'Framework']", "['verification', 'Unified Verification']", "['evidence', 'Evidence']", "['projections', 'Projections']"]) {
    assert.ok(source.includes(page), `missing page declaration ${page}`)
  }
})

test('one application state is projected into verification and projections', () => {
  assert.match(source, /activityEvents=\{activityEvents\}/)
  assert.match(source, /tradeHistory=\{tradeHistory\}/)
  assert.match(source, /userTokens=\{userTokens\}/)
  assert.match(source, /globalStats=\{globalStats\}/)
  assert.match(source, /dailyRevenue=\{dailyRevenue\}/)
  assert.match(source, /prizePool=\{prizePool\}/)
})

test('classical Firebase and social authentication are not runtime dependencies', () => {
  assert.doesNotMatch(source, /from ['"]firebase\//)
  assert.doesNotMatch(source, /signInWithPopup|FacebookAuthProvider|GoogleAuthProvider|onAuthStateChanged/)
  assert.match(source, /Black Mirror Identity/)
  assert.match(source, /Open Connected Return/)
})

test('unified verification keeps OPEN distinct from contradiction', () => {
  assert.match(source, /Missing or self-authored replay/)
  assert.match(source, /FALSE_COLLAPSE/)
  assert.match(source, /Independent \+ recoverable return/)
  assert.match(source, /CLOSED → OPEN/)
})
