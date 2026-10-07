import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {validateCabinetDesign,mergeDoorCells,splitCabinetCell,cellFinishSlots,cabinetCells,frameColour,glassKinds} from '../dist/cabinet-design.js';
import {validateFurniture,initialFurniture,wallRects} from '../dist/model.js';
import {SpaceScene} from '../dist/scene.js';
import {encodeShare,decodeShare} from '../dist/share.js';

function fixture(){const s=Object.create(SpaceScene.prototype);s.m=Object.fromEntries(['wood','fabric','white','accent','dark','metal','stone','glass','leaf','glow','lightWhite','lightNatural','lightWarm'].map(k=>[k,new THREE.MeshStandardMaterial()]));s.actions=new Map;s.lightObjects=[];s.resizeHandles=new THREE.Group;s.collisionWalls=wallRects();s.items=[];s.invalidHelpers=new Map;s.invalidMarkers=new Map;s.foregroundDraft=null;return s;}
const wardrobe=(cells,extra={})=>({...initialFurniture.find(f=>f.type==='wardrobe'),id:'g',x:0,z:0,w:.8,d:.5,h:2,rot:0,openCells:{},cabinetDesign:{template:'custom',columns:[{id:'c',width:.8,bottom:0,cells}]},...extra});
const leaves=f=>validateCabinetDesign(f,f.cabinetDesign).columns[0].cells;

test('glass is kept on hinged and sliding doors with a known kind and a preset or hex frame',()=>{
  const [a,b,c,d,e]=leaves(wardrobe([
    {id:'a',height:.4,front:'left',glass:{kind:'reeded',frame:'champagne'}},
    {id:'b',height:.4,front:'sliding4',glass:{kind:'nope',frame:'#12AB34'}},
    {id:'gr',height:.4,front:'grooved',glass:{kind:'clear',frame:'black'}},
    {id:'d',height:.4,front:'drawers',glass:{kind:'clear',frame:'black'}},
    {id:'e',height:.4,front:'double',glass:{kind:'grey',frame:'url(x)'}}]));
  assert.deepEqual(a.glass,{kind:'reeded',frame:'champagne'});
  assert.deepEqual(b.glass,{kind:'clear',frame:'#12AB34'},'an unknown kind falls back to clear glass');
  assert.equal('glass' in c,false,'a grooved leaf has its slot cut in the board');
  assert.equal('glass' in d,false,'drawers take no glass');
  assert.deepEqual(e.glass,{kind:'grey',frame:'black'},'an unknown frame falls back to black');
  assert.equal(frameColour('champagne'),'#bba67e');assert.equal(frameColour('#12ab34'),'#12ab34');
});

test('a merged door and its split halves keep the glass of the door',()=>{
  const f=wardrobe([{id:'a',height:1,front:'left',glass:{kind:'bronze',frame:'titanium'}},{id:'b',height:1,front:'left'}]);
  f.cabinetDesign=validateCabinetDesign(f,f.cabinetDesign);
  const merged=validateCabinetDesign(f,mergeDoorCells(f,['a','b']));
  assert(merged.columns[0].cells.every(c=>c.glass?.kind==='bronze'&&c.glass.frame==='titanium'),'every member mirrors the first cell');
  const split=validateCabinetDesign(f,splitCabinetCell(f.cabinetDesign,'a',(n=>()=>'n'+n++)(0),'side'));
  const row=split.columns[0].cells[0];
  assert.equal(row.parts[0].glass.kind,'bronze','the half that keeps the id keeps its glass');
  assert.equal('glass' in row,false,'the row that now holds both halves has no front of its own');
  const glassCell=cabinetCells(f).find(c=>c.id==='a');
  assert(!cellFinishSlots(f,glassCell).some(([slot])=>slot==='door'),'a glass leaf offers no board finish');
});

test('a glass leaf is an aluminium frame round a pane that casts no shadow, and the cell behind stays lit',()=>{
  const s=fixture(),g=new THREE.Group;
  const f=validateFurniture([wardrobe([{id:'plain',height:1,front:'left'},{id:'pane',height:1,front:'left',handle:true,glass:{kind:'reeded',frame:'#336699'}}])])[0];
  s.makeFurniture(g,f);
  const a=s.actions.get('g'),door=a.parts.find(p=>p.id==='pane'),plain=a.parts.find(p=>p.id==='plain');
  assert.equal(plain.pivot.children.length,1,'a board leaf is one panel');
  const meshes=door.pivot.children,pane=meshes.find(m=>m.material.transparent);
  assert.equal(meshes.length,6,'four frame bars, the pane and the handle');
  assert(pane&&!pane.castShadow&&pane.material.depthWrite===false,'the pane lets light and the cell behind through');
  assert(pane.receiveShadow,'walls still stop lamps in other rooms from lighting the pane');
  assert(pane.material.isMeshLambertMaterial,'the pane takes no highlights, so the fill light leaves no white spot');
  assert(meshes.filter(m=>m.material.color.getHexString()==='336699').length===4,'the frame takes the chosen colour');
  assert(pane.material.map&&pane.geometry.attributes.uv.array.some(u=>u>10),'reeded flutes repeat across the pane');
  assert(a.shades.every(x=>x.cell!=='pane'),'nothing behind the glass is shaded');
  assert(a.shades.some(x=>x.cell==='plain'),'the board door still shades its cell');
});

test('sliding glass leaves and every glass kind build',()=>{
  for(const [kind]of glassKinds){
    const s=fixture(),g=new THREE.Group;
    const f=validateFurniture([wardrobe([{id:'s',height:2,front:'sliding',glass:{kind,frame:'white'}}],{w:1.2,cabinetDesign:{template:'custom',columns:[{id:'c',width:1.2,bottom:0,cells:[{id:'s',height:2,front:'sliding',glass:{kind,frame:'white'}}]}]}})])[0];
    s.makeFurniture(g,f);
    const slides=s.actions.get('g').parts.filter(p=>p.kind==='slide');
    assert.equal(slides.length,2);
    assert(slides.every(p=>p.pivot.children.filter(m=>m.material.transparent).length===1),`${kind}: each leaf has one pane`);
  }
});

test('glass doors survive a share link',async()=>{
  const f=validateFurniture([wardrobe([{id:'a',height:2,front:'double',glass:{kind:'frosted',frame:'#a1b2c3'}}])])[0];
  const decoded=await decodeShare(await encodeShare('玻璃門',{furniture:[f]}));
  assert.deepEqual(decoded.state.furniture[0].cabinetDesign.columns[0].cells[0].glass,{kind:'frosted',frame:'#a1b2c3'});
});
