import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialFurniture,validateFurniture,issues,overlaps,inside,wallRects,doors} from '../dist/model.js';
test('import validation rejects corrupt numbers, unknown types, duplicate ids and excess height',()=>{assert.equal(validateFurniture(initialFurniture).length,initialFurniture.length);for(const patch of[{w:NaN},{h:2.8},{x:Infinity},{type:'script'},{d:-1}])assert.throws(()=>validateFurniture([{...initialFurniture[0],...patch}]));assert.throws(()=>validateFurniture([initialFurniture[0],initialFurniture[0]]));});
test('rotated rectangular collision separates and touches without false positives',()=>{let a={x:0,z:0,w:2,d:1,rot:0};assert.equal(overlaps(a,{...a,x:2}),false);assert.equal(overlaps(a,{...a,x:1.9}),true);assert.equal(overlaps(a,{...a,x:1.7,rot:90}),false);assert.equal(overlaps(a,{...a,x:1.3,rot:90}),true);});
test('entry outline and door gaps are walkable geometry',()=>{assert(inside(.5,7.8));assert(!inside(3,8));for(const d of doors){let p={x:d.x+Math.cos(d.angle)*d.width/2,z:d.z-Math.sin(d.angle)*d.width/2,w:.1,d:.1,rot:0};assert(!wallRects().some(w=>overlaps(p,w)),d.name);}});
test('all initial furniture fit shell and each other',()=>{const failures=initialFurniture.flatMap(f=>issues(f,initialFurniture).map(m=>f.name+': '+m));assert.deepEqual(failures,[]);});
