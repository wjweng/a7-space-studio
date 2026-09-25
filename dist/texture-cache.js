// Board-finish and flooring textures take 0.6-1 s each to generate, which
// used to hold up the first frame for every finish in a layout. They are now
// generated in workers and kept in IndexedDB, so a reload reads them back
// instead. Materials draw in the finish's median colour until the texture
// arrives. Where workers or IndexedDB are missing (tests in Node), textures
// are generated synchronously as before.
import {finishByCode,finishPixels} from './finishes.js';
import {flooringByCode,flooringPixels} from './floorings.js';

export const FINISH_SIZE=[512,1024];
const DB='a7-textures',STORE='pixels';
const memory=new Map(),pending=new Map();

export const texturesAsync=()=>typeof Worker!=='undefined'&&typeof indexedDB!=='undefined';
export function texturePixelsNow(kind,code){
  if(kind==='finish')return{pixels:finishPixels(finishByCode(code),...FINISH_SIZE),width:FINISH_SIZE[0],height:FINISH_SIZE[1]};
  const {pixels,width,height}=flooringPixels(flooringByCode(code));
  return{pixels,width,height};
}

// Cached pixels are keyed by the generators' source text, so any change to
// finishes.js or floorings.js regenerates them rather than showing stale ones.
let version;
const sourceVersion=()=>version??=Promise.all(['./finishes.js','./floorings.js'].map(path=>fetch(new URL(path,import.meta.url)).then(r=>r.text()))).then(texts=>{
  let h=2166136261;for(const text of texts)for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);
  return(h>>>0).toString(36);
}).catch(()=>'unversioned');

let database;
const openDb=()=>database??=new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
});
const tx=(mode,run)=>openDb().then(db=>new Promise((resolve,reject)=>{const t=db.transaction(STORE,mode),result=run(t.objectStore(STORE));t.oncomplete=()=>resolve(result.result);t.onerror=()=>reject(t.error);}));
const idbGet=key=>tx('readonly',store=>store.get(key));
const idbPut=(key,value)=>tx('readwrite',store=>store.put(value,key));
// Drop textures made by older generator versions so storage does not grow.
let pruned;
const prune=current=>pruned??=tx('readwrite',store=>{const request=store.openCursor();request.onsuccess=()=>{const cursor=request.result;if(!cursor)return;if(!String(cursor.key).endsWith('@'+current))cursor.delete();cursor.continue();};return request;}).catch(()=>{});

// A small pool of module workers. If one fails to start or crashes, its
// outstanding jobs, and every later one, fall back to the main thread.
let workers,next=0,jobs=0,broken=false;
const outstanding=new Map();
const settle=(id,data)=>{const job=outstanding.get(id);if(!job)return;outstanding.delete(id);job.resolve(data?{pixels:data.pixels,width:data.width,height:data.height}:texturePixelsNow(job.kind,job.code));};
function viaWorker(kind,code){
  if(broken)return Promise.resolve(texturePixelsNow(kind,code));
  try{
    workers??=Array.from({length:Math.max(1,Math.min(4,(navigator.hardwareConcurrency||2)-1))},()=>{
      const w=new Worker(new URL('./texture-worker.js',import.meta.url),{type:'module'});
      w.onmessage=({data})=>settle(data.id,data);
      w.onerror=()=>{broken=true;for(const id of[...outstanding.keys()])settle(id,null);};
      return w;
    });
  }catch{broken=true;return Promise.resolve(texturePixelsNow(kind,code));}
  const id=++jobs;
  return new Promise(resolve=>{outstanding.set(id,{kind,code,resolve});workers[next++%workers.length].postMessage({id,kind,code});});
}

// Resolves with {pixels,width,height}: from memory, IndexedDB, or a worker.
export function requestTexture(kind,code){
  const id=kind+':'+code;
  if(memory.has(id))return Promise.resolve(memory.get(id));
  if(!pending.has(id))pending.set(id,(async()=>{
    const v=await sourceVersion(),key=`${id}@${v}`;
    prune(v);
    let data=await idbGet(key).catch(()=>null);
    if(!data?.pixels){data=await viaWorker(kind,code);idbPut(key,data).catch(()=>{});}
    memory.set(id,data);pending.delete(id);
    return data;
  })());
  return pending.get(id);
}
