export const maxDuration = 60;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const sourceUrl = 'https://raw.githubusercontent.com/scarryhott/tagtokn/main/api/arc-v33-autonomous.js';
  const response = await fetch(sourceUrl, { cache: 'no-store' });
  if (!response.ok) {
    return res.status(500).json({ error: 'Could not load autonomous policy source' });
  }
  let source = await response.text();
  source = source.replace('receipts.at(-1]?.potential_relation_count', 'receipts.at(-1)?.potential_relation_count');
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  const policy = await import(moduleUrl);
  return policy.default(req, res);
}
