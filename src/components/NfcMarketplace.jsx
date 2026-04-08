import React, { useCallback, useEffect, useState } from 'react';
import { nfcAuthHeaders } from '../engine/user-accounts';
import { Gem, RefreshCw, ShoppingCart, Tags, Network, Link2 } from 'lucide-react';

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...nfcAuthHeaders(), ...(opts.headers || {}) };
  const r = await fetch(path, { ...opts, headers });
  const text = await r.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!r.ok) {
    const msg = json?.error || json?.message || json?.raw || r.statusText;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return json;
}

export default function NfcMarketplace({ currentUserId }) {
  const [tab, setTab] = useState('inventory');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const [inventory, setInventory] = useState([]);
  const [listings, setListings] = useState([]);

  const [ingest, setIngest] = useState({
    post_id: '',
    platform: 'twitter',
    author_handle: '',
    url: '',
    content_text: '',
    posted_at: new Date().toISOString(),
    verified: false,
    adminKey: '',
  });

  const [mintPostId, setMintPostId] = useState('');
  const [mintMeta, setMintMeta] = useState({ title: '', body: '' });
  const [mintResult, setMintResult] = useState(null);

  const [sell, setSell] = useState({ tokenId: '', priceUsd: '1.00' });
  const [scoreNode, setScoreNode] = useState('');
  const [scoreResult, setScoreResult] = useState(null);

  const [inter, setInter] = useState({ fromTokenId: '', toTokenId: '', linkType: 'comms' });
  const [interToManual, setInterToManual] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const lst = await api('/api/nft/listings');
      setListings(lst.listings || []);
    } catch {
      setListings([]);
    }
    try {
      const inv = await api('/api/nft/inventory');
      setInventory(inv.nfts || []);
    } catch (e) {
      setInventory([]);
      if (!String(e.message).includes('401')) setErr(e.message || String(e));
    }
  }, []);

  useEffect(() => {
    if (currentUserId) load();
  }, [currentUserId, load]);

  const showOk = (m) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 4000);
  };

  const submitIngest = async () => {
    setErr('');
    try {
      const hdr = {};
      if (ingest.adminKey) hdr['x-nfc-admin'] = ingest.adminKey;
      await api('/api/social/ingest', {
        method: 'POST',
        headers: hdr,
        body: JSON.stringify({
          post_id: ingest.post_id,
          platform: ingest.platform,
          author_handle: ingest.author_handle,
          url: ingest.url,
          content_text: ingest.content_text,
          posted_at: ingest.posted_at,
          verified: !!ingest.verified,
          verified_at: ingest.verified ? new Date().toISOString() : '',
        }),
      });
      showOk('Post recorded. You can mint from this post_id next.');
    } catch (e) {
      setErr(e.message || String(e));
    }
  };

  const submitMint = async () => {
    setErr('');
    setMintResult(null);
    try {
      const post = {
        post_id: mintPostId || ingest.post_id,
        platform: ingest.platform,
        author_handle: ingest.author_handle,
        url: ingest.url,
        content_text: ingest.content_text,
        posted_at: ingest.posted_at,
        verified: true,
        verified_at: new Date().toISOString(),
      };
      if (!post.post_id) throw new Error('Set post_id (or fill ingest form)');
      const out = await api('/api/nft/mint', {
        method: 'POST',
        body: JSON.stringify({
          post,
          nftNode: { title: mintMeta.title, body: mintMeta.body },
        }),
      });
      setMintResult(out);
      showOk(`Minted ${out.tokenId}. Add this id to social posts as nft_<hex> to tag.`);
      load();
    } catch (e) {
      setErr(e.message || String(e));
    }
  };

  const submitList = async () => {
    setErr('');
    const cents = Math.round(Number(String(sell.priceUsd).replace(/,/g, '')) * 100);
    if (!Number.isFinite(cents) || cents < 1) {
      setErr('Price must be at least $0.01');
      return;
    }
    try {
      await api('/api/nft/list', {
        method: 'POST',
        body: JSON.stringify({ tokenId: sell.tokenId, priceCents: cents, currency: 'USD' }),
      });
      showOk('Listing created.');
      load();
    } catch (e) {
      setErr(e.message || String(e));
    }
  };

  const buy = async (listingId) => {
    setErr('');
    try {
      await api('/api/nft/purchase', {
        method: 'POST',
        body: JSON.stringify({ listingId }),
      });
      showOk('Purchase complete.');
      load();
    } catch (e) {
      setErr(e.message || String(e));
    }
  };

  const runScore = async () => {
    setErr('');
    setScoreResult(null);
    try {
      const out = await api('/api/nft/score-candidate', {
        method: 'POST',
        body: JSON.stringify({ candidateNodeId: scoreNode, radius: 3 }),
      });
      setScoreResult(out);
    } catch (e) {
      setErr(e.message || String(e));
    }
  };

  const runInterconnect = async () => {
    setErr('');
    try {
      const toTokenId = inter.toTokenId || interToManual.trim();
      if (!inter.fromTokenId || !toTokenId) throw new Error('Set from and to token ids');
      await api('/api/nft/interconnect', {
        method: 'POST',
        body: JSON.stringify({
          fromTokenId: inter.fromTokenId,
          toTokenId,
          linkType: inter.linkType,
          meta: {},
        }),
      });
      showOk('Interconnect created.');
    } catch (e) {
      setErr(e.message || String(e));
    }
  };

  const faceNfts = inventory.filter((n) => n.isFaceNft);

  if (!currentUserId) {
    return (
      <div style={{ padding: 24, color: '#a1a1aa' }}>
        <Gem size={22} color="#f0abfc" style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Log in to use the <strong style={{ color: '#fafafa' }}>internal graph NFT</strong> marketplace (mint, list, buy).
      </div>
    );
  }

  const tabBtn = (id, label, Icon) => (
    <button
      type="button"
      key={id}
      onClick={() => setTab(id)}
      style={{
        padding: '8px 14px',
        borderRadius: 8,
        border: tab === id ? '1px solid #c084fc' : '1px solid #27272a',
        background: tab === id ? 'rgba(192,132,252,0.15)' : '#111',
        color: tab === id ? '#f5f3ff' : '#a1a1aa',
        cursor: 'pointer',
        fontSize: '0.8rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {Icon ? <Icon size={14} /> : null}
      {label}
    </button>
  );

  return (
    <div style={{ padding: '20px', color: '#e4e4e7', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gem size={22} color="#f0abfc" /> Graph NFT hub
          </h2>
          <p style={{ margin: '6px 0 0', color: '#71717a', fontSize: '0.85rem', maxWidth: 720 }}>
            Internal SQLite ledger: mint from verified posts, list, purchase, inventory, face-NFT interconnects. Distinct from the agent service marketplace.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
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
      {msg ? (
        <div style={{ padding: 12, borderRadius: 12, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', fontSize: '0.85rem' }}>{msg}</div>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {tabBtn('inventory', 'My NFTs', null)}
        {tabBtn('market', 'Listings', ShoppingCart)}
        {tabBtn('mint', 'Mint & ingest', Tags)}
        {tabBtn('extra', 'Score & interconnect', Network)}
      </div>

      {tab === 'inventory' && (
        <div style={{ background: '#0c0c0f', border: '1px solid #27272a', borderRadius: 12, padding: 16 }}>
          <h3 style={{ marginTop: 0, color: '#c084fc', fontSize: '1rem' }}>Inventory</h3>
          {inventory.length === 0 ? (
            <p style={{ color: '#52525b' }}>No NFTs yet. Mint from the Mint tab.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {inventory.map((n) => (
                <li
                  key={n.tokenId}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    background: '#111',
                    borderRadius: 8,
                    border: '1px solid #27272a',
                    fontSize: '0.82rem',
                  }}
                >
                  <div>
                    <code style={{ color: '#f0abfc', userSelect: 'all' }}>{n.tokenId}</code>
                    {n.isFaceNft ? <span style={{ marginLeft: 8, color: '#fbbf24', fontSize: '0.7rem' }}>face NFT</span> : null}
                  </div>
                  <div style={{ color: '#71717a', marginTop: 4 }}>
                    node {n.nodeId} · {n.acquisitionSource || 'mint'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'market' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div style={{ background: '#0c0c0f', border: '1px solid #27272a', borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0, color: '#38bdf8', fontSize: '1rem' }}>Active listings</h3>
            {listings.length === 0 ? (
              <p style={{ color: '#52525b' }}>None</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {listings.map((L) => (
                  <li key={L.listing_id} style={{ padding: 10, marginBottom: 8, background: '#111', borderRadius: 8, fontSize: '0.8rem' }}>
                    <div>
                      <code style={{ color: '#a5b4fc' }}>{L.token_id}</code>
                    </div>
                    <div style={{ color: '#a1a1aa' }}>
                      ${(L.price_cents / 100).toFixed(2)} {L.currency} · seller <code>{L.seller_user_id.slice(0, 12)}…</code>
                    </div>
                    {L.seller_user_id === currentUserId ? (
                      <span style={{ color: '#71717a', fontSize: '0.7rem' }}>your listing</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => buy(L.listing_id)}
                        style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, background: '#14532d', color: '#bbf7d0', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Buy
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div style={{ background: '#0c0c0f', border: '1px solid #27272a', borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0, color: '#38bdf8', fontSize: '1rem' }}>Create listing</h3>
            <select
              value={sell.tokenId}
              onChange={(e) => setSell((s) => ({ ...s, tokenId: e.target.value }))}
              style={{ width: '100%', padding: 8, borderRadius: 8, background: '#111', color: '#fff', border: '1px solid #333', marginBottom: 8 }}
            >
              <option value="">Select owned token</option>
              {inventory.map((n) => (
                <option key={n.tokenId} value={n.tokenId}>
                  {n.tokenId.slice(0, 24)}…
                </option>
              ))}
            </select>
            <input
              placeholder="Price USD"
              value={sell.priceUsd}
              onChange={(e) => setSell((s) => ({ ...s, priceUsd: e.target.value }))}
              style={{ width: '100%', padding: 8, borderRadius: 8, background: '#111', color: '#fff', border: '1px solid #333', marginBottom: 8 }}
            />
            <button type="button" onClick={submitList} style={{ padding: '8px 14px', borderRadius: 8, background: '#1e3a5f', color: '#e0f2fe', border: 'none', cursor: 'pointer' }}>
              List for sale
            </button>
          </div>
        </div>
      )}

      {tab === 'mint' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div style={{ background: '#0c0c0f', border: '1px solid #27272a', borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0, color: '#fbbf24', fontSize: '1rem' }}>1 · Record social post</h3>
            <p style={{ fontSize: '0.72rem', color: '#71717a' }}>Optional first step. For verified posts when server has `NFC_SOCIAL_ADMIN_KEY`, paste admin key below.</p>
            <input placeholder="post_id" value={ingest.post_id} onChange={(e) => setIngest((s) => ({ ...s, post_id: e.target.value }))} style={inp} />
            <input placeholder="platform" value={ingest.platform} onChange={(e) => setIngest((s) => ({ ...s, platform: e.target.value }))} style={inp} />
            <input placeholder="author_handle" value={ingest.author_handle} onChange={(e) => setIngest((s) => ({ ...s, author_handle: e.target.value }))} style={inp} />
            <input placeholder="url" value={ingest.url} onChange={(e) => setIngest((s) => ({ ...s, url: e.target.value }))} style={inp} />
            <textarea placeholder="content_text" value={ingest.content_text} onChange={(e) => setIngest((s) => ({ ...s, content_text: e.target.value }))} style={{ ...inp, minHeight: 72 }} />
            <input placeholder="posted_at ISO" value={ingest.posted_at} onChange={(e) => setIngest((s) => ({ ...s, posted_at: e.target.value }))} style={inp} />
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: 8 }}>
              <input type="checkbox" checked={ingest.verified} onChange={(e) => setIngest((s) => ({ ...s, verified: e.target.checked }))} />
              Mark verified (needs admin header if server enforces)
            </label>
            <input placeholder="Admin key (x-nfc-admin) optional" value={ingest.adminKey} onChange={(e) => setIngest((s) => ({ ...s, adminKey: e.target.value }))} style={inp} type="password" autoComplete="off" />
            <button type="button" onClick={submitIngest} style={{ marginTop: 8, padding: '8px 14px', borderRadius: 8, background: '#422006', color: '#fde68a', border: 'none', cursor: 'pointer' }}>
              Ingest post only
            </button>
          </div>
          <div style={{ background: '#0c0c0f', border: '1px solid #27272a', borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0, color: '#4ade80', fontSize: '1rem' }}>2 · Mint NFT</h3>
            <p style={{ fontSize: '0.72rem', color: '#71717a' }}>Post must be verified in DB. Mint re-upserts the post from the ingest fields on the left.</p>
            <input placeholder="post_id (defaults to ingest)" value={mintPostId} onChange={(e) => setMintPostId(e.target.value)} style={inp} />
            <input placeholder="NFT title" value={mintMeta.title} onChange={(e) => setMintMeta((s) => ({ ...s, title: e.target.value }))} style={inp} />
            <textarea placeholder="NFT body" value={mintMeta.body} onChange={(e) => setMintMeta((s) => ({ ...s, body: e.target.value }))} style={{ ...inp, minHeight: 60 }} />
            <button type="button" onClick={submitMint} style={{ marginTop: 8, padding: '8px 14px', borderRadius: 8, background: '#14532d', color: '#bbf7d0', border: 'none', cursor: 'pointer' }}>
              Mint from post
            </button>
            {mintResult ? (
              <pre style={{ marginTop: 12, fontSize: '0.7rem', color: '#86efac', overflow: 'auto', background: '#052e16', padding: 10, borderRadius: 8 }}>
                {JSON.stringify(mintResult, null, 2)}
              </pre>
            ) : null}
          </div>
        </div>
      )}

      {tab === 'extra' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div style={{ background: '#0c0c0f', border: '1px solid #27272a', borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Network size={18} /> Connectivity score
            </h3>
            <input placeholder="candidate node_id" value={scoreNode} onChange={(e) => setScoreNode(e.target.value)} style={inp} />
            <button type="button" onClick={runScore} style={{ marginTop: 8, padding: '8px 14px', borderRadius: 8, background: '#27272a', color: '#fff', border: '1px solid #3f3f46', cursor: 'pointer' }}>
              Score candidate
            </button>
            {scoreResult ? (
              <pre style={{ marginTop: 12, fontSize: '0.72rem', color: '#a1a1aa', overflow: 'auto' }}>{JSON.stringify(scoreResult, null, 2)}</pre>
            ) : null}
          </div>
          <div style={{ background: '#0c0c0f', border: '1px solid #27272a', borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link2 size={18} /> Face NFT interconnect
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#71717a' }}>You must own the <strong>from</strong> token. Both must be face-admissible.</p>
            <select
              value={inter.fromTokenId}
              onChange={(e) => setInter((s) => ({ ...s, fromTokenId: e.target.value }))}
              style={{ ...inp, marginBottom: 8 }}
            >
              <option value="">From (your face NFT)</option>
              {faceNfts.map((n) => (
                <option key={n.tokenId} value={n.tokenId}>
                  {n.tokenId.slice(0, 20)}…
                </option>
              ))}
            </select>
            <select
              value={inter.toTokenId}
              onChange={(e) => setInter((s) => ({ ...s, toTokenId: e.target.value }))}
              style={{ ...inp, marginBottom: 8 }}
            >
              <option value="">To token (yours)</option>
              {inventory.filter((i) => i.isFaceNft).map((n) => (
                <option key={n.tokenId} value={n.tokenId}>
                  {n.tokenId.slice(0, 20)}…
                </option>
              ))}
            </select>
            <input
              placeholder="Or paste any face NFT token_id"
              value={interToManual}
              onChange={(e) => setInterToManual(e.target.value)}
              style={inp}
            />
            <input placeholder="link type" value={inter.linkType} onChange={(e) => setInter((s) => ({ ...s, linkType: e.target.value }))} style={inp} />
            <button type="button" onClick={runInterconnect} style={{ marginTop: 8, padding: '8px 14px', borderRadius: 8, background: '#3b0764', color: '#f5f3ff', border: 'none', cursor: 'pointer' }}>
              Create interconnect
            </button>
          </div>
        </div>
      )}
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
