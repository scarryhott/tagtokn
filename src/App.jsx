import { useEffect, useMemo, useState } from 'react'
import {
  MODALITIES,
  buildRuntimeUrl,
  createId,
  decodeRuntime,
  deriveGuidance,
  deriveRuntime,
  integrateInteraction,
} from './domain/closureRuntime.js'
import {
  admitBasis,
  createRuntimeState,
  loadRuntimeState,
  replaceRuntime,
  saveRuntimeState,
} from './storage/runtimeStore.js'

const EMPTY_INTERACTION = {
  intent: '',
  meaning: '',
  selectedParticipantIds: [],
  newParticipantName: '',
  objectLabel: '',
  objectKind: 'communal-object',
  modalities: ['internal', 'message'],
  platformAction: '',
  platformUrl: '',
  moneyAmount: '',
  currency: 'USD',
  moneyReference: '',
  mediaUrl: '',
  mediaDescription: '',
}

function participantLabel(participant) {
  return participant?.name || participant?.handle || 'Unnamed participant'
}

function modalityLabel(kind) {
  return MODALITIES.find((modality) => modality.id === kind)?.label || kind
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
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

function SetupField({ onCreate }) {
  const [form, setForm] = useState({
    fieldName: '',
    symbol: 'TOKN',
    mission: '',
    participantName: '',
    handle: '',
    referenceUrl: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onCreate({
        field: {
          name: form.fieldName,
          symbol: form.symbol,
          mission: form.mission,
        },
        participant: {
          name: form.participantName,
          handle: form.handle,
          referenceUrl: form.referenceUrl,
        },
      })
    } catch (caught) {
      setError(caught.message || String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-copy">
        <p className="eyebrow">Unified closure runtime</p>
        <h1>The network acts through every medium at once.</h1>
        <p>
          Money transfers, platform links, messages, images, audio, events, collaboration, and internal
          connection are carriers of one evolving closure field. Coins are instantiated by that field as
          its relations continue.
        </p>
        <div className="closure-sequence">
          <span>Closure field</span><b>→</b><span>Multimodal interaction</span><b>→</b>
          <span>Coin instantiation</span><b>→</b><span>Internal connection</span>
        </div>
      </section>

      <form className="panel onboarding-form" onSubmit={submit}>
        <p className="eyebrow">Open a field</p>
        <h2>Enter relationally, not as an isolated account</h2>
        <label>
          Closure field
          <input
            required
            value={form.fieldName}
            onChange={(event) => setForm({ ...form, fieldName: event.target.value })}
            placeholder="Local learning and service field"
          />
        </label>
        <div className="field-grid two-columns">
          <label>
            Closure coin symbol
            <input
              required
              maxLength="12"
              value={form.symbol}
              onChange={(event) => setForm({ ...form, symbol: event.target.value })}
            />
          </label>
          <label>
            Participant basis
            <input
              required
              value={form.participantName}
              onChange={(event) => setForm({ ...form, participantName: event.target.value })}
              placeholder="Harry"
            />
          </label>
        </div>
        <label>
          Field mission
          <textarea
            required
            rows="4"
            value={form.mission}
            onChange={(event) => setForm({ ...form, mission: event.target.value })}
            placeholder="Connect social appreciation, useful local exchange, and collaborative media into stronger internal relations."
          />
        </label>
        <div className="field-grid two-columns">
          <label>
            Optional handle
            <input value={form.handle} onChange={(event) => setForm({ ...form, handle: event.target.value })} />
          </label>
          <label>
            Optional external reference
            <input
              type="url"
              value={form.referenceUrl}
              onChange={(event) => setForm({ ...form, referenceUrl: event.target.value })}
              placeholder="https://..."
            />
          </label>
        </div>
        <p className="field-note">
          External references locate a boundary surface. They do not define the participant or the closure field.
        </p>
        {error ? <p className="error-message">{error}</p> : null}
        <button className="button primary wide" type="submit" disabled={busy}>
          {busy ? 'Opening field…' : 'Open closure runtime'}
        </button>
      </form>
    </main>
  )
}

function EnterSharedField({ runtime, onEnter }) {
  const [form, setForm] = useState({ name: '', handle: '', referenceUrl: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onEnter(form)
    } catch (caught) {
      setError(caught.message || String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="onboarding-shell shared-entry">
      <section className="onboarding-copy">
        <p className="eyebrow">Shared closure runtime</p>
        <h1>{runtime.field.name}</h1>
        <p>{runtime.field.mission}</p>
        <div className="closure-sequence"><span>{runtime.events.length} integrated events</span><b>·</b><span>{runtime.field.symbol} closure coins</span></div>
      </section>
      <form className="panel onboarding-form" onSubmit={submit}>
        <p className="eyebrow">Enter the existing field</p>
        <h2>Your basis becomes an internal relation</h2>
        <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Optional handle<input value={form.handle} onChange={(event) => setForm({ ...form, handle: event.target.value })} /></label>
        <label>Optional reference<input type="url" value={form.referenceUrl} onChange={(event) => setForm({ ...form, referenceUrl: event.target.value })} /></label>
        {error ? <p className="error-message">{error}</p> : null}
        <button className="button primary wide" type="submit" disabled={busy}>{busy ? 'Integrating basis…' : 'Enter through closure'}</button>
      </form>
    </main>
  )
}

function MetricGrid({ derived }) {
  const moneyEntries = Object.entries(derived.moneyByCurrency || {})
  const metrics = [
    ['Integrated interactions', derived.coins.length, 'Each event instantiates a closure coin automatically.'],
    ['Internal connections', derived.internalConnectionCount, 'Known relations inside this closure field.'],
    ['Participants', derived.participants.length, 'Bases admitted through shared interactions.'],
    ['Communal objects', derived.objects.length, 'Projects, services, events, products, and ideas carried by the field.'],
    ['External surfaces', derived.surfaces.length, 'Platform or media boundaries referenced by the runtime.'],
    ['Money carriers', moneyEntries.length ? moneyEntries.map(([currency, amount]) => formatMoney(amount, currency)).join(' · ') : 'None yet', 'Money is one carrier of closure, not its isolated meaning.'],
  ]
  return (
    <section className="summary-grid">
      {metrics.map(([label, value, note]) => (
        <article className="summary-card" key={label}>
          <span>{label}</span><strong>{value}</strong><p>{note}</p>
        </article>
      ))}
    </section>
  )
}

function GuidancePanel({ guidance, onIntegrate }) {
  return (
    <section className="panel guidance-panel">
      <div className="section-heading">
        <div><p className="eyebrow">Closure guidance</p><h2>Continue toward stronger internal connection</h2></div>
        <span className="pill">Derived from runtime topology</span>
      </div>
      <div className="guidance-list">
        {guidance.map((item) => (
          <article className="guidance-card static" key={item.id}>
            <div><span>{item.kind.replaceAll('-', ' ')}</span><h3>{item.title}</h3><p>{item.reason}</p></div>
            <button className="button secondary" type="button" onClick={() => onIntegrate(item)}>Continue</button>
          </article>
        ))}
      </div>
    </section>
  )
}

function InteractionStream({ runtime }) {
  const events = [...runtime.events].reverse()
  return (
    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">Live closure memory</p><h2>Integrated interaction stream</h2></div><span className="pill">Append-only</span></div>
      <div className="event-stream">
        {events.map((event) => (
          <article className="event-card" key={event.digest}>
            <div className="event-topline">
              <div><span>{event.kind}</span><strong>{participantLabel(event.actor)}</strong></div>
              <time>{formatDate(event.at)}</time>
            </div>
            <p>{event.payload.meaning}</p>
            {event.payload.intent ? <blockquote>{event.payload.intent}</blockquote> : null}
            <div className="chip-row">
              {(event.payload.modalities || []).map((modality, index) => (
                <span key={`${modality.kind}-${index}`}>
                  {modalityLabel(modality.kind)}
                  {modality.kind === 'money' && modality.amount ? ` · ${formatMoney(modality.amount, modality.currency)}` : ''}
                </span>
              ))}
            </div>
            <code>{event.digest.slice(0, 22)}</code>
          </article>
        ))}
      </div>
    </section>
  )
}

function IntegrateInteraction({ runtime, basis, initialGuidance, onIntegrated }) {
  const derived = useMemo(() => deriveRuntime(runtime), [runtime])
  const [form, setForm] = useState(() => ({
    ...EMPTY_INTERACTION,
    intent: initialGuidance?.title || '',
    meaning: initialGuidance?.reason || '',
  }))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (initialGuidance) {
      setForm((current) => ({ ...current, intent: initialGuidance.title, meaning: initialGuidance.reason }))
    }
  }, [initialGuidance])

  function toggleModality(kind) {
    setForm((current) => {
      const selected = current.modalities.includes(kind)
      return {
        ...current,
        modalities: selected ? current.modalities.filter((item) => item !== kind) : [...current.modalities, kind],
      }
    })
  }

  function toggleParticipant(id) {
    setForm((current) => ({
      ...current,
      selectedParticipantIds: current.selectedParticipantIds.includes(id)
        ? current.selectedParticipantIds.filter((item) => item !== id)
        : [...current.selectedParticipantIds, id],
    }))
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const selectedParticipants = derived.participants.filter((participant) => form.selectedParticipantIds.includes(participant.id))
      const newParticipant = form.newParticipantName
        ? { id: createId('participant'), name: form.newParticipantName }
        : null
      const object = form.objectLabel
        ? { label: form.objectLabel, kind: form.objectKind }
        : null
      const updated = await integrateInteraction(runtime, {
        actor: basis,
        participants: [...selectedParticipants, ...(newParticipant ? [newParticipant] : [])],
        object,
        modalities: form.modalities,
        intent: form.intent,
        meaning: form.meaning,
        platformAction: form.platformAction,
        platformUrl: form.platformUrl,
        moneyAmount: form.moneyAmount,
        currency: form.currency,
        moneyReference: form.moneyReference,
        mediaUrl: form.mediaUrl,
        mediaDescription: form.mediaDescription,
      })
      onIntegrated(updated)
      setForm(EMPTY_INTERACTION)
    } catch (caught) {
      setError(caught.message || String(caught))
    } finally {
      setBusy(false)
    }
  }

  const hasMoney = form.modalities.includes('money')
  const hasPlatform = form.modalities.includes('platform')
  const hasMedia = form.modalities.some((kind) => ['image', 'audio', 'video'].includes(kind))

  return (
    <section className="panel composer-panel">
      <div className="section-heading">
        <div><p className="eyebrow">Integrate into closure</p><h2>One interaction may carry many modalities</h2></div>
        <span className="pill">Coins instantiate automatically</span>
      </div>
      <p className="section-copy">
        Do not choose a separate tag, payment, or media workflow. Describe one network continuation and select every medium through which it is occurring.
      </p>
      <form onSubmit={submit}>
        <label>
          Closure continuation
          <textarea required rows="4" value={form.meaning} onChange={(event) => setForm({ ...form, meaning: event.target.value })} placeholder="How does this interaction continue the existing field and strengthen internal connection?" />
        </label>
        <label>
          Current guidance or intent
          <input value={form.intent} onChange={(event) => setForm({ ...form, intent: event.target.value })} placeholder="Connect the tutor, event, and shared audio explanation." />
        </label>

        <fieldset>
          <legend>Interaction media</legend>
          <div className="modality-grid">
            {MODALITIES.map((modality) => (
              <label className={form.modalities.includes(modality.id) ? 'modality-option selected' : 'modality-option'} key={modality.id}>
                <input type="checkbox" checked={form.modalities.includes(modality.id)} onChange={() => toggleModality(modality.id)} />
                <strong>{modality.label}</strong><span>{modality.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field-grid two-columns">
          <label>
            Add a new participant basis
            <input value={form.newParticipantName} onChange={(event) => setForm({ ...form, newParticipantName: event.target.value })} placeholder="Local tutor" />
          </label>
          <label>
            Connect a communal object
            <input value={form.objectLabel} onChange={(event) => setForm({ ...form, objectLabel: event.target.value })} placeholder="Learning event, service, project, product, or idea" />
          </label>
        </div>
        {form.objectLabel ? (
          <label>
            Object kind
            <select value={form.objectKind} onChange={(event) => setForm({ ...form, objectKind: event.target.value })}>
              {['communal-object', 'project', 'service', 'business', 'event', 'product', 'idea', 'resource'].map((kind) => <option key={kind} value={kind}>{kind}</option>)}
            </select>
          </label>
        ) : null}

        {derived.participants.length > 1 ? (
          <fieldset>
            <legend>Existing participants carried into this continuation</legend>
            <div className="participant-picker">
              {derived.participants.filter((participant) => participant.id !== basis.id).map((participant) => (
                <label key={participant.id}>
                  <input type="checkbox" checked={form.selectedParticipantIds.includes(participant.id)} onChange={() => toggleParticipant(participant.id)} />
                  <span>{participantLabel(participant)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {hasPlatform ? (
          <div className="carrier-fields">
            <p className="field-title">Platform boundary carrier</p>
            <div className="field-grid two-columns">
              <label>Platform action<input value={form.platformAction} onChange={(event) => setForm({ ...form, platformAction: event.target.value })} placeholder="Shared, followed, referred, linked, invited" /></label>
              <label>Platform reference<input type="url" value={form.platformUrl} onChange={(event) => setForm({ ...form, platformUrl: event.target.value })} placeholder="https://..." /></label>
            </div>
          </div>
        ) : null}

        {hasMoney ? (
          <div className="carrier-fields">
            <p className="field-title">Money-transfer carrier</p>
            <div className="field-grid three-columns">
              <label>Amount<input type="number" min="0" step="0.01" value={form.moneyAmount} onChange={(event) => setForm({ ...form, moneyAmount: event.target.value })} /></label>
              <label>Currency<input maxLength="8" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} /></label>
              <label>Transfer reference<input value={form.moneyReference} onChange={(event) => setForm({ ...form, moneyReference: event.target.value })} placeholder="Receipt, payment link, or transaction note" /></label>
            </div>
          </div>
        ) : null}

        {hasMedia ? (
          <div className="carrier-fields">
            <p className="field-title">Multimodal carrier</p>
            <div className="field-grid two-columns">
              <label>Media reference<input type="url" value={form.mediaUrl} onChange={(event) => setForm({ ...form, mediaUrl: event.target.value })} placeholder="https://..." /></label>
              <label>Media role<input value={form.mediaDescription} onChange={(event) => setForm({ ...form, mediaDescription: event.target.value })} placeholder="Audio explanation, image invitation, video response" /></label>
            </div>
          </div>
        ) : null}

        {error ? <p className="error-message">{error}</p> : null}
        <button className="button primary wide" type="submit" disabled={busy}>
          {busy ? 'Integrating interaction…' : 'Integrate and instantiate closure coin'}
        </button>
      </form>
    </section>
  )
}

function CoinLedger({ derived, symbol }) {
  const children = new Map()
  for (const coin of derived.coins) {
    for (const parent of coin.parents) children.set(parent, (children.get(parent) || 0) + 1)
  }
  return (
    <section className="coin-grid">
      {[...derived.coins].reverse().map((coin) => (
        <article className="coin-card" key={coin.id}>
          <div className="coin-mark">{symbol.slice(0, 2)}</div>
          <div className="coin-content">
            <div className="coin-topline"><span>Closure coin #{coin.index}</span><strong>{coin.units} relational unit{coin.units === 1 ? '' : 's'}</strong></div>
            <p>{coin.meaning}</p>
            <div className="chip-row">{coin.carriers.map((carrier) => <span key={carrier}>{modalityLabel(carrier)}</span>)}</div>
            {coin.money.length ? <p className="money-shadow">Money carrier: {coin.money.map((money) => formatMoney(money.amount, money.currency)).join(' · ')}</p> : null}
            <dl className="coin-lineage">
              <div><dt>Parents</dt><dd>{coin.parents.length || 'origin'}</dd></div>
              <div><dt>Later continuations</dt><dd>{children.get(coin.id) || 0}</dd></div>
              <div><dt>Connected nodes</dt><dd>{coin.nodes.length}</dd></div>
            </dl>
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
    const width = 940
    const height = 540
    const radius = Math.min(width, height) * 0.37
    const positioned = nodes.map((node, index) => {
      if (node.kind === 'field') return { ...node, x: width / 2, y: height / 2 }
      const nonFieldCount = Math.max(1, nodes.length - 1)
      const angle = (Math.PI * 2 * Math.max(0, index - 1)) / nonFieldCount - Math.PI / 2
      return { ...node, x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius }
    })
    return { width, height, nodes: positioned, byId: new Map(positioned.map((node) => [node.id, node])) }
  }, [runtime, derived])

  return (
    <section className="panel network-panel">
      <div className="section-heading"><div><p className="eyebrow">Internal connection topology</p><h2>The closure field, not the external platform, is the graph</h2></div></div>
      <div className="network-scroll">
        <svg className="network-svg" viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label="Unified TagTokn closure network">
          {derived.edges.map((edge, index) => {
            const from = layout.byId.get(edge.from)
            const to = layout.byId.get(edge.to)
            if (!from || !to) return null
            return (
              <g className="edge" key={`${edge.eventDigest}-${index}`}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
                <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 7}>{edge.modalities.slice(0, 2).map(modalityLabel).join(' + ')}</text>
              </g>
            )
          })}
          {layout.nodes.map((node) => (
            <g className={`node node-${node.kind}`} key={node.id}>
              <circle cx={node.x} cy={node.y} r={node.kind === 'field' ? 42 : 29} />
              <text x={node.x} y={node.y + (node.kind === 'field' ? 62 : 48)} textAnchor="middle">{node.label.slice(0, 28)}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="network-legend"><span><i className="legend-dot field" /> Closure field</span><span><i className="legend-dot participant" /> Participant basis</span><span><i className="legend-dot object" /> Communal object</span></div>
    </section>
  )
}

function BasisPanel({ state, derived, onShare }) {
  return (
    <section className="panel identity-panel">
      <div>
        <p className="eyebrow">Current relational basis</p>
        <h2>{participantLabel(state.basis)}</h2>
        <p>{state.basis.handle || 'No external handle required'}</p>
        <code>{state.basis.id}</code>
      </div>
      <div className="identity-principles">
        <h3>{state.runtime.field.name}</h3>
        <p>{state.runtime.field.mission}</p>
        <p>
          This basis is not a detached account. It is one participant node admitted through the same append-only runtime that carries money, links, media, social actions, objects, and coin lineage.
        </p>
        <dl className="basis-stats"><div><dt>Participants</dt><dd>{derived.participants.length}</dd></div><div><dt>Coins</dt><dd>{derived.coins.length}</dd></div><div><dt>Modalities</dt><dd>{Object.keys(derived.modalityCounts).length}</dd></div></dl>
        <button className="button secondary" type="button" onClick={onShare}>Share complete runtime</button>
      </div>
    </section>
  )
}

export default function App() {
  const [state, setState] = useState(() => loadRuntimeState())
  const [activeTab, setActiveTab] = useState('field')
  const [selectedGuidance, setSelectedGuidance] = useState(null)
  const [notice, setNotice] = useState('')
  const [urlError, setUrlError] = useState('')

  const derived = useMemo(() => state.runtime ? deriveRuntime(state.runtime) : null, [state.runtime])
  const guidance = useMemo(() => state.runtime ? deriveGuidance(state.runtime) : [], [state.runtime])

  function commit(nextState) {
    saveRuntimeState(nextState)
    setState(nextState)
    return nextState
  }

  useEffect(() => {
    const encoded = new URLSearchParams(window.location.search).get('runtime')
    if (!encoded) return
    try {
      const runtime = decodeRuntime(encoded)
      const existing = loadRuntimeState()
      const next = { runtime, basis: existing.basis }
      commit(next)
      setUrlError('')
    } catch (caught) {
      setUrlError(caught.message || 'The shared closure runtime could not be decoded.')
    }
  }, [])

  async function createField(input) {
    const next = await createRuntimeState(input)
    commit(next)
  }

  async function enterField(input) {
    const next = await admitBasis(state, input)
    commit(next)
    window.history.replaceState({}, '', window.location.pathname)
  }

  function updateRuntime(runtime) {
    const next = replaceRuntime(state, runtime)
    commit(next)
    window.history.replaceState({}, '', buildRuntimeUrl(runtime))
    setActiveTab('field')
    setSelectedGuidance(null)
    setNotice('Interaction integrated. A new closure coin was instantiated from the updated runtime.')
  }

  async function shareRuntime() {
    const url = buildRuntimeUrl(state.runtime)
    try {
      if (navigator.share) {
        await navigator.share({ title: state.runtime.field.name, text: state.runtime.field.mission, url })
      } else {
        await navigator.clipboard.writeText(url)
        setNotice('Complete runtime URL copied.')
      }
    } catch (caught) {
      if (caught?.name !== 'AbortError') setNotice('The runtime could not be shared.')
    }
  }

  if (!state.runtime) return <SetupField onCreate={createField} />
  if (!state.basis) return <EnterSharedField runtime={state.runtime} onEnter={enterField} />

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand-button" type="button" onClick={() => setActiveTab('field')}>
          <span className="brand-mark">T</span><span>TagTokn</span>
        </button>
        <nav aria-label="Primary navigation">
          {[['field', 'Closure field'], ['integrate', 'Integrate'], ['coins', `Coins (${derived.coins.length})`], ['network', 'Network'], ['basis', 'Basis']].map(([id, label]) => (
            <button className={activeTab === id ? 'nav-button active' : 'nav-button'} type="button" key={id} onClick={() => setActiveTab(id)}>{label}</button>
          ))}
        </nav>
        <button className="button secondary compact-action" type="button" onClick={shareRuntime}>Share runtime</button>
      </header>

      <main className="page-content">
        {urlError ? <p className="error-message">{urlError}</p> : null}
        {notice ? <p className="notice-message">{notice}</p> : null}

        {activeTab === 'field' ? (
          <>
            <section className="hero">
              <p className="eyebrow">{state.runtime.field.symbol} · unified closure runtime</p>
              <h1>{state.runtime.field.name}</h1>
              <p>{state.runtime.field.mission}</p>
              <div className="closure-sequence"><span>Money</span><span>Platforms</span><span>Messages</span><span>Media</span><span>Events</span><span>Collaboration</span><b>→</b><span>Internal connection</span></div>
            </section>
            <MetricGrid derived={derived} />
            <GuidancePanel guidance={guidance} onIntegrate={(item) => { setSelectedGuidance(item); setActiveTab('integrate') }} />
            <InteractionStream runtime={state.runtime} />
          </>
        ) : null}

        {activeTab === 'integrate' ? <IntegrateInteraction runtime={state.runtime} basis={state.basis} initialGuidance={selectedGuidance} onIntegrated={updateRuntime} /> : null}

        {activeTab === 'coins' ? (
          <>
            <section className="page-heading"><p className="eyebrow">Closure-instantiated coins</p><h1>Coin lineage is network continuation.</h1><p>No participant manually mints these units. Each appears when the closure field integrates a relational change, and later interactions carry earlier coins forward through money, links, media, and internal connections.</p></section>
            <CoinLedger derived={derived} symbol={state.runtime.field.symbol} />
          </>
        ) : null}

        {activeTab === 'network' ? <NetworkGraph runtime={state.runtime} derived={derived} /> : null}
        {activeTab === 'basis' ? <BasisPanel state={state} derived={derived} onShare={shareRuntime} /> : null}
      </main>
    </div>
  )
}
