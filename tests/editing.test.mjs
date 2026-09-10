import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialFurniture,structuralBlocks,wallRects,validateFurniture,issues,migrateLayout} from '../dist/model.js';
import {constrainMove,signedDistance,distanceLabel,blocksCamera,cabinetLeaves,cabinetRects} from '../dist/spatial.js';
test('last half-centimetre nudge reaches contact and repeated moves cannot penetrate',()=>{
 let f={id:'test',name:'test',type:'chair',x:.315,z:3,w:.5,d:.5,h:.8,rot:0};
 const result=constrainMove(f,{x:f.x-.01,z:f.z},[f]);assert(result.blocked);f=result.item;assert(Math.abs(f.x-.31)<1e-6);assert.match(distanceLabel(Math.min(...wallRects().map(w=>signedDistance(f,w)))),/接觸/);
 for(let i=0;i<20;i++)f=constrainMove(f,{x:f.x-.01,z:f.z},[f]).item;
 assert(Math.abs(f.x-.31)<1e-6);assert.deepEqual(issues(f,[f]),[]);
});
test('drag cannot tunnel through a wall or another piece of furniture',()=>{
 const f={id:'test',name:'test',type:'chair',x:2,z:3,w:.4,d:.4,h:.8,rot:0},other={...f,id:'other',name:'other',x:2.7};
 const r=constrainMove(f,{x:3.5,z:3},[f,other]);assert(r.blocked);assert(Math.abs(r.item.x-2.3)<1e-6);
 const across=constrainMove({...f,x:2,z:1},{x:4,z:1},[]);assert(across.blocked);assert(across.item.x<2.57);
});
test('legacy overlaps can move outward but cannot get worse',()=>{
 const f={id:'test',type:'chair',x:.25,z:3,w:.5,d:.5,h:.8,rot:0};assert(constrainMove(f,{x:.24,z:3},[]).blocked);assert(!constrainMove(f,{x:.32,z:3},[]).blocked);
});
test('low dining furniture is passable only below camera; wardrobes stay solid',()=>{
 for(const f of initialFurniture.filter(f=>['table','chair','desk'].includes(f.type))){assert(!blocksCamera(f,1.3));assert(blocksCamera({...f,h:1.5},1.3));}
 assert(blocksCamera(initialFurniture.find(f=>f.id==='wardM'),1.6));
});
test('wet area solid blocks are collision obstacles and shower A fits the reduced recess',()=>{
 for(const b of structuralBlocks)assert(wallRects().includes(b));const f=initialFurniture.find(f=>f.id==='showerA');assert.equal(f.w,1.08);assert(structuralBlocks.every(b=>signedDistance(f,b)>=0));
 const old={...f,x:2.24,w:1.48};assert.equal(migrateLayout([old],4)[0].w,1.08);
});
test('cabinet styles persist and open outwards with opposing hinges for double doors',()=>{
 const f=initialFurniture.find(f=>f.id==='wardB');for(const style of ['left','right','double']){const item=validateFurniture([{...f,doorStyle:style}])[0];assert.equal(item.doorStyle,style);const leaves=cabinetLeaves(item);assert.equal(leaves.length,style==='double'?2:1);for(const r of cabinetRects(item,1))assert(r.z>f.z+f.d/2);}
 assert.deepEqual(cabinetLeaves({...f,doorStyle:'double'}).map(l=>l.sign),[1,-1]);
});
