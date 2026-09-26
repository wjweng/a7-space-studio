import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {validateFurniture,normalizeCornerShelf} from '../dist/model.js';
import {SpaceScene} from '../dist/scene.js';

const shelf=extra=>({id:'s',type:'cornerShelf',name:'轉角層架',x:4,z:3,w:.3,d:.3,h:2.5,rot:0,...extra});

test('a corner shelf keeps its own shelf heights, in order, and drops any above the top',()=>{
  const [f]=validateFurniture([shelf({shelves:[1.8,.4,.9,2.6,.4]})]);
  assert.deepEqual(f.shelves,[.4,.9,1.8],'sorted, duplicates and ones past the top board dropped');
  assert.equal(f.cap,true);
  assert.deepEqual(normalizeCornerShelf(shelf({})).shelves.length,3,'three even shelves by default');
  const lowered=validateFurniture([{...f,h:1.5}])[0];
  assert.deepEqual(lowered.shelves,[.4,.9],'lowering the unit drops shelves it no longer reaches');
  assert.equal(validateFurniture([shelf({cap:false})])[0].cap,false);
});

test('a corner shelf draws quarter-round shelves and the arched top only when asked',()=>{
  const s=Object.create(SpaceScene.prototype);
  s.m=Object.fromEntries(['wood','fabric','white','accent','dark','metal','stone','glass','leaf','glow'].map(k=>[k,new THREE.MeshStandardMaterial()]));
  Object.assign(s,{actions:new Map,lightObjects:[],items:[]});
  const count=f=>{const g=new THREE.Group;s.makeFurniture(g,validateFurniture([f])[0]);let quarters=0;g.traverse(o=>{if(o.geometry?.type==='CylinderGeometry')quarters++;});return quarters;};
  assert.equal(count(shelf({shelves:[.5,1,1.5]})),1+3+2,'base, three shelves, top board and its curved band');
  assert.equal(count(shelf({shelves:[.5],cap:false})),1+1);
  // Every quarter sweeps from the back edge round to the right edge, so the square corner sits back-right.
  const g=new THREE.Group;s.makeFurniture(g,validateFurniture([shelf({shelves:[1]})])[0]);g.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(g);
  assert(Math.abs(box.min.x+.15)<1e-6&&Math.abs(box.max.x-.15)<1e-6&&Math.abs(box.min.z+.15)<1e-6&&Math.abs(box.max.z-.15)<1e-6,'it fills its 30 × 30 cm footprint');
});
