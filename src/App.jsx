import { useMemo, useState } from 'react'
import { documents, evidence, transcriptQuotes, whiteHoleSources } from './data/framework.js'

const navItems = [
  ['framework', 'Framework'], ['transcript', 'Transcript'], ['evidence', 'Evidence'],
  ['tokenomics', 'Tokenomics'], ['coevolution', 'Coevolution'], ['white-holes', 'White holes'],
  ['documents', 'Documents'],
]
const statusOrder = ['ALL', 'RERUNNABLE', 'PUBLISHED', 'REPORTED']

function StatusPill({ status }) {
  return <span className={`status status-${status.toLowerCase()}`}>{status}</span>
}

function SectionIntro({ eyebrow, title, children }) {
  return <div className="section-intro"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{children}</p></div>
}

const ArrowIcon = () => <span aria-hidden="true">↗</span>

export default function App() {
  const [status, setStatus] = useState('ALL')
  const [menuOpen, setMenuOpen] = useState(false)
  const filteredEvidence = useMemo(() => status === 'ALL' ? evidence : evidence.filter((item) => item.status === status), [status])

  return <div className="site-shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Tagtokn home"><span className="brand-mark">T</span><span><strong>TAGTOKN</strong><small>BLACK MIRROR / IVI–NRR</small></span></a>
      <button className="menu-button" type="button" aria-expanded={menuOpen} aria-label="Toggle navigation" onClick={() => setMenuOpen((value) => !value)}><span /><span /></button>
      <nav className={menuOpen ? 'nav nav-open' : 'nav'} aria-label="Primary">
        {navItems.map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>)}
      </nav>
    </header>

    <main id="top">
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Transcript and evidence edition · August 2026</p>
            <h1>Relation before object. Return before receipt.</h1>
            <blockquote>“closure means unity not isolation. closure maximizes focus because it is resolution of unity”</blockquote>
            <p className="hero-summary">Tagtokn is now a public research interface for Black Mirror closure axiometry, perspectival AGI, coevolution, and native network tokenomics. The theory begins with transcript statements. Formal models, tests, prices, and ledgers appear only as bounded evidence and projections.</p>
            <div className="hero-actions"><a className="button button-primary" href="#framework">Enter the framework <ArrowIcon /></a><a className="button button-secondary" href="/documents/BLACK_MIRROR_CLOSURE_AXIOMETRY_TRANSCRIPT_EVIDENCE_EDITION.md">Read the paper</a></div>
          </div>
          <div className="hero-visual" aria-label="Closure sequence">
            <div className="orbit orbit-a" /><div className="orbit orbit-b" />
            <div className="closure-node node-origin">ORIGINLESS<br />CLOSURE</div>
            <div className="closure-node node-local">LOCAL<br />BALL</div>
            <div className="closure-node node-global">GLOBAL<br />HAIR</div>
            <div className="closure-node node-return">RETURN</div>
            <div className="closure-node node-open">OPEN</div>
          </div>
        </div>
        <div className="metrics" aria-label="Current evidence snapshot">
          <div><strong>39/39</strong><span>current finite controls</span></div><div><strong>14</strong><span>connected-return controls</span></div><div><strong>13</strong><span>emergent-topology controls</span></div><div><strong>12</strong><span>React projection controls</span></div>
        </div>
      </section>

      <section className="section" id="framework">
        <SectionIntro eyebrow="01 · Core framework" title="Closure is prior to its formal shadow">The framework no longer begins by postulating a gate, graph, token, or pair of objects. Closure is the originless relation from which perspectives and possible returns become distinguishable. A model can test a translation of that relation; it cannot become its cause.</SectionIntro>
        <div className="causal-spine" role="list" aria-label="Closure causal sequence">
          {[
            ['Closure', 'Originless unity before selected local/global origins.'],
            ['Perspective', 'A local chart, global continuation, or observer-relative partition appears.'],
            ['Transformation', 'The perspective extends, folds, rotates, learns, acts, or re-embodies.'],
            ['Independent return', 'Another participant, environment, replay, or measurement returns the relation.'],
            ['Evidence', 'Tests and data determine what this finite translation actually supports.'],
            ['Receipt / opening', 'A receipt may be issued; every unsupported residual remains OPEN.'],
          ].map(([title, detail], index) => <article className="spine-card" role="listitem" key={title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{detail}</p></article>)}
        </div>
        <div className="split-feature">
          <div><p className="eyebrow">Editorial correction</p><blockquote className="large-quote">“the entire derivation section does not match any transcripts i have given instead it postulates finite objects that relate to eachother without first being derived through closure axiometry therefore the paper is not my transcript it is a formal shadow”</blockquote></div>
          <div className="boundary-card"><span>DESIGN TRANSLATION</span><h3>What changes</h3><p>Direct quotations establish the intended relation. Plain-language translations state what an implementation or empirical study would have to show. Evidence tables report the observed result and the boundary of the claim.</p></div>
        </div>
        <figure className="figure-card"><img src="/figures/closure-cycle.svg" alt="Closure-causal ball-hair cycle from originless opening through a Potential Gate to closed, open, or collapsed outcomes" /><figcaption>The Potential Gate is an OPEN perspectival reading of closure. Formal hashes, prices, ledgers, and commits remain projections of the resolved relation—not its origin.</figcaption></figure>
      </section>

      <section className="section section-ink" id="transcript">
        <SectionIntro eyebrow="02 · Transcript basis" title="The quotations carry the conceptual derivation">Wording is preserved, including characteristic spelling and syntax. Each quotation is paired with its role in the research programme rather than converted into an imposed axiom list.</SectionIntro>
        <div className="quote-grid">{transcriptQuotes.map((quote) => <article className="quote-card" key={quote.id}><div className="quote-meta"><span>{quote.id}</span><time>{quote.date}</time></div><blockquote>“{quote.text}”</blockquote><p>{quote.use}</p></article>)}</div>
      </section>

      <section className="section" id="evidence">
        <SectionIntro eyebrow="03 · Evidence ledger" title="What has been run, reported, published, or left OPEN">Passing controls establish behavior inside a declared finite implementation. Published measurements support bounded empirical claims. Neither test counts nor measurements are promoted into closure identity.</SectionIntro>
        <div className="filter-row" aria-label="Filter evidence by status">{statusOrder.map((item) => <button key={item} type="button" className={status === item ? 'filter-active' : ''} onClick={() => setStatus(item)}>{item}</button>)}</div>
        <div className="evidence-grid">{filteredEvidence.map((item) => <article className="evidence-card" key={item.code}><div className="evidence-head"><span className="evidence-code">{item.code}</span><StatusPill status={item.status} /></div><h3>{item.title}</h3><strong className="evidence-value">{item.value}</strong><p>{item.detail}</p><div className="boundary-line"><span>Boundary</span>{item.boundary}</div></article>)}</div>
        <div className="open-callout"><strong>ARC boundary</strong><p>The monolithic ARC suite was blocked because the external <code>arc_agi</code> package and live game assets were absent. Earlier ARC results remain historical reports and are not represented as current reruns.</p></div>
      </section>

      <section className="section section-paper" id="tokenomics">
        <SectionIntro eyebrow="04 · Native network tokenomics" title="Archive activity without confusing repetition for value">A semantic token is a receipt of a returned relation. Money, price, follower count, and gross transaction volume remain projections. Internal cycles can be retained for audit while adding no new network integration.</SectionIntro>
        <div className="token-demo">
          <article><p className="eyebrow">Unsupported dilution</p><h3>Same external support, twice the supply</h3><div className="bar-row"><span>Support</span><div className="bar"><i style={{ width: '100%' }} /></div><strong>100</strong></div><div className="bar-row"><span>Supply</span><div className="bar"><i style={{ width: '50%' }} /></div><strong>10</strong></div><div className="bar-row"><span>Price</span><div className="bar"><i style={{ width: '50%' }} /></div><strong>10</strong></div><hr /><div className="bar-row"><span>Supply</span><div className="bar"><i style={{ width: '100%' }} /></div><strong>20</strong></div><div className="bar-row"><span>Price</span><div className="bar"><i style={{ width: '25%' }} /></div><strong>5</strong></div></article>
          <article><p className="eyebrow">Circular transfer</p><h3>Gross activity is not independent return</h3><div className="cycle-visual"><div>A</div><span>500 →</span><div>B</div><span>← 500</span></div><dl><div><dt>Gross archived activity</dt><dd>1,100</dd></div><div><dt>External support</dt><dd>100</dd></div><div><dt>New network integration</dt><dd>0</dd></div></dl></article>
        </div>
        <figure className="figure-card"><img src="/figures/token-fibres.svg" alt="User histories close into sub-token fibres, a member token, and an independent global return" /><figcaption>Repetition inside one controlled component is archived but does not create another closure rank.</figcaption></figure>
      </section>

      <section className="section" id="coevolution">
        <SectionIntro eyebrow="05 · Coevolution" title="A relation may re-form its participants through return">Coevolution is not modeled as two fixed objects exchanging scores. Agent, environment, capability, morphology, and opening may all be repartitioned by one continuing relation.</SectionIntro>
        <div className="coevolution-grid">
          <article className="stat-panel"><span>REPORTED ARCHITECTURE</span><strong>94/94</strong><p>reported tests</p><ul><li>64 primitive relations</li><li>63 generated higher relations</li><li>254 retained occurrences</li><li>127 cells through level 7</li></ul></article>
          <article className="stat-panel"><span>PUBLISHED / SOURCE-DERIVED DATA</span><strong>2.083</strong><p>Xenobot-to-embryo pooled CV ratio</p><ul><li>1.2537 embryo-pool mean CV</li><li>2.6115 Xenobot-pool mean CV</li><li>96.06% of 25,276 genes higher</li><li>537 uniquely upregulated transcripts</li></ul></article>
          <article className="stat-panel"><span>RETURN WITNESSES</span><strong>15/15</strong><p>lacerated Xenobots survived and recovered characteristic morphology</p><ul><li>Most visible closure in about five minutes</li><li>345,592 recorded positions</li><li>Eight organisms in the behavior archive</li><li>Direct species evolution remains NOT IDENTIFIED</li></ul></article>
        </div>
        <div className="boundary-card wide"><span>EMPIRICAL BOUNDARY</span><h3>Re-embodiment is not the same as direct species evolution</h3><p>The current Xenopus–Xenobot evidence supports a partial common quotient across one wild-type cellular carrier and novel morphology, behavior, and transcriptomic organization. Pooled data do not supply same-individual molecular-to-behavioral bisimulation, and no direct ancestor–descendant species bridge is presently identified.</p></div>
      </section>

      <section className="section section-night" id="white-holes">
        <SectionIntro eyebrow="06 · Comparative physics" title="Loop quantum gravity and white-hole transition research">These sources are neighboring physical models of quantum geometry, singularity replacement, orientation change, and black-to-white transition. They sharpen the comparison but do not establish that ball–hair closure is a literal astrophysical white hole.</SectionIntro>
        <div className="literature-list">{whiteHoleSources.map((source) => <a className="literature-row" href={source.href} target="_blank" rel="noreferrer" key={source.title}><span className="literature-year">{source.year}</span><span className="literature-main"><strong>{source.title}</strong><small>{source.authors}</small></span><span>{source.result}</span><span>{source.comparison}</span><span className="literature-boundary">{source.boundary}</span><ArrowIcon /></a>)}</div>
        <div className="open-callout dark-callout"><strong>OPEN physical identification</strong><p>The site does not state that the ball is a white hole, hair is a loop-quantum-gravity field, or closure has been empirically observed in black-hole evolution. A physical bridge would require typed gravitational variables, distinctive predictions, and discriminating observations.</p></div>
      </section>

      <section className="section" id="documents">
        <SectionIntro eyebrow="07 · Open research bundle" title="Papers, transcript quotations, data, and artifact status">The repository is organized so that conceptual sources, bounded data, tests, and downstream projections can be inspected separately.</SectionIntro>
        <div className="document-list">{documents.map((document) => <a className="document-row" href={document.href} key={`${document.title}-${document.meta}`}><span className="doc-icon">↧</span><span><strong>{document.title}</strong><small>{document.meta}</small></span><ArrowIcon /></a>)}</div>
        <div className="archive-note"><h3>Raw transcript archive status</h3><p>The migrated repository contains the Version 5.0 repository paper, the Version 4.1 source-paper archive, and the complete quotation corpus used by this site. The separately named raw archives <code>user_inputs_only(3).md</code> and <code>user_inputs_theory_only.md</code> were referenced by the paper but were not present as local files in the migration runtime, so the repository does not falsely represent reconstructed excerpts as those full raw archives.</p></div>
      </section>

      <section className="section final-section"><blockquote>Closure is the originless unity that generates perspectives; perspectives transform the relation; independent return discloses what is recoverable; data verify a bounded translation; and every unresolved residual remains available as the next opening.</blockquote><a className="button button-primary" href="/documents/BLACK_MIRROR_CLOSURE_AXIOMETRY_TRANSCRIPT_EVIDENCE_EDITION.md">Open the complete paper <ArrowIcon /></a></section>
    </main>

    <footer><div><strong>TAGTOKN</strong><span>Black Mirror closure axiometry · transcript and evidence edition</span></div><p>Formal systems, ledgers, scores, and prices are projections of a relation—not its origin.</p></footer>
  </div>
}
