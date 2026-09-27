import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeShare,decodeShare,shareUrl,sharedData} from '../dist/share.js';
import {VERSION,LAYOUT_REVISION,initialFurniture,clone} from '../dist/model.js';

const layout={version:VERSION,layoutRevision:LAYOUT_REVISION,furniture:clone(initialFurniture),palette:'oak',floors:{},openStates:{}};

test('a shared layout decodes to the same name and state', async()=>{
  const data=await encodeShare('餐桌靠窗',layout);
  assert.deepEqual(await decodeShare(data),{name:'餐桌靠窗',state:layout});
});

test('share links use only URL-safe characters and stay short enough to send', async()=>{
  const url=await shareUrl('https://a7-space-studio.pages.dev/?x=1#old','方案',layout);
  assert.match(url,/^https:\/\/a7-space-studio\.pages\.dev\/\?x=1#plan=[A-Za-z0-9_-]+$/);
  assert.ok(url.length<JSON.stringify(layout).length/2,`link is ${url.length} characters`);
});

test('only a plan fragment counts as a share link', async()=>{
  const data=await encodeShare('A',layout);
  assert.equal(sharedData('#plan='+data),data);
  for(const hash of ['','#','#plan=','#other=abc','#plan=a b'])assert.equal(sharedData(hash),null);
});

test('a damaged link is reported instead of loading', async()=>{
  const data=await encodeShare('A',layout);
  await assert.rejects(decodeShare(data.slice(0,data.length>>1)),/連結/);
  await assert.rejects(decodeShare('bm90IGRlZmxhdGU'),/連結/);
});

test('names from a link are cut to the scheme name limit', async()=>{
  const shared=await decodeShare(await encodeShare('長'.repeat(60),layout));
  assert.equal(shared.name.length,40);
});
