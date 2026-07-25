import { useEffect, useMemo, useState } from 'react'
import {
  INTERACTION_TYPES,
  allowedActions,
  appendWrapEvent,
  buildWrapUrl,
  createSocialWrap,
  decodeWrap,
  deriveEconomy,
  deriveNetwork,
  reduceWrap,
} from './domain/closureEconomy.js'
import {
  canSpend,
  createProfileState,
  joinCommunity,
  loadEconomyState,
  reconcileClosures,
  removeWrap,
  saveEconomyState,
  upsertCommunity,
  upsertWrap,
  walletBalance,
} from './storage/economyStore.js'

const EMPTY_WRAP = {
  communityId: '',
  representedLabel: '',
  referenceUrl: '',
  interactionType: 'service',
  appreciation: '',
  guidance: '',
  suggestedAmount: '10',
}

function actorLabel(actor) {
  return actor?.name || actor?.handle || 'Unclaimed network node'
}

function formatCoin(value, symbol = 'TTK') {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(Number(value || 0))} ${symbol}`
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

function relationLabel(typeId) {
  return INTERACTION_TYPES.find((type) => type.id === typeId)?.label || typeId
}

function ProfileSetup({ onCreate }) {
  const [form, setForm] = useState({ name: '', handle: '', referenceUrl: '' })
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    try { onCreate(form) } catch (caught) { setError(caught.message || String(caught)) }
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-copy">
        <p className="eyebrow">TagTokn socioeconomic closure network</p>
        <h1>Wrap appreciation into communal economic guidance.</h1>
        <p>Social references locate context. Value is created by the network path: appreciation, communal representation, NFT custody, coin exchange, and a direct interaction that closes the loop.</p>
        <div className="closure-sequence"><span>Appreciate</span><b>→</b><span>Wrap</span><b>→</b><span>Guide</span><b>→</b><span>Exchange</span><b>→</b><span>Close</span></div>
      </section>
      <form className="panel onboarding-form" onSubmit={submit}>
        <p className="eyebrow">Create a local network basis</p>
        <h2>Begin without importing a platform identity</h2>
        <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Harry" /></label>
        <label>Optional handle<input value={form.handle} onChange={(event) => setForm({ ...form, handle: event.target.value })} placeholder="@handle" /></label>
        <label>Optional social reference<input type="url" value={form.referenceUrl} onChange={(event) => setForm({ ...form, referenceUrl: event.target.value })} placeholder="https://..." /><small>Reference only. TagTokn does not scrape, rank, or absorb the external profile.</small></label>
        {error ? <p className="error-message">{error}</p> : null}
        <button className="button primary wide" type="submit">Enter the network</button>
      </form>
    </main>
  )
}

function SummaryCards({ economy }) {
  const cards = [
    ['Open social wraps', economy.totals.open, 'Indirect appreciation awaiting communal admission.'],
    ['Guided wraps', economy.totals.guided, 'Represented nodes have claimed the guidance path.'],
    ['Closed interactions', economy.totals.closed, 'Direct exchanges that completed a social path.'],
    ['Coin circulation', economy.totals.circulation, 'Direct community-coin value moved through known closures.'],
    ['Closure rewards', economy.totals.rewards, 'Coins minted for providers, participants, and NFT custodians.'],
    ['Community pools', economy.totals.communityPool, 'Two-percent contributions retained for communal capacity.'],
  ]
  return <section className="summary-grid">{cards.map(([label, value, note], index) => <article className="summary-card" key={label}><span>{label}</span><strong>{index >= 3 ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value) : value}</strong><p>{note}</p></article>)}</section>
}

function CommunityRows({ economy }) {
  if (!economy.communities.length) return null
  return (
    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">Communal representation</p><h2>Community closure fields</h2></div></div>
      <div className="community-table">{economy.communities.map((row) => <article key={row.community.id}>
        <div><strong>{row.community.name}</strong><span>{row.community.symbol}</span><p>{row.community.mission || 'No mission stated.'}</p></div>
        <dl><div><dt>Open</dt><dd>{row.open}</dd></div><div><dt>Guided</dt><dd>{row.guided}</dd></div><div><dt>Closed</dt><dd>{row.closed}</dd></div><div><dt>Circulation</dt><dd>{formatCoin(row.circulation, row.community.symbol)}</dd></div><div><dt>Pool</dt><dd>{formatCoin(row.communityPool, row.community.symbol)}</dd></div></dl>
      </article>)}</div>
    </section>
  )
}

function GuidanceList({ wraps, onOpen }) {
  const guidance = wraps.map((wrap) => ({ wrap, state: reduceWrap(wrap) })).filter(({ state }) => state.status !== 'closed')
  if (!guidance.length) return <section className="panel empty-state"><p className="eyebrow">No open guidance paths</p><h2>Mint a social-wrap NFT from indirect appreciation.</h2><p>The wrap becomes guidance when the represented business, project, service, or communal node claims it.</p></section>
  return (
    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">Network guidance</p><h2>Open appreciation seeking direct closure</h2></div><span className="pill">No global ranking</span></div>
      <div className="guidance-list">{guidance.map(({ wrap, state }) => <button className="guidance-card" type="button" key={wrap.id} onClick={() => onOpen(wrap)}>
        <div className="guidance-topline"><span>{state.community.name} · {state.community.symbol}</span><b className={`status status-${state.status}`}>{state.status}</b></div>
        <h3>{state.represented.label}</h3><p>{state.interaction.appreciation}</p>
        <div className="guidance-meta"><span>{relationLabel(state.interaction.type)}</span><span>{state.endorsements.length} network endorsements</span><span>NFT custodian: {actorLabel(state.custodian)}</span>{state.interaction.suggestedAmount ? <span>Suggested: {formatCoin(state.interaction.suggestedAmount, state.community.symbol)}</span> : null}</div>
      </button>)}</div>
    </section>
  )
}

function NetworkGraph({ wraps, onOpen }) {
  const network = useMemo(() => deriveNetwork(wraps), [wraps])
  const nodes = useMemo(() => {
    const all = [
      ...network.communities.map((item) => ({ id: `community:${item.id}`, label: item.name, kind: 'community' })),
      ...network.actors.map((item) => ({ id: `actor:${item.id}`, label: actorLabel(item), kind: 'actor' })),
      ...network.represented.map((item) => ({ id: item.id, label: item.label, kind: 'represented' })),
    ]
    const width = 900, height = 500, radius = Math.min(width, height) * 0.37
    return { width, height, list: all.map((node, index) => { const angle = all.length <= 1 ? 0 : (Math.PI * 2 * index) / all.length - Math.PI / 2; return { ...node, x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius } }) }
  }, [network])
  const byId = useMemo(() => new Map(nodes.list.map((node) => [node.id, node])), [nodes])
  if (!wraps.length) return null
  return (
    <section className="panel network-panel">
      <div className="section-heading"><div><p className="eyebrow">Relational topology</p><h2>Communities, custodians, and represented value</h2></div></div>
      <p className="section-copy">The graph is derived from closure bundles known on this device. It represents economic guidance paths, not a complete map of an external platform.</p>
      <div className="network-scroll"><svg viewBox={`0 0 ${nodes.width} ${nodes.height}`} className="network-svg" role="img" aria-label="TagTokn socioeconomic closure network">
        {network.edges.flatMap((edge) => { const actor = byId.get(`actor:${edge.from}`), represented = byId.get(edge.to), community = byId.get(`community:${edge.communityId}`); if (!actor || !represented || !community) return []; return [
          <g key={`${edge.id}-a`} className={`edge edge-${edge.status}`} onClick={() => onOpen(edge.wrap)}><line x1={actor.x} y1={actor.y} x2={represented.x} y2={represented.y} /><text x={(actor.x + represented.x) / 2} y={(actor.y + represented.y) / 2 - 8}>{relationLabel(edge.interactionType)}</text></g>,
          <g key={`${edge.id}-c`} className={`edge edge-community edge-${edge.status}`} onClick={() => onOpen(edge.wrap)}><line x1={community.x} y1={community.y} x2={represented.x} y2={represented.y} /></g>,
        ] })}
        {nodes.list.map((node) => <g className={`node node-${node.kind}`} key={node.id}><circle cx={node.x} cy={node.y} r={node.kind === 'community' ? 34 : 27} /><text x={node.x} y={node.y + 48} textAnchor="middle">{node.label.slice(0, 24)}</text></g>)}
      </svg></div>
      <div className="network-legend"><span><i className="legend-dot community" /> Community field</span><span><i className="legend-dot actor" /> Participant or custodian</span><span><i className="legend-dot represented" /> Represented economic object</span></div>
    </section>
  )
}

function WrapComposer({ state, onCreated }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_WRAP, communityId: state.communities[0]?.id || '' }))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (!form.communityId && state.communities[0]) setForm((current) => ({ ...current, communityId: state.communities[0].id })) }, [state.communities, form.communityId])
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { const community = state.communities.find((item) => item.id === form.communityId); const wrap = await createSocialWrap({ creator: state.profile, community, ...form }); onCreated(wrap); setForm({ ...EMPTY_WRAP, communityId: form.communityId }) }
    catch (caught) { setError(caught.message || String(caught)) } finally { setBusy(false) }
  }
  return (
    <section className="panel composer-panel">
      <div className="section-heading"><div><p className="eyebrow">Social wrapping</p><h2>Mint indirect appreciation as a network-guidance NFT</h2></div><span className="pill">Reference, not extraction</span></div>
      <p className="section-copy">The wrap does not label a person. It represents a potential socioeconomic path between a community, a useful object, a curator, a future participant, and a direct exchange.</p>
      <form onSubmit={submit}>
        <div className="field-grid two-columns"><label>Community field<select value={form.communityId} onChange={(event) => setForm({ ...form, communityId: event.target.value })}>{state.communities.map((community) => <option key={community.id} value={community.id}>{community.name} · {community.symbol}</option>)}</select></label><label>Interaction class<select value={form.interactionType} onChange={(event) => setForm({ ...form, interactionType: event.target.value })}>{INTERACTION_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label} · weight {type.weight}</option>)}</select></label></div>
        <label>Business, project, service, event, product, or communal object<input required value={form.representedLabel} onChange={(event) => setForm({ ...form, representedLabel: event.target.value })} placeholder="Community Bookstore" /></label>
        <label>Optional external social reference<input type="url" value={form.referenceUrl} onChange={(event) => setForm({ ...form, referenceUrl: event.target.value })} placeholder="https://..." /><small>TagTokn stores the reference supplied by the network participant; it does not fetch the platform's interpretation.</small></label>
        <label>Indirect social appreciation<textarea required rows="4" value={form.appreciation} onChange={(event) => setForm({ ...form, appreciation: event.target.value })} placeholder="Why this object matters to the community even before a direct transaction occurs." /></label>
        <div className="field-grid two-columns"><label>Network guidance<input value={form.guidance} onChange={(event) => setForm({ ...form, guidance: event.target.value })} placeholder="Route the next local book purchase here." /></label><label>Suggested direct coin exchange<input type="number" min="0" step="0.01" value={form.suggestedAmount} onChange={(event) => setForm({ ...form, suggestedAmount: event.target.value })} /></label></div>
        {error ? <p className="error-message">{error}</p> : null}<button className="button primary wide" type="submit" disabled={busy}>{busy ? 'Minting social wrap…' : 'Mint social-wrap NFT'}</button>
      </form>
    </section>
  )
}

function EventTimeline({ wrap }) {
  return <ol className="timeline">{wrap.events.map((event) => <li key={event.digest}><div className="timeline-marker" /><div className="timeline-card"><div className="timeline-topline"><strong>{event.kind}</strong><span>{formatDate(event.at)}</span></div><p>{actorLabel(event.actor)}</p>{event.payload?.statement ? <blockquote>{event.payload.statement}</blockquote> : null}{event.kind === 'mint' ? <blockquote>{event.payload.interaction.appreciation}</blockquote> : null}{event.kind === 'close' ? <p>{formatCoin(event.payload.settlement.gross, event.payload.settlement.coinSymbol)} direct exchange · {formatCoin(event.payload.settlement.rewardTotal, event.payload.settlement.coinSymbol)} closure reward</p> : null}<code>{event.digest.slice(0, 18)}</code></div></li>)}</ol>
}

function SettlementReceipt({ settlement }) {
  if (!settlement) return null
  const { allocations } = settlement
  return <section className="settlement-card"><div className="section-heading"><div><p className="eyebrow">Closure settlement</p><h2>Direct value returned through the social path</h2></div><span className="status status-closed">closed</span></div><div className="settlement-grid">
    <article><span>Direct exchange</span><strong>{formatCoin(settlement.gross, settlement.coinSymbol)}</strong><p>Participant to represented provider.</p></article>
    <article><span>Provider receives</span><strong>{formatCoin(allocations.provider.amount + allocations.provider.reward, settlement.coinSymbol)}</strong><p>Net exchange plus provider closure reward.</p></article>
    <article><span>Participant reward</span><strong>{formatCoin(allocations.participant.reward, settlement.coinSymbol)}</strong><p>Reward for completing the guided interaction.</p></article>
    <article><span>NFT custodian reward</span><strong>{formatCoin(allocations.curator.reward, settlement.coinSymbol)}</strong><p>Direct value for the indirect social appreciation path.</p></article>
    <article><span>Community pool</span><strong>{formatCoin(allocations.community.amount, settlement.coinSymbol)}</strong><p>Two-percent contribution to communal capacity.</p></article>
  </div></section>
}

function WrapView({ wrap, state, onUpdate, onBack }) {
  const current = reduceWrap(wrap), actions = allowedActions(wrap)
  const [statement, setStatement] = useState(''), [amount, setAmount] = useState(String(current.interaction.suggestedAmount || 10))
  const [recipient, setRecipient] = useState({ id: '', name: '', handle: '' }), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState('')
  const balance = walletBalance(state, current.community.id)
  async function share() { const url = buildWrapUrl(wrap); try { if (navigator.share) await navigator.share({ title: `${current.community.name} social wrap`, text: current.interaction.appreciation, url }); else { await navigator.clipboard.writeText(url); setNotice('Closure-wrap URL copied.') } } catch (caught) { if (caught?.name !== 'AbortError') setError('The closure wrap could not be shared.') } }
  async function act(action) {
    setBusy(action); setError(''); setNotice('')
    try {
      if (action === 'close' && !canSpend(state, current.community.id, amount)) throw new Error(`Your local wallet has ${formatCoin(balance, current.community.symbol)}. Join or fund this community before closing that amount.`)
      const updated = await appendWrapEvent(wrap, { action, actor: state.profile, statement, amount, to: recipient })
      onUpdate(updated); setStatement(''); setNotice(action === 'close' ? 'Interaction closed and settlement appended.' : 'Network event appended. Share the updated wrap to continue the communal path.')
    } catch (caught) { setError(caught.message || String(caught)) } finally { setBusy('') }
  }
  return (
    <main className="page-content narrow-content">
      <button className="text-button" type="button" onClick={onBack}>Back to network</button>
      <article className="wrap-hero">
        <div className="wrap-header"><div><p className="eyebrow">Social-wrap NFT · {wrap.id}</p><h1>{current.represented.label}</h1></div><span className={`status status-${current.status}`}>{current.status}</span></div>
        <div className="wrap-path"><div><span>Community</span><strong>{current.community.name}</strong><small>{current.community.symbol}</small></div><b>→</b><div><span>Curated by</span><strong>{actorLabel(current.creator)}</strong><small>NFT custodian: {actorLabel(current.custodian)}</small></div><b>→</b><div><span>Represented node</span><strong>{current.represented.label}</strong><small>{current.provider ? `Claimed by ${actorLabel(current.provider)}` : 'Awaiting claim'}</small></div></div>
        <blockquote className="appreciation-quote">{current.interaction.appreciation}</blockquote>{current.interaction.guidance ? <p className="guidance-callout"><b>Network guidance:</b> {current.interaction.guidance}</p> : null}
        <div className="wrap-meta"><span>{relationLabel(current.interaction.type)} · reward weight {current.interaction.weight}</span><span>{current.endorsements.length} endorsements</span>{current.interaction.suggestedAmount ? <span>Suggested exchange {formatCoin(current.interaction.suggestedAmount, current.community.symbol)}</span> : null}<span>Wallet {formatCoin(balance, current.community.symbol)}</span></div>
        {current.represented.referenceUrl ? <a className="reference-link" href={current.represented.referenceUrl} target="_blank" rel="noreferrer">Open supplied social reference</a> : null}
        <div className="integrity-note">External platforms locate context only. Economic meaning is constituted by this network's mint, custody, claim, exchange, and closure events.</div>
        <div className="button-row"><button className="button primary" type="button" onClick={share}>Share social wrap</button><button className="button secondary" type="button" onClick={async () => { await navigator.clipboard.writeText(buildWrapUrl(wrap)); setNotice('Closure-wrap URL copied.') }}>Copy URL</button></div>
      </article>
      <SettlementReceipt settlement={current.settlement} />
      {actions.length ? <section className="panel action-panel"><div className="section-heading"><div><p className="eyebrow">Continue the socioeconomic relation</p><h2>Act from your network basis</h2></div></div><textarea rows="3" value={statement} onChange={(event) => setStatement(event.target.value)} placeholder="Add appreciation, claim context, or a closure receipt." />
        {actions.includes('transfer') ? <div className="transfer-fields"><p className="field-title">NFT transfer recipient</p><div className="field-grid three-columns"><label>Identity code<input value={recipient.id} onChange={(event) => setRecipient({ ...recipient, id: event.target.value })} placeholder="actor-…" /></label><label>Name<input value={recipient.name} onChange={(event) => setRecipient({ ...recipient, name: event.target.value })} placeholder="Network participant" /></label><label>Handle<input value={recipient.handle} onChange={(event) => setRecipient({ ...recipient, handle: event.target.value })} placeholder="@handle" /></label></div></div> : null}
        {actions.includes('close') ? <label>Direct interaction amount in {current.community.symbol}<input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label> : null}
        <div className="button-row actions-row">{actions.map((action) => <button className={action === 'close' ? 'button primary' : 'button secondary'} type="button" key={action} disabled={Boolean(busy)} onClick={() => act(action)}>{busy === action ? 'Appending…' : action === 'claim' ? 'Claim communal representation' : action === 'close' ? 'Exchange coins and close' : action === 'transfer' ? 'Transfer social-wrap NFT' : 'Endorse guidance'}</button>)}</div>
        {notice ? <p className="notice-message">{notice}</p> : null}{error ? <p className="error-message">{error}</p> : null}
      </section> : null}
      <section className="panel"><div className="section-heading"><div><p className="eyebrow">Append-only closure memory</p><h2>Network event chain</h2></div><span className="pill">{wrap.events.length} events</span></div><EventTimeline wrap={wrap} /></section>
    </main>
  )
}

function Wallets({ state, onJoin, onCreateCommunity }) {
  const [form, setForm] = useState({ name: '', symbol: '', mission: '' }), [error, setError] = useState('')
  function submit(event) { event.preventDefault(); try { onCreateCommunity(form); setForm({ name: '', symbol: '', mission: '' }); setError('') } catch (caught) { setError(caught.message || String(caught)) } }
  return <><section className="panel"><div className="section-heading"><div><p className="eyebrow">Local coin wallets</p><h2>Community balances</h2></div><span className="pill">Prototype ledger</span></div><p className="section-copy">These balances are device-local demonstration balances. Every closure receipt remains portable in its social-wrap URL.</p><div className="wallet-grid">{state.communities.map((community) => { const joined = state.balances[community.id] != null; return <article key={community.id}><span>{community.name}</span><strong>{joined ? formatCoin(walletBalance(state, community.id), community.symbol) : `Not joined · ${community.symbol}`}</strong><p>{community.mission || 'No mission stated.'}</p>{!joined ? <button className="button secondary" type="button" onClick={() => onJoin(community.id)}>Join with 100 demo coins</button> : null}</article> })}</div></section>
    <form className="panel" onSubmit={submit}><div className="section-heading"><div><p className="eyebrow">Create a communal field</p><h2>Issue a local community coin</h2></div></div><div className="field-grid two-columns"><label>Community name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Neighborhood Learning Commons" /></label><label>Coin symbol<input required maxLength="12" value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value })} placeholder="LEARN" /></label></div><label>Communal mission<textarea rows="3" value={form.mission} onChange={(event) => setForm({ ...form, mission: event.target.value })} placeholder="What kind of interaction should this coin help circulate?" /></label>{error ? <p className="error-message">{error}</p> : null}<button className="button primary" type="submit">Create community and issue 100 demo coins</button></form></>
}

function WrapArchive({ wraps, onOpen, onRemove }) {
  if (!wraps.length) return <GuidanceList wraps={[]} />
  return <section className="archive-list">{wraps.map((wrap) => { const current = reduceWrap(wrap); return <article className="archive-card" key={wrap.id}><button type="button" onClick={() => onOpen(wrap)}><div><p className="eyebrow">{current.community.name} · {relationLabel(current.interaction.type)}</p><h3>{current.represented.label}</h3><p>{current.interaction.appreciation}</p></div><span className={`status status-${current.status}`}>{current.status}</span></button><footer><code>{wrap.id}</code><span>NFT: {actorLabel(current.custodian)}</span><button className="text-button muted" type="button" onClick={() => onRemove(wrap.id)}>Remove locally</button></footer></article> })}</section>
}

export default function App() {
  const [state, setState] = useState(() => reconcileClosures(loadEconomyState()))
  const [activeTab, setActiveTab] = useState('network'), [activeWrap, setActiveWrap] = useState(null), [urlError, setUrlError] = useState('')
  const economy = useMemo(() => deriveEconomy(state.wraps), [state.wraps])
  function commit(nextState) { const reconciled = reconcileClosures(nextState); saveEconomyState(reconciled); setState(reconciled); return reconciled }
  function importFromLocation() { const encoded = new URLSearchParams(window.location.search).get('wrap'); if (!encoded) { setActiveWrap(null); return } try { const wrap = decodeWrap(encoded); const next = commit(upsertWrap(loadEconomyState(), wrap)); setActiveWrap(next.wraps.find((item) => item.id === wrap.id) || wrap); setUrlError('') } catch (caught) { setUrlError(caught.message || 'The shared closure wrap could not be decoded.'); setActiveWrap(null) } }
  useEffect(() => { importFromLocation(); window.addEventListener('popstate', importFromLocation); return () => window.removeEventListener('popstate', importFromLocation) }, [])
  function updateLocation(wrap, replace = false) { const url = buildWrapUrl(wrap); window.history[replace ? 'replaceState' : 'pushState']({}, '', url) }
  function openWrap(wrap) { const next = commit(upsertWrap(state, wrap)); const stored = next.wraps.find((item) => item.id === wrap.id) || wrap; setActiveWrap(stored); updateLocation(stored); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function updateWrap(wrap) { const next = commit(upsertWrap(state, wrap)); const stored = next.wraps.find((item) => item.id === wrap.id) || wrap; setActiveWrap(stored); updateLocation(stored, true) }
  function closeWrap() { window.history.pushState({}, '', window.location.pathname); setActiveWrap(null) }
  if (!state.profile) return <ProfileSetup onCreate={(profile) => commit(createProfileState(profile))} />
  if (activeWrap) return <WrapView wrap={activeWrap} state={state} onUpdate={updateWrap} onBack={closeWrap} />

  return <div className="app-shell"><header className="site-header"><button className="brand-button" type="button" onClick={() => setActiveTab('network')}><span className="brand-mark">T</span><span>TagTokn</span></button><nav aria-label="Primary navigation">{[['network', 'Network'], ['wrap', 'Wrap appreciation'], ['wallets', 'Coins'], ['archive', `NFTs${state.wraps.length ? ` (${state.wraps.length})` : ''}`], ['identity', 'Identity']].map(([id, label]) => <button key={id} className={activeTab === id ? 'nav-button active' : 'nav-button'} type="button" onClick={() => setActiveTab(id)}>{label}</button>)}</nav></header>
    <main className="page-content">{urlError ? <p className="error-message">{urlError}</p> : null}
      {activeTab === 'network' ? <><section className="hero"><p className="eyebrow">Relational network socioeconomic closure</p><h1>Give indirect social appreciation a direct economic path.</h1><p>Curators wrap appreciation as NFTs. Communities guide attention. Represented nodes claim the path. Participants exchange coins. Closure rewards the provider, participant, NFT custodian, and communal pool.</p><div className="closure-sequence"><span>Social appreciation</span><b>→</b><span>Communal wrap</span><b>→</b><span>Coin exchange</span><b>→</b><span>Closure distribution</span></div></section><SummaryCards economy={economy} /><GuidanceList wraps={state.wraps} onOpen={openWrap} /><CommunityRows economy={economy} /><NetworkGraph wraps={state.wraps} onOpen={openWrap} /></> : null}
      {activeTab === 'wrap' ? <WrapComposer state={state} onCreated={openWrap} /> : null}
      {activeTab === 'wallets' ? <Wallets state={state} onJoin={(communityId) => commit(joinCommunity(state, communityId))} onCreateCommunity={(community) => commit(upsertCommunity(state, community))} /> : null}
      {activeTab === 'archive' ? <><section className="page-heading"><p className="eyebrow">Portable social wrapping</p><h1>Known social-wrap NFTs</h1><p>Each NFT is an append-only socioeconomic guidance path, not ownership of an external person or platform profile.</p></section><WrapArchive wraps={state.wraps} onOpen={openWrap} onRemove={(wrapId) => commit(removeWrap(state, wrapId))} /></> : null}
      {activeTab === 'identity' ? <section className="panel identity-panel"><div><p className="eyebrow">Local network basis</p><h2>{actorLabel(state.profile)}</h2><p>{state.profile.handle || 'No handle supplied'}</p><code>{state.profile.id}</code></div><div className="identity-principles"><h3>The architectural boundary</h3><p>TagTokn does not claim absolute access to another platform's people, reputation, or attention. It records only relations admitted by participants and the economic events that continue them.</p><p>Share the identity code when someone needs to transfer a social-wrap NFT to this local basis.</p></div></section> : null}
    </main></div>
}
