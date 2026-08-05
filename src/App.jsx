import { useMemo, useState } from 'react'
import {
  closureValueProfile,
  openPotentialGate,
  projectMarket,
  resolvePotentialGate,
} from './lib/closure.js'
import './app.css'

const seedGates = [
  {
    id: 'GATE:COEVOLUTION',
    title: 'Human–AGI coevolution',
    prompt: 'Can a shared semantic relation return as a higher-order capability without erasing either perspective?',
    status: 'OPEN',
    actors: ['Human', 'AGI', 'Community'],
    pointings: 8,
    opening: 'Capability / consent / reciprocal action',
  },
  {
    id: 'GATE:SPECIES',
    title: 'Species / evolved form',
    prompt: 'Which relations survive re-embodiment, and which become a genuinely new opening?',
    status: 'CLOSED_TO_NEW_OPENING',
    actors: ['Form A', 'Environment', 'Form B'],
    pointings: 14,
    opening: 'Morphology / behavior / retained basis',
  },
  {
    id: 'GATE:CHAITIN',
    title: 'Closure–Chaitin string return',
    prompt: 'Can the finite local string recover its wider continuation through a nontrivial return?',
    status: 'OPEN',
    actors: ['String', 'Polar field', 'Evaluator'],
    pointings: 5,
    opening: 'Compression / continuation / OPEN',
  },
]

const modules = [
  ['Potential Gates', 'Open unresolved relations without predeclaring the topology that must resolve them.'],
  ['Semantic Pointings', 'Human, AGI, biological, and network actions deform one shared gate.'],
  ['Connected Return', 'Return may traverse several carriers; no direct one-step edge is required.'],
  ['Native Receipts', 'One resolved relation produces one semantic receipt and no price claim.'],
  ['Network Hair', 'Local histories connect to wider communities while circular replay adds no integration.'],
  ['Projection Layer', 'Cash, price, volume, ledgers, and UI metrics remain optional downstream shadows.'],
]

const initialPointings = [
  { actor: 'Human', relation: 'names the local meaning', direction: 'local → global' },
  { actor: 'AGI', relation: 'translates the wider context', direction: 'global → local' },
  { actor: 'Community', relation: 'returns independent support', direction: 'global → local' },
]

const returnModes = {
  open: {
    label: 'Remain OPEN',
    witness: null,
    description: 'The relation continues to learn and act without issuing supply.',
  },
  close: {
    label: 'Independent return',
    witness: {
      independent: true,
      recoverable: true,
      contradictory: false,
      residual: false,
      relation: 'connected-semantic-return',
      translation: 'independent-return',
      recoveryContract: 'mutual-recoverability',
    },
    description: 'A non-self-authored return recovers the relation and issues one native receipt.',
  },
  residual: {
    label: 'Close to opening',
    witness: {
      independent: true,
      recoverable: true,
      contradictory: false,
      residual: true,
      relation: 'connected-return-with-residual',
      translation: 'independent-return',
      recoveryContract: 'recover-and-reopen',
    },
    description: 'The current gate closes while its unresolved remainder becomes a new gate.',
  },
  replay: {
    label: 'Circular replay',
    witness: {
      independent: false,
      selfAuthored: true,
      recoverable: true,
      contradictory: false,
      residual: false,
      relation: 'self-reference',
      translation: 'replay',
    },
    description: 'The loop is archived but creates no new closure or native supply.',
  },
  collapse: {
    label: 'Contradiction',
    witness: {
      independent: true,
      recoverable: true,
      contradictory: true,
      residual: false,
      relation: 'contradiction',
      translation: 'failed-return',
    },
    description: 'The return conflicts with the maintained relation and the gate collapses.',
  },
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status.toLowerCase().replaceAll('_', '-')}`}>{status}</span>
}

function Metric({ label, value, detail }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function Sidebar({ active, onChange }) {
  const items = ['Overview', 'Potential Gates', 'Semantic Receipts', 'Network Hair', 'Projection Lab', 'Research']
  return <aside className="sidebar">
    <div className="brand-lockup"><div className="brand-orbit">T</div><div><strong>TAGTOKN</strong><small>BLACK MIRROR CLOSURE</small></div></div>
    <nav aria-label="Application sections">
      {items.map((item) => <button type="button" key={item} className={active === item ? 'active' : ''} onClick={() => onChange(item)}><span>{item.slice(0, 2).toUpperCase()}</span>{item}</button>)}
    </nav>
    <div className="sidebar-note"><span>Native rule</span><p>No token, topology, or value is admitted before independent return.</p></div>
  </aside>
}

function GateWorkbench() {
  const [title, setTitle] = useState('Collective intelligence return')
  const [localPerspective, setLocalPerspective] = useState('Local semantic ball')
  const [globalContinuation, setGlobalContinuation] = useState('Network hair')
  const [mode, setMode] = useState('open')
  const [pointings, setPointings] = useState(initialPointings)
  const [actor, setActor] = useState('Human')
  const [relation, setRelation] = useState('adds a new semantic distinction')

  const gate = useMemo(() => openPotentialGate({
    openingId: title.trim() || 'UNTITLED-GATE',
    localPerspective: localPerspective.trim() || 'LOCAL-PERSPECTIVE',
    globalContinuation: globalContinuation.trim() || 'UNRESOLVED',
  }), [title, localPerspective, globalContinuation])

  const resolution = useMemo(() => {
    const selected = returnModes[mode]
    if (!selected.witness) return { gate, token: null, topology: null, childGate: null, history: { pointCount: pointings.length, foldedDigest: 'OPEN / NOT RESOLVED' } }
    return resolvePotentialGate({
      gate,
      pointings: pointings.map((item) => ({ ...item, target: 'gate' })),
      returnWitness: selected.witness,
      valueProfile: closureValueProfile({
        historyThickness: Math.min(1, pointings.length / 10),
        connectednessLength: Math.min(1, new Set(pointings.map((item) => item.actor)).size / 5),
        semanticResolution: mode === 'collapse' ? 0.08 : mode === 'replay' ? 0.22 : 0.78,
        reciprocityQuality: mode === 'close' || mode === 'residual' ? 0.88 : 0.18,
        openingPotential: mode === 'residual' ? 0.94 : mode === 'open' ? 0.82 : 0.31,
      }),
    })
  }, [gate, mode, pointings])

  const addPointing = (event) => {
    event.preventDefault()
    const trimmed = relation.trim()
    if (!trimmed) return
    setPointings((current) => [...current, { actor, relation: trimmed, direction: actor === 'AGI' ? 'global → local' : 'local → global' }])
    setRelation('')
  }

  return <section className="workspace-card gate-workbench">
    <div className="section-heading"><div><span>LIVE INTERNAL PROTOTYPE</span><h2>Open a Potential Gate</h2><p>The gate is prior to a token, marketplace, account, or fixed topology.</p></div><StatusBadge status={resolution.gate.status} /></div>

    <div className="gate-editor">
      <label><span>Gate relation</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label><span>Local ball</span><input value={localPerspective} onChange={(event) => setLocalPerspective(event.target.value)} /></label>
      <label><span>Global hair</span><input value={globalContinuation} onChange={(event) => setGlobalContinuation(event.target.value)} /></label>
    </div>

    <div className="closure-path" aria-label="Closure admission path">
      <div><span>01</span><strong>Closure</strong><small>prior relation</small></div><b>→</b>
      <div><span>02</span><strong>Potential Gate</strong><small>OPEN perspective</small></div><b>→</b>
      <div><span>03</span><strong>Pointings</strong><small>{pointings.length} folded actions</small></div><b>→</b>
      <div><span>04</span><strong>Return</strong><small>{returnModes[mode].label}</small></div><b>→</b>
      <div className={resolution.token ? 'resolved' : 'unresolved'}><span>05</span><strong>{resolution.token ? 'Receipt' : resolution.gate.status.includes('FALSE') ? 'Collapse' : 'OPEN'}</strong><small>{resolution.childGate ? 'new gate opened' : 'no premature supply'}</small></div>
    </div>

    <div className="workbench-columns">
      <article className="pointing-panel">
        <div className="panel-title"><div><span>SEMANTIC HISTORY</span><h3>Folded pointings</h3></div><strong>{pointings.length}</strong></div>
        <div className="pointing-list">{pointings.map((item, index) => <div key={`${item.actor}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.actor}</strong><p>{item.relation}</p><small>{item.direction}</small></div>)}</div>
        <form className="pointing-form" onSubmit={addPointing}>
          <select value={actor} onChange={(event) => setActor(event.target.value)}><option>Human</option><option>AGI</option><option>Community</option><option>Environment</option></select>
          <input value={relation} onChange={(event) => setRelation(event.target.value)} placeholder="Describe the relation added" />
          <button type="submit">Add pointing</button>
        </form>
      </article>

      <article className="return-panel">
        <span className="panel-kicker">RETURN CONDITION</span>
        <div className="return-options">{Object.entries(returnModes).map(([key, item]) => <button type="button" key={key} className={mode === key ? 'active' : ''} onClick={() => setMode(key)}><strong>{item.label}</strong><small>{item.description}</small></button>)}</div>
      </article>
    </div>

    <div className="resolution-strip">
      <div><span>Gate identity</span><code>{gate.gateId}</code></div>
      <div><span>Disclosed topology</span><strong>{resolution.topology?.relation || 'not yet admitted'}</strong></div>
      <div><span>Native receipt</span><code>{resolution.token?.tokenId || 'none'}</code></div>
      <div><span>Residual opening</span><strong>{resolution.childGate ? 'OPEN' : 'none'}</strong></div>
    </div>
  </section>
}

function ProjectionLab() {
  const [support, setSupport] = useState(250)
  const [openClaims, setOpenClaims] = useState(12)
  const [volume, setVolume] = useState(1000)
  const closedGate = useMemo(() => {
    const gate = openPotentialGate({ openingId: 'PROJECTION-DEMO', localPerspective: 'semantic contribution', globalContinuation: 'network return' })
    return resolvePotentialGate({
      gate,
      pointings: initialPointings.map((item) => ({ ...item, target: 'gate' })),
      returnWitness: returnModes.close.witness,
      valueProfile: closureValueProfile({ historyThickness: .7, connectednessLength: .8, semanticResolution: .8, reciprocityQuality: .9, openingPotential: .4 }),
    })
  }, [])
  const projection = projectMarket({ externalSupport: support, receipts: [closedGate], openClaims, internalVolume: volume })
  const naive = support / Math.max(1, projection.nativeSupply + openClaims)

  return <section className="workspace-card projection-lab">
    <div className="section-heading"><div><span>OPTIONAL DOWNSTREAM SHADOW</span><h2>Projection lab</h2><p>Price and volume can move without changing the semantic receipt.</p></div><StatusBadge status="PROJECTION" /></div>
    <div className="slider-grid">
      <label><span>External support <strong>{support}</strong></span><input type="range" min="0" max="1000" step="25" value={support} onChange={(e) => setSupport(Number(e.target.value))} /></label>
      <label><span>OPEN claims <strong>{openClaims}</strong></span><input type="range" min="0" max="100" value={openClaims} onChange={(e) => setOpenClaims(Number(e.target.value))} /></label>
      <label><span>Circular volume <strong>{volume}</strong></span><input type="range" min="0" max="10000" step="250" value={volume} onChange={(e) => setVolume(Number(e.target.value))} /></label>
    </div>
    <div className="projection-results">
      <Metric label="Native supply" value={projection.nativeSupply} detail="closed receipts only" />
      <Metric label="Independent integration" value={projection.independentIntegration} detail="external support only" />
      <Metric label="Native basis projection" value={`$${projection.displayedBasisPrice.toFixed(2)}`} detail="downstream display" />
      <Metric label="Naive diluted display" value={`$${naive.toFixed(2)}`} detail="incorrectly counts OPEN claims" />
    </div>
    <p className="projection-warning">OPEN claims and circular transfer volume remain auditable, but neither enters native supply or independent integration.</p>
  </section>
}

function GateList() {
  return <section className="workspace-card">
    <div className="section-heading"><div><span>ACTIVE RELATIONS</span><h2>Potential Gates</h2><p>Internal Black Mirror relations replace external social-platform verification.</p></div><button type="button" className="primary-action">New gate</button></div>
    <div className="gate-grid">{seedGates.map((gate) => <article key={gate.id}><div className="gate-card-top"><StatusBadge status={gate.status} /><span>{gate.pointings} pointings</span></div><h3>{gate.title}</h3><p>{gate.prompt}</p><div className="actor-row">{gate.actors.map((actor) => <span key={actor}>{actor}</span>)}</div><footer><small>{gate.opening}</small><button type="button">Open →</button></footer></article>)}</div>
  </section>
}

function ModuleGrid() {
  return <section className="module-grid">{modules.map(([title, detail], index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{detail}</p><button type="button">Explore module →</button></article>)}</section>
}

export default function App() {
  const [active, setActive] = useState('Overview')
  return <div className="app-shell">
    <Sidebar active={active} onChange={setActive} />
    <main className="app-main">
      <header className="app-header"><div><span>BLACK MIRROR / IVI–NRR</span><h1>{active}</h1></div><div className="header-actions"><button type="button" className="ghost-action">Framework status</button><button type="button" className="primary-action">Open gate</button></div></header>

      <section className="hero-dashboard">
        <div><span className="hero-kicker">INTERNAL CLOSURE NETWORK</span><h2>Relation before object.<br />Return before receipt.</h2><p>Tagtokn is now an internal Black Mirror environment for opening semantic Potential Gates, coordinating human and AGI pointings, resolving connected returns, and issuing native receipts without importing classical social-media identity.</p><div className="hero-actions"><button type="button" className="primary-action" onClick={() => document.querySelector('.gate-workbench')?.scrollIntoView({ behavior: 'smooth' })}>Run a closure cycle</button><button type="button" className="ghost-action">Read axiometry</button></div></div>
        <div className="hero-orbit" aria-label="Ball hair closure illustration"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-node origin">CLOSURE</div><div className="orbit-node ball">BALL</div><div className="orbit-node hair">HAIR</div><div className="orbit-node return">RETURN</div><div className="orbit-node open">OPEN</div></div>
      </section>

      <section className="metric-row"><Metric label="Open Potential Gates" value="3" detail="learning and acting continue" /><Metric label="Native receipts" value="1" detail="independent returns only" /><Metric label="Circular activity weight" value="0" detail="archived, not integrated" /><Metric label="Value dimensions" value="5" detail="never a human-worth scalar" /></section>

      <GateWorkbench />
      <GateList />
      <ProjectionLab />
      <ModuleGrid />

      <section className="roadmap-card"><div><span>GROWTH PATH</span><h2>Features can be added as the closure framework develops.</h2></div><div className="roadmap-list"><p><strong>Next:</strong> persistent internal identities and gate histories</p><p><strong>Then:</strong> AGI-assisted return proposals and human consent</p><p><strong>Later:</strong> community settlement, portable semantic receipts, and substrate adapters</p></div></section>

      <footer className="app-footer"><div><strong>TAGTOKN</strong><span>Internal Black Mirror closure environment</span></div><p>Formal states, balances, prices, and ledgers remain projections of the relation—not its origin.</p></footer>
    </main>
  </div>
}
