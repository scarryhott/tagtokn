import { useEffect, useMemo, useState } from 'react'

const POLL_INTERVAL_MS = 8000

function shortDigest(value) {
  if (!value) return 'none'
  return `${value.slice(0, 12)}…${value.slice(-8)}`
}

function pretty(value) {
  return JSON.stringify(value ?? {}, null, 2)
}

function Readiness({ label, ready, detail }) {
  return (
    <article className="readiness-item">
      <span className={ready ? 'status ready' : 'status blocked'}>{ready ? 'ready' : 'blocked'}</span>
      <div>
        <strong>{label}</strong>
        <p>{detail}</p>
      </div>
    </article>
  )
}

function ProofRow({ label, value, positive }) {
  return (
    <div className="proof-row">
      <span>{label}</span>
      <code className={positive === true ? 'proof-good' : positive === false ? 'proof-bad' : ''}>{value}</code>
    </div>
  )
}

function RecordCard({ record }) {
  const verification = record.independentVerification || {}
  const checks = verification.checks || {}

  return (
    <article className="record-card">
      <header className="record-header">
        <div>
          <p className="record-source">{record.source.system}</p>
          <h3>{record.source.eventType}</h3>
          <span>{record.source.eventId}</span>
        </div>
        <span className={verification.valid ? 'record-valid' : 'record-invalid'}>
          {verification.valid ? 'independently verified' : 'verification failed'}
        </span>
      </header>

      <section className="record-proof-grid">
        <div className="proof-panel">
          <h4>Source proof</h4>
          <ProofRow label="signature" value={record.source.signature?.scheme || 'unknown'} positive={record.source.signature?.verified} />
          <ProofRow label="raw payload" value={shortDigest(record.source.rawPayloadDigest)} />
          <ProofRow label="received" value={record.source.receivedAt || 'unknown'} />
        </div>
        <div className="proof-panel">
          <h4>Declared adapter</h4>
          <ProofRow label="adapter" value={`${record.adapter.id}@${record.adapter.version}`} />
          <ProofRow label="mapping" value={shortDigest(record.adapter.mappingDigest)} positive={checks.normalizedDigest} />
          <ProofRow label="normalized" value={shortDigest(record.chain.normalizedDigest)} positive={checks.normalizedDigest} />
        </div>
        <div className="proof-panel">
          <h4>Closure chain</h4>
          <ProofRow label="previous" value={shortDigest(record.chain.previousClosureDigest)} />
          <ProofRow label="result" value={shortDigest(record.chain.resultingClosureDigest)} positive={checks.resultingClosureDigest} />
          <ProofRow label="schema" value={record.schema} positive={checks.schema} />
        </div>
      </section>

      <section className="fact-inference-grid">
        <div>
          <p className="section-label">Observed source facts</p>
          <pre>{pretty(record.observed)}</pre>
        </div>
        <div>
          <p className="section-label">Declared inference</p>
          <pre>{pretty(record.inferred)}</pre>
        </div>
      </section>

      {(record.contractEvidence || record.contractTransition) && (
        <section className="contract-effect">
          <p className="section-label">Contract relation</p>
          <pre>{pretty(record.contractTransition || record.contractEvidence)}</pre>
        </section>
      )}
    </article>
  )
}

function App() {
  const [ledger, setLedger] = useState(null)
  const [requestError, setRequestError] = useState('')
  const [lastChecked, setLastChecked] = useState(null)

  useEffect(() => {
    let active = true
    let timer

    async function loadLedger() {
      try {
        const response = await fetch('/api/closure/ledger?limit=30', { cache: 'no-store' })
        const body = await response.json()
        if (!active) return
        setLedger(body)
        setRequestError(response.ok ? '' : body.error || 'The ledger endpoint returned an error.')
        setLastChecked(new Date())
      } catch (error) {
        if (!active) return
        setRequestError(error.message || 'The ledger could not be reached.')
        setLastChecked(new Date())
      } finally {
        if (active) timer = window.setTimeout(loadLedger, POLL_INTERVAL_MS)
      }
    }

    loadLedger()
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [])

  const configuration = ledger?.configuration
  const records = ledger?.records || []
  const allReady = useMemo(() => {
    if (!configuration) return false
    return Boolean(
      configuration.storage?.configured &&
      configuration.integrations?.stripe?.configured &&
      configuration.integrations?.platformAdapter?.configured &&
      configuration.integrations?.internalContracts?.configured,
    )
  }, [configuration])

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand">TagTokn</div>
        <div className="header-state">
          <span className={allReady ? 'status ready' : 'status blocked'}>{allReady ? 'live path ready' : 'integration setup incomplete'}</span>
          <small>{lastChecked ? `checked ${lastChecked.toLocaleTimeString()}` : 'checking server'}</small>
        </div>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">transparent closure architecture v1</p>
          <h1>Verify every transformation before closure accepts it.</h1>
          <p className="hero-copy">
            Source events remain inspectable. Transport signatures are verified against the untouched raw body. Adapter rules are versioned and hashed. Observed facts stay separate from inferred relations. Native contract transitions are state-checked. Only then is an event appended to the closure chain.
          </p>
          <div className="architecture-line" aria-label="Transparent closure sequence">
            <span>source event</span><i>→</i><span>verified transport</span><i>→</i><span>deterministic adapter</span><i>→</i><span>contract or evidence</span><i>→</i><span>closure digest</span>
          </div>
          <p className="fail-closed">The server rejects events when signature verification or durable append-only storage is unavailable.</p>
        </section>

        <section className="readiness-section">
          <div className="section-heading">
            <p className="eyebrow">server readiness</p>
            <h2>What is actually connected</h2>
          </div>
          <div className="readiness-grid">
            <Readiness
              label="Append-only ledger"
              ready={configuration?.storage?.configured}
              detail="UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN"
            />
            <Readiness
              label="Stripe payment verification"
              ready={configuration?.integrations?.stripe?.configured}
              detail="STRIPE_WEBHOOK_SECRET · POST /api/webhooks/stripe"
            />
            <Readiness
              label="Platform adapter signatures"
              ready={configuration?.integrations?.platformAdapter?.configured}
              detail="TAGTOKN_CONNECTOR_SECRET · POST /api/closure/observe"
            />
            <Readiness
              label="Internal contract transitions"
              ready={configuration?.integrations?.internalContracts?.configured}
              detail="TAGTOKN_CONNECTOR_SECRET · POST /api/contracts/transition"
            />
          </div>
          {requestError && <p className="server-error">{requestError}</p>}
          {ledger?.reason && <p className="server-warning">{ledger.reason}</p>}
        </section>

        <section className="implementation-section">
          <div className="section-heading">
            <p className="eyebrow">first verified integration</p>
            <h2>Stripe payment → closure evidence</h2>
          </div>
          <ol className="implementation-steps">
            <li><strong>Provision durable storage.</strong><span>Add the two Upstash REST environment variables to the Vercel project.</span></li>
            <li><strong>Register the webhook.</strong><span>Point Stripe to <code>https://tagtokn.vercel.app/api/webhooks/stripe</code> and copy its signing secret into <code>STRIPE_WEBHOOK_SECRET</code>.</span></li>
            <li><strong>Declare relational metadata.</strong><span>Attach <code>contract_id</code>, <code>payer_basis_id</code>, <code>recipient_basis_id</code>, and optional <code>communal_context</code> to the PaymentIntent.</span></li>
            <li><strong>Reconcile the proof.</strong><span>The ledger exposes the provider event ID, raw payload digest, signature result, adapter mapping digest, observed facts, declared inference, and resulting closure digest.</span></li>
          </ol>
          <pre className="payload-example"><code>{`{
  "metadata": {
    "contract_id": "contract-001",
    "payer_basis_id": "basis-payer",
    "recipient_basis_id": "basis-provider",
    "communal_context": "local service agreement"
  }
}`}</code></pre>
          <p className="principle-note">A successful payment is recorded as evidence. It does not automatically declare that the internal contract was fulfilled.</p>
        </section>

        <section className="implementation-section two-column">
          <div>
            <div className="section-heading compact">
              <p className="eyebrow">platform adapters</p>
              <h2>Signed observed/inferred envelope</h2>
            </div>
            <pre className="payload-example"><code>{`POST /api/closure/observe
X-TagTokn-Signature: sha256=<HMAC(raw body)>

{
  "sourceSystem": "github",
  "sourceEventId": "delivery-123",
  "sourceEventType": "pull_request.merged",
  "observed": {
    "repository": "owner/repo",
    "pullRequest": 42,
    "merged": true
  },
  "inferred": {
    "relationType": "collaboration-continued",
    "inferenceBasis": ["adapter-rule-v1"]
  }
}`}</code></pre>
          </div>
          <div>
            <div className="section-heading compact">
              <p className="eyebrow">native contracts</p>
              <h2>Append-only state transition</h2>
            </div>
            <pre className="payload-example"><code>{`POST /api/contracts/transition
X-TagTokn-Signature: sha256=<HMAC(raw body)>

{
  "contractId": "contract-001",
  "sourceEventId": "transition-002",
  "nextState": "accepted",
  "participants": [
    { "id": "basis-payer" },
    { "id": "basis-provider" }
  ],
  "evidence": [
    "proposal-digest",
    "acceptance-signature-digest"
  ]
}`}</code></pre>
          </div>
        </section>

        <section className="ledger-section">
          <div className="section-heading ledger-heading">
            <div>
              <p className="eyebrow">append-only inspection</p>
              <h2>Verified closure ledger</h2>
            </div>
            <code>head {shortDigest(ledger?.head)}</code>
          </div>
          {records.length ? (
            <div className="records">{records.map((record) => <RecordCard record={record} key={record.recordId} />)}</div>
          ) : (
            <div className="empty-ledger">
              <strong>No verified events have been appended.</strong>
              <p>This remains empty until storage and at least one signed connector are configured. The server does not fabricate demonstration records.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
