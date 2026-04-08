import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe, Link2, RefreshCw, Hexagon, Circle, Sparkles } from 'lucide-react';
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

function normalizeLayout(positions, pad = 40, size = 420, extraPoints = []) {
  const pts = [...positions.values(), ...extraPoints];
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

function hueFromUserId(userId) {
  let h = 216109;
  const s = String(userId);
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h % 360;
}

function PrimeWheelNav({ neighbors = [], selectedBucket, onSelectBucket }) {
  const counts = useMemo(() => {
    const c = { '-1': 0, '0': 0, '1': 0 };
    for (const n of neighbors) {
      const b = n.prime_bucket;
      const k = b < 0 ? '-1' : b > 0 ? '1' : '0';
      c[k] += 1;
    }
    return c;
  }, [neighbors]);

  const R = 54;
  const cx = 62;
  const cy = 62;
  const sectors = [
    { bucket: -1, label: '−1', start: -Math.PI / 2, end: Math.PI / 6, color: 'rgba(56,189,248,0.45)' },
    { bucket: 0, label: '0', start: Math.PI / 6, end: 5 * Math.PI / 6, color: 'rgba(167,139,250,0.45)' },
    { bucket: 1, label: '+1', start: 5 * Math.PI / 6, end: 3 * Math.PI / 2, color: 'rgba(251,191,36,0.4)' },
  ];

  function arcPath(s, e) {
    const x1 = cx + R * Math.cos(s);
    const y1 = cy + R * Math.sin(s);
    const x2 = cx + R * Math.cos(e);
    const y2 = cy + R * Math.sin(e);
    const large = e - s > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
  }

  return (
    <div>
      <div style={{ fontSize: '0.72rem', color: '#71717a', marginBottom: 6 }}>
        Prime wheel (neighbor angles → buckets). Tap a sector to highlight bucket.
      </div>
      <svg width={124} height={124} viewBox="0 0 124 124" style={{ display: 'block' }}>
        <circle cx={cx} cy={cy} r={R + 6} fill="none" stroke="#27272a" strokeWidth={1} />
        {sectors.map((sec) => {
          const k = sec.bucket < 0 ? '-1' : sec.bucket > 0 ? '1' : '0';
          const sel = selectedBucket === sec.bucket;
          return (
            <path
              key={sec.bucket}
              d={arcPath(sec.start, sec.end)}
              fill={sec.color}
              stroke={sel ? '#fafafa' : 'rgba(63,63,70,0.6)'}
              strokeWidth={sel ? 2 : 0.8}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectBucket(sel ? null : sec.bucket)}
            />
          );
        })}
        <text x={cx} y={cy - 8} textAnchor="middle" fill="#a1a1aa" fontSize="10">Σ</text>
        <text x={cx} y={cy + 6} textAnchor="middle" fill="#e4e4e7" fontSize="11" fontWeight={700}>
          {neighbors.length}
        </text>
      </svg>
      <div style={{ fontSize: '0.68rem', color: '#52525b', marginTop: 6, display: 'flex', gap: 10 }}>
        <span style={{ color: '#38bdf8' }}>−1: {counts['-1']}</span>
        <span style={{ color: '#a78bfa' }}>0: {counts['0']}</span>
        <span style={{ color: '#fbbf24' }}>+1: {counts['1']}</span>
      </div>
    </div>
  );
}

export default function TutteAtlas({ currentUserId = '', focusTokenId = '' }) {
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
  const [perspectival, setPerspectival] = useState({ paths: [] });
  const [showLightCurves, setShowLightCurves] = useState(true);
  const [nftTemporal, setNftTemporal] = useState(null);
  const [wheelFilter, setWheelFilter] = useState(null);
  const [graphActionNote, setGraphActionNote] = useState('');

  useEffect(() => {
    const id = currentUserId || '';
    setGuideUserId(id);
  }, [currentUserId]);

  useEffect(() => {
    if (!focusTokenId) return;
    setSelectedToken(focusTokenId);
  }, [focusTokenId]);

  const load = useCallback(async (guideId = '') => {
    setLoading(true);
    setErr('');
    try {
      const q = guideId.trim() ? `?guideUserId=${encodeURIComponent(guideId.trim())}` : '';
      const [g, h, pv] = await Promise.all([
        fetchJson(`/api/tutte/global${q}`),
        fetchJson('/api/barbour/history?limit=120'),
        fetchJson('/api/tutte/perspectival-paths?maxUsers=28'),
      ]);
      setGlobalData(g);
      setHistory(h.snapshots || []);
      setPerspectival(pv);
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

  useEffect(() => {
    if (!selectedToken) {
      setNftTemporal(null);
      return;
    }
    let cancelled = false;
    fetchJson(`/api/tutte/nft/${encodeURIComponent(selectedToken)}/temporal`)
      .then((t) => {
        if (!cancelled && t?.points) setNftTemporal(t);
      })
      .catch(() => {
        if (!cancelled) setNftTemporal(null);
      });
    return () => { cancelled = true; };
  }, [selectedToken]);

  const pathExtraPoints = useMemo(() => {
    if (!showLightCurves || !perspectival?.paths?.length) return [];
    const out = [];
    for (const p of perspectival.paths) {
      for (const pt of p.points || []) out.push({ x: pt.x, y: pt.y });
    }
    return out;
  }, [showLightCurves, perspectival]);

  const posMap = useMemo(() => buildPosMap(globalData?.positions), [globalData]);
  const layout = useMemo(
    () => normalizeLayout(posMap, 48, 460, pathExtraPoints),
    [posMap, pathExtraPoints],
  );
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
            Temporal chain-ledger geometry: Tutte harmonic embedding, Julian Barbour–style shape-sphere snapshots,
            prime-wheel neighbor buckets, and perspectival light curves (user centroids across epochs).
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
        <button
          type="button"
          onClick={() => setShowLightCurves((v) => !v)}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: showLightCurves ? '1px solid #f472b6' : '1px solid #3f3f46',
            background: showLightCurves ? 'rgba(244,114,182,0.15)' : '#18181b',
            color: showLightCurves ? '#fce7f3' : '#a1a1aa',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.78rem',
          }}
        >
          <Sparkles size={14} />
          Light curves
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
              setGraphActionNote('');
              setBusy(true);
              try {
                const out = await fetchJson('/api/graph/connect', {
                  method: 'POST',
                  body: JSON.stringify({ ...connectForm, edgeType: 'user_connect' }),
                });
                setConnectPreview(null);
                const v = out?.vitiatedLinks ?? 0;
                setGraphActionNote(
                  v > 0
                    ? `Edge applied. ${v} joint route(s) no longer highlighted (face collapse).`
                    : 'Edge applied.',
                );
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
            admission surcharge {connectPreview.collapseSurcharge?.toFixed(3) ?? '0'},
            faces {connectPreview.collapsedFaces.length}) — vitiates highlighted joint interconnects through those faces.
          </div>
        ) : null}
        {graphActionNote ? (
          <div style={{ width: '100%', color: '#86efac', fontSize: '0.72rem' }}>{graphActionNote}</div>
        ) : null}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(280px, 0.9fr)', gap: '20px' }}>
        <div style={{ background: '#0c0c0f', borderRadius: 16, border: '1px solid #27272a', padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe size={14} /> Global Tutte · epoch {globalData?.epoch ?? '—'}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#52525b' }}>
              Gold ring = face NFT · Cyan = guide · Gold = centroid · Bright purple = live joint route · Muted = collapsed / taxed
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
                <filter id="curveGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.2" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <rect width="460" height="460" fill="#09090b" rx="12" />
              {showLightCurves && layout.toPixel && (perspectival.paths || []).map((pathRow) => {
                const pts = (pathRow.points || []).map((pt) => layout.toPixel({ x: pt.x, y: pt.y }));
                if (pts.length < 2) return null;
                const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
                const hue = hueFromUserId(pathRow.userId);
                const ownsSel = selectedToken && (pathRow.tokenIds || []).includes(selectedToken);
                const stroke = `hsla(${hue}, 72%, 58%, ${ownsSel ? 0.92 : 0.42})`;
                return (
                  <path
                    key={pathRow.userId}
                    d={d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={ownsSel ? 4 : 2.2}
                    filter="url(#curveGlow)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}
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
                const live =
                  l.route_highlight == null || l.route_highlight === undefined || Number(l.route_highlight) === 1;
                return (
                  <path
                    key={l.link_id}
                    d={`M ${pa.x} ${pa.y} Q ${(pa.x + pb.x) / 2} ${(pa.y + pb.y) / 2 - 28} ${pb.x} ${pb.y}`}
                    fill="none"
                    stroke={live ? 'rgba(167,139,250,0.78)' : 'rgba(82,82,91,0.42)'}
                    strokeWidth={live ? 2 : 1}
                    strokeDasharray={live ? '6 4' : '3 8'}
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
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Link2 size={12} /> Purple = admissible joint route; gray dash = vitiated or taxed</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#0c0c0f', borderRadius: 16, border: '1px solid #27272a', padding: 16 }}>
            <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              Barbour shape sphere (configuration-time snapshots)
            </div>
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

          <div style={{ background: '#0c0c0f', borderRadius: 16, border: '1px solid #27272a', padding: 16 }}>
            <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: 8 }}>Prime wheel navigator (guide neighbors)</div>
            {ug?.perspectivalRepellorsApplied > 0 ? (
              <div style={{ fontSize: '0.68rem', color: '#a78bfa', marginBottom: 8, lineHeight: 1.4 }}>
                Perspectival tax field: your primary guide is steered away from <strong>{ug.perspectivalRepellorsApplied}</strong> active
                collapse / inadmissible domain(s) owned by others (token-space chords you are not encouraged to align with).
              </div>
            ) : null}
            {ug?.neighbors?.length ? (
              <>
                <PrimeWheelNav
                  neighbors={ug.neighbors}
                  selectedBucket={wheelFilter}
                  onSelectBucket={setWheelFilter}
                />
                <div style={{ maxHeight: 120, overflow: 'auto', marginTop: 8, fontSize: '0.68rem', color: '#71717a' }}>
                  {(wheelFilter == null
                    ? ug.neighbors
                    : ug.neighbors.filter((n) => n.prime_bucket === wheelFilter)
                  ).slice(0, 14).map((n) => (
                    <div key={`${n.anchor_node_id}-${n.neighbor_node_id}`} style={{ marginBottom: 4 }}>
                      <code style={{ color: '#a1a1aa' }}>{n.neighbor_node_id}</code>
                      <span style={{ marginLeft: 6, opacity: 0.85 }}>{n.bucket_label}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: '#52525b', fontSize: '0.78rem' }}>Set user id and load guides, or run global recompute.</div>
            )}
          </div>

          <div style={{ background: '#0c0c0f', borderRadius: 16, border: '1px solid #27272a', padding: 16, flex: 1, minHeight: 160 }}>
            <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: 8 }}>Selected NFT · temporal Tutte trail</div>
            {!selectedToken && <div style={{ color: '#52525b', fontSize: '0.8rem' }}>Click an NFT node on the graph.</div>}
            {selectedToken && overlay && (
              <div style={{ fontSize: '0.78rem', lineHeight: 1.6 }}>
                <div><strong>Identity</strong> <code>{selectedToken}</code></div>
                <a
                  href={`/api/identity/${encodeURIComponent(selectedToken)}/nrr-ledger`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.72rem', color: '#7dd3fc' }}
                >
                  Immutable NRR ledger (genesis + epochs + mutators)
                </a>
                {nftTemporal?.points?.length > 0 ? (
                  <div style={{ marginTop: 6, color: '#a78bfa' }}>
                    Epoch trail: {nftTemporal.points.length} sample(s){' '}
                    (e{nftTemporal.points[0].epoch}→e{nftTemporal.points[nftTemporal.points.length - 1].epoch})
                  </div>
                ) : (
                  <div style={{ marginTop: 6, color: '#52525b' }}>Recompute global Tutte again to accumulate epoch history for this node.</div>
                )}
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
