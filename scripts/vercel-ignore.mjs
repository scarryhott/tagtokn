const CANONICAL_PROJECT_ID = 'prj_eSGf07bcURq9HOrynC1Q6efMbaj5'
const projectId = process.env.VERCEL_PROJECT_ID || ''

// Vercel's Ignored Build Step semantics are intentionally inverted:
// exit 0 ignores the deployment; exit 1 continues the deployment.
if (!projectId) {
  console.log('VERCEL_PROJECT_ID is unavailable; continue so local and unknown builds fail visibly.')
  process.exit(1)
}

if (projectId === CANONICAL_PROJECT_ID) {
  console.log(`Canonical TagTokn project ${projectId}; continue deployment.`)
  process.exit(1)
}

console.log(`Ignoring duplicate Vercel project ${projectId}; canonical project is ${CANONICAL_PROJECT_ID}.`)
process.exit(0)
