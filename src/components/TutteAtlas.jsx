import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe, Link2, RefreshCw, Hexagon, Circle } from 'lucide-react';
import { nfcAuthHeaders } from '../engine/user-accounts';

const API = '';

async function fetchJson(path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: { ...nfcAuthHeaders(), ...(opts.headers || {}) },
  });
  const text = await r.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!r.ok) {
    if (r.status === 401) {
      throw new Error('Sign in required (use My Profile). Recompute, graph connect, and previews need a session.');
    }
    throw new Error(data.message || data.error || `${path} ${r.status}`);
  }
  return data;
}

function buildPosMap(positions) {
  const m = new Map();
  for (const p of positions || []) m.set(p.node_id, { x: p.x, y: p.y });
  return m;
}

function normalizeLayout(positions, pad = 40, size = 420) {
  const pts = [...positions.values()];
  if (!pts.length) {
    return {
      map: new Map(),
      scale: 1,
      ox: 0,
      oy: 0,
      toPixel: () => ({ x: 0, y: 0 }),
    };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const inner = size - 2 * pad;
  const scale = inner / Math.max(w, h);
  const map = new Map();
  for (const [id, p] of positions) {
    const nx = pad + (p.x - minX) * scale;
    const ny = pad + (p.y - minY) * scale;
    map.set(id, { x: nx, y: ny });
  }
  function toPixel(p) {
    return { x: pad + (p.x - minX) * scale, y: pad + (p.y - minY) * scale };
  }
  return { map, scale, ox: minX, oy: minY, toPixel };
}

export default function TutteAtlas({ currentUserId = '' }) {
  const [globalData, setGlobalData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selectedToken, setSelectedToken] = useState(null);
  const [overlay, setOverlay] = useState(null);
  const [busy, setBusy] = useState(false);
  const [guideUserId, setGuideUserId] = useState(currentUserId || '');
  const [connectPreview, setConnectPreview] = useState(null);
  const [connectForm, setConnectForm] = useState({
    fromNodeId: '',
    toNodeId: '',
  });

  useEffect(() => {
    const id = currentUserId || '';
    setGuideUserId(id);
  }, [currentUserId]);

  const load = useCallback(async (guideId = '') => {
    setLoading(true);
    setErr('');
    try {
      const q = guideId.trim() ? `?guideUserId=${encodeURIComponent(guideId.trim())}` : '';
      const [g, h] = await Promise.all([
        fetchJson(`/api/tutte/global${q}`),
        fetchJson('/api/barbour/history?limit=120'),
      ]);
      setGlobalData(g);
      setHistory(h.snapshots || []);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedToken) {
      setOverlay(null);
      return;
    }
    let cancelled = false;
    fetchJson(`/api/tutte/nft/${encodeURIComponent(selectedToken)}/overlay`)
      .then((o) => {
        if (!cancelled) setOverlay(o);
      })
      .catch(() => {
        if (!cancelled) setOverlay(null);
      });
    return () => { cancelled = true; };
  }, [selectedToken]);

  const posMap = useMemo(() => buildPosMap(globalData?.positions), [globalData]);
  const layout = useMemo(() => normalizeLayout(posMap, 48, 460), [posMap]);
  const ug = globalData?.userGuides;
  const nodeById = useMemo(() => {
    const m = new Map();
    for (const n of globalData?.nodes || []) m.set(n.node_id, n);
    return m;
  }, [globalData]);
  const nftByToken = useMemo(() => {
    const m = new Map();
    for (const t of globalData?.nfts || []) m.set(t.token_id, t);
    return m;
  }, [globalData]);

  const onRecompute = async () => {
    setBusy(true);
    setErr('');
    try {
      await fetchJson('/api/engine/recompute', { method: 'POST', body: JSON.stringify({}) });
      await load(guideUserId);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const sphereSize = 280;
  const spherePad = 24;
  const spherePath = useMemo(() => {
    if (!history.length) return '';
    const cx = sphereSize / 2;
    const cy = sphereSize / 2;
    const R = sphereSize / 2 - spherePad;
    const pts = history.map((s, i) => {
      const t = i / Math.max(1, history.length - 1);
      const u = s.centroid_x ?? 0;
      const v = s.centroid_z ?? 0;
      const w = s.sphere_radius ?? 0;
      const px = cx + u * R * 0.85;
      const py = cy + v * R * 0.85 - (w / (0.5 + (s.stress || 0.1))) * 8;
      return `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`;
    });
    return pts.join(' ');
  }, [history, sphereSize, spherePad]);

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', color: '#e4e4e7' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Hexagon size={22} color="#38bdf8" /> Tutte Atlas
          </h2>
          <p style={{ margin: '6px 0 0', color: '#71717a', fontSize: '0.85rem', maxWidth: 720 }}>
            Global harmonic Tutte embedding, face-admissible NFTs (exactly one NFT on a Tutte face cycle), Barbour shape-sphere
            trail over epochs, and local–global overlays per token.
          </p>
        </div>
        <button
          type="button"
          onClick={onRecompute}
          disabled={busy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 12,
            border: '1px solid #27272a',
            background: '#18181b',
            color: '#fafafa',
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          <RefreshCw size={16} />
          Recompute global Tutte
        </button>
      </div>

      {err && (
        <div style={{ padding: 12, borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', fontSize: '0.85rem' }}>
          {err}
        </div>
      )}

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'flex-end',
        padding: 14,
        borderRadius: 12,
        border: '1px solid #27272a',
        background: '#0c0c0f',
        fontSize: '0.78rem',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ color: '#a1a1aa' }}>User id (guide vectors on graph)</span>
          <input
            value={guideUserId}
            onChange={(e) => setGuideUserId(e.target.value)}
            placeholder="e.g. alice"
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #3f3f46', background: '#18181b', color: '#fafafa', width: 160 }}
          />
        </div>
        <button
          type="button"
          onClick={() => load(guideUserId)}
          style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #3b82f6', background: '#1e3a5f', color: '#e0f2fe', cursor: 'pointer' }}
        >
          Load guides
        </button>
        <div style={{ borderLeft: '1px solid #27272a', paddingLeft: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
          <input placeholder="from node" value={connectForm.fromNodeId} onChange={(e) => setConnectForm((s) => ({ ...s, fromNodeId: e.target.value }))} style={{ width: 120, padding: 8, borderRadius: 8, border: '1px solid #3f3f46', background: '#18181b', color: '#fff' }} />
          <input placeholder="to node" value={connectForm.toNodeId} onChange={(e) => setConnectForm((s) => ({ ...s, toNodeId: e.target.value }))} style={{ width: 120, padding: 8, borderRadius: 8, border: '1px solid #3f3f46', background: '#18181b', color: '#fff' }} />
          <button
            type="button"
            onClick={async () => {
              setConnectPreview(null);
              try {
                const o = await fetchJson('/api/graph/connect/preview', {
                  method: 'POST',
                  body: JSON.stringify(connectForm),
                });
                setConnectPreview(o);
              } catch (e) {
                setErr(e.message || String(e));
              }
            }}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #52525b', background: '#27272a', color: '#fff', cursor: 'pointer' }}
          >
            Preview α impact
          </button>
          <button
            type="button"
            onClick={async () => {
              setErr('');
              setBusy(true);
              try {
                await fetchJson('/api/graph/connect', {
                  method: 'POST',
                  body: JSON.stringify({ ...connectForm, edgeType: 'user_connect' }),
                });
                setConnectPreview(null);
                await load(guideUserId);
              } catch (e) {
                setErr(e.message || String(e));
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy || !connectForm.fromNodeId || !connectForm.toNodeId}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #16a34a', background: '#14532d', color: '#bbf7d0', cursor: busy ? 'wait' : 'pointer', opacity: busy || !connectForm.fromNodeId || !connectForm.toNodeId ? 0.5 : 1 }}
          >
            Apply edge
          </button>
        </div>
        {connectPreview?.collapsedFaces ? (
          <div style={{ width: '100%', color: '#a1a1aa', fontSize: '0.72rem' }}>
            Δα ≈ {connectPreview.projectedAlphaDelta?.toFixed(4)} (alignment {connectPreview.guideAlignment?.toFixed(3)},
            collapse weight {connectPreview.collapseWeight?.toFixed(3)},
            faces {connectPreview.collapsedFaces.length})
          </div>
        ) : null}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(280px, 0.9fr)', gap: '20px' }}>
        <div style={{ background: '#0c0c0f', borderRadius: 16, border: '1px solid #27272a', padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe size={14} /> Global Tutte · epoch {globalData?.epoch ?? '—'}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#52525b' }}>
              Gold ring = face NFT · Cyan arrow = guide · Gold = your centroid
            </span>
          </div>
          {loading ? (
            <div style={{ height: 460, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b' }}>Loading…</div>
          ) : (
            <svg width="100%" height={460} viewBox="0 0 460 460" style={{ maxWidth: '100%' }}>
              <defs>
                <marker id="arrowG" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#38bdf8" />
                </marker>
              </defs>
              <rect width="460" height="460" fill="#09090b" rx="12" />
              {(globalData?.edges || []).map((e) => {
                const a = layout.map.get(e.from_node_id);
                const b = layout.map.get(e.to_node_id);
                if (!a || !b) return null;
                return (
                  <line
                    key={e.edge_id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="rgba(63,63,70,0.55)"
                    strokeWidth={1}
                  />
                );
              })}
              {(globalData?.interconnects || []).map((l) => {
                const na = nftByToken.get(l.from_token_id)?.node_id;
                const nb = nftByToken.get(l.to_token_id)?.node_id;
                const pa = na ? layout.map.get(na) : null;
                const pb = nb ? layout.map.get(nb) : null;
                if (!pa || !pb) return null;
                return (
                  <path
                    key={l.link_id}
                    d={`M ${pa.x} ${pa.y} Q ${(pa.x + pb.x) / 2} ${(pa.y + pb.y) / 2 - 28} ${pb.x} ${pb.y}`}
                    fill="none"
                    stroke="rgba(167,139,250,0.75)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                );
              })}
              {ug?.userCentroid && layout.toPixel ? (
                <g opacity={0.95}>
                  {(() => {
                    const base = layout.toPixel(ug.userCentroid);
                    const L = 56;
                    const p1 = ug.primaryGuide;
                    const p2 = ug.secondaryGuide;
                    const ex = base.x + p1.x * L;
                    const ey = base.y + p1.y * L;
                    const ex2 = base.x + p2.x * L * 0.7;
                    const ey2 = base.y + p2.y * L * 0.7;
                    return (
                      <>
                        <line x1={base.x} y1={base.y} x2={ex} y2={ey} stroke="#38bdf8" strokeWidth={2.5} markerEnd="url(#arrowG)" />
                        <line x1={base.x} y1={base.y} x2={ex2} y2={ey2} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 3" />
                        <circle cx={base.x} cy={base.y} r={6} fill="none" stroke="#fbbf24" strokeWidth={2} />
                      </>
                    );
                  })()}
                </g>
              ) : null}
              {(globalData?.nodes || []).map((n) => {
                const p = layout.map.get(n.node_id);
                if (!p) return null;
                const nft = (globalData?.nfts || []).find((t) => t.node_id === n.node_id);
                let fill = '#3f3f46';
                let r = 5;
                if (nft) {
                  fill = nft.is_face_nft ? '#fbbf24' : '#a78bfa';
                  r = nft.is_face_nft ? 8 : 6;
                }
                const isSel = selectedToken && nft?.token_id === selectedToken;
                return (
                  <g key={n.node_id} style={{ cursor: nft ? 'pointer' : 'default' }} onClick={() => nft && setSelectedToken(nft.token_id)}>
                    {nft?.is_face_nft ? (
                      <circle cx={p.x} cy={p.y} r={r + 4} fill="none" stroke="#fbbf24" strokeWidth={isSel ? 3 : 1.5} opacity={0.9} />
                    ) : null}
                    <circle cx={p.x} cy={p.y} r={r} fill={fill} stroke="#18181b" strokeWidth={1} />
                  </g>
                );
              })}
            </svg>
          )}
          <div style={{ marginTop: 12, fontSize: '0.72rem', color: '#52525b', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Circle size={12} fill="#fbbf24" /> Face NFT (interconnect admissible)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Circle size={12} fill="#a78bfa" /> Non-face NFT</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Link2 size={12} /> Dashed purple = interconnect (contracts / comms)</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#0c0c0f', borderRadius: 16, border: '1px solid #27272a', padding: 16 }}>
            <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: 8 }}>Barbour shape sphere (centroid trail · radius / stress)</div>
            <svg width={sphereSize} height={sphereSize} viewBox={`0 0 ${sphereSize} ${sphereSize}`} style={{ display: 'block', margin: '0 auto' }}>
              <circle cx={sphereSize / 2} cy={sphereSize / 2} r={sphereSize / 2 - spherePad} fill="none" stroke="#27272a" strokeWidth={1} />
              {spherePath ? (
                <path d={spherePath} fill="none" stroke="url(#gradB)" strokeWidth={2} strokeLinecap="round" />
              ) : (
                <text x={sphereSize / 2} y={sphereSize / 2} textAnchor="middle" fill="#52525b" fontSize="12">Run global recompute</text>
              )}
              <defs>
                <linearGradient id="gradB" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
              </defs>
            </svg>
            {history.length > 0 && (
              <div style={{ fontSize: '0.68rem', color: '#71717a', marginTop: 8 }}>
                Latest R={history[history.length - 1]?.sphere_radius?.toFixed(4) ?? '—'} · ᾱ={Number(history[history.length - 1]?.alpha_mean ?? 0).toFixed(4)}
              </div>
            )}
          </div>

          <div style={{ background: '#0c0c0f', borderRadius: 16, border: '1px solid #27272a', padding: 16, flex: 1, minHeight: 160 }}>
            <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: 8 }}>Selected NFT · local vs global</div>
            {!selectedToken && <div style={{ color: '#52525b', fontSize: '0.8rem' }}>Click an NFT node on the graph.</div>}
            {selectedToken && overlay && (
              <div style={{ fontSize: '0.78rem', lineHeight: 1.6 }}>
                <div><strong>Token</strong> {selectedToken}</div>
                <div>Global face flag: {overlay.isFaceNftOnGlobal ? 'yes (face-admissible)' : 'no'}</div>
                <div>Local faces (NFT count on cycle): {overlay.localFaces?.filter((f) => f.nftNodeCount >= 1).length ?? 0} with cycles</div>
                <div>Local stress: {overlay.localStress?.toFixed?.(5) ?? overlay.localStress}</div>
                <img
                  alt="NFT face SVG"
                  src={`/api/nft/${encodeURIComponent(selectedToken)}/image.svg`}
                  style={{ marginTop: 10, maxWidth: '100%', borderRadius: 8, border: '1px solid #27272a' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
