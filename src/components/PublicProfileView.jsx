import React, { useEffect, useState } from 'react';
import { User, Link as LinkIcon, ArrowLeft } from 'lucide-react';

export default function PublicProfileView({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    setErr('');
    setData(null);
    if (!userId) return () => {};
    fetch(`/api/public/profile/${encodeURIComponent(userId)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || `${r.status}`);
        return j;
      })
      .then((j) => {
        if (!cancelled) setData(j);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message || String(e));
      });
    return () => { cancelled = true; };
  }, [userId]);

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#e4e4e7', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <button
        type="button"
        onClick={onClose}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 24,
          padding: '10px 16px',
          borderRadius: 10,
          border: '1px solid #27272a',
          background: '#111',
          color: '#fafafa',
          cursor: 'pointer',
        }}
      >
        <ArrowLeft size={18} /> Back to app
      </button>

      {err ? (
        <div style={{ padding: 16, borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)' }}>{err}</div>
      ) : null}

      {data && (
        <article style={{ maxWidth: 560, margin: '0 auto' }}>
          <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #38bdf8, #a78bfa)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={32} color="#050505" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, fontFamily: 'Outfit, system-ui' }}>
                {data.user.displayName || data.user.username}
              </h1>
              <p style={{ margin: '4px 0 0', color: '#71717a', fontSize: '0.9rem' }}>@{data.user.username}</p>
              <code style={{ fontSize: '0.7rem', color: '#52525b' }}>{data.user.id}</code>
            </div>
          </header>

          {data.user.bio ? (
            <section style={{ marginBottom: 24, padding: 16, background: '#0c0c0f', borderRadius: 12, border: '1px solid #27272a', lineHeight: 1.6 }}>
              {data.user.bio}
            </section>
          ) : null}

          <section>
            <h2 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a', marginBottom: 12 }}>Verified social links</h2>
            {data.socialLinks?.length ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {data.socialLinks.map((l, i) => (
                  <li
                    key={`${l.platform}-${l.handle}-${i}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 12,
                      marginBottom: 8,
                      background: '#111',
                      borderRadius: 10,
                      border: '1px solid #27272a',
                    }}
                  >
                    <LinkIcon size={18} color="#38bdf8" />
                    <div>
                      <strong style={{ color: '#fafafa' }}>{l.platform}</strong>
                      <div style={{ color: '#a1a1aa' }}>{l.handle}</div>
                      {l.profile_url ? (
                        <a href={l.profile_url} style={{ color: '#7dd3fc', fontSize: '0.8rem' }} target="_blank" rel="noreferrer">
                          Profile
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#52525b' }}>No public links (or owner has hidden them).</p>
            )}
          </section>

          <p style={{ marginTop: 32, fontSize: '0.72rem', color: '#3f3f46' }}>
            Public TAP / NFC profile · JSON also at <code>/api/public/profile/{data.user.id}</code>
          </p>
        </article>
      )}
    </div>
  );
}
