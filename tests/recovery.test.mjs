import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RECOVERY_KEY,readRecovered,setAside,discardRecovered,requestPersistentStorage} from '../dist/recovery.js';

const memory=()=>{const map=new Map;return{getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),map};};

test('an unreadable layout is set aside verbatim, newest first, once, and at most three',()=>{
 const s=memory();
 assert(setAside(s,'{"broken":1',new Date('2026-09-01T00:00:00Z')));
 assert(setAside(s,'{"broken":1',new Date('2026-09-02T00:00:00Z')));
 assert.equal(readRecovered(s).length,1,'the same text is kept once');
 for(const day of[3,4,5])setAside(s,'v'+day,new Date(`2026-09-0${day}T00:00:00Z`));
 const list=readRecovered(s);assert.equal(list.length,3);assert.equal(list[0].raw,'v5');
 discardRecovered(s,list[0].savedAt);assert.equal(readRecovered(s)[0].raw,'v4');
 for(const e of readRecovered(s))discardRecovered(s,e.savedAt);assert.equal(s.map.has(RECOVERY_KEY),false);
});

test('a refused copy is reported so autosave can pause, and junk reads as empty',()=>{
 const full={...memory(),setItem(){throw new Error('QuotaExceededError');}};
 assert.equal(setAside(full,'x'),false);
 const s=memory();s.setItem(RECOVERY_KEY,'not json');assert.deepEqual(readRecovered(s),[]);
 s.setItem(RECOVERY_KEY,JSON.stringify([{raw:1},{savedAt:'t',raw:'ok'}]));assert.deepEqual(readRecovered(s),[{savedAt:'t',raw:'ok'}]);
});

test('persistent storage is requested once and tolerated when unsupported',async()=>{
 let asked=0;
 assert.equal(await requestPersistentStorage({persisted:async()=>false,persist:async()=>{asked++;return true;}}),true);
 assert.equal(await requestPersistentStorage({persisted:async()=>true,persist:async()=>{asked++;return true;}}),true);
 assert.equal(asked,1);
 assert.equal(await requestPersistentStorage(undefined),false);
 assert.equal(await requestPersistentStorage({persist:async()=>{throw new Error('denied');}}),false);
});
