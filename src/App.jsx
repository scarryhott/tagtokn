import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MODALITIES,
  decodeRuntime,
  deriveGuidance,
  deriveIdentity,
  deriveRuntime,
  integrateObservation,
  participantLabel,
} from './domain/closureRuntime.js'
import {
  adoptRuntime,
  ensureRuntimeState,
  loadRuntimeState,
  replaceRuntime,
  saveRuntimeState,
} from './storage/runtimeStore.js'

const INTEGRATION_PATHS = [
  {
    id: 'payments',
    title: 'Payment systems',
    purpose: 'Translate confirmed money movement into a relational observation without making payment the identity of the interaction.',
    sequence: [
      'Receive the provider webhook in a server route.',
      'Verify its signature and discard untrusted or duplicate events.',
      'Resolve the payer, recipient, shared context, and any connected platform action.',
      'Send one normalized observation to the closure ingestion endpoint.',
    ],
    source: 'payment-connector',
    example: `{
  source: 'payment-connector',
  amount: 25,
  currency: 'USD',
  transactionId: 'provider-event-id',
  participants: [{ id: 'payer-basis' }, { id: 'recipient-basis' }],
  context: 'Community exchange',
  relation: 'payment continued an existing communal relation'
}`,
  },
  {
    id: 'platforms',
    title: 'Platform and media systems',
    purpose: 'Treat posts, messages, links, audio, video, events, and collaborations as boundary carriers rather than imported authority.',
    sequence: [
      'Subscribe to an approved webhook, export, share extension, or native client event.',
      'Preserve the external reference but do not import platform ranking or profile truth.',
      'Relate the action to known participants and a communal context.',
      'Submit the platform action and its media carriers as one observation.',
    ],
    source: 'platform-connector',
    example: `{
  source: 'platform-connector',
  platformAction: 'shared community project',
  platformUrl: 'https://platform.example/item',
  message: 'Discussion continued around the project.',
  imageUrl: 'https://cdn.example/context.jpg',
  participants: [{ id: 'basis-a' }, { id: 'basis-b' }],
  context: 'Shared project'
}`,
  },
  {
    id: 'contracts',
    title: 'Internal relational contracts',
    purpose: 'Encode commitments, permissions, value exchange, completion, and reciprocity as continuing network relations rather than isolated legal records.',
    sequence: [
      'Create a stable contract ID and identify its relational parties and communal purpose.',
      'Record proposed, accepted, fulfilled, disputed, or revised transitions as append-only observations.',
      'Attach payment, media, platform, and evidence references to the same contract context.',
      'Let closure coins record continuation lineage; never use them as a human-worth score.',
    ],
    source: 'internal-contract',
    example: `{
  source: 'internal-contract',
  contractId: 'contract-001',
  contractState: 'accepted',
  participants: [{ id: 'provider-basis' }, { id: 'community-basis' }],
  context: 'Local service agreement',
  collaboration: true,
  relation: 'mutual commitment accepted',
  evidence: ['proposal-digest', 'acceptance-digest']
}`,
  },
]

function modalityLabel(kind) {
  return MODALITIES.find((item) => item.id === kind)?.label || kind
}

function sourceLabel(event) {
  return event.payload.source || (event.kind === 'admit' ? 'closure runtime' : 'network')
}

function latestDistinctEvents(runtime, limit = 7) {
  return [...runtime.events].reverse().slice(0, limit)
}

function FieldAperture({ runtime, derived }) {
  const latest = runtime.events[runtime.events.length - 1]
  const carriers = latest.payload.modalities || []
  const contexts = derived.objects.slice(-6)

  return (
    <div className="field-aperture" aria-label="Live multimodal closure field">
      <div className="field-ripple ripple-one" />
      <div className="field-ripple ripple-two" />
      <div className="field-ripple ripple-three" />
      <div className="closure-core">
        <span>{runtime.field.symbol}</span>
        <strong>closure</strong>
      </div>
      {carriers.map((carrier, index) => (
        <div
          className={`carrier carrier-${carrier.kind}`}
          style={{ '--carrier-index': index, '--carrier-count': Math.max(1, carriers.length) }}
          key={`${latest.digest}-${carrier.kind}-${index}`}
        >
          {modalityLabel(carrier.kind)}
        </div>
      ))}
      {contexts.map((context, index) => (
        <div
          className="context-node"
          style={{ '--context-index': index, '--context-count': Math.max(1, contexts.length) }}
          key={context.id}
        >
          {context.label}
        </div>
      ))}
    </div>
  )
}

function AmbientStream({ runtime }) {
  return (
    <section className="ambient-stream" aria-label="Closure interaction stream">
      {latestDistinctEvents(runtime).map((event, index) => (
        <article className={index === 0 ? 'stream-event current' : 'stream-event'} key={event.digest}>
          <div className="event-origin">
            <span>{sourceLabel(event)}</span>
            <i />
            <span>{participantLabel(event.actor)}</span>
          </div>
          <p>{event.payload.meaning}</p>
          <div className="carrier-line">
            {(event.payload.modalities || []).map((carrier, carrierIndex) => (
              <span key={`${carrier.kind}-${carrierIndex}`}>{modalityLabel(carrier.kind)}</span>
            ))}
          </div>
        </article>
      ))}
    </section>
  )
}

function IntegrationGuidance() {
  return (
    <section className="integration-guidance" aria-labelledby="integration-heading">
      <div className="integration-intro">
        <p className="eyebrow">implementation path</p>
        <h2 id="integration-heading">Connect systems to the field</h2>
        <p>
          The participant does not select payment, platform, or contract actions in this interface. Your integrations observe those systems, normalize their events, and submit one relational observation to TagTokn.
        </p>
      </div>

      <div className="integration-flow" aria-label="Connector flow">
        <span>provider or internal system</span>
        <i>→</i>
        <span>verified adapter</span>
        <i>→</i>
        <span>closure observation</span>
        <i>→</i>
        <span>shared relational field</span>
      </div>

      <div className="integration-paths">
        {INTEGRATION_PATHS.map((path, pathIndex) => (
          <article className="integration-path" key={path.id}>
            <div className="path-heading">
              <span>{String(pathIndex + 1).padStart(2, '0')}</span>
              <div>
                <h3>{path.title}</h3>
                <p>{path.purpose}</p>
              </div>
            </div>
            <ol>
              {path.sequence.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <div className="contract-example">
              <div>
                <span>normalized source</span>
                <code>{path.source}</code>
              </div>
              <pre><code>{path.example}</code></pre>
            </div>
          </article>
        ))}
      </div>

      <div className="ingestion-contract">
        <div>
          <span>browser prototype</span>
          <code>window.TagTokn.observe(observation)</code>
        </div>
        <div>
          <span>production target</span>
          <code>POST /api/closure/observe</code>
        </div>
        <p>
          The production endpoint should authenticate the connector, verify signatures, enforce idempotency, preserve provider references, and append the normalized observation to shared storage before broadcasting it to clients.
        </p>
      </div>
    </section>
  )
}

function OpeningField() {
  return (
    <main className="opening-field">
      <div className="opening-orbit"><i /><i /><i /></div>
      <p>Opening the closure field</p>
      <span>No profile or isolated action is being requested.</span>
    </main>
  )
}

export default function App() {
  const [state, setState] = useState(() => loadRuntimeState())
  const [booting, setBooting] = useState(true)
  const [connectionState, setConnectionState] = useState('opening network field')
  const runtimeRef = useRef(state.runtime)
  const basisRef = useRef(state.basis)

  function commit(nextState) {
    saveRuntimeState(nextState)
    runtimeRef.current = nextState.runtime
    basisRef.current = nextState.basis
    setState(nextState)
    return nextState
  }

  useEffect(() => {
    let active = true
    let channel = null

    async function ingest(observation) {
      if (!observation || typeof observation !== 'object' || !runtimeRef.current || !basisRef.current) return
      try {
        const runtime = await integrateObservation(runtimeRef.current, { basis: basisRef.current, observation })
        if (!active) return
        commit(replaceRuntime({ runtime: runtimeRef.current, basis: basisRef.current }, runtime))
        setConnectionState(`receiving ${observation.source || observation.connector || 'network'} closure input`)
      } catch {
        setConnectionState('listening for admissible network closure input')
      }
    }

    async function boot() {
      try {
        const existing = loadRuntimeState()
        const encoded = new URLSearchParams(window.location.search).get('runtime')
        const next = encoded ? await adoptRuntime(existing, decodeRuntime(encoded)) : await ensureRuntimeState(existing)
        if (!active) return
        commit(next)
        if (encoded) window.history.replaceState({}, '', window.location.pathname)
        setConnectionState('listening across socioeconomic and multimodal carriers')

        channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('tagtokn-closure-input') : null
        if (channel) channel.onmessage = (event) => ingest(event.data?.observation || event.data)

        window.addEventListener('message', (event) => {
          const payload = event.data
          if (payload?.type === 'tagtokn:observation' || payload?.source === 'tagtokn-connector') ingest(payload.observation || payload)
        })
        window.addEventListener('tagtokn:observe', (event) => ingest(event.detail))
        window.addEventListener('storage', (event) => {
          if (event.key?.startsWith('tagtokn.') && event.newValue) {
            const loaded = loadRuntimeState()
            if (loaded.runtime && loaded.basis) commit(loaded)
          }
        })

        window.TagTokn = {
          observe: ingest,
          snapshot: () => runtimeRef.current,
          channel: 'tagtokn-closure-input',
        }
      } catch {
        setConnectionState('closure field unavailable')
      } finally {
        if (active) setBooting(false)
      }
    }

    boot()
    return () => {
      active = false
      channel?.close()
      if (window.TagTokn) delete window.TagTokn
    }
  }, [])

  const derived = useMemo(() => state.runtime ? deriveRuntime(state.runtime) : null, [state.runtime])
  const identity = useMemo(() => state.runtime && state.basis ? deriveIdentity(state.runtime, state.basis.id) : null, [state.runtime, state.basis])
  const guidance = useMemo(() => state.runtime ? deriveGuidance(state.runtime)[0] : null, [state.runtime])

  if (booting || !state.runtime || !state.basis || !derived || !identity) return <OpeningField />

  const latest = state.runtime.events[state.runtime.events.length - 1]

  return (
    <div className="app-shell">
      <header className="ambient-header">
        <div className="brand-mark">T</div>
        <div>
          <strong>TagTokn</strong>
          <span>{connectionState}</span>
        </div>
        <div className="listening-pulse" aria-hidden="true"><i /><i /><i /></div>
      </header>

      <main className="closure-interface">
        <section className="field-language">
          <p className="eyebrow">{sourceLabel(latest)} · unified closure observation</p>
          <h1>{latest.payload.meaning}</h1>
          <p className="network-tendency">{guidance?.title}</p>
          <div className="emergent-basis">
            <span>relational pattern emerging as</span>
            <strong>{identity.label}</strong>
          </div>
        </section>

        <FieldAperture runtime={state.runtime} derived={derived} />
        <AmbientStream runtime={state.runtime} />
        <IntegrationGuidance />

        <footer className="connector-boundary">
          <span>Payment, platform, message, image, audio, video, event, collaboration, and internal-contract connectors write into this same field.</span>
          <code>window.TagTokn.observe(observation)</code>
        </footer>
      </main>
    </div>
  )
}
