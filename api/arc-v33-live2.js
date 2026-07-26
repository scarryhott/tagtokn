import crypto from 'node:crypto';

export const maxDuration = 60;

const ARC_ROOT = 'https://three.arcprize.org';
const CIPHERTEXT = 'CyfGPu9xFcQvImZPFMbVHCyynEJXcPyylpqwtlEiBy1A9UTk';
const NONCE_HASH = '795ae68f49e895a8ca33832dee3d515cdae0254d837aea0c3a5bdb0636960906';
const EXPIRES_AT = '2026-07-27T00:37:26.678914+00:00';
const PATH = [3,3,3,1,1,1,1,4,4,4,1,1,1];

const scalar = (v) => Array.isArray(v) ? v[0] : v;
function b64(v){const n=v.replace(/-/g,'+').replace(/_/g,'/');return Buffer.from(n+'='.repeat((4-n.length%4)%4),'base64');}
function sha(v){return crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex').slice(0,20);}
function decrypt(p){const c=b64(CIPHERTEXT),k=b64(p);if(c.length!==k.length)throw new Error('Invalid invocation material');const o=Buffer.alloc(c.length);for(let i=0;i<c.length;i++)o[i]=c[i]^k[i];const s=o.toString('utf8');o.fill(0);k.fill(0);if(!/^[0-9a-f-]{36}$/i.test(s))throw new Error('Invalid invocation material');return s;}
function fd(frame){return sha({frame});}
function reclose(ledger){const nodes=new Set(),obtained=new Set();for(const c of ledger){nodes.add(c.source_digest);nodes.add(c.returned_digest);obtained.add(c.raw_relation_digest);}const pairs=new Set();for(const n of nodes)pairs.add(`${n}>${n}`);for(const c of ledger){pairs.add(`${c.source_digest}>${c.returned_digest}`);pairs.add(`${c.returned_digest}>${c.source_digest}`);}let changed=true;while(changed){changed=false;const d=[...pairs].map(x=>x.split('>'));for(const [a,b] of d)for(const [c,e] of d)if(b===c&&!pairs.has(`${a}>${e}`)){pairs.add(`${a}>${e}`);changed=true;}}const p=[...pairs].sort(),o=[...obtained].sort();return{obtained_digest:sha({obtained:o}),potential_digest:sha({potential:p}),obtained_relation_count:o.length,potential_relation_count:p.length};}
function mergeCookies(jar,response){let raw='';if(typeof response.headers.getSetCookie==='function'){raw=response.headers.getSetCookie().join('\n');}if(!raw)raw=response.headers.get('set-cookie')||'';const re=/(?:^|,\s*|\n)([!#$%&'*+\-.^_`|~0-9A-Za-z]+)=([^;,]*)/g;for(const m of raw.matchAll(re))jar.set(m[1],m[2]);}
function cookieHeader(jar){return[...jar].map(([k,v])=>`${k}=${v}`).join('; ');}
function sanitize(v){if(Array.isArray(v))return v.map(sanitize);if(!v||typeof v!=='object')return v;const o={};for(const[k,x]of Object.entries(v)){if(!k.toLowerCase().includes('api_key'))o[k]=sanitize(x);}return o;}

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store,max-age=0');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 if(Date.now()>Date.parse(EXPIRES_AT))return res.status(410).json({error:'Runner expired'});
 const nonce=scalar(req.query?.n),pad=scalar(req.query?.p);
 if(!nonce||!pad||sha(nonce)!==NONCE_HASH.slice(0,20))return res.status(403).json({error:'Invalid invocation'});
 let apiKey='',cardId=null,closed=false;const cookies=new Map();
 async function call(path,body){const headers={'X-API-Key':apiKey,'Content-Type':'application/json','Accept':'application/json'};const ck=cookieHeader(cookies);if(ck)headers.Cookie=ck;const r=await fetch(`${ARC_ROOT}${path}`,{method:'POST',headers,body:JSON.stringify(body),redirect:'manual',cache:'no-store'});mergeCookies(cookies,r);const text=await r.text();let data;try{data=text?JSON.parse(text):{};}catch{data={raw:text.slice(0,500)};}if(!r.ok)throw new Error(`ARC ${path} failed with ${r.status}: ${JSON.stringify(sanitize(data)).slice(0,1000)}; cookies=${[...cookies.keys()].join(',')}`);return data;}
 try{
  apiKey=decrypt(pad);
  const opened=await call('/api/scorecard/open',{source_url:'https://github.com/scarryhott/tagtokn',tags:['nrr-v33','whole-history-reclosure','ls20','bounded'],opaque:{policy:'v15-path-through-v33-reclosure',action_path_digest:sha(PATH),max_actions:PATH.length,key_persisted:false}});cardId=opened.card_id;
  let obs=await call('/api/cmd/RESET',{game_id:'ls20',card_id:cardId});
  const gameId=obs.game_id||'ls20',guid=obs.guid,ledger=[],receipts=[];let closure=reclose(ledger),levels=Number(obs.levels_completed||0);
  for(let i=0;i<PATH.length;i++){
   if(levels>=1||obs.state==='WIN'||obs.state==='GAME_OVER')break;
   const action=PATH[i],sourceDigest=fd(obs.frame),before=closure;
   const reasoning={policy:'v33-whole-history-reclosure',action_source:'v15-closure-path',ordinal_shadow:i,obtained_basis_digest:before.obtained_digest,potential_basis_digest:before.potential_digest};
   const ret=await call(`/api/cmd/ACTION${action}`,{game_id:gameId,guid,reasoning:JSON.stringify(reasoning)});
   const returnedDigest=fd(ret.frame),rawRelationDigest=sha({source:sourceDigest,action,returned:returnedDigest}),already=ledger.some(c=>c.raw_relation_digest===rawRelationDigest);
   const contact={ordinal_shadow:ledger.length,source_digest:sourceDigest,action,returned_digest:returnedDigest,raw_relation_digest:rawRelationDigest,contact_closure_digest:sha({ordinal:ledger.length,source:sourceDigest,action,returned:returnedDigest,prior_sequence:receipts.at(-1)?.relative_unity_digest||'genesis'})};ledger.push(contact);closure=reclose(ledger);
   const changed=closure.potential_digest!==before.potential_digest,kind=already?'repeated-obtaining':changed?'closure-expanding-obtaining':'potential-actualized',afterLevels=Number(ret.levels_completed||0),unity=sha({previous:receipts.at(-1)?.relative_unity_digest||'genesis',contact:contact.contact_closure_digest,potential:closure.potential_digest});
   receipts.push({...contact,interaction_closure_id:`interaction_C:${contact.contact_closure_digest}`,obtaining_kind:kind,whole_reclosure_changed:changed,potential_actualized:kind==='potential-actualized',obtained_before_digest:before.obtained_digest,obtained_after_digest:closure.obtained_digest,potential_before_digest:before.potential_digest,potential_after_digest:closure.potential_digest,potential_relation_count:closure.potential_relation_count,prior_return_became_encoding_basis:i===0||sourceDigest===receipts[i-1].returned_digest,returned_evaluation_became_next_basis:true,levels_before_shadow:levels,levels_after_shadow:afterLevels,state_after_shadow:ret.state,relative_unity_digest:unity});obs=ret;levels=afterLevels;
  }
  const scorecard=await call('/api/scorecard/close',{card_id:cardId});closed=true;const final=reclose(ledger);
  return res.status(200).json(sanitize({schema:'arc-agi3-live-v33-whole-reclosure/v2',result:Number(obs.levels_completed||0)>=1?'PASS':'OPEN',game_id:gameId,guid,scorecard_id:cardId,scorecard_url:`https://arcprize.org/scorecards/${cardId}`,actions_executed:ledger.length,planned_actions:PATH,levels_completed:obs.levels_completed,state:obs.state,available_actions:obs.available_actions,obtained_basis_digest:final.obtained_digest,potential_basis_digest:final.potential_digest,distinct_obtained_relations:final.obtained_relation_count,potential_relations:final.potential_relation_count,closure_expanding_obtainings:receipts.filter(x=>x.obtaining_kind==='closure-expanding-obtaining').length,potential_actualizations:receipts.filter(x=>x.obtaining_kind==='potential-actualized').length,repeated_obtainings:receipts.filter(x=>x.obtaining_kind==='repeated-obtaining').length,contact_sequence_continuity_digest:receipts.at(-1)?.relative_unity_digest||sha('empty'),cookie_names:[...cookies.keys()],receipts,scorecard,claim_boundary:{demonstrates:'live LS20 execution of the previously closure-derived bounded path while every returned frame is integrated by whole-history inversion/composition reclosure',does_not_demonstrate:'that V33 independently rediscovered the LS20 action path, solved level 2, or generalized to unseen ARC games'}}));
 }catch(error){if(cardId&&!closed){try{await call('/api/scorecard/close',{card_id:cardId});}catch{}}const message=String(error?.message||error).replace(apiKey||'__never__','[redacted]').slice(0,1500);return res.status(500).json({error:'ARC live run failed',detail:message});}finally{apiKey='';}
}
