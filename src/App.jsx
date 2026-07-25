import { useEffect, useMemo, useState } from 'react'
import {
  MODALITIES,
  buildRuntimeUrl,
  decodeRuntime,
  deriveGuidance,
  deriveIdentity,
  deriveRuntime,
  integrateInteraction,
  participantLabel,
} from './domain/closureRuntime.js'
import {
  adoptRuntime,
  ensureRuntimeState,
  loadRuntimeState,
  replaceRuntime,
  saveRuntimeState,
} from './storage/runtimeStore.js'

const DEFAULT_MODALITIES = ['internal', 'message']

function modalityLabel(kind) {
  return MODALITIES.find((modality) => modality.id === kind)?.label || kind
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function formatMoney(value, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value || 0))
  } catch {
    return `${Number(value || 0)} ${currency}`
  }
}

function BootScreen() {
  return (
    <main className="onboarding-shell">
      <section className="onboarding-copy">
        <p className="eyebrow">Unified closure runtime</p>
        <h1>Identity begins open.</h1>
        <p>The local basis is admitted automatically. The network learns its identity from recurring relations, modalities, economic carriers, and internal connection over time.</p>
        <div className="closure-sequence"><span>Open basis</span><b>→</b><span>Interaction history</span><b>→</b><span>Relational identity</span></div>
      </section>
      <section className="panel onboarding-form">
        <p className="eyebrow">Opening field</p>
        <h2>No profile declaration required</h2>
        <p className="section-copy">The runtime is creating a device-local basis and admitting it into the shared closure field.</p>
        <div className="button primary wide">Opening closure runtime…</div>
      </section>
    </main>
  )
}

function MetricGrid({ derived }) {
  const moneyEntries = Object.entries(derived.moneyByCurrency || {})
  const metrics = [
    ['Integrated interactions', derived.coins.length, 'Every relational change instantiates a closure coin.'],
    ['Internal connections', derived.internalConnectionCount, 'Known relations inside the closure field.'],
    ['Emerging bases', derived.participants.length, 'Identity is inferred from participation rather than declared in advance.'],
    ['Communal objects', derived.objects.length, 'Contexts learned from recurring interaction carriers.'],
    ['External surfaces', derived.surfaces.length, 'Referenced platform or media boundaries.'],
    ['Money carriers', moneyEntries.length ? moneyEntries.map(([currency, amount]) => formatMoney(amount, currency)).join(' · ') : 'Observed structurally', 'Money is integrated as a modality, not treated as isolated identity.'],
  ]
  return (
    <section className="summary-grid">
      {metrics.map(([label, value, note]) => <article className="summary-card" key={label}><span>{label}</span><strong>{value}</strong><p>{note}</p></article>)}
    </section>
  )
}

function GuidancePanel({ guidance, onContinue }) {
  return (
    <section className="panel guidance-panel">
      <div className="section-heading"><div><p className="eyebrow">Closure guidance</p><h2>Continue toward stronger internal connection</h2></div><span className="pill">Derived from runtime topology</span></div>
      <div className="guidance-list">
        {guidance.map((item) => (
          <article className="guidance-card static" key={item.id}>
            <div><span>{item.kind.replaceAll('-', ' ')}</span><h3>{item.title}</h3><p>{item.reason}</p></div>
            <button className="button secondary" type="button" onClick={() => onContinue(item)}>Continue</button>
          </article>
        ))}
      </div>
    </section>
  )
}

function InteractionStream({ runtime }) {
  return (
    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">Live closure memory</p><h2>Integrated interaction stream</h2></div><span className="pill">Append-only</span></div>
      <div className="event-stream">
        {[...runtime.events].reverse().map((event) => (
          <article className="event-card" key={event.digest}>
            <div className="event-topline"><div><span>{event.kind}</span><strong>{participantLabel(event.actor)}</strong></div><time>{formatDate(event.at)}</time></div>
            <p>{event.payload.meaning}</p>
            {event.payload.intent ? <blockquote>{event.payload.intent}</blockquote> : null}
            <div className="chip-row">
              {(event.payload.modalities || []).map((modality, index) => <span key={`${modality.kind}-${index}`}>{modalityLabel(modality.kind)}{modality.kind === 'money' && modality.amount ? ` · ${formatMoney(modality.amount, modality.currency)}` : ''}</span>)}
            </div>
            <code>{event.digest.slice(0, 22)}</code>
          </article>
        ))}
      </div>
    </section>
  )
}

function inferredObjects(modalities) {
  const map = {
    money: { id: 'exchange-context', label: 'Economic exchange context', kind: 'exchange' },
    platform: { id: 'platform-boundary', label: 'Platform boundary', kind: 'boundary' },
    message: { id: 'shared-language', label: 'Shared language context', kind: 'communication' },
    image: { id: 'shared-visual', label: 'Shared visual context', kind: 'media' },
    audio: { id: 'shared-audio', label: 'Shared audio context', kind: 'media' },
    video: { id: 'shared-video', label: 'Shared video context', kind: 'media' },
    event: { id: 'shared-event', label: 'Shared event context', kind: 'event' },
    collaboration: { id: 'shared-work', label: 'Collaborative work', kind: 'project' },
  }
  return modalities.map((kind) => map[kind]).filter(Boolean)
}

function leastConnectedParticipant(derived, basisId, preferredId) {
  if (preferredId) return derived.participants.find((participant) => participant.id === preferredId) || null
  const degree = new Map()
  for (const edge of derived.edges) {
    degree.set(edge.from, (degree.get(edge.from) || 0) + 1)
    degree.set(edge.to, (degree.get(edge.to) || 0) + 1)
  }
  return derived.participants
    .filter((participant) => participant.id !== basisId)
    .sort((left, right) => (degree.get(`participant:${left.id}`) || 0) - (degree.get(`participant:${right.id}`) || 0))[0] || null
}

function modalitiesForGuidance(guidance) {
  if (!guidance) return DEFAULT_MODALITIES
  if (guidance.kind === 'boundary-return') return ['internal', 'platform', 'message']
  if (guidance.kind === 'multimodal-context') return ['internal', 'money', 'message']
  if (guidance.kind === 'internal-connection') return ['internal', 'message', 'collaboration']
  if (guidance.kind === 'coin-continuation') return ['internal', 'message']
  return DEFAULT_MODALITIES
}

function ContinueClosure({ runtime, basis, guidance, onIntegrated }) {
  const derived = useMemo(() => deriveRuntime(runtime), [runtime])
  const [selected, setSelected] = useState(() => modalitiesForGuidance(guidance))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => setSelected(modalitiesForGuidance(guidance)), [guidance])

  function toggle(kind) {
    setSelected((current) => current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind])
  }

  async function continueClosure(extra = {}) {
    setBusy(true)
    setMessage('')
    try {
      const modalities = extra.modalities || (selected.length ? selected : ['internal'])
      const target = leastConnectedParticipant(derived, basis.id, guidance?.participantId)
      const labels = modalities.map(modalityLabel)
      const updated = await integrateInteraction(runtime, {
        actor: basis,
        participants: target ? [target] : [],
        objects: inferredObjects(modalities),
        modalities,
        intent: guidance?.title || 'Continue the strongest available relation.',
        meaning: `The runtime observed continuation through ${labels.join(', ')}. Identity remains open and is updated from this relation rather than supplied as profile data.`,
        platformAction: extra.platformAction || (modalities.includes('platform') ? 'boundary continuation observed' : ''),
        platformUrl: extra.platformUrl || '',
        moneyAmount: 0,
        currency: 'USD',
        mediaUrl: extra.mediaUrl || '',
        mediaDescription: modalities.some((kind) => ['image', 'audio', 'video'].includes(kind)) ? 'Multimodal carrier observed by the closure runtime.' : '',
      })
      onIntegrated(updated)
    } catch (caught) {
      setMessage(caught.message || String(caught))
    } finally {
      setBusy(false)
    }
  }

  async function continueClipboardLink() {
    setBusy(true)
    setMessage('')
    try {
      const text = await navigator.clipboard.readText()
      const url = new URL(text.trim())
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('The clipboard does not contain a supported link.')
      await continueClosure({ modalities: [...new Set([...selected, 'platform', 'internal'])], platformUrl: url.toString(), platformAction: 'linked from the current boundary context' })
    } catch (caught) {
      setMessage(caught.message || 'Clipboard access was unavailable or did not contain a link.')
      setBusy(false)
    }
  }

  return (
    <section className="panel composer-panel">
      <div className="section-heading"><div><p className="eyebrow">Continue closure</p><h2>No identity or description fields</h2></div><span className="pill">Identity learned over time</span></div>
      <p className="section-copy">Choose the media currently carrying the relation. The runtime generates the continuation event, connects available internal nodes, preserves coin lineage, and updates the learned basis.</p>
      {guidance ? <article className="guidance-card static selected-guidance"><div><span>{guidance.kind.replaceAll('-', ' ')}</span><h3>{guidance.title}</h3><p>{guidance.reason}</p></div></article> : null}
      <div className="modality-grid" role="group" aria-label="Interaction media">
        {MODALITIES.map((modality) => (
          <button className={selected.includes(modality.id) ? 'modality-option selected' : 'modality-option'} type="button" key={modality.id} aria-pressed={selected.includes(modality.id)} onClick={() => toggle(modality.id)}>
            <strong>{modality.label}</strong><span>{modality.description}</span>
          </button>
        ))}
      </div>
      <div className="button-row continuation-actions">
        <button className="button primary" type="button" disabled={busy} onClick={() => continueClosure()}>{busy ? 'Integrating…' : 'Continue current relation'}</button>
        <button className="button secondary" type="button" disabled={busy} onClick={continueClipboardLink}>Continue a link from clipboard</button>
      </div>
      <p className="field-note">Money carriers are observed structurally in this field-only prototype. Actual amounts and counterparties should arrive later from payment connectors, not manual identity forms.</p>
      {message ? <p className="error-message">{message}</p> : null}
    </section>
  )
}

function CoinLedger({ derived, symbol }) {
  const children = new Map()
  for (const coin of derived.coins) for (const parent of coin.parents) children.set(parent, (children.get(parent) || 0) + 1)
  return (
    <section className="coin-grid">
      {[...derived.coins].reverse().map((coin) => (
        <article className="coin-card" key={coin.id}>
          <div className="coin-mark">{symbol.slice(0, 2)}</div>
          <div className="coin-content">
            <div className="coin-topline"><span>Closure coin #{coin.index}</span><strong>{coin.units} relational unit{coin.units === 1 ? '' : 's'}</strong></div>
            <p>{coin.meaning}</p>
            <div className="chip-row">{coin.carriers.map((carrier) => <span key={carrier}>{modalityLabel(carrier)}</span>)}</div>
            {coin.money.some((money) => money.amount > 0) ? <p className="money-shadow">Money carrier: {coin.money.filter((money) => money.amount > 0).map((money) => formatMoney(money.amount, money.currency)).join(' · ')}</p> : null}
            <dl className="coin-lineage"><div><dt>Parents</dt><dd>{coin.parents.length || 'origin'}</dd></div><div><dt>Later continuations</dt><dd>{children.get(coin.id) || 0}</dd></div><div><dt>Connected nodes</dt><dd>{coin.nodes.length}</dd></div></dl>
            <code>{coin.id}</code>
          </div>
        </article>
      ))}
    </section>
  )
}

function NetworkGraph({ runtime, derived }) {
  const layout = useMemo(() => {
    const nodes = [
      { id: `field:${runtime.field.id}`, label: runtime.field.name, kind: 'field' },
      ...derived.participants.map((participant) => ({ id: `participant:${participant.id}`, label: participantLabel(participant), kind: 'participant' })),
      ...derived.objects.map((object) => ({ id: `object:${object.id}`, label: object.label, kind: 'object' })),
    ]
    const width = 940, height = 540, radius = Math.min(width, height) * 0.37
    const positioned = nodes.map((node, index) => {
      if (node.kind === 'field') return { ...node, x: width / 2, y: height / 2 }
      const count = Math.max(1, nodes.length - 1)
      const angle = (Math.PI * 2 * Math.max(0, index - 1)) / count - Math.PI / 2
      return { ...node, x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius }
    })
    return { width, height, nodes: positioned, byId: new Map(positioned.map((node) => [node.id, node])) }
  }, [runtime, derived])

  return (
    <section className="panel network-panel">
      <div className="section-heading"><div><p className="eyebrow">Internal connection topology</p><h2>The graph learns identity through relations</h2></div></div>
      <div className="network-scroll"><svg className="network-svg" viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label="Unified TagTokn closure network">
        {derived.edges.map((edge, index) => {
          const from = layout.byId.get(edge.from), to = layout.byId.get(edge.to)
          if (!from || !to) return null
          return <g className="edge" key={`${edge.eventDigest}-${index}`}><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} /><text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 7}>{edge.modalities.slice(0, 2).map(modalityLabel).join(' + ')}</text></g>
        })}
        {layout.nodes.map((node) => <g className={`node node-${node.kind}`} key={node.id}><circle cx={node.x} cy={node.y} r={node.kind === 'field' ? 42 : 29} /><text x={node.x} y={node.y + (node.kind === 'field' ? 62 : 48)} textAnchor="middle">{node.label.slice(0, 28)}</text></g>)}
      </svg></div>
      <div className="network-legend"><span><i className="legend-dot field" /> Closure field</span><span><i className="legend-dot participant" /> Emerging basis</span><span><i className="legend-dot object" /> Learned communal context</span></div>
    </section>
  )
}

function IdentityPanel({ runtime, basis, derived, onShare }) {
  const identity = useMemo(() => deriveIdentity(runtime, basis.id), [runtime, basis.id])
  const ranked = Object.entries(identity.modalityCounts).sort((left, right) => right[1] - left[1])
  return (
    <section className="panel identity-panel">
      <div>
        <p className="eyebrow">Learned relational identity</p>
        <h2>{identity.label}</h2>
        <p>{Math.round(identity.confidence * 100)}% runtime depth · identity remains revisable</p>
        <code>{basis.id}</code>
      </div>
      <div className="identity-principles">
        <h3>No declared profile</h3>
        <p>This basis is represented only by its continuing pattern across internal connection, money, platforms, language, media, events, and collaboration.</p>
        <dl className="basis-stats"><div><dt>Observed events</dt><dd>{identity.eventCount}</dd></div><div><dt>Relations</dt><dd>{identity.relationCount}</dd></div><div><dt>Modalities</dt><dd>{ranked.length}</dd></div><div><dt>Coins carried</dt><dd>{derived.coins.filter((coin) => coin.nodes.includes(`participant:${basis.id}`)).length}</dd></div></dl>
        <div className="chip-row">{ranked.map(([kind, count]) => <span key={kind}>{modalityLabel(kind)} · {count}</span>)}</div>
        <button className="button secondary" type="button" onClick={onShare}>Share complete runtime</button>
      </div>
    </section>
  )
}

export default function App() {
  const [state, setState] = useState(() => loadRuntimeState())
  const [booting, setBooting] = useState(true)
  const [activeTab, setActiveTab] = useState('field')
  const [selectedGuidance, setSelectedGuidance] = useState(null)
  const [notice, setNotice] = useState('')
  const [urlError, setUrlError] = useState('')

  function commit(nextState) {
    saveRuntimeState(nextState)
    setState(nextState)
    return nextState
  }

  useEffect(() => {
    let active = true
    async function boot() {
      try {
        const existing = loadRuntimeState()
        const encoded = new URLSearchParams(window.location.search).get('runtime')
        const next = encoded ? await adoptRuntime(existing, decodeRuntime(encoded)) : await ensureRuntimeState(existing)
        if (!active) return
        commit(next)
        if (encoded) window.history.replaceState({}, '', window.location.pathname)
        setUrlError('')
      } catch (caught) {
        if (active) setUrlError(caught.message || 'The closure runtime could not be opened.')
      } finally {
        if (active) setBooting(false)
      }
    }
    boot()
    return () => { active = false }
  }, [])

  const derived = useMemo(() => state.runtime ? deriveRuntime(state.runtime) : null, [state.runtime])
  const guidance = useMemo(() => state.runtime ? deriveGuidance(state.runtime) : [], [state.runtime])

  function updateRuntime(runtime) {
    commit(replaceRuntime(state, runtime))
    window.history.replaceState({}, '', buildRuntimeUrl(runtime))
    setActiveTab('field')
    setSelectedGuidance(null)
    setNotice('Interaction integrated. Identity and coin lineage were updated from the relation.')
  }

  async function shareRuntime() {
    const url = buildRuntimeUrl(state.runtime)
    try {
      if (navigator.share) await navigator.share({ title: state.runtime.field.name, text: state.runtime.field.mission, url })
      else { await navigator.clipboard.writeText(url); setNotice('Complete runtime URL copied.') }
    } catch (caught) {
      if (caught?.name !== 'AbortError') setNotice('The runtime could not be shared.')
    }
  }

  if (booting || !state.runtime || !state.basis || !derived) return <BootScreen />

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand-button" type="button" onClick={() => setActiveTab('field')}><span className="brand-mark">T</span><span>TagTokn</span></button>
        <nav aria-label="Primary navigation">
          {[['field', 'Closure field'], ['continue', 'Continue'], ['coins', `Coins (${derived.coins.length})`], ['network', 'Network'], ['identity', 'Identity']].map(([id, label]) => <button className={activeTab === id ? 'nav-button active' : 'nav-button'} type="button" key={id} onClick={() => setActiveTab(id)}>{label}</button>)}
        </nav>
        <button className="button secondary compact-action" type="button" onClick={shareRuntime}>Share runtime</button>
      </header>

      <main className="page-content">
        {urlError ? <p className="error-message">{urlError}</p> : null}
        {notice ? <p className="notice-message">{notice}</p> : null}

        {activeTab === 'field' ? <>
          <section className="hero"><p className="eyebrow">{state.runtime.field.symbol} · identity-learning closure runtime</p><h1>{state.runtime.field.name}</h1><p>{state.runtime.field.mission}</p><div className="closure-sequence"><span>Observe</span><span>Relate</span><span>Integrate</span><span>Learn identity</span><span>Instantiate coin</span><b>→</b><span>Deeper connection</span></div></section>
          <MetricGrid derived={derived} />
          <GuidancePanel guidance={guidance} onContinue={(item) => { setSelectedGuidance(item); setActiveTab('continue') }} />
          <InteractionStream runtime={state.runtime} />
        </> : null}

        {activeTab === 'continue' ? <ContinueClosure runtime={state.runtime} basis={state.basis} guidance={selectedGuidance} onIntegrated={updateRuntime} /> : null}
        {activeTab === 'coins' ? <><section className="page-heading"><p className="eyebrow">Closure-instantiated coins</p><h1>Coin lineage records learned relation.</h1><p>Each coin appears from an integrated interaction. It preserves modalities, connected nodes, prior lineage, and any monetary shadow without requiring manual mint or identity entry.</p></section><CoinLedger derived={derived} symbol={state.runtime.field.symbol} /></> : null}
        {activeTab === 'network' ? <NetworkGraph runtime={state.runtime} derived={derived} /> : null}
        {activeTab === 'identity' ? <IdentityPanel runtime={state.runtime} basis={state.basis} derived={derived} onShare={shareRuntime} /> : null}
      </main>
    </div>
  )
}
