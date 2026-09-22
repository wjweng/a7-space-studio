import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SITE,towers,paintFacade,northFacade,eastFacade,corridor} from '../dist/surroundings.js';
import {walls,doors} from '../dist/model.js';
import {SpaceScene} from '../dist/scene.js';

test('neighbouring towers stand at the estimated distances and rise above the 14th floor',()=>{
 assert.equal(SITE.ground,-13*SITE.floorHeight);
 assert(Math.abs(northFacade-(SITE.northFace-18))<1e-9,'the tower opposite is 18 m north');
 assert(Math.abs(eastFacade-(SITE.eastFace+8))<1e-9,'the neighbour is 8 m east');
 for(const t of towers){
  assert(t.top>2.79,t.id+' is taller than A7');
  if(t.faces==='south')assert(t.z1<=northFacade+1.5+1e-9,t.id+' stays across the lane');
  else assert(t.x0>=eastFacade-1e-9,t.id+' stays east of the gap');
 }
});

test('facades paint deterministically, with some but not all windows lit at night',()=>{
 for(const t of towers){
  const a=paintFacade(t,20,40),b=paintFacade(t,20,40);
  assert.deepEqual(a.albedo,b.albedo,t.id);
  let lit=0;for(let k=0;k<a.glow.length;k+=4)if(a.glow[k]+a.glow[k+1]+a.glow[k+2]>0)lit++;
  const share=lit/(a.width*a.height);assert(share>.03&&share<.5,t.id+' lit share '+share.toFixed(2));
 }
});

test('the lobby corridor lines up with the front door and runs away from the flat',()=>{
 const entry=doors.find(d=>d.name==='玄關大門'),wall=walls.find(w=>w.a[0]===-.45&&w.b[0]===-.45);
 assert(entry&&wall);
 const z0=wall.a[1]+wall.opening[0],z1=z0+wall.opening[1];
 assert(corridor.z0<z0&&corridor.z1>z1,'the doorway opens into the corridor');
 assert(corridor.x1<=wall.a[0]-.06+1e-9,'the corridor starts outside the wall');
});

test('outside is unlit, shown only in walk view, and switches to its night look',()=>{
 const s=Object.create(SpaceScene.prototype);
 Object.assign(s,{scene:new THREE.Scene(),mode:'walk',night:false,camera:{position:new THREE.Vector3()}});
 s.buildSurroundings();
 assert.equal(s.surroundings.visible,true);
 const outside=s.outdoor;assert(outside.length>0);
 assert(outside.every(m=>m.isMeshBasicMaterial),'indoor lamps and bounce cannot light the neighbours');
 let casts=false;s.surroundings.traverse(o=>{if(o.isMesh&&(o.castShadow||o.receiveShadow))casts=true;});assert.equal(casts,false);
 const facade=outside.find(m=>m.userData.dayMap);assert.equal(facade.map,facade.userData.dayMap);
 s.night=true;s.updateOutdoor();assert.equal(facade.map,facade.userData.nightMap);
 const wall=outside.find(m=>!m.userData.dayMap);assert(wall.color.r<=wall.userData.day.r*.11+1e-6,'walls darken at night');
 const orbit=Object.assign(Object.create(SpaceScene.prototype),{mode:'orbit',surroundings:s.surroundings,sky:s.sky,camera:s.camera,renderer:{render(){}},clock:{getDelta:()=>.016},actions:new Map,controls:{update(){}},keys:new Set});
 Object.defineProperty(orbit,'activeCamera',{get:()=>null});orbit.frame();
 assert.equal(s.surroundings.visible,false,'orbit and top views are not hidden behind the neighbours');
});
