import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialFurniture,issues,validateFurniture,normalizeKitchenParts,normalizeSinkBasin} from '../dist/model.js';
import {furnitureInterference,tableChairInterference} from '../dist/geometry.js';
import {SpaceScene} from '../dist/scene.js';
import {constrainMove} from '../dist/spatial.js';

test('a tucked chair may enter the tabletop footprint but its back and legs remain protected',()=>{
 const table=initialFurniture.find(f=>f.id==='dining'),chair=initialFurniture.find(f=>f.id==='chair1');
 const tucked={...chair,x:1.8,z:3.05};
 assert.equal(tableChairInterference(tucked,table),false);
 assert.deepEqual(issues(tucked,[table,tucked]),[]);
 assert.equal(tableChairInterference({...tucked,z:3.35},table),true,'chair back should not overlap the tabletop');
 assert.equal(tableChairInterference({...tucked,x:1.45,z:3.3},table),true,'chair body should avoid table legs');
 const drag=constrainMove(tucked,{x:tucked.x,z:3.35},[tucked,table]);
 assert.equal(drag.blocked,true);
});

test('adjustable sink and kitchen parts are clamped to their work surfaces',()=>{
 const sink=initialFurniture.find(f=>f.id==='bathSink1'),kitchen=initialFurniture.find(f=>f.id==='kitchen');
 const basin=normalizeSinkBasin({...sink,basin:{w:5,d:5}}),parts=normalizeKitchenParts({...kitchen,kitchenParts:{sink:{w:5,d:5},cooktop:{w:5,d:5}}});
 assert(basin.w<=sink.w-.08&&basin.d<=sink.d-.08);
 assert(parts.sink.w<=kitchen.w*.54-.08&&parts.cooktop.w<=kitchen.w*.40-.08);
 const saved=validateFurniture([{...kitchen,kitchenParts:parts}])[0];
 assert.deepEqual(saved.kitchenParts,parts);
});

test('opened washer contains a dark recessed drum behind the movable door',()=>{
 const s=Object.create(SpaceScene.prototype);s.m=Object.fromEntries(['wood','fabric','white','accent','dark','metal','stone','glass','leaf'].map(k=>[k,new THREE.MeshStandardMaterial()]));s.actions=new Map;
 const f=initialFurniture.find(f=>f.type==='washer'),g=new THREE.Group;s.makeFurniture(g,f);const a=s.actions.get(f.id);
 assert.equal(a.type,'washer');assert(a.pivot.children.length>=3);assert(g.children.some(o=>o.material===s.m.dark));
});
