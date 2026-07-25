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

        <footer className="connector-boundary">
          <span>Payment, platform, message, image, audio, video, event, collaboration, and internal-network connectors write into this same field.</span>
          <code>window.TagTokn.observe(observation)</code>
        </footer>
      </main>
    </div>
  )
}
