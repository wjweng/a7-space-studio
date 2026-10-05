import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeShare,decodeShare,shareUrl,sharedData} from '../dist/share.js';
import {VERSION,LAYOUT_REVISION,initialFurniture,clone,validateFurniture} from '../dist/model.js';

const UUIDS=/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
// Validated furniture, as snapshot() holds it: cabinets carry UUID cell and part ids.
const furniture=validateFurniture(clone(initialFurniture));
const layout={version:VERSION,layoutRevision:LAYOUT_REVISION,furniture,palette:'oak',floors:{},openStates:{}};
// Renames UUIDs by first appearance, so two layouts compare by structure and id references.
const byOrder=value=>{const ids=new Map();return JSON.parse(JSON.stringify(value).replace(UUIDS,id=>{if(!ids.has(id))ids.set(id,ids.size);return 'id'+ids.get(id);}));};
async function deflateLink(payload){
  const bytes=new Uint8Array(await new Response(new Blob([JSON.stringify(payload)]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

test('a shared layout decodes to the same name and layout, ids and references included', async()=>{
  const state=clone(layout),cabinet=state.furniture.find(f=>f.cabinetDesign),cell=JSON.stringify(cabinet.cabinetDesign).match(UUIDS)[0];
  state.furniture.push({...clone(state.furniture.find(f=>f.type!=='beam')),id:'socket',supportId:cabinet.id,supportCell:cell});
  state.openStates={[cell]:1};
  const shared=await decodeShare(await encodeShare('餐桌靠窗',state));
  assert.equal(shared.name,'餐桌靠窗');
  assert.deepEqual(byOrder(shared.state),byOrder(state));
  const text=JSON.stringify(shared.state);
  assert.ok(text.match(UUIDS).every(id=>!JSON.stringify(state).includes(id)),'recipient gets fresh ids');
  assert.ok(text.match(UUIDS).every(id=>/^.{14}4.{3}-[89ab]/.test(id)),'fresh ids are version-4 shaped');
});

test('the same link gives the same ids each time it is opened', async()=>{
  const data=await encodeShare('A',layout);
  assert.deepEqual(await decodeShare(data),await decodeShare(data));
});

test('furniture flags left at their defaults are restored, others kept', async()=>{
  const state=clone(layout);Object.assign(state.furniture[0],{open:1,doorStyle:'sliding',draft:true});
  const shared=await decodeShare(await encodeShare('A',state));
  for(const [i,f] of shared.state.furniture.entries())for(const k of ['open','doorStyle','draft','assumed'])assert.equal(f[k],state.furniture[i][k],`${f.id}.${k}`);
});

test('text that starts with a tilde is not taken for a packed id', async()=>{
  const state=clone(layout);state.furniture[0].name='~1 書櫃';state.furniture[1].name='~~';
  const shared=await decodeShare(await encodeShare('~a',state));
  assert.equal(shared.name,'~a');
  assert.equal(shared.state.furniture[0].name,'~1 書櫃');
  assert.equal(shared.state.furniture[1].name,'~~');
});

test('links made before ids were packed still open unchanged', async()=>{
  assert.deepEqual(await decodeShare(await deflateLink({name:'舊連結',state:layout})),{name:'舊連結',state:layout});
});

test('packing ids makes a link with cabinet designs much shorter', async()=>{
  const packed=(await encodeShare('A',layout)).length,plain=(await deflateLink({name:'A',state:layout})).length;
  assert.ok(packed<plain*0.75,`packed ${packed} vs plain ${plain}`);
});

test('share links use only URL-safe characters and stay short enough to send', async()=>{
  const url=await shareUrl('https://a7-space-studio.pages.dev/?x=1#old','方案',layout);
  assert.match(url,/^https:\/\/a7-space-studio\.pages\.dev\/\?x=1#plan=[A-Za-z0-9_-]+$/);
  assert.ok(url.length<JSON.stringify(layout).length/4,`link is ${url.length} characters`);
});

test('only a plan fragment counts as a share link', async()=>{
  const data=await encodeShare('A',layout);
  assert.equal(sharedData('#plan='+data),data);
  for(const hash of ['','#','#plan=','#other=abc','#plan=a b'])assert.equal(sharedData(hash),null);
});

test('a damaged or cut-off link is reported instead of loading', async()=>{
  const data=await encodeShare('A',layout);
  for(const cut of [data.length>>1,data.length-40,10000-40].filter(n=>n<data.length))await assert.rejects(decodeShare(data.slice(0,cut)),/連結不完整或已損壞/);
  await assert.rejects(decodeShare('bm90IGRlZmxhdGU'),/連結/);
});

test('a link from a newer format asks for a reload', async()=>{
  await assert.rejects(decodeShare(await deflateLink({v:99,name:'A',state:layout})),/較新版本/);
});

test('names from a link are cut to the scheme name limit', async()=>{
  const shared=await decodeShare(await encodeShare('長'.repeat(60),layout));
  assert.equal(shared.name.length,40);
});
