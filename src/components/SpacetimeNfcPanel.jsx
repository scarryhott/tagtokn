import React, { useMemo, useState } from 'react';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { Radio, Send, Wifi, WifiOff } from 'lucide-react';
import {
  nfcTables,
  postLivePingReducer,
} from '../spacetimedb/nfcModule';

const DEFAULT_URI = 'http://127.0.0.1:3000';
const DEFAULT_DB = 'nfc-tap';

function formatRow(row) {
  const who = row.sender?.toHexString?.() ?? String(row.sender ?? '—');
  let when = '—';
  try {
    if (row.postedAt?.toISOString) when = row.postedAt.toISOString();
  } catch {
    when = '—';
  }
  return { who, when, body: row.body };
}

function nftWhen(row) {
  try {
    if (row.updatedAt?.toISOString) return row.updatedAt.toISOString();
  } catch {
    /* ignore */
  }
  return '—';
}

function SpacetimeNfcPanelConnected() {
  const ctx = useSpacetimeDB();
  const [rows, ready] = useTable(nfcTables.nfcLivePing);
  const [nfts, nftsReady] = useTable(nfcTables.publicGraphNft);
  const postPing = useReducer(postLivePingReducer);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const sorted = useMemo(() => {
    const r = [...rows];
    r.sort((a, b) => {
      const bb = BigInt(b.id ?? 0);
      const ba = BigInt(a.id ?? 0);
      if (bb > ba) return 1;
      if (bb < ba) return -1;
      return 0;
    });
    return r;
  }, [rows]);

  const nftSorted = useMemo(() => {
    const r = [...nfts];
    r.sort((a, b) => String(a.tokenId).localeCompare(String(b.tokenId)));
    return r;
  }, [nfts]);

  const send = async () => {
    const t = draft.trim();
    if (!t) return;
    setSending(true);
    try {
      await postPing({ body: t });
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ color: '#e4e4e7', maxWidth: 860 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 20,
          padding: 12,
          borderRadius: 12,
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid #27272a',
        }}
      >
        {ctx.isActive ? (
          <Wifi size={20} color="#4ade80" />
        ) : (
          <WifiOff size={20} color="#f87171" />
        )}
        <div style={{ flex: 1, fontSize: '0.85rem' }}>
          <div>
            <strong>SpacetimeDB</strong>{' '}
            {ctx.isActive ? 'connected' : 'connecting / offline'}
          </div>
          <div style={{ color: '#71717a', marginTop: 4 }}>
            Identity:{' '}
            {ctx.identity ? (
              <code style={{ fontSize: '0.72rem', color: '#a78bfa' }}>{ctx.identity.toHexString()}</code>
            ) : (
              '—'
            )}
          </div>
          {ctx.connectionError ? (
            <div style={{ color: '#f87171', marginTop: 6, fontSize: '0.8rem' }}>
              {String(ctx.connectionError?.message || ctx.connectionError)}
            </div>
          ) : null}
        </div>
        <div style={{ fontSize: '0.75rem', color: ready && nftsReady ? '#4ade80' : '#fbbf24' }}>
          {ready && nftsReady ? 'subscribed' : 'waiting…'}
        </div>
      </div>

      <h3 style={{ fontSize: '1rem', color: '#c084fc', margin: '0 0 12px' }}>Public graph NFTs (realtime)</h3>
      <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: 0, lineHeight: 1.5 }}>
        Rows sync from the Graph NFT hub when you mint or list with Spacetime enabled. Ownership is your STDB identity;{' '}
        <code style={{ color: '#94a3b8' }}>ownerUserId</code> mirrors NFC login for display.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {nftSorted.length === 0 ? (
          <div style={{ color: '#52525b', fontSize: '0.9rem' }}>No public NFT rows yet.</div>
        ) : (
          nftSorted.map((row) => (
            <div
              key={row.tokenId}
              style={{
                padding: 12,
                borderRadius: 10,
                background: '#111',
                border: '1px solid #27272a',
                fontSize: '0.82rem',
              }}
            >
              <code style={{ color: '#a5b4fc' }}>{row.tokenId}</code>
              <span style={{ margin: '0 10px', color: '#52525b' }}>·</span>
              <span style={{ color: row.listed ? '#4ade80' : '#71717a' }}>
                {row.listed ? `listed ${String(row.priceCents)}¢` : 'not listed'}
              </span>
              <div style={{ color: '#71717a', fontSize: '0.72rem', marginTop: 6 }}>
                user <code>{String(row.ownerUserId).slice(0, 16)}</code> · {nftWhen(row)}
              </div>
              {row.title ? <div style={{ marginTop: 8, fontWeight: 600 }}>{row.title}</div> : null}
              {row.body ? (
                <div style={{ marginTop: 4, color: '#a1a1aa', lineHeight: 1.4 }}>{row.body.slice(0, 280)}</div>
              ) : null}
            </div>
          ))
        )}
      </div>

      <h3 style={{ fontSize: '1rem', color: '#22d3ee', margin: '0 0 12px' }}>Live pings</h3>
      <p style={{ fontSize: '0.85rem', color: '#a1a1aa', lineHeight: 1.5, marginBottom: 16 }}>
        Realtime <code style={{ color: '#38bdf8' }}>nfc_live_ping</code> (public). Separate from Express/SQLite.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Short ping message"
          style={{
            flex: '1 1 200px',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #3f3f46',
            background: '#18181b',
            color: '#fafafa',
          }}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button
          type="button"
          disabled={sending || !ctx.isActive}
          onClick={send}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 10,
            border: 'none',
            cursor: sending || !ctx.isActive ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, #22d3ee, #a78bfa)',
            color: '#0a0a0a',
            fontWeight: 700,
          }}
        >
          <Send size={16} /> Post ping
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.length === 0 ? (
          <div style={{ color: '#52525b', fontSize: '0.9rem' }}>No pings yet.</div>
        ) : (
          sorted.map((row) => {
            const { who, when, body } = formatRow(row);
            return (
              <div
                key={String(row.id)}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: '#111',
                  border: '1px solid #27272a',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ color: '#71717a', fontSize: '0.72rem', marginBottom: 6 }}>
                  <code style={{ color: '#94a3b8' }}>
                    {who.length > 20 ? `${who.slice(0, 20)}…` : who}
                  </code>
                  <span style={{ margin: '0 8px' }}>·</span>
                  {when}
                </div>
                <div style={{ lineHeight: 1.4 }}>{body}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function SpacetimeNfcPanel() {
  const uri = import.meta.env.VITE_SPACETIMEDB_URI || '';

  if (!uri) {
    return (
      <div style={{ padding: 24, color: '#a1a1aa', maxWidth: 640, lineHeight: 1.6 }}>
        <h2 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 10, color: '#e4e4e7' }}>
          <Radio size={22} color="#22d3ee" /> SpacetimeDB
        </h2>
        <p style={{ margin: '0 0 12px' }}>
          Set <code style={{ color: '#fbbf24' }}>VITE_SPACETIMEDB_URI</code> (e.g.{' '}
          <code style={{ color: '#86efac' }}>{DEFAULT_URI}</code>) and optional{' '}
          <code style={{ color: '#fbbf24' }}>VITE_SPACETIMEDB_DATABASE</code> (default{' '}
          <code>{DEFAULT_DB}</code>).
        </p>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#71717a' }}>
          Republish after schema changes:{' '}
          <code style={{ color: '#c4b5fd' }}>spacetime publish {DEFAULT_DB} -p spacetimedb -y</code>
        </p>
      </div>
    );
  }

  return <SpacetimeNfcPanelConnected />;
}
