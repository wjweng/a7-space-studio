import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {validateFurniture,CORNER_BOARD} from '../dist/model.js';
import {cabinetCells,designLeaves} from '../dist/cabinet-design.js';
import {SpaceScene} from '../dist/scene.js';

const shelf=extra=>({id:'s',type:'cornerShelf',name:'轉角層架',x:4,z:3,w:.3,d:.3,h:2.5,rot:0,...extra});

test('a corner shelf is a one-column design of open cells; older saved shelf heights convert to it',()=>{
  const [fresh]=validateFurniture([shelf()]);
  assert.equal(cabinetCells(fresh).length,4,'three even shelves by default');
  const [old]=validateFurniture([shelf({shelves:[1.7,.5,1,2.6]})]);
  const tops=cabinetCells(old).filter(c=>c.bottom>0).map(c=>Math.round((c.bottom+CORNER_BOARD)*1000)/1000);
  assert.deepEqual(tops,[.5,1,1.7],'each old shelf top lands where it was; one above the top is dropped');
  assert(!('shelves' in old));assert.equal(old.cap,true);
  // Whatever a design says, a corner shelf has no fronts.
  const design=structuredClone(old.cabinetDesign);for(const cell of designLeaves(design)){cell.front='double';cell.handle=true;}
  const [again]=validateFurniture([{...old,cabinetDesign:design,cap:false}]);
  assert(designLeaves(again.cabinetDesign).every(c=>c.front==='open'&&!c.handle));assert.equal(again.cap,false);
});

test('a corner shelf draws a quarter-round board per shelf and a top board as thick as a shelf',()=>{
  const s=Object.create(SpaceScene.prototype);
  s.m=Object.fromEntries(['wood','fabric','white','accent','dark','metal','stone','glass','leaf','glow'].map(k=>[k,new THREE.MeshStandardMaterial()]));
  Object.assign(s,{actions:new Map,lightObjects:[],items:[]});
  const boards=f=>{const g=new THREE.Group;s.makeFurniture(g,validateFurniture([f])[0]);const out=[];g.traverse(o=>{if(o.geometry?.type==='CylinderGeometry')out.push(o.geometry.parameters.height);});return out;};
  const capped=boards(shelf({shelves:[.5,1,1.5]}));
  assert.equal(capped.length,1+3+1,'base, three shelves and the top board');
  assert.equal(capped.filter(t=>t===CORNER_BOARD).length,4,'shelves and top board share one thickness');
  assert.equal(boards(shelf({shelves:[.5],cap:false})).length,1+1);
  const g=new THREE.Group;s.makeFurniture(g,validateFurniture([shelf()])[0]);g.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(g);
  assert(Math.abs(box.min.x+.15)<1e-6&&Math.abs(box.max.x-.15)<1e-6&&Math.abs(box.min.z+.15)<1e-6&&Math.abs(box.max.z-.15)<1e-6,'it fills its 30 × 30 cm footprint');
});

test('corner shelf finishes follow the cabinet rules: a cell, then all shelves or backs, then the unit',()=>{
  const s=Object.create(SpaceScene.prototype);
  s.m=Object.fromEntries(['wood','fabric','white','accent','dark','metal','stone','glass','leaf','glow'].map(k=>[k,new THREE.MeshStandardMaterial()]));
  Object.assign(s,{actions:new Map,lightObjects:[],items:[]});
  const [f]=validateFurniture([shelf({shelves:[.5,1,1.5],finish:'P92'})]);f.partFinishes={shelves:'P64'};
  const cells=cabinetCells(f),own=cells.find(c=>c.bottom>0).id;
  for(const cell of designLeaves(f.cabinetDesign))if(cell.id===own)cell.finishes={shelf:'P87',back:'B35'};
  const [g0]=validateFurniture([f]),g=new THREE.Group;s.makeFurniture(g,g0);
  const used=new Set;g.traverse(o=>{if(o.isMesh)used.add(o.material);});
  for(const code of['P92','P64','P87','B35'])assert(used.has(s.finishMaterial(code)),code+' is drawn');
  let p87=0,p64=0;g.traverse(o=>{if(o.geometry?.type==='CylinderGeometry'){if(o.material===s.finishMaterial('P87'))p87++;if(o.material===s.finishMaterial('P64'))p64++;}});
  assert.equal(p87,1,'the cell with its own shelf finish');assert.equal(p64,2,'the other shelves follow all shelves');
  let b35=0;g.traverse(o=>{if(o.geometry?.type==='BoxGeometry'&&o.material===s.finishMaterial('B35'))b35++;});
  assert.equal(b35,2,'that cell\'s back finish covers both straight boards, the wall one and the side one');
});
