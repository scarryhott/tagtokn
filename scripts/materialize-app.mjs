import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'

const root = resolve(import.meta.dirname, '..')
const sourceDir = resolve(root, 'src/app-source-v8')
const outputPath = resolve(root, 'src/App.generated.jsx')
const expectedSha256 = '05e55f71e1e4335018201c3a3b5445bec1786887710ed7e43733aa3c38bdb59e'
const chunkNames = Array.from({ length: 8 }, (_, index) => `${String(index).padStart(2, '0')}.b64`)

const encoded = chunkNames.map((name) => {
  const path = resolve(sourceDir, name)
  if (!existsSync(path)) throw new Error(`Missing paper-audited application source chunk: ${name}`)
  return readFileSync(path, 'utf8').trim()
}).join('')

const source = gunzipSync(Buffer.from(encoded, 'base64'))
const actualSha256 = createHash('sha256').update(source).digest('hex')

if (actualSha256 !== expectedSha256) {
  throw new Error(`Paper-audited application source digest mismatch: expected ${expectedSha256}, received ${actualSha256}`)
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, source)
console.log(`Materialized ${outputPath} (${source.length} bytes, sha256 ${actualSha256})`)