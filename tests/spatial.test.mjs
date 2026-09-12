import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialFurniture,doors,rooms,wallRects,issues,migrateLayout,corners,inside} from '../dist/model.js';
import {signedDistance,distanceLabel,sameRoom,roomAt,doorRects,fixedDoorLimit,pointClear,findRoute,segmentClear,showerDoorRects,EPS} from '../dist/spatial.js';
test('wall contact and sub-centimetre penetration have consistent signed labels',()=>{
 const a={x:1,z:1,w:1,d:1,rot:0},b={...a,x:2};
 assert.equal(signedDistance(a,b),0);assert.match(distanceLabel(signedDistance(a,b)),/接觸/);
 b.x=1.999;assert(signedDistance(a,b)<0);assert.match(distanceLabel(signedDistance(a,b)),/重疊 0.1/);
 b.x=2.0005;assert.equal(distanceLabel(signedDistance(a,b)),'< 0.1 cm');
});
test('furniture across room boundaries does not produce furniture interference',()=>{
 const a={id:'a',name:'A',x:6.50,z:4.8,w:.4,d:.4,h:1,rot:0},b={...a,id:'b',name:'B',x:6.64};
 assert(!sameRoom(a,b));assert(!issues(a,[a,b]).some(x=>x.includes('B')));
});
test('all fixed door slabs and both handles clear structural walls throughout opening',()=>{
 for(const d of doors){const limit=fixedDoorLimit(d);assert(limit>75,d.id);for(let i=0;i<=100;i++)for(const r of doorRects(d,i/100,limit))for(const wall of wallRects())assert(signedDistance(r,wall)>=-EPS,`${d.id} at ${i}%`);}
});
test('both shower doors sweep inward without crossing walls or bathroom fixtures',()=>{for(const shower of initialFurniture.filter(f=>f.type==='shower'))for(let step=0;step<=20;step++)for(const rect of showerDoorRects(shower,step/20)){assert(corners(rect).every(([x,z])=>inside(x,z)),`${shower.id} outside at ${step}`);for(const wall of wallRects())assert(signedDistance(rect,wall)>=-EPS,`${shower.id} wall at ${step}`);for(const item of initialFurniture)if(item.id!==shower.id&&!['rug','light','beam'].includes(item.type)&&sameRoom(shower,item))assert(signedDistance(rect,item)>=-EPS,`${shower.id} ${item.id} at ${step}`);}});
test('every default room has a continuous furniture-free route from the entrance',()=>{
 const obstacles=[...wallRects(),...initialFurniture.filter(f=>f.type!=='rug'&&f.h>.15),...doors.flatMap(d=>doorRects(d,1,fixedDoorLimit(d)))],clear=(x,z)=>pointClear(x,z,obstacles),start={x:.75,z:7.7};
 for(const room of rooms){const path=findRoute(start,room,clear);assert(path?.length,room.name);assert.equal(roomAt(path.at(-1).x,path.at(-1).z),roomAt(room.x,room.z));let last=start;for(const p of path){assert(segmentClear(last,p,clear),room.name);last=p;}}
 assert(!clear(5.58,1.27));assert(!clear(1.96,3.55));
});
test('column corrections preserve furniture that users already moved',()=>{
 const old=structuredClone(initialFurniture);old.find(f=>f.id==='shoe').z=6.14;old.find(f=>f.id==='bedM').z=1.19;
 const revised=migrateLayout(old,3);assert.equal(revised.find(f=>f.id==='shoe').z,6.10);assert.equal(revised.find(f=>f.id==='bedM').z,1.31);
 old.find(f=>f.id==='shoe').x=.4;old.find(f=>f.id==='bedM').z=1.5;const custom=migrateLayout(old,3);assert.equal(custom.find(f=>f.id==='shoe').z,6.14);assert.equal(custom.find(f=>f.id==='bedM').z,1.5);
});
