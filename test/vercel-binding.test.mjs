import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const binding = JSON.parse(await readFile(new URL('../deployment/vercel-binding.json', import.meta.url), 'utf8'))
const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))

test('GitHub repository is pinned to the intended Vercel project', () => {
  assert.deepEqual(binding.repository, {
    provider: 'github',
    fullName: 'scarryhott/tagtokn',
    productionBranch: 'main',
    rootDirectory: '.',
  })

  assert.deepEqual(binding.vercelProject, {
    projectId: 'prj_eZGLHSZcMUMr3yvllDhmyaDILHz2',
    projectSlug: 'tagtoken',
    teamId: 'team_8lwRiE0ISUD66ftmTcnduSCb',
    teamSlug: 'harrys-projects-08015ef2',
  })
})

test('Vercel build configuration matches the pinned project contract', () => {
  assert.equal(config.framework, binding.build.framework)
  assert.equal(config.installCommand, binding.build.installCommand)
  assert.equal(config.buildCommand, binding.build.buildCommand)
  assert.equal(config.outputDirectory, binding.build.outputDirectory)
})

test('generated deployment hostnames are not treated as project identity', () => {
  assert.equal(binding.requestedDeployment.role, 'deployment-reference-not-project-identity')
  assert.match(binding.requestedDeployment.url, /^https:\/\/tagtoken-[a-z0-9-]+\.vercel\.app$/)
  assert.match(binding.bindingRule, /project ID.*authoritative/i)
})
