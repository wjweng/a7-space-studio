import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SpaceScene,floorBoardRects} from '../dist/scene.js';
import {issues,mountedOn,mountDrop,hangingElevation,lightMountDrop,validateFurniture,initialFurniture,wallRects,HEIGHT} from '../dist/model.js';
import {blocksCamera} from '../dist/spatial.js';

const beam={id:'b',type:'beam',name:'樑',x:2,z:3,w:3,d:.2,h:.3,rot:0};
const linear={id:'l',type:'light',name:'線燈',lightKind:'linear',x:2,z:3,w:1.2,d:.04,h:.01,rot:0};
function fixture(){const s=Object.create(SpaceScene.prototype);s.m=Object.fromEntries(['wood','fabric','white','accent','dark','metal','stone','glass','leaf','glow','lightWhite','lightNatural','lightWarm'].map(k=>[k,new THREE.MeshStandardMaterial()]));Object.assign(s,{actions:new Map,lightObjects:[],resizeHandles:new THREE.Group,collisionWalls:wallRects(),items:[],invalidHelpers:new Map,invalidMarkers:new Map,foregroundDraft:null});return s;}

test('a light wholly under a beam is mounted on it; one straddling its edge still clashes',()=>{
 assert(mountedOn(linear,beam));
 assert.deepEqual(issues(linear,[linear,beam]),[]);assert.deepEqual(issues(beam,[linear,beam]),[]);
 assert.equal(lightMountDrop(linear,[linear,beam]),.3);
 const straddling={...linear,z:3.1};
 assert(!mountedOn(straddling,beam));assert(issues(straddling,[straddling,beam]).length>0);
 assert.equal(lightMountDrop(straddling,[straddling,beam]),0);
 const turned={...beam,rot:90,w:3,d:.2},along={...linear,rot:90};
 assert(mountedOn(along,turned),'rotated beams hold lights running along them');
 assert.equal(lightMountDrop(linear,[linear,{...beam,draft:true}]),0,'a hidden draft beam holds nothing');
});

test('mounted lights drop under the beam in walk view and rise above it in top view',()=>{
 const s=fixture();s.items=[linear,beam];
 s.mode='walk';assert.equal(s.mountOffset(linear),-.3);
 s.mode='top';assert(s.mountOffset(linear)>linear.h,'clears the beam top');
 s.items=[linear];s.mode='walk';assert.equal(s.mountOffset(linear),0);
});

test('a linear light protrudes by its height',()=>{
 for(const h of[.01,.05]){
  const s=fixture(),g=new THREE.Group;s.makeFurniture(g,{...linear,h,lumens:1200,dimming:100,colorTemperature:'white'});
  const bar=g.children.find(o=>o.isMesh&&o.material.userData.fixtureLens);bar.geometry.computeBoundingBox();
  const box=bar.geometry.boundingBox;assert(Math.abs(box.max.y-box.min.y-h)<1e-9,'bar is '+h+' m deep');
  assert(Math.abs(bar.position.y+box.max.y-HEIGHT)<1e-9,'top stays on the ceiling');
 }
});

test('fabric colours survive validation only on upholstered furniture and recolour only fabric',()=>{
 const sofa=initialFurniture.find(f=>f.type==='sofa'),wardrobe=initialFurniture.find(f=>f.type==='wardrobe');
 const [kept]=validateFurniture([{...sofa,fabric:'#4A6552',finish:'P64'}]);
 assert.equal(kept.fabric,'#4a6552');assert.equal('finish' in kept,false,'sofas no longer take a board finish');
 assert.equal('fabric' in validateFurniture([{...sofa,fabric:'green'}])[0],false);
 assert.equal('fabric' in validateFurniture([{...wardrobe,fabric:'#4a6552'}])[0],false);
 const s=fixture(),g=new THREE.Group;s.makeFurniture(g,{...sofa,fabric:'#4a6552'});
 const meshes=[];g.traverse(o=>{if(o.isMesh)meshes.push(o);});
 assert(meshes.some(m=>m.material.color?.getHexString()==='4a6552'),'upholstery takes the colour');
 assert(!meshes.some(m=>m.material===s.m.fabric),'no upholstery keeps the palette fabric');
 assert(meshes.some(m=>m.material===s.m.wood),'legs keep their wood');
 assert.equal(s.fabricOverride,null,'the override does not leak to the next item');
});

test('walking passes through plants',()=>{
 assert.equal(blocksCamera(initialFurniture.find(f=>f.type==='plant')),false);
});

test('floor boards meet end to end with a joint, not a gap',()=>{
 const boards=floorBoardRects(),byColumn=new Map;
 for(const b of boards){const k=b.x.toFixed(3);if(!byColumn.has(k))byColumn.set(k,[]);byColumn.get(k).push(b);}
 let joints=0;
 for(const column of byColumn.values()){column.sort((a,b)=>a.z-b.z);for(let i=1;i<column.length;i++){const gap=(column[i].z-column[i].d/2)-(column[i-1].z+column[i-1].d/2);if(gap<.05){joints++;assert(gap>0&&gap<=.0035,'joint is '+gap);}}}
 assert(joints>50);
});

test('refreshing the scene moves a mounted light group to the beam underside and back when the beam goes',()=>{
 const s=fixture(),g=new THREE.Group;Object.assign(s,{scene:new THREE.Scene,groups:new Map([[linear.id,g]]),items:[linear,beam],selected:null,selection:null,mode:'walk'});
 s.refreshValidity();assert.equal(g.position.y,-.3);
 s.mode='top';s.refreshValidity();assert(g.position.y>0);
 s.items=[linear];s.mode='walk';s.refreshValidity();assert.equal(g.position.y,0);
});

// Ceiling -> beam -> hanging cabinet -> light: each hangs from the one above
// only when its whole footprint lies under it.
const wideBeam={...beam,d:.6};
const hanging={id:'h',type:'hangingCabinet',name:'吊櫃',x:2,z:3,w:1,d:.35,h:.6,rot:0};
const named=(list,name)=>list.some(m=>m.includes(name));

test('a hanging cabinet hangs from the ceiling or a beam wholly above it, and lights hang below it',()=>{
 assert.equal(mountDrop(hanging,[hanging]),0);
 assert.equal(hangingElevation(hanging,[hanging]),HEIGHT-.6);
 const lamp={...linear,w:.5,lightKind:'ceiling'};
 assert(mountedOn(lamp,hanging));
 assert.ok(Math.abs(mountDrop(lamp,[lamp,hanging])-.6)<1e-9,'a light under the cabinet is pushed down to its underside');
 assert(!named(issues(lamp,[lamp,hanging]),'吊櫃'));
 const stack=[wideBeam,hanging,lamp];
 assert.ok(Math.abs(mountDrop(hanging,stack)-.3)<1e-9);
 assert.ok(Math.abs(hangingElevation(hanging,stack)-(HEIGHT-.9))<1e-9);
 assert.ok(Math.abs(mountDrop(lamp,stack)-.9)<1e-9,'the drop accumulates through beam and cabinet');
 assert(!named(issues(hanging,stack),'樑'));
});

test('nothing may hang partly over empty space, and the order never inverts',()=>{
 const straddling={...hanging,z:3.25};
 assert(!mountedOn(straddling,wideBeam));
 assert(named(issues(straddling,[wideBeam,straddling]),'樑'),'a cabinet half under a beam clashes');
 const edgeLamp={...linear,w:.5,lightKind:'ceiling',x:2.6};
 assert(named(issues(edgeLamp,[hanging,edgeLamp]),'吊櫃'),'a light half under a cabinet clashes');
 assert(!mountedOn(wideBeam,{...hanging,w:4,d:1}),'a beam never hangs from a cabinet');
 assert(!mountedOn({...hanging,w:.3,d:.02},{...linear,w:.5,d:.5}),'a cabinet never hangs from a light');
 assert.equal(mountDrop(hanging,[{...wideBeam,draft:true},hanging]),0,'a draft beam holds nothing');
});

test('hanging cabinets clash with floor furniture only where their heights overlap',()=>{
 const tall={id:'w',type:'wardrobe',name:'衣櫃',x:2,z:3,w:.8,d:.35,h:2.35,rot:0};
 assert(!named(issues(hanging,[hanging,tall]),'衣櫃'),'a 2.35 m wardrobe fits under a cabinet whose underside is at 2.4 m');
 assert(!named(issues(tall,[hanging,tall]),'吊櫃'));
 const taller={...tall,h:2.5};
 assert(named(issues(hanging,[hanging,taller]),'衣櫃'));
 assert(named(issues(taller,[hanging,taller]),'吊櫃'));
 assert(!blocksCamera({...hanging,elevation:2.4}),'a cabinet above head height does not block the walk camera');
 assert(blocksCamera({...hanging,h:1.8,elevation:1.2}));
});

test('a hanging cabinet always has a cabinet design and is drawn at its elevation',()=>{
 const [valid]=validateFurniture([{...hanging,elevation:2.4}]);
 assert.equal(valid.cabinetDesign.columns.length,1);
 assert.equal(valid.elevation,2.4);
 const s=fixture();s.items=[wideBeam,hanging];
 assert.ok(Math.abs(s.mountOffset(hanging)-(HEIGHT-.9))<1e-9);
});

test('top view stacks what hangs lower higher up, so light over cabinet over beam',()=>{
 const s=fixture(),lamp={...linear,w:.5,lightKind:'ceiling'},stack=[wideBeam,hanging,lamp];s.items=stack;
 s.mode='top';
 const cabinetBottom=s.mountOffset(hanging),cabinetTop=cabinetBottom+hanging.h;
 assert.ok(cabinetBottom>=HEIGHT,'the cabinet under a beam draws above the beam top');
 const lampBottom=HEIGHT-Math.max(.02,lamp.h)+s.mountOffset(lamp);
 assert.ok(lampBottom>cabinetTop,'the light under the cabinet draws above the cabinet');
 s.items=[hanging];assert.ok(Math.abs(s.mountOffset(hanging)-(HEIGHT-.6))<1e-9,'a cabinet on the ceiling keeps its real height');
 s.items=stack;s.mode='walk';assert.ok(Math.abs(s.mountOffset(hanging)-(HEIGHT-.9))<1e-9,'walk view is unchanged');
});
