import { useEffect, useMemo, useState } from 'react'
import {
  RELATION_TYPES,
  allowedResponses,
  appendTagEvent,
  buildTagUrl,
  createRelationalTag,
  decodeTag,
  reduceTag,
} from './domain/relationalTag.js'
import { loadProfile, loadTags, removeTag, saveProfile, saveTag } from './storage/tagStore.js'

const EMPTY_FORM = {
  targetLabel: '',
  targetReferenceUrl: '',
  relationType: 'connect',
  statement: '',
  requestedResponse: 'Accept, reframe, or decline this relation.',
  amountUsd: '',
  checkoutUrl: '',
}

function relationLabel(id) {
  return RELATION_TYPES.find((type) => type.id === id)?.label || id
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

function identityLabel(identity) {
  return identity?.displayName || identity?.handle || 'Unknown participant'
}

function ProfileEditor({ profile, onSave, compact = false }) {
  const [form, setForm] = useState(
    profile || { displayName: '', handle: '', referenceUrl: '' },
  )

  useEffect(() => {
    setForm(profile || { displayName: '', handle: '', referenceUrl: '' })
  }, [profile])

  function submit(event) {
    event.preventDefault()
    onSave(form)
  }

  return (
    <form className={compact ? 'profile-editor compact' : 'profile-editor'} onSubmit={submit}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Local identity</p>
          <h2>{profile ? 'Your relational basis' : 'Create your TagTokn identity'}</h2>
        </div>
        <span className="privacy-label">Self-declared</span>
      </div>
      <div className="field-grid two-columns">
        <label>
          Display name
          <input
            required
            value={form.displayName || ''}
            onChange={(event) => setForm({ ...form, displayName: event.target.value })}
            placeholder="Harry"
          />
        </label>
        <label>
          Social handle
          <input
            value={form.handle || ''}
            onChange={(event) => setForm({ ...form, handle: event.target.value })}
            placeholder="@handle"
          />
        </label>
      </div>
      <label>
        Optional profile reference
        <input
          type="url"
          value={form.referenceUrl || ''}
          onChange={(event) => setForm({ ...form, referenceUrl: event.target.value })}
          placeholder="https://social.example/you"
        />
        <span className="field-note">Stored as your reference. TagTokn does not fetch or score it.</span>
      </label>
      <button className="button primary" type="submit">
        Save local identity
      </button>
    </form>
  )
}

function CreateTag({ profile, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const tag = await createRelationalTag({ creator: profile, ...form })
      saveTag(tag)
      onCreated(tag)
      setForm(EMPTY_FORM)
    } catch (caught) {
      setError(caught.message || String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel composer-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Propose a relation</p>
          <h2>Create a relational tag</h2>
        </div>
        <span className="privacy-label">No scraping</span>
      </div>
      <p className="section-copy">
        A reference URL may locate the context, but the tag is defined by what you and another
        participant admit, reframe, decline, or complete.
      </p>
      <form onSubmit={submit}>
        <div className="field-grid two-columns">
          <label>
            Who or what are you tagging?
            <input
              required
              value={form.targetLabel}
              onChange={(event) => setForm({ ...form, targetLabel: event.target.value })}
              placeholder="A person, post, project, product, or idea"
            />
          </label>
          <label>
            Optional external reference
            <input
              type="url"
              value={form.targetReferenceUrl}
              onChange={(event) =>
                setForm({ ...form, targetReferenceUrl: event.target.value })
              }
              placeholder="https://..."
            />
          </label>
        </div>

        <fieldset>
          <legend>Relation type</legend>
          <div className="relation-options">
            {RELATION_TYPES.map((type) => (
              <label
                key={type.id}
                className={form.relationType === type.id ? 'relation-option selected' : 'relation-option'}
              >
                <input
                  type="radio"
                  name="relationType"
                  value={type.id}
                  checked={form.relationType === type.id}
                  onChange={(event) =>
                    setForm({ ...form, relationType: event.target.value })
                  }
                />
                <strong>{type.label}</strong>
                <span>{type.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          Why does this relation matter?
          <textarea
            required
            rows="4"
            value={form.statement}
            onChange={(event) => setForm({ ...form, statement: event.target.value })}
            placeholder="State the bounded context, invitation, recommendation, or offer."
          />
        </label>

        <label>
          Requested response
          <input
            value={form.requestedResponse}
            onChange={(event) => setForm({ ...form, requestedResponse: event.target.value })}
          />
        </label>

        {form.relationType === 'offer' ? (
          <div className="offer-fields">
            <div className="field-grid two-columns">
              <label>
                Amount in USD
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amountUsd}
                  onChange={(event) => setForm({ ...form, amountUsd: event.target.value })}
                  placeholder="15.00"
                />
              </label>
              <label>
                External checkout URL
                <input
                  type="url"
                  value={form.checkoutUrl}
                  onChange={(event) => setForm({ ...form, checkoutUrl: event.target.value })}
                  placeholder="https://..."
                />
              </label>
            </div>
            <p className="field-note">
              Payment remains external. TagTokn records the admitted commercial relation, not custody.
            </p>
          </div>
        ) : null}

        {error ? <p className="error-message">{error}</p> : null}
        <button className="button primary wide" type="submit" disabled={busy}>
          {busy ? 'Creating relation…' : 'Create and open tag'}
        </button>
      </form>
    </section>
  )
}

function TagTimeline({ tag }) {
  return (
    <ol className="timeline">
      {tag.events.map((event) => (
        <li key={event.digest}>
          <div className="timeline-marker" />
          <div className="timeline-card">
            <div className="timeline-topline">
              <strong>{event.kind === 'propose' ? 'Proposed' : event.kind}</strong>
              <span>{formatDate(event.at)}</span>
            </div>
            <p>{identityLabel(event.actor)}</p>
            {event.kind === 'propose' ? (
              <blockquote>{event.payload.relation.statement}</blockquote>
            ) : event.payload.statement ? (
              <blockquote>{event.payload.statement}</blockquote>
            ) : null}
            <code>{event.digest.slice(0, 16)}</code>
          </div>
        </li>
      ))}
    </ol>
  )
}

function TagView({ tag, profile, onUpdate, onBack }) {
  const state = reduceTag(tag)
  const responses = allowedResponses(tag)
  const [statement, setStatement] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyAction, setBusyAction] = useState('')

  async function share() {
    const url = buildTagUrl(tag)
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${relationLabel(state.relation.type)} · ${state.target.label}`,
          text: state.relation.statement,
          url,
        })
        return
      }
      await navigator.clipboard.writeText(url)
      setNotice('Tag URL copied.')
    } catch (caught) {
      if (caught?.name !== 'AbortError') setError('The tag URL could not be shared.')
    }
  }

  async function respond(action) {
    setBusyAction(action)
    setError('')
    setNotice('')
    try {
      const updated = await appendTagEvent(tag, {
        action,
        actor: profile,
        statement,
      })
      saveTag(updated)
      onUpdate(updated)
      setStatement('')
      setNotice('Response appended. Share the updated relation URL to continue the chain.')
    } catch (caught) {
      setError(caught.message || String(caught))
    } finally {
      setBusyAction('')
    }
  }

  return (
    <section className="tag-view">
      <button className="text-button" type="button" onClick={onBack}>
        Back to TagTokn
      </button>
      <article className="relation-card">
        <div className="relation-card-header">
          <div>
            <p className="eyebrow">Relational tag · {tag.id}</p>
            <h1>{relationLabel(state.relation.type)}</h1>
          </div>
          <span className={`status status-${state.status}`}>{state.status}</span>
        </div>

        <div className="relation-route">
          <div>
            <span>From</span>
            <strong>{identityLabel(state.creator)}</strong>
            {state.creator.handle ? <small>{state.creator.handle}</small> : null}
          </div>
          <div className="route-line">→</div>
          <div>
            <span>Relative to</span>
            <strong>{state.target.label}</strong>
            {state.target.referenceUrl ? (
              <a href={state.target.referenceUrl} target="_blank" rel="noreferrer">
                Open reference
              </a>
            ) : null}
          </div>
        </div>

        <blockquote className="relation-statement">{state.relation.statement}</blockquote>
        <p className="requested-response">{state.relation.requestedResponse}</p>

        {state.commerce ? (
          <div className="commerce-card">
            <div>
              <span>Offer context</span>
              <strong>
                {state.commerce.amountUsd
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(state.commerce.amountUsd)
                  : 'Price not specified'}
              </strong>
            </div>
            {state.commerce.checkoutUrl ? (
              <a className="button secondary" href={state.commerce.checkoutUrl} target="_blank" rel="noreferrer">
                Open external checkout
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="integrity-note">
          External pages are references only. This relation is constituted by its append-only proposal
          and response events.
        </div>

        <div className="tag-actions">
          <button className="button primary" type="button" onClick={share}>
            Share current relation
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(buildTagUrl(tag))
              setNotice('Tag URL copied.')
            }}
          >
            Copy URL
          </button>
        </div>
      </article>

      {responses.length ? (
        <section className="panel response-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Continue the relation</p>
              <h2>Respond from your local basis</h2>
            </div>
          </div>
          <textarea
            rows="3"
            value={statement}
            onChange={(event) => setStatement(event.target.value)}
            placeholder="Add context. A reframe requires an alternative statement."
          />
          <div className="response-buttons">
            {responses.map((action) => (
              <button
                key={action}
                className={action === 'decline' ? 'button danger' : 'button secondary'}
                type="button"
                disabled={Boolean(busyAction)}
                onClick={() => respond(action)}
              >
                {busyAction === action ? 'Appending…' : action}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {notice ? <p className="notice-message">{notice}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Closure memory</p>
            <h2>Event chain</h2>
          </div>
          <span className="privacy-label">{tag.events.length} events</span>
        </div>
        <TagTimeline tag={tag} />
      </section>
    </section>
  )
}

function TagList({ tags, onOpen, onDelete }) {
  if (!tags.length) {
    return (
      <section className="panel empty-state">
        <p className="eyebrow">No local relations yet</p>
        <h2>Create or open a shared tag.</h2>
        <p>Tags you create or receive are remembered on this device.</p>
      </section>
    )
  }

  return (
    <section className="tag-list">
      {tags.map((tag) => {
        const state = reduceTag(tag)
        return (
          <article className="tag-list-item" key={`${tag.id}-${tag.events.length}`}>
            <button className="tag-open-button" type="button" onClick={() => onOpen(tag)}>
              <div>
                <p className="eyebrow">{relationLabel(state.relation.type)}</p>
                <h3>{state.target.label}</h3>
                <p>{state.relation.statement}</p>
              </div>
              <span className={`status status-${state.status}`}>{state.status}</span>
            </button>
            <div className="tag-list-footer">
              <code>{tag.id}</code>
              <button className="text-button muted" type="button" onClick={() => onDelete(tag.id)}>
                Remove locally
              </button>
            </div>
          </article>
        )
      })}
    </section>
  )
}

function NetworkView({ tags, onOpen }) {
  const graph = useMemo(() => {
    const nodes = new Map()
    const edges = []

    for (const tag of tags) {
      const state = reduceTag(tag)
      const sourceId = `actor:${state.creator.id || identityLabel(state.creator)}`
      const responderIdentity = state.responder
      const targetId = responderIdentity
        ? `actor:${responderIdentity.id || identityLabel(responderIdentity)}`
        : `target:${state.target.label}`
      nodes.set(sourceId, { id: sourceId, label: identityLabel(state.creator), kind: 'actor' })
      nodes.set(targetId, {
        id: targetId,
        label: responderIdentity ? identityLabel(responderIdentity) : state.target.label,
        kind: responderIdentity ? 'actor' : 'reference',
      })
      edges.push({
        id: tag.id,
        sourceId,
        targetId,
        type: state.relation.type,
        status: state.status,
        tag,
      })
    }

    const list = [...nodes.values()]
    const width = 720
    const height = 430
    const radius = Math.min(width, height) * 0.34
    const positioned = list.map((node, index) => {
      const angle = list.length === 1 ? 0 : (Math.PI * 2 * index) / list.length - Math.PI / 2
      return {
        ...node,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
      }
    })
    const byId = new Map(positioned.map((node) => [node.id, node]))
    return { nodes: positioned, edges, byId, width, height }
  }, [tags])

  if (!tags.length) return <TagList tags={[]} />

  return (
    <section className="panel network-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Local relational network</p>
          <h2>Tags are edges, not scores</h2>
        </div>
        <span className="privacy-label">{graph.edges.length} relations</span>
      </div>
      <p className="section-copy">
        This graph is derived only from tag event chains present on this device. It does not claim a
        complete map of any external platform.
      </p>
      <div className="network-scroll">
        <svg
          className="network-svg"
          viewBox={`0 0 ${graph.width} ${graph.height}`}
          role="img"
          aria-label="Relational tag network"
        >
          {graph.edges.map((edge) => {
            const source = graph.byId.get(edge.sourceId)
            const target = graph.byId.get(edge.targetId)
            return (
              <g key={edge.id} className={`edge edge-${edge.status}`} onClick={() => onOpen(edge.tag)}>
                <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} />
                <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 8}>
                  {relationLabel(edge.type)}
                </text>
              </g>
            )
          })}
          {graph.nodes.map((node) => (
            <g className={`node node-${node.kind}`} key={node.id}>
              <circle cx={node.x} cy={node.y} r="30" />
              <text x={node.x} y={node.y + 48} textAnchor="middle">
                {node.label.slice(0, 24)}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="network-legend">
        <span><i className="legend-dot actor" /> Participant basis</span>
        <span><i className="legend-dot reference" /> Unclaimed reference</span>
        <span>Click an edge to open its relation.</span>
      </div>
    </section>
  )
}

function Principles() {
  return (
    <section className="principles-grid">
      <article>
        <p className="eyebrow">1 · Reference</p>
        <h3>Locate without absorbing</h3>
        <p>An external URL identifies context. Its platform data is neither copied nor treated as truth.</p>
      </article>
      <article>
        <p className="eyebrow">2 · Relation</p>
        <h3>Propose from a basis</h3>
        <p>A tag states who proposes what relation, relative to whom or what, and why.</p>
      </article>
      <article>
        <p className="eyebrow">3 · Reciprocity</p>
        <h3>Closure requires response</h3>
        <p>The target may accept, reframe, decline, or complete. No unilateral label becomes absolute.</p>
      </article>
    </section>
  )
}

export default function App() {
  const [profile, setProfile] = useState(() => loadProfile())
  const [tags, setTags] = useState(() => loadTags())
  const [activeTab, setActiveTab] = useState('create')
  const [activeTag, setActiveTag] = useState(null)
  const [urlError, setUrlError] = useState('')

  function importTagFromLocation() {
    const encoded = new URLSearchParams(window.location.search).get('tag')
    if (!encoded) {
      setActiveTag(null)
      return
    }
    try {
      const tag = decodeTag(encoded)
      saveTag(tag)
      setTags(loadTags())
      setActiveTag(tag)
      setUrlError('')
    } catch (caught) {
      setUrlError(caught.message || 'The shared relation could not be decoded.')
      setActiveTag(null)
    }
  }

  useEffect(() => {
    importTagFromLocation()
    window.addEventListener('popstate', importTagFromLocation)
    return () => window.removeEventListener('popstate', importTagFromLocation)
  }, [])

  function updateLocationForTag(tag, replace = false) {
    const url = buildTagUrl(tag)
    window.history[replace ? 'replaceState' : 'pushState']({}, '', url)
  }

  function openTag(tag) {
    saveTag(tag)
    setTags(loadTags())
    setActiveTag(tag)
    updateLocationForTag(tag)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function updateTag(tag) {
    saveTag(tag)
    setTags(loadTags())
    setActiveTag(tag)
    updateLocationForTag(tag, true)
  }

  function closeTag() {
    window.history.pushState({}, '', window.location.pathname)
    setActiveTag(null)
  }

  function saveIdentity(nextProfile) {
    const saved = saveProfile({ ...profile, ...nextProfile })
    setProfile(saved)
  }

  function deleteLocalTag(tagId) {
    setTags(removeTag(tagId))
  }

  if (activeTag) {
    return (
      <div className="app-shell">
        <header className="site-header compact-header">
          <button className="brand-button" type="button" onClick={closeTag}>
            <span className="brand-mark">T</span>
            <span>TagTokn</span>
          </button>
          <span className="header-note">Relational tagging infrastructure</span>
        </header>
        <main className="page-content narrow-content">
          {profile ? (
            <TagView tag={activeTag} profile={profile} onUpdate={updateTag} onBack={closeTag} />
          ) : (
            <section className="panel">
              <p className="eyebrow">Identity required to respond</p>
              <ProfileEditor profile={profile} onSave={saveIdentity} compact />
              <button className="text-button" type="button" onClick={closeTag}>
                Return without responding
              </button>
            </section>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand-button" type="button" onClick={() => setActiveTab('create')}>
          <span className="brand-mark">T</span>
          <span>TagTokn</span>
        </button>
        <nav aria-label="Primary navigation">
          {[
            ['create', 'Create'],
            ['tags', `My tags${tags.length ? ` (${tags.length})` : ''}`],
            ['network', 'Network'],
            ['identity', 'Identity'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={activeTab === id ? 'nav-button active' : 'nav-button'}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="page-content">
        {urlError ? <p className="error-message">{urlError}</p> : null}

        {activeTab === 'create' ? (
          <>
            <section className="hero">
              <p className="eyebrow">Relational social tagging</p>
              <h1>Tag the relation, not the person.</h1>
              <p>
                Propose a contextual connection to a person, post, project, product, or idea. Share it.
                Let the other basis accept, reframe, decline, or complete it.
              </p>
            </section>
            {!profile ? (
              <section className="panel">
                <ProfileEditor profile={profile} onSave={saveIdentity} />
              </section>
            ) : (
              <CreateTag profile={profile} onCreated={openTag} />
            )}
            <Principles />
          </>
        ) : null}

        {activeTab === 'tags' ? (
          <>
            <section className="page-heading">
              <p className="eyebrow">Device memory</p>
              <h1>Known relations</h1>
              <p>These are the event chains created or opened on this device.</p>
            </section>
            <TagList tags={tags} onOpen={openTag} onDelete={deleteLocalTag} />
          </>
        ) : null}

        {activeTab === 'network' ? (
          <>
            <section className="page-heading">
              <p className="eyebrow">Relational topology</p>
              <h1>Local network</h1>
            </section>
            <NetworkView tags={tags} onOpen={openTag} />
          </>
        ) : null}

        {activeTab === 'identity' ? (
          <section className="panel identity-panel">
            <ProfileEditor profile={profile} onSave={saveIdentity} />
            <div className="identity-explanation">
              <p className="eyebrow">Architectural boundary</p>
              <h3>TagTokn does not own your external identity.</h3>
              <p>
                This local profile names the basis from which you create and respond to tags. External
                social URLs remain optional references. Verification and persistent shared storage can be
                added later without changing the relational event model.
              </p>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}
