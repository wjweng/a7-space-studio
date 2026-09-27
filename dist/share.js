// A share link carries one layout in the URL fragment, so the recipient needs no file and
// the fragment never reaches the server. The layout JSON is deflated (about 4x smaller)
// and base64url-encoded: #plan=<data>.
export const SHARE_PARAM='plan';
const MAX_BYTES=2e6;

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

export async function encodeShare(name,state){
  const json=new TextEncoder().encode(JSON.stringify({name,state}));
  return toBase64Url(await pipe(json,new CompressionStream('deflate-raw')));
}
export async function decodeShare(data){
  let bytes;
  try{bytes=await pipe(fromBase64Url(data),new DecompressionStream('deflate-raw'));}catch{throw Error('連結不完整或已損壞');}
  if(bytes.length>MAX_BYTES)throw Error('連結內容過大');
  const shared=JSON.parse(new TextDecoder().decode(bytes));
  if(!shared||typeof shared.name!=='string'||!shared.state)throw Error('連結內容不是配置');
  return{name:shared.name.slice(0,40),state:shared.state};
}

export async function shareUrl(base,name,state){
  const url=new URL(base);url.hash=`${SHARE_PARAM}=${await encodeShare(name,state)}`;return url.href;
}
// The encoded layout in a location hash, or null when the hash is not a share link.
export function sharedData(hash){
  const match=new RegExp(`^#${SHARE_PARAM}=([A-Za-z0-9_-]+)$`).exec(hash||'');return match?match[1]:null;
}
