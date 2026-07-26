import crypto from 'node:crypto';

export const maxDuration = 60;

const ARC_ROOT = 'https://three.arcprize.org';
const GAME_ID = 'ls20-9607627b';
const CIPHERTEXT = 'i5cnvmpSRXSe4abZjibPGpuEGiJGs5QqBMljJtMEZzE-xaw8';
const NONCE_HASH = '7ac555dfb9f9858ef6f5249ae3ce00e0e30ddabc727b5b1e7879e8f37bcdaf22';
const EXPIRES_AT = '2026-07-26T23:42:10.995968+00:00';
const DELTAS = {
  1: [-5, 0],
  2: [5, 0],
  3: [0, -5],
  4: [0, 5],
};
const WALKABLE = new Set([0,1,2,3,8,9,10,11,12,14,15]);
let used = false;

function scalar(value) {
  return Array.isArray(value) ? value[0] : value;
}

function b64urlDecode(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/') + padding, 'base64');
}

function recoverKey(padEncoded) {
  const cipher = b64urlDecode(CIPHERTEXT);
  const pad = b64urlDecode(padEncoded);
  if (pad.length !== cipher.length) throw new Error('invalid invocation material');
  const key = Buffer.alloc(cipher.length);
  for (let i = 0; i < cipher.length; i += 1) key[i] = cipher[i] ^ pad[i];
  return key.toString('utf8');
}

function digest(value) {
  const data = typeof value === 'string' ? value : JSON.stringify(value);
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 20);
}

function pointKey(point) { return `${point[0]},${point[1]}`; }
function edgeKey(point, action) { return `${point[0]},${point[1]}|${action}`; }
function samePoint(a, b) { return a[0] === b[0] && a[1] === b[1]; }
function near(a, b) { return Math.abs(a[0]-b[0]) <= 2 && Math.abs(a[1]-b[1]) <= 2; }

function latestLayer(frame) {
  if (!Array.isArray(frame) || frame.length === 0) throw new Error('missing frame');
  const candidate = frame[frame.length - 1];
  if (!Array.isArray(candidate) || !Array.isArray(candidate[0])) throw new Error('invalid frame layer');
  return candidate;
}

function frameDigest(frame) { return digest(frame); }

function componentPoints(frame, values, maxY = 55) {
  const accepted = new Set(values);
  const seen = new Set();
  const components = [];
  const height = Math.min(maxY, frame.length);
  const width = frame[0].length;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = `${y},${x}`;
      if (seen.has(start) || !accepted.has(Number(frame[y][x]))) continue;
      const queue = [[y, x]];
      seen.add(start);
      const points = [];
      for (let qi = 0; qi < queue.length; qi += 1) {
        const [py, px] = queue[qi];
        points.push([py, px]);
        for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const sy = py + dy;
          const sx = px + dx;
          if (sy < 0 || sy >= height || sx < 0 || sx >= width) continue;
          const sk = `${sy},${sx}`;
          if (seen.has(sk) || !accepted.has(Number(frame[sy][sx]))) continue;
          seen.add(sk);
          queue.push([sy, sx]);
        }
      }
      components.push(points);
    }
  }
  return components;
}

function center(points) {
  const ys = points.map(p => p[0]);
  const xs = points.map(p => p[1]);
  const y = Math.round(ys.reduce((a,b)=>a+b,0) / ys.length);
  const x = Math.round(xs.reduce((a,b)=>a+b,0) / xs.length);
  return [y, x];
}

function playerCenter(frame) {
  const ys = [];
  const xs = [];
  const height = Math.min(55, frame.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < frame[y].length; x += 1) {
      if (Number(frame[y][x]) === 12) { ys.push(y); xs.push(x); }
    }
  }
  if (!ys.length) throw new Error('player marker value 12 absent');
  const meanY = ys.reduce((a,b)=>a+b,0) / ys.length;
  const meanX = xs.reduce((a,b)=>a+b,0) / xs.length;
  return [Math.trunc(meanY) + 2, Math.round(meanX)];
}

function targetRelation(frame, allowLight = true) {
  const lights = componentPoints(frame, [0,1,2]).filter(p => p.length >= 2 && p.length <= 128);
  if (allowLight && lights.length) {
    lights.sort((a,b)=>b.length-a.length);
    return ['map-disclosure', center(lights[0])];
  }
  const [py, px] = playerCenter(frame);
  const player = new Set();
  for (let y = py-2; y <= py+2; y += 1) for (let x = px-2; x <= px+2; x += 1) player.add(`${y},${x}`);
  const blues = componentPoints(frame, [9]).filter(p => p.length >= 2 && p.length <= 12 && !p.every(q => player.has(pointKey(q))));
  if (!blues.length) throw new Error('no closure target perceived');
  blues.sort((a,b)=>b.length-a.length);
  return ['terminal-fold', center(blues[0])];
}

class ActiveTopology {
  constructor(height = 55, width = 64) {
    this.height = height;
    this.width = width;
    this.nodes = new Map();
    this.edges = new Map();
    this.rejected = new Set();
    this.observations = 0;
    this.interventions = 0;
    this.phase = null;
  }
  step(point, action) {
    const [dy, dx] = DELTAS[action];
    return [point[0] + dy, point[1] + dx];
  }
  inBounds(point) {
    return point[0] >= 2 && point[0] < this.height - 2 && point[1] >= 2 && point[1] < this.width - 2;
  }
  footprintOpen(frame, point) {
    if (!this.inBounds(point)) return false;
    for (let y = point[0]-2; y <= point[0]+2; y += 1)
      for (let x = point[1]-2; x <= point[1]+2; x += 1)
        if (!WALKABLE.has(Number(frame[y][x]))) return false;
    return true;
  }
  addNode(point) { this.nodes.set(pointKey(point), point); }
  observe(frame, basis) {
    if (this.phase === null) this.phase = [((basis[0] % 5)+5)%5, ((basis[1] % 5)+5)%5];
    const visible = new Map([[pointKey(basis), basis]]);
    for (let y = 2; y < this.height-2; y += 1) {
      if (y % 5 !== this.phase[0]) continue;
      for (let x = 2; x < this.width-2; x += 1) {
        if (x % 5 !== this.phase[1]) continue;
        const p = [y,x];
        if (this.footprintOpen(frame,p)) visible.set(pointKey(p),p);
      }
    }
    for (const p of visible.values()) this.addNode(p);
    for (const p of visible.values()) {
      for (const action of [1,2,3,4]) {
        const successor = this.step(p, action);
        const ek = edgeKey(p, action);
        if (visible.has(pointKey(successor)) && !this.rejected.has(ek)) this.edges.set(ek, successor);
      }
    }
    this.observations += 1;
  }
  integrateTarget(target) {
    this.addNode(target);
    for (const node of this.nodes.values()) {
      for (const action of [1,2,3,4]) {
        const successor = this.step(node, action);
        const ek = edgeKey(node, action);
        if (samePoint(successor,target) && !this.rejected.has(ek)) this.edges.set(ek,target);
      }
    }
  }
  pathToGoal(start, goalKeys) {
    const queue = [start];
    const previous = new Map([[pointKey(start), null]]);
    let goal = null;
    for (let qi = 0; qi < queue.length; qi += 1) {
      const current = queue[qi];
      const ck = pointKey(current);
      if (goalKeys.has(ck)) { goal = current; break; }
      for (const action of [1,2,3,4]) {
        const successor = this.edges.get(edgeKey(current, action));
        if (!successor) continue;
        const sk = pointKey(successor);
        if (!previous.has(sk)) {
          previous.set(sk, [current, action]);
          queue.push(successor);
        }
      }
    }
    if (!goal) return [];
    const path = [];
    let cursor = goal;
    while (previous.get(pointKey(cursor)) !== null) {
      const [prior, action] = previous.get(pointKey(cursor));
      path.push(action);
      cursor = prior;
    }
    path.reverse();
    return path;
  }
  plan(start,target) {
    this.integrateTarget(target);
    const goals = new Set([...this.nodes.values()].filter(n => near(n,target)).map(pointKey));
    return this.pathToGoal(start,goals);
  }
  planProbe(start,target) {
    const candidates = [];
    for (const origin of this.nodes.values()) {
      const prefix = this.pathToGoal(start,new Set([pointKey(origin)]));
      if (!samePoint(origin,start) && !prefix.length) continue;
      for (const action of [1,2,3,4]) {
        const ek = edgeKey(origin,action);
        const successor = this.step(origin,action);
        if (this.edges.has(ek) || this.rejected.has(ek) || !this.inBounds(successor)) continue;
        const score = prefix.length + (Math.abs(successor[0]-target[0])+Math.abs(successor[1]-target[1]))/5;
        candidates.push({score,path:[...prefix,action]});
      }
    }
    if (!candidates.length) return [[], 'topology-closed'];
    candidates.sort((a,b)=>a.score-b.score || JSON.stringify(a.path).localeCompare(JSON.stringify(b.path)));
    const path = candidates[0].path;
    return [path, path.length === 1 ? 'topology-probe' : 'topology-frontier-navigation'];
  }
  confirm(basis,action,observed) {
    this.interventions += 1;
    this.addNode(basis); this.addNode(observed);
    const ek = edgeKey(basis,action);
    this.rejected.delete(ek);
    this.edges.set(ek,observed);
    return samePoint(this.step(basis,action),observed) ? 'edge-confirmed' : 'edge-rewritten';
  }
  reject(basis,action) {
    this.interventions += 1;
    const ek = edgeKey(basis,action);
    const learned = !this.rejected.has(ek);
    this.rejected.add(ek);
    this.edges.delete(ek);
    return ['edge-rejected',learned];
  }
  digest() {
    const nodes = [...this.nodes.values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    const edges = [...this.edges.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
    const rejected = [...this.rejected].sort();
    return digest({nodes,edges,rejected});
  }
  summary() {
    return {
      nodes:this.nodes.size,
      edges:this.edges.size,
      rejected_edges:this.rejected.size,
      observations:this.observations,
      interventions:this.interventions,
      digest:this.digest(),
    };
  }
}

function parseSetCookies(response, jar) {
  const values = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')] : []);
  for (const line of values) {
    for (const chunk of String(line).split(/,(?=\s*[^;,=]+=[^;,]+)/g)) {
      const pair = chunk.trim().split(';',1)[0];
      const index = pair.indexOf('=');
      if (index > 0) jar.set(pair.slice(0,index),pair.slice(index+1));
    }
  }
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k,v])=>`${k}=${v}`).join('; ');
}

async function arcCall(path, body, key, jar) {
  const response = await fetch(`${ARC_ROOT}${path}`, {
    method:'POST',
    headers:{
      'X-API-Key':key,
      'Content-Type':'application/json',
      'Accept':'application/json',
      ...(jar.size ? {Cookie:cookieHeader(jar)} : {}),
    },
    body:JSON.stringify(body),
    redirect:'manual',
  });
  parseSetCookies(response,jar);
  const text = await response.text();
  if (!response.ok) throw new Error(`ARC ${path} failed with ${response.status}: ${text.slice(0,500)}`);
  return text ? JSON.parse(text) : {};
}

function recloseHistory(contacts) {
  const nodes = new Set();
  const adjacency = new Map();
  function addEdge(a,b) {
    nodes.add(a); nodes.add(b);
    if (!adjacency.has(a)) adjacency.set(a,new Set());
    adjacency.get(a).add(b);
  }
  for (const c of contacts) { addEdge(c.source_digest,c.returned_digest); addEdge(c.returned_digest,c.source_digest); }
  const pairs = [];
  for (const start of [...nodes].sort()) {
    const seen = new Set([start]);
    const queue = [start];
    for (let i=0;i<queue.length;i+=1) {
      for (const next of adjacency.get(queue[i]) || []) if (!seen.has(next)) {seen.add(next);queue.push(next);}
    }
    for (const end of [...seen].sort()) pairs.push([start,end]);
  }
  return {digest:digest(pairs), relation_count:pairs.length, pairs};
}

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store, max-age=0');
  if (req.method !== 'GET') return res.status(405).json({error:'Method not allowed'});
  if (used) return res.status(410).json({error:'Runner already used'});
  const n = String(scalar(req.query?.n) || '');
  const p = String(scalar(req.query?.p) || '');
  if (new Date() > new Date(EXPIRES_AT)) return res.status(410).json({error:'Runner expired'});
  const full = crypto.createHash('sha256').update(n).digest('hex');
  if (full !== NONCE_HASH) return res.status(403).json({error:'Invalid invocation'});
  used = true;
  const key = recoverKey(p);
  const jar = new Map();
  let cardId = null;
  const receipts = [];
  const contacts = [];
  let closedScorecard = null;
  let stopReason = 'not-started';
  try {
    const card = await arcCall('/api/scorecard/open', {
      tags:['nrr-v33','autonomous-active-topology','whole-history-reclosure','ls20','agent'],
      source_url:'https://github.com/scarryhott/tagtokn',
      opaque:{policy:'active-topology-v2-presented-through-v33-reclosure',fixed_action_path:false,max_actions:32}
    }, key, jar);
    cardId = card.card_id;
    let observation = await arcCall('/api/cmd/RESET', {card_id:cardId,game_id:GAME_ID}, key, jar);
    const guid = observation.guid;
    const startingLevel = Number(observation.levels_completed || 0);
    let topology = new ActiveTopology();
    let lightResolved = false;
    let targetMemory = new Map();

    for (let step=0; step<32; step+=1) {
      const levelNow = Number(observation.levels_completed || 0);
      if (levelNow - startingLevel >= 1) { stopReason='bounded-level-goal-reached'; break; }
      if (observation.state === 'GAME_OVER') { stopReason='game-over'; break; }

      const before = latestLayer(observation.frame);
      const basis = playerCenter(before);
      topology.observe(before,basis);

      try {
        const [,exit] = targetRelation(before,false);
        targetMemory.set('terminal-fold',exit);
      } catch {}

      const lightVisible = componentPoints(before,[0,1,2]).some(p=>p.length>=2&&p.length<=128);
      const previous = receipts.length ? receipts[receipts.length-1] : null;
      const crossedLightCenter = Boolean(previous && previous.target_relation.startsWith('map-disclosure') && !lightVisible && samePoint(basis,previous.target));
      let relation,target,path,actionRole;

      if (crossedLightCenter) {
        const lastAction = previous.action;
        target = topology.step(basis,lastAction);
        relation = 'map-disclosure-postshift';
        path = [lastAction];
        actionRole = 'closure-seam';
      } else {
        try {
          [relation,target] = targetRelation(before,!lightResolved);
          targetMemory.set(relation,target);
        } catch {
          relation = lightResolved ? 'terminal-fold' : 'map-disclosure';
          if (!targetMemory.has(relation)) { stopReason='fail-open:no-target-relation'; break; }
          target = targetMemory.get(relation);
        }
        relation += ':learned-topology';
        path = topology.plan(basis,target);
        actionRole = 'goal-navigation';
      }

      if (!path.length && relation.startsWith('map-disclosure') && near(basis,target) && previous) {
        relation = 'map-disclosure-seam';
        path = [previous.action];
        actionRole = 'closure-seam';
      }

      if (!path.length) {
        [path,actionRole] = topology.planProbe(basis,target);
        relation += ':active-learning';
        if (!path.length) { stopReason='fail-open:topology-closed-without-goal'; break; }
      }

      const topologyBefore = topology.digest();
      const action = path[0];
      const predicted = topology.step(basis,action);
      const levelBefore = Number(observation.levels_completed || 0);
      const sourceDigest = frameDigest(before);

      const next = await arcCall(`/api/cmd/ACTION${action}`, {
        game_id:GAME_ID,
        guid,
        reasoning:JSON.stringify({
          policy:'autonomous-active-topology-v2',
          action_role:actionRole,
          target_relation:relation,
          basis,
          target,
          topology_digest:topologyBefore,
        })
      }, key, jar);

      const after = latestLayer(next.frame);
      const returnedDigest = frameDigest(after);
      const levelAfter = Number(next.levels_completed || 0);
      const observed = playerCenter(after);
      let topologyUpdate,learnedRejection=false;
      if (levelAfter > levelBefore) { topology.interventions += 1; topologyUpdate='level-transition'; }
      else if (samePoint(observed,basis)) { [topologyUpdate,learnedRejection] = topology.reject(basis,action); }
      else topologyUpdate = topology.confirm(basis,action,observed);
      if (levelAfter === levelBefore) topology.observe(after,observed);
      const topologyAfter = topology.digest();

      const rawRelationDigest = digest({source_digest:sourceDigest,action,returned_digest:returnedDigest});
      const priorRaw = new Set(contacts.map(c=>c.raw_relation_digest));
      const beforeClosure = recloseHistory(contacts);
      contacts.push({source_digest:sourceDigest,returned_digest:returnedDigest,raw_relation_digest:rawRelationDigest});
      const afterClosure = recloseHistory(contacts);
      const rawNew = !priorRaw.has(rawRelationDigest);
      const wholeChanged = beforeClosure.digest !== afterClosure.digest;
      const obtainingKind = !rawNew ? 'repeated-obtaining' : (wholeChanged ? 'closure-expanding-obtaining' : 'potential-actualized');

      const transitioned = levelAfter>levelBefore || !samePoint(observed,basis) || learnedRejection;
      const admitted = levelAfter>levelBefore || samePoint(observed,predicted) || learnedRejection || !samePoint(observed,basis);
      const receipt = {
        step:step+1,
        basis,
        action,
        action_role:actionRole,
        target_relation:relation,
        target,
        planned_trajectory_length:path.length,
        predicted_basis:predicted,
        observed_basis:observed,
        level_before:levelBefore,
        level_after:levelAfter,
        topology_before_digest:topologyBefore,
        topology_after_digest:topologyAfter,
        topology_update:topologyUpdate,
        closure_admitted:admitted,
        transition_witnessed:transitioned,
        raw_relation_digest:rawRelationDigest,
        obtaining_kind:obtainingKind,
        whole_reclosure_changed:wholeChanged,
        potential_relation_count:afterClosure.relation_count,
        source_digest:sourceDigest,
        returned_digest:returnedDigest,
        contact_closure_digest:digest({step:step+1,sourceDigest,action,returnedDigest,before:beforeClosure.digest,after:afterClosure.digest,topologyBefore,topologyAfter}),
      };
      receipts.push(receipt);
      if (relation.startsWith('map-disclosure-postshift') && admitted) lightResolved=true;
      observation = next;
      if (!admitted) {stopReason='fail-open:unmodeled-return';break;}
      if (levelAfter>levelBefore) {stopReason='bounded-level-goal-reached';break;}
    }
    if (stopReason==='not-started') stopReason='fail-open:action-budget';
    closedScorecard = await arcCall('/api/scorecard/close',{card_id:cardId},key,jar);
    return res.status(200).json({
      schema:'arc-agi3-live-v33-autonomous-active-topology/v1',
      result: Number(receipts.at(-1)?.level_after || 0) >= 1 ? 'PASS' : 'FAIL',
      fixed_action_path:false,
      generated_actions:receipts.map(r=>r.action),
      stop_reason:stopReason,
      actions_executed:receipts.length,
      levels_completed:Number(receipts.at(-1)?.level_after || 0),
      all_transitions_admitted:receipts.every(r=>r.closure_admitted),
      action_roles:Object.fromEntries([...new Set(receipts.map(r=>r.action_role))].map(role=>[role,receipts.filter(r=>r.action_role===role).length])),
      topology_updates:Object.fromEntries([...new Set(receipts.map(r=>r.topology_update))].map(kind=>[kind,receipts.filter(r=>r.topology_update===kind).length])),
      final_topology:topology.summary(),
      final_potential_relation_count:receipts.at(-1]?.potential_relation_count || 0,
      receipts,
      scorecard:closedScorecard,
      claim_boundary:{
        demonstrates:'live action generation from the returned-frame active topology with whole-history reclosure after every contact',
        does_not_demonstrate:'environment-independent object/target derivation, LS20 level 2, or cross-game generalization'
      }
    });
  } catch (error) {
    if (cardId && !closedScorecard) {
      try { closedScorecard = await arcCall('/api/scorecard/close',{card_id:cardId},key,jar); } catch {}
    }
    return res.status(500).json({error:'ARC autonomous test failed',detail:error?.message || String(error),scorecard:closedScorecard});
  }
}
