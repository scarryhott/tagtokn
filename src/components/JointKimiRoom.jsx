import React, { useCallback, useEffect, useState } from 'react';
import { nfcAuthHeaders } from '../engine/user-accounts';
import { MessageCircle, Plus, RefreshCw } from 'lucide-react';

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...nfcAuthHeaders(), ...(opts.headers || {}) };
  const r = await fetch(path, { ...opts, headers });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || j.message || `${r.status}`);
  return j;
}

export default function JointKimiRoom({ currentUserId }) {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [sessionData, setSessionData] = useState(null);
  const [newTitle, setNewTitle] = useState('Perspective room');
  const [newNote, setNewNote] = useState('');
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState('');

  const loadList = useCallback(async () => {
    if (!currentUserId) return;
    setErr('');
    try {
      const { sessions: s } = await api('/api/kimi/joint-sessions');
      setSessions(s || []);
    } catch (e) {
      setErr(e.message || String(e));
    }
  }, [currentUserId]);

  const loadRoom = useCallback(async (sid) => {
    if (!sid) {
      setSessionData(null);
      return;
    }
    setErr('');
    try {
      const data = await api(`/api/kimi/joint-sessions/${encodeURIComponent(sid)}`);
      setSessionData(data);
    } catch (e) {
      setErr(e.message || String(e));
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (activeId) loadRoom(activeId);
  }, [activeId, loadRoom]);

  const createSession = async () => {
    setErr('');
    try {
      const { sessionId } = await api('/api/kimi/joint-sessions', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle, perspectiveNote: newNote }),
      });
      setActiveId(sessionId);
      await loadList();
      await loadRoom(sessionId);
    } catch (e) {
      setErr(e.message || String(e));
    }
  };

  const send = async () => {
    if (!activeId || !draft.trim()) return;
    setErr('');
    try {
      await api(`/api/kimi/joint-sessions/${encodeURIComponent(activeId)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: draft.trim(), role: 'participant' }),
      });
      setDraft('');
      await loadRoom(activeId);
    } catch (e) {
      setErr(e.message || String(e));
    }
  };

  if (!currentUserId) {
    return (
      <div style={{ padding: 24, color: '#a1a1aa' }}>
        <MessageCircle size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Log in to open perspectival joint sessions (graph-epoch tagged on the server).
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', color: '#e4e4e7', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageCircle size={22} color="#a78bfa" /> Joint Kimi rooms
          </h2>
          <p style={{ margin: '6px 0 0', color: '#71717a', fontSize: '0.85rem', maxWidth: 720 }}>
            Server-stored transcripts tied to Tutte epoch at creation. Use alongside graph translation for shared context.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { loadList(); if (activeId) loadRoom(activeId); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #27272a',
            background: '#18181b',
            color: '#fafafa',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {err ? (
        <div style={{ padding: 12, borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', fontSize: '0.85rem' }}>{err}</div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px,0.35fr) minmax(320px,1fr)', gap: 16 }}>
        <div style={{ background: '#0c0c0f', border: '1px solid #27272a', borderRadius: 12, padding: 14 }}>
          <h3 style={{ marginTop: 0, fontSize: '0.9rem', color: '#c084fc' }}>Sessions</h3>
          <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #27272a' }}>
            <input
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={inp}
            />
            <textarea
              placeholder="Perspective note (optional)"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              style={{ ...inp, minHeight: 56 }}
            />
            <button
              type="button"
              onClick={createSession}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: 8,
                background: '#3b0764',
                color: '#f5f3ff',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Plus size={16} /> New session
            </button>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 360, overflowY: 'auto' }}>
            {sessions.map((s) => (
              <li key={s.session_id}>
                <button
                  type="button"
                  onClick={() => setActiveId(s.session_id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: 10,
                    marginBottom: 6,
                    borderRadius: 8,
                    border: activeId === s.session_id ? '1px solid #a78bfa' : '1px solid #27272a',
                    background: activeId === s.session_id ? 'rgba(167,139,250,0.12)' : '#111',
                    color: '#e4e4e7',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{s.title || s.session_id.slice(0, 12)}</div>
                  <div style={{ color: '#71717a' }}>epoch {s.graph_epoch}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ background: '#0c0c0f', border: '1px solid #27272a', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', minHeight: 420 }}>
          {!activeId ? (
            <p style={{ color: '#52525b' }}>Select or create a session.</p>
          ) : !sessionData ? (
            <p style={{ color: '#52525b' }}>Loading…</p>
          ) : (
            <>
              <div style={{ marginBottom: 12, fontSize: '0.78rem', color: '#a1a1aa' }}>
                <code style={{ color: '#f0abfc' }}>{sessionData.session.session_id}</code>
                <span style={{ marginLeft: 12 }}>graph epoch {sessionData.session.graph_epoch}</span>
                {sessionData.session.perspective_note ? (
                  <div style={{ marginTop: 8, color: '#d4d4d8' }}>{sessionData.session.perspective_note}</div>
                ) : null}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {(sessionData.messages || []).map((m) => (
                  <div
                    key={m.message_id}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      background: '#111',
                      border: '1px solid #27272a',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ color: '#71717a', fontSize: '0.68rem', marginBottom: 4 }}>
                      {m.role} · <code>{m.user_id.slice(0, 12)}…</code> · {new Date(m.created_at).toLocaleString()}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                  </div>
                ))}
              </div>
              <textarea
                placeholder="Message…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                style={{ ...inp, minHeight: 72, marginBottom: 8 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button
                type="button"
                onClick={send}
                style={{ padding: '10px 16px', borderRadius: 8, background: '#14532d', color: '#bbf7d0', border: 'none', cursor: 'pointer' }}
              >
                Send (⌘/Ctrl+Enter)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const inp = {
  width: '100%',
  padding: 8,
  borderRadius: 8,
  background: '#111',
  color: '#fff',
  border: '1px solid #333',
  marginBottom: 8,
  boxSizing: 'border-box',
};
