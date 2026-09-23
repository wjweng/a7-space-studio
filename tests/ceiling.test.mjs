import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SpaceScene} from '../dist/scene.js';
import {HEIGHT,walls,doors,initialFurniture,validateFurniture} from '../dist/model.js';
import {resizeAtHandle} from '../dist/spatial.js';

test('the clear ceiling height is 3 m and full-height parts follow it',()=>{
 assert.equal(HEIGHT,3);
 const railing=walls.find(w=>w.id==='balcony-railing');assert.equal(railing.opening[2]+railing.opening[3],HEIGHT,'balcony opening reaches the ceiling');
 for(const w of walls.filter(w=>w.opening&&w.opening[2]>0&&w.openingType!=='railing'))assert(w.opening[2]+w.opening[3]<HEIGHT,w.id+' window head stays below the ceiling');
 for(const d of doors)assert(d.height<HEIGHT);
 assert.equal(validateFurniture([{...initialFurniture.find(f=>f.type==='wardrobe'),h:HEIGHT}])[0].h,HEIGHT,'furniture may reach the ceiling');
});

test('curtains hang from a rod just under the ceiling',()=>{
 const s=Object.create(SpaceScene.prototype);
 s.m=Object.fromEntries(['wood','fabric','white','accent','dark','metal','stone','glass','leaf','glow','lightWhite','lightNatural','lightWarm','floor','tile','wall','entryDoor'].map(k=>[k,new THREE.MeshStandardMaterial()]));
 Object.assign(s,{palette:'oak',building:new THREE.Group,actions:new Map,lightObjects:[],openStates:{},cutaway:false,mode:'orbit',floors:{}});s.setCutaway=()=>{};s.updateLight=()=>{};
 s.buildHouse();
 const rod=[];s.building.traverse(o=>{if(o.isMesh&&o.material===s.m.dark&&o.geometry.parameters?.height===.05)rod.push(o);});
 assert(rod.length>=3);for(const r of rod)assert(Math.abs(r.position.y-(HEIGHT-.21))<1e-9);
 const folds=[];s.building.traverse(o=>{if(o.isMesh&&o.material===s.m.fabric)folds.push(o);});
 for(const f of folds){const h=f.geometry.parameters.height;assert(Math.abs(f.position.y+h/2-(HEIGHT-.24))<1e-9,'fold top meets the rod');}
});

test('a ratio-locked handle drag scales the other plan dimension too',()=>{
 const f={...initialFurniture.find(x=>x.id==='coffee'),rot:0};
 const free=resizeAtHandle(f,'w',1,{x:f.x+f.w/2+.1,z:f.z}).item;
 assert(Math.abs(free.w-(f.w+.1))<1e-9);assert.equal(free.d,f.d);
 const locked=resizeAtHandle(f,'w',1,{x:f.x+f.w/2+.1,z:f.z},true).item;
 assert(Math.abs(locked.w/locked.d-f.w/f.d)<1e-9,'ratio kept');assert(locked.w>f.w);
 const shrunk=resizeAtHandle(f,'w',1,{x:f.x-f.w/2,z:f.z},true).item;
 assert(Math.abs(shrunk.w/shrunk.d-f.w/f.d)<1e-9,'ratio kept at the minimum');
});
