import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SpaceScene} from '../dist/scene.js';
import {doors,WALL_THICKNESS,wallRects,overlaps} from '../dist/model.js';
import {doorLeaf,JAMB_WIDTH} from '../dist/spatial.js';

// Leaf corners in the door group's frame after the pivot turns as frame() turns it.
const leafCorners=(d,degrees)=>{const leaf=doorLeaf(d),th=d.swing*degrees*Math.PI/180,c=Math.cos(th),s=Math.sin(th);
 return[[0,0],[0,-leaf.side*leaf.thickness],[leaf.width,0],[leaf.width,-leaf.side*leaf.thickness]].map(([x,z])=>[leaf.x+x*c+z*s,leaf.z-x*s+z*c]);};

test('every door leaf closes inside its frame, flush with the wall face on its swing side',()=>{
 for(const d of doors){const leaf=doorLeaf(d),half=WALL_THICKNESS/2;
  for(const [x,z]of leafCorners(d,0)){assert(z>=-half-1e-9&&z<=half+1e-9,d.id+' stays within the wall thickness');assert(x>=JAMB_WIDTH/2-1e-9&&x<=d.width-JAMB_WIDTH/2+1e-9,d.id+' stays between the jambs');}
  assert.equal(Math.abs(leaf.z),half,d.id+' hinge on the wall face');
 }
});

test('the hinge edge stays put and the leaf never sweeps through the hinge jamb',()=>{
 for(const d of doors)for(let degrees=0;degrees<=89;degrees+=1){
  const [hinge,back,far]=leafCorners(d,degrees),leaf=doorLeaf(d);
  assert(Math.abs(hinge[0]-leaf.x)<1e-12&&Math.abs(hinge[1]-leaf.z)<1e-12,d.id+' hinge corner fixed');
  assert(back[0]>=leaf.x-1e-12,d.id+' back corner clears the jamb at '+degrees+'°');
  if(degrees>=45)assert(Math.sign(far[1])===leaf.side,d.id+' swings to its own side');
 }
});

test('the rendered leaf sits on the pivot the way doorLeaf describes',()=>{
 const s=Object.create(SpaceScene.prototype);
 s.m=Object.fromEntries(['wood','fabric','white','accent','dark','metal','stone','glass','leaf','glow','lightWhite','lightNatural','lightWarm','floor','tile','wall','entryDoor'].map(k=>[k,new THREE.MeshStandardMaterial()]));
 Object.assign(s,{palette:'oak',building:new THREE.Group,actions:new Map,lightObjects:[],openStates:{},cutaway:false,mode:'orbit',floors:{}});s.setCutaway=()=>{};s.updateLight=()=>{};
 s.buildHouse();
 for(const d of doors){const {pivot}=s.actions.get(d.id),leaf=doorLeaf(d),panel=pivot.children[0];
  assert.deepEqual([pivot.position.x,pivot.position.z],[leaf.x,leaf.z]);
  assert(Math.abs(panel.position.x-leaf.width/2)<1e-12&&Math.abs(panel.position.z+leaf.side*leaf.thickness/2)<1e-12,d.id+' leaf hangs from its corner');
 }
});

test('every leaf fills its frame and opens without entering a wall',()=>{
 for(const d of doors){const leaf=doorLeaf(d);
  assert(leaf.x>=JAMB_WIDTH/2+.002-1e-12&&leaf.x+leaf.width<=d.width-JAMB_WIDTH/2-.002+1e-12,d.id+' stays between the jambs');
  assert(leaf.width>=d.width-JAMB_WIDTH-.004-.13,d.id+' fills its clear opening');
  for(const degrees of[30,60,89]){const th=d.swing*degrees*Math.PI/180,lx=leaf.width/2,lz=-leaf.side*leaf.thickness/2;
   const px=leaf.x+lx*Math.cos(th)+lz*Math.sin(th),pz=leaf.z-lx*Math.sin(th)+lz*Math.cos(th),ca=Math.cos(d.angle),sa=Math.sin(d.angle);
   const rect={x:d.x+px*ca+pz*sa,z:d.z-px*sa+pz*ca,w:leaf.width,d:leaf.thickness,rot:(d.angle+th)*180/Math.PI};
   for(const w of wallRects())assert(!overlaps(rect,w,1e-6),`${d.id} at ${degrees}° enters a wall`);
  }
 }
});
