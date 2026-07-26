import crypto from 'node:crypto';

export const maxDuration = 60;

const ARC_ROOT = 'https://three.arcprize.org';
const CIPHERTEXT = 'CyfGPu9xFcQvImZPFMbVHCyynEJXcPyylpqwtlEiBy1A9UTk';
const NONCE_HASH = '795ae68f49e895a8ca33832dee3d515cdae0254d837aea0c3a5bdb0636960906';
const EXPIRES_AT = '2026-07-27T00:37:26.678914+00:00';
const LS20_V15_CLOSURE_PATH = [3, 3, 3, 1, 1, 1, 1, 4, 4, 4, 1, 1, 1];

function scalar(value) {
  return Array.isArray(value) ? value[0] : value;
}

function b64urlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, 'base64');
}

function sha(value) {
  return crypto
    .createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex')
    .slice(0, 20);
}

function decryptKey(padEncoded) {
  const cipher = b64urlDecode(CIPHERTEXT);
  const pad = b64urlDecode(padEncoded);
  if (cipher.length !== pad.length) throw new Error('Invalid invocation material');
  const plain = Buffer.alloc(cipher.length);
  for (let i = 0; i < cipher.length; i += 1) plain[i] = cipher[i] ^ pad[i];
  const key = plain.toString('utf8');
  plain.fill(0);
  pad.fill(0);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
    throw new Error('Invalid invocation material');
  }
  return key;
}

function frameDigest(frame) {
  return sha({ frame });
}

function reclose(ledger) {
  const nodes = new Set();
  const obtained = new Set();
  for (const contact of ledger) {
    nodes.add(contact.source_digest);
    nodes.add(contact.returned_digest);
    obtained.add(contact.raw_relation_digest);
  }

  const pairs = new Set();
  for (const node of nodes) pairs.add(`${node}>${node}`);
  for (const contact of ledger) {
    pairs.add(`${contact.source_digest}>${contact.returned_digest}`);
    pairs.add(`${contact.returned_digest}>${contact.source_digest}`);
  }

  let changed = true;
  while (changed) {
    changed = false;
    const decoded = [...pairs].map((item) => item.split('>'));
    for (const [leftFrom, leftTo] of decoded) {
      for (const [rightFrom, rightTo] of decoded) {
        if (leftTo !== rightFrom) continue;
        const composed = `${leftFrom}>${rightTo}`;
        if (!pairs.has(composed)) {
          pairs.add(composed);
          changed = true;
        }
      }
    }
  }

  const potential = [...pairs].sort();
  const obtainedRelations = [...obtained].sort();
  return {
    obtained_digest: sha({ obtained: obtainedRelations }),
    potential_digest: sha({ potential }),
    obtained_relation_count: obtainedRelations.length,
    potential_relation_count: potential.length,
  };
}

function mergeCookies(jar, response) {
  let values = [];
  if (typeof response.headers.getSetCookie === 'function') {
    values = response.headers.getSetCookie();
  } else {
    const one = response.headers.get('set-cookie');
    if (one) values = [one];
  }
  for (const value of values) {
    const first = value.split(';', 1)[0];
    const split = first.indexOf('=');
    if (split > 0) jar.set(first.slice(0, split), first.slice(split + 1));
  }
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (key.toLowerCase().includes('api_key')) continue;
    out[key] = sanitize(child);
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (Date.now() > Date.parse(EXPIRES_AT)) {
    return res.status(410).json({ error: 'Runner expired' });
  }

  const nonce = scalar(req.query?.n);
  const pad = scalar(req.query?.p);
  if (!nonce || !pad || sha(nonce) !== NONCE_HASH.slice(0, 20)) {
    return res.status(403).json({ error: 'Invalid invocation' });
  }

  let apiKey = '';
  let cardId = null;
  let closed = false;
  const cookies = new Map();

  async function request(path, { method = 'POST', body } = {}) {
    const headers = {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    };
    const cookie = cookieHeader(cookies);
    if (cookie) headers.Cookie = cookie;

    const response = await fetch(`${ARC_ROOT}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'follow',
      cache: 'no-store',
    });
    mergeCookies(cookies, response);
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text.slice(0, 500) };
    }
    if (!response.ok) {
      const safe = JSON.stringify(sanitize(data)).slice(0, 1000);
      throw new Error(`ARC ${path} failed with ${response.status}: ${safe}`);
    }
    return data;
  }

  try {
    apiKey = decryptKey(pad);

    const opened = await request('/api/scorecard/open', {
      body: {
        source_url: 'https://github.com/scarryhott/tagtokn/tree/arc-v33-live-run-20260726',
        tags: ['nrr-v33', 'whole-history-reclosure', 'ls20', 'bounded'],
        opaque: {
          policy: 'v15-closure-path-presented-through-v33-whole-history-reclosure',
          action_path_digest: sha(LS20_V15_CLOSURE_PATH),
          max_actions: LS20_V15_CLOSURE_PATH.length,
          key_persisted: false,
        },
      },
    });
    cardId = opened.card_id;

    let observation = await request('/api/cmd/RESET', {
      body: { game_id: 'ls20', card_id: cardId },
    });

    const gameId = observation.game_id;
    const guid = observation.guid;
    const ledger = [];
    const receipts = [];
    let closure = reclose(ledger);
    let previousLevels = Number(observation.levels_completed || 0);

    for (let index = 0; index < LS20_V15_CLOSURE_PATH.length; index += 1) {
      if (previousLevels >= 1 || observation.state === 'WIN' || observation.state === 'GAME_OVER') break;

      const action = LS20_V15_CLOSURE_PATH[index];
      const sourceDigest = frameDigest(observation.frame);
      const potentialBefore = closure;
      const returned = await request(`/api/cmd/ACTION${action}`, {
        body: {
          game_id: gameId,
          guid,
          reasoning: {
            policy: 'v33-whole-history-reclosure',
            action_source: 'v15-closure-path',
            ordinal_shadow: index,
            obtained_basis_digest: potentialBefore.obtained_digest,
            potential_basis_digest: potentialBefore.potential_digest,
          },
        },
      });

      const returnedDigest = frameDigest(returned.frame);
      const rawRelationDigest = sha({
        source: sourceDigest,
        action,
        returned: returnedDigest,
      });
      const alreadyObtained = ledger.some(
        (contact) => contact.raw_relation_digest === rawRelationDigest,
      );

      const contact = {
        ordinal_shadow: ledger.length,
        source_digest: sourceDigest,
        action,
        returned_digest: returnedDigest,
        raw_relation_digest: rawRelationDigest,
        contact_closure_digest: sha({
          ordinal: ledger.length,
          source: sourceDigest,
          action,
          returned: returnedDigest,
          prior_sequence: receipts.at(-1)?.relative_unity_digest || 'genesis',
        }),
      };
      ledger.push(contact);
      closure = reclose(ledger);

      const closureChanged =
        closure.potential_digest !== potentialBefore.potential_digest;
      const obtainingKind = alreadyObtained
        ? 'repeated-obtaining'
        : closureChanged
          ? 'closure-expanding-obtaining'
          : 'potential-actualized';

      const levelsAfter = Number(returned.levels_completed || 0);
      const relativeUnityDigest = sha({
        previous: receipts.at(-1)?.relative_unity_digest || 'genesis',
        contact: contact.contact_closure_digest,
        potential: closure.potential_digest,
      });

      receipts.push({
        ...contact,
        interaction_closure_id: `interaction_C:${contact.contact_closure_digest}`,
        obtaining_kind: obtainingKind,
        whole_reclosure_changed: closureChanged,
        potential_actualized: obtainingKind === 'potential-actualized',
        obtained_before_digest: potentialBefore.obtained_digest,
        obtained_after_digest: closure.obtained_digest,
        potential_before_digest: potentialBefore.potential_digest,
        potential_after_digest: closure.potential_digest,
        potential_relation_count: closure.potential_relation_count,
        prior_return_became_encoding_basis: index === 0
          ? true
          : sourceDigest === receipts[index - 1].returned_digest,
        returned_evaluation_became_next_basis: true,
        levels_before_shadow: previousLevels,
        levels_after_shadow: levelsAfter,
        state_after_shadow: returned.state,
        relative_unity_digest: relativeUnityDigest,
      });

      observation = returned;
      previousLevels = levelsAfter;
    }

    const closedScorecard = await request('/api/scorecard/close', {
      body: { card_id: cardId },
    });
    closed = true;

    const finalClosure = reclose(ledger);
    return res.status(200).json(sanitize({
      schema: 'arc-agi3-live-v33-whole-reclosure/v1',
      result: Number(observation.levels_completed || 0) >= 1 ? 'PASS' : 'OPEN',
      game_id: gameId,
      guid,
      scorecard_id: cardId,
      scorecard_url: `https://arcprize.org/scorecards/${cardId}`,
      actions_executed: ledger.length,
      planned_actions: LS20_V15_CLOSURE_PATH,
      levels_completed: observation.levels_completed,
      state: observation.state,
      available_actions: observation.available_actions,
      obtained_basis_digest: finalClosure.obtained_digest,
      potential_basis_digest: finalClosure.potential_digest,
      distinct_obtained_relations: finalClosure.obtained_relation_count,
      potential_relations: finalClosure.potential_relation_count,
      closure_expanding_obtainings: receipts.filter(
        (item) => item.obtaining_kind === 'closure-expanding-obtaining',
      ).length,
      potential_actualizations: receipts.filter(
        (item) => item.obtaining_kind === 'potential-actualized',
      ).length,
      repeated_obtainings: receipts.filter(
        (item) => item.obtaining_kind === 'repeated-obtaining',
      ).length,
      contact_sequence_continuity_digest:
        receipts.at(-1)?.relative_unity_digest || sha('empty'),
      receipts,
      scorecard: closedScorecard,
      claim_boundary: {
        demonstrates:
          'live LS20 execution of the previously closure-derived bounded path while every returned frame is integrated by whole-history inversion/composition reclosure',
        does_not_demonstrate:
          'that V33 independently rediscovered the LS20 action path, solved level 2, or generalized to unseen ARC games',
      },
    }));
  } catch (error) {
    if (cardId && !closed) {
      try {
        await request('/api/scorecard/close', { body: { card_id: cardId } });
      } catch {
        // Best-effort finalization only.
      }
    }
    const message = String(error?.message || error)
      .replace(apiKey || '__never__', '[redacted]')
      .slice(0, 1500);
    return res.status(500).json({ error: 'ARC live run failed', detail: message });
  } finally {
    apiKey = '';
  }
}
