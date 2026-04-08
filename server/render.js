import { barbourFaceColors } from './engine.js';

function svgEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function normalizePoints(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  return points.map((p) => ({
    x: (p.x - minX) / w,
    y: (p.y - minY) / h,
  }));
}

export function renderNftFacesSvg({ tokenId, title = '', faces, positions, size = 1024 } = {}) {
  const bg = '#0b0f17';
  const stroke = '#7dd3fc';

  // Collect points used across faces for normalization
  const used = [];
  for (const f of faces) {
    for (const nodeId of f.cycle) {
      const p = positions.get(nodeId);
      if (p) used.push(p);
    }
  }
  if (used.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="100%" height="100%" fill="${bg}"/>
  <text x="48" y="96" font-family="ui-sans-serif, system-ui" font-size="40" fill="${stroke}">
    ${svgEscape(title || tokenId || 'NFT')}
  </text>
</svg>`;
  }

  const norm = normalizePoints(used);
  let idx = 0;
  const map = new Map();
  for (const f of faces) {
    for (const nodeId of f.cycle) {
      if (!map.has(nodeId)) {
        map.set(nodeId, norm[idx]);
        idx++;
      }
    }
  }

  function px(t) {
    const pad = 0.10;
    return Math.round((pad + (1 - 2 * pad) * t) * size);
  }

  const polys = faces.slice(0, 8).map((f, i) => {
    const pts = f.cycle.map((id) => map.get(id)).filter(Boolean);
    const d = pts.map((p) => `${px(p.x)},${px(1 - p.y)}`).join(' ');
    const { fill, stroke: strokeCol } = barbourFaceColors(f, positions);
    const sw = Math.max(2, Math.min(8, Math.round(2 + 6 * Math.sqrt(f.area || 0.0001))));
    return `<polygon points="${d}" fill="${fill}" stroke="${svgEscape(strokeCol)}" stroke-width="${sw}" stroke-linejoin="round" />`;
  }).join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="g" cx="30%" cy="20%" r="90%">
      <stop offset="0%" stop-color="#111a2b"/>
      <stop offset="100%" stop-color="${bg}"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <g opacity="0.98">
    ${polys}
  </g>
  <text x="48" y="${size - 64}" font-family="ui-sans-serif, system-ui" font-size="34" fill="${stroke}" opacity="0.85">
    ${svgEscape(title || tokenId || '')}
  </text>
</svg>`;
}

