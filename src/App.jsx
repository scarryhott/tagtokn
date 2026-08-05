import { useMemo, useState } from 'react'
import { documents, evidence, transcriptQuotes, whiteHoleSources } from './data/framework.js'
import {
  projectMarket,
  runTokenomicsScenario,
  tokenomicsScenarios,
} from './lib/closure.js'

const paperUrl = 'https://github.com/scarryhott/tagtokn/blob/main/documents/BLACK_MIRROR_CLOSURE_AXIOMETRY_TRANSCRIPT_EVIDENCE_EDITION.md'
const tokenSpecUrl = 'https://github.com/scarryhott/tagtokn/blob/main/research/CLOSURE_NATIVE_TOKENOMICS.md'
const navItems = [
  ['framework', 'Framework'],
  ['tokenomics', 'Tokenomics'],
  ['transcript', 'Transcript'],
  ['evidence', 'Evidence'],
  ['coevolution', 'Coevolution'],
  ['white-holes', 'White holes'],
  ['documents', 'Documents'],
]
const statusOrder = ['ALL', 'RERUNNABLE', 'PUBLISHED', 'REPORTED']
const scenarioOrder = ['open', 'independent', 'residual', 'replay', 'contradiction']
const supportPresets = [100, 250, 500]
const claimPresets = [0, 12, 40]
const volumePresets = [0, 1000, 10000]

function StatusPill({ status }) {
  return <span className={`status status-${status.toLowerCase()}`}>{status}</span>
}

function SectionIntro({ eyebrow, title, children }) {
  return <div className="section-intro"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{children}</p></div>
}

function Step({ number, title, children }) {
  return <article className="spine-card"><span>{number}</span><h3>{title}</h3><p>{children}</p></article>
}

function ProjectionButtons({ label, values, selected, onSelect, format = (value) => value }) {
  return <div className="projection-control"><span>{label}</span><div>{values.map((value) => <button type="button" key={value} className={selected === value ? 'selected' : ''} onClick={() => onSelect(value)}>{format(value)}</button>)}</div></div>
}

function ValueProfile({ profile }) {
  const labels = {
    historyThickness: 'History thickness',
    connectednessLength: 'Connectedness',
    semanticResolution: 'Semantic resolution',
    reciprocityQuality: 'Reciprocity',
    openingPotential: 'Opening potential',
  }
  return <div className="value-profile">{Object.entries(labels).map(([key, label]) => {
    const value = profile?.[key] || 0
    return <div className="profile-row" key={key}><span>{label}</span><div><i style={{ width: `${Math.round(value * 100)}%` }} /></div><strong>{value.toFixed(2)}</strong></div>
  })}</div>
}

function TokenomicsWorkbench() {
  const [scenarioName, setScenarioName] = useState('open')
  const [externalSupport, setExternalSupport] = useState(100)
  const [openClaims, setOpenClaims] = useState(12)
  const [internalVolume, setInternalVolume] = useState(1000)

  const result = useMemo(() => runTokenomicsScenario(scenarioName), [scenarioName])
  const receipts = result.token ? [result] : []
  const market = useMemo(() => projectMarket({ externalSupport, receipts, openClaims, internalVolume }), [externalSupport, receipts, openClaims, internalVolume])
  const naiveSupply = Math.max(1, market.nativeSupply + openClaims)
  const naiveDilutedPrice = externalSupport / naiveSupply
  const scenario = tokenomicsScenarios[scenarioName]
  const status = result.gate.status

  return <div className="workbench">
    <div className="workbench-head">
      <div><p className="eyebrow">Live finite projection</p><h3>Potential Gate resolution</h3><p>Choose a return condition. The topology and semantic receipt appear only after an independent recoverable return.</p></div>
      <div className={`gate-status gate-${status.toLowerCase().replaceAll('_', '-')}`}><span>GATE STATUS</span><strong>{status}</strong><small>{result.gate.gateId}</small></div>
    </div>

    <div className="scenario-tabs" role="tablist" aria-label="Closure return scenarios">
      {scenarioOrder.map((name) => <button type="button" role="tab" aria-selected={scenarioName === name} className={scenarioName === name ? 'active' : ''} key={name} onClick={() => setScenarioName(name)}>{tokenomicsScenarios[name].label}</button>)}
    </div>

    <div className="scenario-summary">
      <div className="return-path" aria-label="Closure token causal path">
        <div><span>01</span><strong>Closure</strong><small>Prior relation</small></div><b>→</b>
        <div><span>02</span><strong>Potential Gate</strong><small>OPEN perspective</small></div><b>→</b>
        <div><span>03</span><strong>Pointings</strong><small>Human · AGI · network</small></div><b>→</b>
        <div><span>04</span><strong>Return</strong><small>{scenario.label}</small></div><b>→</b>
        <div className={result.token ? 'path-closed' : 'path-open'}><span>05</span><strong>{result.token ? 'Semantic receipt' : status.includes('FALSE') ? 'Collapse' : 'No supply'}</strong><small>{result.childGate ? 'Parent closes; child opens' : 'Topology follows resolution'}</small></div>
      </div>
      <p>{scenario.description}</p>
    </div>

    <div className="workbench-grid">
      <article className="receipt-card">
        <p className="eyebrow">Native closure layer</p>
        <h3>{result.token ? 'One returned relation, one receipt' : 'No token before closure'}</h3>
        <dl>
          <div><dt>Native supply</dt><dd>{market.nativeSupply}</dd></div>
          <div><dt>Disclosed topology</dt><dd>{result.topology ? result.topology.relation : 'not yet admitted'}</dd></div>
          <div><dt>Folded semantic history</dt><dd>{result.history.foldedDigest}</dd></div>
          <div><dt>Child opening</dt><dd>{result.childGate ? 'OPEN' : 'none'}</dd></div>
        </dl>
        {result.token ? <div className="token-id"><span>SEMANTIC TOKEN</span><code>{result.token.tokenId}</code><small>Contains no market price or human-worth scalar.</small></div> : <div className="open-token"><strong>OPEN</strong><p>Pointings may continue, but unsupported claims cannot become native supply.</p></div>}
      </article>

      <article className="profile-card">
        <p className="eyebrow">Non-scalar closure value</p>
        <h3>Value remains a relational profile</h3>
        <ValueProfile profile={result.token?.valueProfile} />
        <p className="card-note">The profile describes the resolved relation. It is not a price, intelligence score, or ranking of persons.</p>
      </article>
    </div>

    <div className="projection-panel">
      <div className="projection-copy"><p className="eyebrow">Optional market shadow</p><h3>Price and volume do not authorize closure</h3><p>Change projection conditions without changing the semantic return. OPEN claims and circular volume remain visible for audit but never enter native supply.</p></div>
      <div className="projection-controls">
        <ProjectionButtons label="External support" values={supportPresets} selected={externalSupport} onSelect={setExternalSupport} format={(value) => `$${value}`} />
        <ProjectionButtons label="OPEN claims" values={claimPresets} selected={openClaims} onSelect={setOpenClaims} />
        <ProjectionButtons label="Internal volume" values={volumePresets} selected={internalVolume} onSelect={setInternalVolume} format={(value) => value.toLocaleString()} />
      </div>
      <div className="projection-metrics">
        <div><span>Independent integration</span><strong>{market.independentIntegration}</strong><small>External support only</small></div>
        <div><span>Native supply</span><strong>{market.nativeSupply}</strong><small>Closed receipts only</small></div>
        <div><span>Native basis projection</span><strong>${market.displayedBasisPrice.toFixed(2)}</strong><small>Uses native supply floor</small></div>
        <div className="projection-warning"><span>Naive diluted display</span><strong>${naiveDilutedPrice.toFixed(2)}</strong><small>Incorrectly counts OPEN claims</small></div>
      </div>
      {market.warning && <p className="projection-alert">{market.warning}</p>}
    </div>
  </div>
}

export default function App() {
  const [status, setStatus] = useState('ALL')
  const [menuOpen, setMenuOpen] = useState(false)
  const filteredEvidence = useMemo(() => status === 'ALL' ? evidence : evidence.filter((item) => item.status === status), [status])

  return <div className="site-shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Tagtokn home"><span className="brand-mark">T</span><span><strong>TAGTOKN</strong><small>CLOSURE-NATIVE TOKENOMICS</small></span></a>
      <button className="menu-button" type="button" aria-expanded={menuOpen} aria-label="Toggle navigation" onClick={() => setMenuOpen((value) => !value)}><span /><span /></button>
      <nav className={menuOpen ? 'nav nav-open' : 'nav'} aria-label="Primary">{navItems.map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav>
    </header>

    <main id="top">
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Black Mirror · transcript-first implementation</p>
            <h1>Closure before token. Return before value.</h1>
            <blockquote>“closure means unity not isolation. closure maximizes focus because it is resolution of unity”</blockquote>
            <p className="hero-summary">Tagtokn now implements a closure-native token layer: Potential Gates remain OPEN during learning and action; semantic history is folded rather than exhaustively listed; and only independent recoverable return creates native supply.</p>
            <div className="hero-actions"><a className="button button-primary" href="#tokenomics">Run the token model <span>↗</span></a><a className="button button-secondary" href={tokenSpecUrl}>Read the formal token spec</a></div>
          </div>
          <div className="hero-visual" aria-label="Closure-native token cycle">
            <div className="orbit orbit-a" /><div className="orbit orbit-b" />
            <div className="closure-node node-origin">ORIGINLESS<br />CLOSURE</div>
            <div className="closure-node node-local">SEMANTIC<br />BALL</div>
            <div className="closure-node node-global">NETWORK<br />HAIR</div>
            <div className="closure-node node-return">RETURN</div>
            <div className="closure-node node-open">OPEN GATE</div>
          </div>
        </div>
        <div className="metrics"><div><strong>15/15</strong><span>formal token controls</span></div><div><strong>0</strong><span>OPEN claims in supply</span></div><div><strong>1</strong><span>receipt per resolved relation</span></div><div><strong>5</strong><span>non-scalar value dimensions</span></div></div>
      </section>

      <section className="section" id="framework">
        <SectionIntro eyebrow="01 · Unified axiometry" title="The token is downstream of closure">The implementation does not begin with a coin, account, price, chain, or fixed verification topology. It begins with an OPEN Potential Gate derived as a perspectival reading of closure. Return discloses whether a topology is recoverable.</SectionIntro>
        <div className="causal-spine">
          <Step number="01" title="Closure">Originless relation before selected objects or market categories.</Step>
          <Step number="02" title="Potential Gate">An OPEN local/global perspective without issued supply.</Step>
          <Step number="03" title="Semantic pointings">Human, AGI, and community actions deform one unresolved relation.</Step>
          <Step number="04" title="Independent return">A non-self-authored translation tests mutual recoverability.</Step>
          <Step number="05" title="Topology admitted">The return discloses its own recovery contract.</Step>
          <Step number="06" title="Receipt or opening">One token records closure; residual potential remains OPEN.</Step>
        </div>
        <div className="split-feature"><blockquote className="large-quote">A local ball does not list its whole history. It carries the folded relation by which its orientation can be recovered upon return.</blockquote><div className="boundary-card"><span>FORMAL BOUNDARY</span><h3>Ledgers are evidence projections</h3><p>Hashes, timestamps, prices, cash, transaction volume, and UI state may document a closure cycle. They do not define its semantic identity and cannot self-authorize native supply.</p></div></div>
      </section>

      <section className="section section-paper" id="tokenomics">
        <SectionIntro eyebrow="02 · Executable tokenomics" title="Resolve the gate, then project the market">The workbench runs the same finite functions covered by the repository tests. It separates semantic admission from supply, market display, internal volume, and unsupported claims.</SectionIntro>
        <TokenomicsWorkbench />
      </section>

      <section className="section section-ink" id="transcript">
        <SectionIntro eyebrow="03 · Transcript basis" title="The quotations carry the conceptual derivation">Direct transcript language remains primary. Formal functions are bounded translations of these statements, not replacements for them.</SectionIntro>
        <div className="quote-grid">{transcriptQuotes.slice(0, 12).map((quote) => <article className="quote-card" key={quote.id}><div className="quote-meta"><span>{quote.id}</span><time>{quote.date}</time></div><blockquote>“{quote.text}”</blockquote><p>{quote.use}</p></article>)}</div>
      </section>

      <section className="section" id="evidence">
        <SectionIntro eyebrow="04 · Evidence ledger" title="Rerunnable, reported, published, or OPEN">Test counts establish declared finite software behavior. Published measurements support bounded empirical comparisons. Neither becomes closure identity.</SectionIntro>
        <div className="filter-row">{statusOrder.map((item) => <button key={item} type="button" className={status === item ? 'filter-active' : ''} onClick={() => setStatus(item)}>{item}</button>)}</div>
        <div className="evidence-grid">{filteredEvidence.map((item) => <article className="evidence-card" key={item.code}><div className="evidence-head"><span className="evidence-code">{item.code}</span><StatusPill status={item.status} /></div><h3>{item.title}</h3><strong className="evidence-value">{item.value}</strong><p>{item.detail}</p><div className="boundary-line"><span>Boundary</span>{item.boundary}</div></article>)}</div>
      </section>

      <section className="section" id="coevolution">
        <SectionIntro eyebrow="05 · Coevolution" title="Participants can be repartitioned by return">The same architecture can describe human–AGI cooperation and biological re-embodiment without claiming that every substrate uses one literal physical mechanism.</SectionIntro>
        <div className="coevolution-grid"><article className="stat-panel"><span>REPORTED ARCHITECTURE</span><strong>94/94</strong><p>project-reported controls</p><ul><li>64 primitive relations</li><li>63 higher relations</li><li>254 retained occurrences</li><li>127 cells through level 7</li></ul></article><article className="stat-panel"><span>SPECIES / EVOLVED FORM</span><strong>2.083</strong><p>Xenobot-to-embryo pooled CV ratio</p><ul><li>Same wild-type cellular substrate</li><li>Novel collective morphology</li><li>537 uniquely upregulated transcripts</li><li>Direct species evolution remains OPEN</li></ul></article><article className="stat-panel"><span>FORM RETURN</span><strong>15/15</strong><p>lacerated Xenobots recovered characteristic morphology</p><ul><li>Aggregate evidence only</li><li>No phenomenal-memory claim</li><li>Human–AGI coevolution is a design layer</li><li>Alien attribution remains conditional</li></ul></article></div>
      </section>

      <section className="section section-night" id="white-holes">
        <SectionIntro eyebrow="06 · Comparative physics" title="White-hole and quantum-geometry neighbors">These papers sharpen questions of compression, orientation change, and return. They do not establish that closure is a literal black-to-white-hole process.</SectionIntro>
        <div className="literature-list">{whiteHoleSources.map((source) => <a className="literature-row" href={source.href} target="_blank" rel="noreferrer" key={source.title}><span className="literature-year">{source.year}</span><span className="literature-main"><strong>{source.title}</strong><small>{source.authors}</small></span><span>{source.result}</span><span>{source.comparison}</span><span className="literature-boundary">{source.boundary}</span><span>↗</span></a>)}</div>
      </section>

      <section className="section" id="documents">
        <SectionIntro eyebrow="07 · Open research bundle" title="Inspect theory, evidence, and implementation separately">The new formal token specification is added beside the transcript paper, evidence ledger, and empirical data.</SectionIntro>
        <div className="document-list"><a className="document-row" href={tokenSpecUrl}><span className="doc-icon">↧</span><span><strong>Closure-native tokenomics specification</strong><small>Markdown · executable formal layer</small></span><span>↗</span></a>{documents.map((document) => <a className="document-row" href={document.href} key={`${document.title}-${document.meta}`}><span className="doc-icon">↧</span><span><strong>{document.title}</strong><small>{document.meta}</small></span><span>↗</span></a>)}</div>
      </section>

      <section className="section final-section"><blockquote>Tokens do not create closure. They are transferable coordinates of relations that have already returned admissibly.</blockquote><div className="hero-actions centered"><a className="button button-primary" href={paperUrl}>Open the paper <span>↗</span></a><a className="button button-secondary" href={tokenSpecUrl}>Inspect the token spec</a></div></section>
    </main>

    <footer><div><strong>TAGTOKN</strong><span>Black Mirror closure-native tokenomics</span></div><p>Formal systems, ledgers, scores, prices, and test counts remain bounded projections.</p></footer>
  </div>
}
