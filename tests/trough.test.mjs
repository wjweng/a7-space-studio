import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {validateFurniture,TROUGH,troughCapacity} from '../dist/model.js';
import {placeOutlet,troughTurn,socketOnSurface,socketFromTopView} from '../dist/spatial.js';
import {planSvg} from '../dist/plan-drawing.js';
import {SpaceScene} from '../dist/scene.js';

// A desk against the north wall (z = 0), in bedroom A, its back to the wall.
const desk={id:'desk',type:'desk',name:'書桌',x:4,z:.3,w:1.4,d:.6,h:.75,rot:0,open:0,finish:'P92'};
const trough=(extra={})=>validateFurniture([{id:'t',type:'outlet',name:'線槽',x:4,z:.3,w:.6,d:.12,h:.018,rot:0,open:0,outletKind:'duplex',outletMount:'top',supportId:'desk',elevation:.75,trough:{count:2},...extra}])[0];

test('the length decides how many sockets fit, and the width must take a plate beside the slot',()=>{
  assert.equal(troughCapacity(.6),4);assert.equal(troughCapacity(.2),1);assert.equal(troughCapacity(.3),2);
  const t=trough({w:.3,d:.05,trough:{count:9}});
  assert.equal(t.trough.count,2,'more sockets than the length takes are cut to what fits');
  assert.equal(t.d,TROUGH.minW,'too narrow a trough is widened to take a plate');
  assert.equal(t.outletMount,'top');assert.equal(t.h,TROUGH.h);
});
test('on a desk its slot turns to the wall, and it never runs past the top',()=>{
  assert.equal(troughTurn(desk),0,'the back edge is nearest the wall');
  assert.equal(troughTurn({...desk,rot:90,x:.35,z:3,w:1.4,d:.6}),0,'a desk turned to the west wall still has its back there');
  const placed=placeOutlet(trough(),[desk]);
  assert.equal(placed.rot,0);assert.equal(placed.elevation,.75,'the lid sits in the top surface');
  const flipped=placeOutlet(trough({trough:{count:2,flip:true}}),[desk]);assert.equal(flipped.rot,180,'flipped, the slot faces the room');
  const long=placeOutlet(trough({w:2.2,trough:{count:4}}),[desk]);
  assert.equal(long.w,1.4,'cut to the desk\'s length');assert(long.trough.count<=troughCapacity(1.4));
  const far=placeOutlet({...trough(),x:9,z:.3},[desk],{fromPoint:true});
  assert(Math.abs(far.x-desk.x)<=desk.w/2-far.w/2+1e-9,'dragged past the end it stops at the edge');
});
test('a trough only goes on a top: not on a wall, the floor or into a cell',()=>{
  const t=trough();
  assert.equal(socketOnSurface(t,{point:{x:4,y:1,z:0},normal:{x:0,y:0,z:1},id:null},[desk]),null,'a wall');
  assert.equal(socketOnSurface(t,{point:{x:4,y:.75,z:.3},normal:{x:0,y:1,z:0},id:'desk'},[desk]).supportId,'desk','the desk top');
  assert.equal(socketFromTopView(t,{x:2,z:4},[desk]),t,'top view, off any top: it stays where it was');
});
test('the scene draws a lid that opens about the slot and shows the sockets only while open',()=>{
  const s=Object.create(SpaceScene.prototype);
  s.m=Object.fromEntries(['wood','fabric','white','accent','dark','metal','stone','glass','leaf','glow'].map(k=>[k,new THREE.MeshStandardMaterial()]));
  Object.assign(s,{actions:new Map,items:[desk]});s.finishMaterial=()=>null;
  const t=placeOutlet(trough({trough:{count:3}}),[desk]),g=new THREE.Group;s.makeFurniture(g,t);
  const a=s.actions.get(t.id);assert.equal(a.type,'trough');assert.equal(a.inside.visible,false,'closed: the sockets are hidden');
  assert.equal(a.inside.children.filter(c=>c.isGroup).length,3,'one plate per socket');
  s.makeFurniture(new THREE.Group,{...t,open:1});assert.equal(s.actions.get(t.id).inside.visible,true,'open: they show');
});
test('the plan sheet draws a trough like furniture, with its sockets in the label',()=>{
  const svg=planSvg([desk,placeOutlet(trough(),[desk])]);
  assert(svg.includes('60×12（雙插座 ×2）'));assert(svg.includes('線槽：嵌入檯面'));
});
