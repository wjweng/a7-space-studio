import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SpaceScene,floorBoardRects} from '../dist/scene.js';
import {issues,mountedOn,lightMountDrop,validateFurniture,initialFurniture,wallRects,HEIGHT} from '../dist/model.js';
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
