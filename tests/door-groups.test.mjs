import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {validateCabinetDesign,cabinetCells,modularCabinetRects,frontPanels,mergeDoorCells,splitDoorGroup,splitCabinetCell,doorGroupOf,FRONT_GAP} from '../dist/cabinet-design.js';
import {validateFurniture} from '../dist/model.js';
import {SpaceScene} from '../dist/scene.js';

// A 1.2 m wide, 2.4 m tall wardrobe of two columns with three rows each.
const row=(id,height,front='left',extra={})=>({id,height,front,...extra});
const cabinet=()=>({id:'w',type:'wardrobe',name:'收納櫃',x:4,z:1,w:1.2,d:.5,h:2.4,rot:0,open:0,
  cabinetDesign:{template:'custom',columns:[{id:'L',width:.6,bottom:0,cells:[row('a',.8,'drawers'),row('b',.8),row('c',.8)]},{id:'R',width:.6,bottom:0,cells:[row('d',.8),row('e',.8),row('f',.8,'open')]}]}});
const withDesign=(f,design)=>({...f,cabinetDesign:validateCabinetDesign(f,design)});

test('cells that make a rectangle merge into one door that covers them exactly',()=>{
  const f=cabinet(),merged=withDesign(f,mergeDoorCells(f,['b','c','e','f']));
  const group=doorGroupOf(merged.cabinetDesign,'c');
  assert.deepEqual([...group.cells].sort(),['b','c','e','f']);
  const panels=frontPanels(merged),door=panels.find(p=>p.ids.length===4);
  assert.equal(panels.length,3,'drawer a, door d on its own, and the shared door');
  assert(Math.abs(door.w-1.2)<1e-9&&Math.abs(door.h-1.6)<1e-9&&Math.abs(door.bottom-.8)<1e-9,'the door spans exactly the merged cells');
  assert.equal(door.front,'left','keeps the first chosen hinged front');
  for(const id of group.cells)assert.equal(cabinetCells(merged).find(c=>c.id===id).front,'left','the open cell gets the shared door too');
  // Opening swings the full 1.2 m leaf, keyed by the first member.
  const [leaf]=modularCabinetRects(merged,{[door.id]:1});
  assert(Math.abs(leaf.w-(1.2-FRONT_GAP))<1e-9&&Math.abs(leaf.yMax-leaf.yMin-1.6)<1e-9);
});

test('a selection that is not a rectangle is refused with the reason',()=>{
  assert.throws(()=>mergeDoorCells(cabinet(),['b','c','e']),/矩形/);
  assert.throws(()=>mergeDoorCells(cabinet(),['b']),/至少選兩格/);
});

test('a merge picks up the whole group a chosen cell already belongs to',()=>{
  const f=cabinet(),first=withDesign(f,mergeDoorCells(f,['b','c']));
  const second=withDesign(first,mergeDoorCells(first,['e','f','b']));
  assert.equal(second.cabinetDesign.doorGroups.length,1);
  assert.deepEqual([...second.cabinetDesign.doorGroups[0].cells].sort(),['b','c','e','f']);
});

test('groups that stop being a rectangle of hinged cells are dropped, and cells keep their doors',()=>{
  const f=cabinet(),merged=withDesign(f,mergeDoorCells(f,['b','c']));
  let n=0;const fresh=()=>'n'+(++n);
  const stacked=withDesign(merged,splitCabinetCell(merged.cabinetDesign,'c',fresh,'stack'));
  assert(doorGroupOf(stacked.cabinetDesign,'b'),'b and the lower half of c still make a rectangle');
  const split=withDesign(merged,splitCabinetCell(merged.cabinetDesign,'c',fresh,'side'));
  assert.equal(split.cabinetDesign.doorGroups,undefined);
  assert.equal(cabinetCells(split).find(c=>c.id==='b').front,'left');
  const drawers=structuredClone(merged.cabinetDesign);for(const col of drawers.columns)for(const cell of col.cells)if(['b','c'].includes(cell.id))cell.front='drawers';
  assert.equal(validateCabinetDesign(f,drawers).doorGroups,undefined,'drawers never share a front');
  assert.equal(withDesign(merged,splitDoorGroup(merged.cabinetDesign,'b')).cabinetDesign.doorGroups,undefined);
});

test('handles are off unless asked for, and group members share handle and door finish',()=>{
  const f=cabinet();
  assert(frontPanels(withDesign(f,f.cabinetDesign)).every(p=>!p.handle));
  const design=structuredClone(f.cabinetDesign);design.columns[0].cells[1].handle=true;design.columns[0].cells[1].finishes={door:'P87'};
  const merged=withDesign(f,mergeDoorCells({...f,cabinetDesign:design},['b','c']));
  const c=cabinetCells(merged).find(cell=>cell.id==='c');
  assert.equal(c.handle,true);assert.equal(c.finishes.door,'P87');
  const [saved]=validateFurniture([merged]);
  assert.deepEqual(saved.cabinetDesign.doorGroups,merged.cabinetDesign.doorGroups,'groups survive saving and loading');
});

test('the scene draws one leaf per shared door and a handle only when ticked',()=>{
  const s=Object.create(SpaceScene.prototype);
  s.m=Object.fromEntries(['wood','fabric','white','accent','dark','metal','stone','glass','leaf','glow'].map(k=>[k,new THREE.MeshStandardMaterial()]));
  Object.assign(s,{actions:new Map,items:[]});
  const f=cabinet(),merged=withDesign(f,mergeDoorCells(f,['b','c','e','f']));
  const count=item=>{s.actions=new Map;const g=new THREE.Group;s.makeFurniture(g,item);const parts=s.actions.get(item.id).parts;let metal=0;g.traverse(o=>{if(o.isMesh&&o.material===s.m.metal)metal++;});return{doors:parts.filter(p=>p.kind==='door').length,metal};};
  const plain=count(merged);
  assert.equal(plain.doors,2,'door d and one shared door');
  const design=structuredClone(merged.cabinetDesign);for(const col of design.columns)for(const cell of col.cells)if(cell.front!=='open')cell.handle=true;
  const handled=count(withDesign(merged,design));
  assert.equal(handled.metal-plain.metal,3,'one handle per door and one on the drawer');
});
