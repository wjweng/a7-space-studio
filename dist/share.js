// A share link carries one layout in the URL fragment, so the recipient needs no file and
// the fragment never reaches the server. The layout JSON is deflated and base64url-encoded:
// #plan=<data>. Before deflating, every UUID (cabinet cells, parts, door groups and the
// sockets and TVs that point at them) becomes a short token and the furniture flags that
// validateFurniture fills in anyway are left out: random UUIDs barely compress, and they
// were about half of a deflated link. Links made before this (no `v`) still open.
export const SHARE_PARAM='plan';
const MAX_BYTES=2e6,FORMAT=2;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// Values validateFurniture gives a piece that lacks them; a link omits them when they match.
const ITEM_DEFAULTS={open:0,doorStyle:'double',draft:false,assumed:true};

async function pipe(bytes,stream){
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}
function toBase64Url(bytes){
  let text='';for(let i=0;i<bytes.length;i+=0x8000)text+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return btoa(text).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function fromBase64Url(text){
  const bin=atob(text.replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from(bin,c=>c.charCodeAt(0));
}

// Rewrites every string, object key included, through fn.
function mapStrings(value,fn){
  if(typeof value==='string')return fn(value);
  if(Array.isArray(value))return value.map(v=>mapStrings(v,fn));
  if(value&&typeof value==='object'){
    const out={};for(const [k,v] of Object.entries(value))out[fn(k)]=mapStrings(v,fn);return out;
  }
  return value;
}
// UUID → '~<base36 index>'; a string already starting with '~' is escaped as '~~'.
function packIds(state){
  const ids=new Map();
  return mapStrings(state,s=>{
    if(UUID.test(s)){if(!ids.has(s))ids.set(s,ids.size);return '~'+ids.get(s).toString(36);}
    return s.startsWith('~')?'~'+s:s;
  });
}
// The recipient gets fresh UUIDs, derived from the link so that opening it twice gives the
// same layout (and finds the scheme already saved) instead of a near-copy.
function unpackIds(state,seed){
  const h=hash128(seed),tail=parseInt(h.slice(20),16),head=`${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-${'89ab'[parseInt(h[16],16)&3]}${h.slice(17,20)}-`;
  return mapStrings(state,s=>{
    if(s.startsWith('~~'))return s.slice(1);
    if(!/^~[0-9a-z]+$/.test(s))return s;
    return head+((tail+parseInt(s.slice(1),36))%2**48).toString(16).padStart(12,'0');
  });
}
function hash128(text){
  let a=0x811c9dc5,b=0x9e3779b9,c=0x85ebca6b,d=0xc2b2ae35;
  for(let i=0;i<text.length;i++){
    const k=text.charCodeAt(i);
    a=Math.imul(a^k,0x01000193);b=Math.imul(b^k,0x5bd1e995);c=Math.imul(c^k,0x27d4eb2d);d=Math.imul(d^k,0x165667b1);
    b^=a>>>15;c^=b>>>13;d^=c>>>16;a^=d>>>11;
  }
  return [a,b,c,d].map(x=>(x>>>0).toString(16).padStart(8,'0')).join('');
}
function withFurniture(state,fn){
  return Array.isArray(state?.furniture)?{...state,furniture:state.furniture.map(f=>f&&typeof f==='object'?fn(f):f)}:state;
}
const dropDefaults=f=>{const out={...f};for(const [k,v] of Object.entries(ITEM_DEFAULTS))if(out[k]===v)delete out[k];return out;};
const addDefaults=f=>({...f,...Object.fromEntries(Object.entries(ITEM_DEFAULTS).filter(([k])=>!(k in f)))});

export async function encodeShare(name,state){
  const json=new TextEncoder().encode(JSON.stringify({v:FORMAT,name,state:packIds(withFurniture(state,dropDefaults))}));
  return toBase64Url(await pipe(json,new CompressionStream('deflate-raw')));
}
export async function decodeShare(data){
  let bytes;
  try{bytes=await pipe(fromBase64Url(data),new DecompressionStream('deflate-raw'));}catch{throw Error('連結不完整或已損壞');}
  if(bytes.length>MAX_BYTES)throw Error('連結內容過大');
  let shared;try{shared=JSON.parse(new TextDecoder().decode(bytes));}catch{throw Error('連結不完整或已損壞');}
  if(!shared||typeof shared.name!=='string'||!shared.state)throw Error('連結內容不是配置');
  if(shared.v>FORMAT)throw Error('連結來自較新版本的網站，請重新整理後再開');
  const state=shared.v===FORMAT?withFurniture(unpackIds(shared.state,data),addDefaults):shared.state;
  return{name:shared.name.slice(0,40),state};
}

export async function shareUrl(base,name,state){
  const url=new URL(base);url.hash=`${SHARE_PARAM}=${await encodeShare(name,state)}`;return url.href;
}
// The encoded layout in a location hash, or null when the hash is not a share link.
export function sharedData(hash){
  const match=new RegExp(`^#${SHARE_PARAM}=([A-Za-z0-9_-]+)$`).exec(hash||'');return match?match[1]:null;
}
