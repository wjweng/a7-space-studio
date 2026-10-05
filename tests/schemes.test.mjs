import test from 'node:test';
import assert from 'node:assert/strict';
import {uniqueSchemes,mergeSchemes,canonicalIds,MAX_SCHEMES} from '../dist/schemes.js';
import {initialFurniture,clone,validateFurniture} from '../dist/model.js';

const keyOf=state=>{if(state.bad)throw Error('bad');return JSON.stringify(state.layout);};
const scheme=(name,layout,extra={})=>({id:name,name,state:{layout,...extra}});

test('copies of a layout collapse to the earliest scheme and its name', ()=>{
  const list=[scheme('分享前',1),scheme('測試分享',2),scheme('分享前 2',1),scheme('測試分享 2',2),scheme('其他',3)];
  assert.deepEqual(uniqueSchemes(list,keyOf).map(s=>s.name),['分享前','測試分享','其他']);
});

test('a scheme whose key cannot be computed is kept, not taken for a copy', ()=>{
  const list=[scheme('a',1,{bad:true}),scheme('b',1,{bad:true}),scheme('c',1)];
  assert.deepEqual(uniqueSchemes(list,keyOf).map(s=>s.name),['a','b','c']);
});

test('importing skips layouts already in the list, including copies inside the file', ()=>{
  const result=mergeSchemes([scheme('mine',1)],[scheme('same as mine',1),scheme('new',2),scheme('new again',2)],keyOf);
  assert.deepEqual(result.schemes.map(s=>s.name),['mine','new']);
  assert.deepEqual([result.added,result.duplicate,result.full],[1,2,0]);
});

test('a full list keeps every existing scheme and reports what did not fit', ()=>{
  const mine=Array.from({length:MAX_SCHEMES-1},(_,i)=>scheme('mine'+i,i));
  const result=mergeSchemes(mine,[scheme('x',100),scheme('y',101),scheme('z',102)],keyOf);
  assert.equal(result.schemes.length,MAX_SCHEMES);
  assert.deepEqual(result.schemes.slice(0,mine.length),mine);
  assert.deepEqual([result.added,result.duplicate,result.full],[1,0,2]);
});

test('merging does not change the list it was given', ()=>{
  const mine=[scheme('mine',1)];
  mergeSchemes(mine,[scheme('new',2)],keyOf);
  assert.equal(mine.length,1);
});

test('one layout gives one key although validation hands out fresh cabinet ids each load', ()=>{
  // Stored cabinets without a design (wardrobes, kitchen, fridge) get random ids on every validation.
  const key=()=>canonicalIds(JSON.stringify(validateFurniture(clone(initialFurniture))));
  assert.notEqual(JSON.stringify(validateFurniture(clone(initialFurniture))),JSON.stringify(validateFurniture(clone(initialFurniture))));
  assert.equal(key(),key());
});

test('ids are renamed by first appearance, so references still have to match', ()=>{
  const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
  assert.equal(canonicalIds(`${a} ${b} ${a}`),canonicalIds(`${b} ${a} ${b}`));
  assert.notEqual(canonicalIds(`${a} ${b} ${a}`),canonicalIds(`${a} ${b} ${b}`));
});
