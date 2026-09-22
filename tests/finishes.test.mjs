import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {finishes,finishByCode,finishPixels,finishFamilies,BOARD} from '../dist/finishes.js';
import {validateFurniture,initialFurniture,wallRects} from '../dist/model.js';
import {SpaceScene,boardUV} from '../dist/scene.js';

const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lum=([r,g,b])=>.2126*r+.7152*g+.0722*b;

test('the catalogue lists every board once, in a known family, with dark-to-light tones',()=>{
 assert.equal(finishes.length,54);
 assert.equal(new Set(finishes.map(f=>f.code)).size,54);
 const families=finishFamilies.map(([key])=>key);
 for(const f of finishes){
  assert(families.includes(f.family),f.code);
  const [dark,mid,light]=f.colors.map(hex).map(lum);
  assert(dark<=mid+1e-9&&mid<=light+1e-9,f.code+' tones are ordered');
 }
});

test('generated boards reproduce the measured tone distribution and are deterministic',()=>{
 for(const code of['P64','A12','B49','P73','B36']){
  const f=finishByCode(code),px=finishPixels(f,64,128),n=64*128,l=[];
  for(let i=0;i<n;i++)l.push(lum([px[i*4],px[i*4+1],px[i*4+2]]));l.sort((a,b)=>a-b);
  const [dark,mid,light]=f.colors.map(hex).map(lum);
  assert(Math.abs(l[Math.floor(n*.5)]-mid)<3,code+' median tone');
  assert(Math.abs(l[Math.floor(n*.1)]-dark)<4&&Math.abs(l[Math.floor(n*.9)]-light)<4,code+' spread');
  assert.deepEqual(finishPixels(f,64,128),px,code+' is deterministic');
 }
});

test('generated boards tile without a seam',()=>{
 const f=finishByCode('P64'),w=128,h=256,px=finishPixels(f,w,h),at=(x,y)=>lum([px[(y*w+x)*4],px[(y*w+x)*4+1],px[(y*w+x)*4+2]]);
 let edge=0,inner=0;
 for(let y=0;y<h;y++){edge+=Math.abs(at(w-1,y)-at(0,y));inner+=Math.abs(at(w/2,y)-at(w/2-1,y));}
 assert(edge<inner*2.5,'left/right wrap is no rougher than neighbouring columns');
 edge=0;inner=0;for(let x=0;x<w;x++){edge+=Math.abs(at(x,h-1)-at(x,0));inner+=Math.abs(at(x,h/2)-at(x,h/2-1));}
 assert(edge<inner*2.5,'top/bottom wrap is no rougher than neighbouring rows');
});

test('only valid finishes on finishable furniture survive validation',()=>{
 const wardrobe={...initialFurniture.find(f=>f.type==='wardrobe')},toilet={...initialFurniture.find(f=>f.type==='toilet')};
 assert.equal(validateFurniture([{...wardrobe,finish:'P64'}])[0].finish,'P64');
 assert.equal('finish' in validateFurniture([{...wardrobe,finish:'NOPE'}])[0],false);
 assert.equal('finish' in validateFurniture([{...toilet,finish:'P64'}])[0],false);
});

test('a finish replaces only the wooden parts and maps the board at true scale along the longer side',()=>{
 const s=Object.create(SpaceScene.prototype);
 s.m=Object.fromEntries(['wood','fabric','white','accent','dark','metal','stone','glass','leaf','glow','lightWhite','lightNatural','lightWarm'].map(k=>[k,new THREE.MeshStandardMaterial()]));
 Object.assign(s,{actions:new Map,lightObjects:[],resizeHandles:new THREE.Group,collisionWalls:wallRects(),items:[],invalidHelpers:new Map,invalidMarkers:new Map,foregroundDraft:null});
 const g=new THREE.Group,f={...initialFurniture.find(x=>x.id==='wardM'),finish:'P64'};s.makeFurniture(g,f);
 const meshes=[];g.traverse(o=>{if(o.isMesh)meshes.push(o);});
 const board=s.finishMaterial('P64');
 assert(meshes.some(m=>m.material===board),'wooden parts use the finish');
 assert(!meshes.some(m=>m.material===s.m.wood),'no wooden part keeps the palette wood');
 assert(meshes.some(m=>m.material===s.m.white),'non-wood parts keep their own material');
 assert.equal(s.woodOverride,null,'the override does not leak to the next item');
 const geo=boardUV(new THREE.BoxGeometry(.6,2,.02)),uv=geo.attributes.uv,pos=geo.attributes.position,nor=geo.attributes.normal;
 for(let i=0;i<pos.count;i++)if(Math.abs(nor.getZ(i))>.9){assert(Math.abs(uv.getY(i)-pos.getY(i)/BOARD.h)<1e-6,'grain runs up a tall door');assert(Math.abs(uv.getX(i)-pos.getX(i)/BOARD.w)<1e-6);}
 const top=boardUV(new THREE.BoxGeometry(2,.03,.6)),tu=top.attributes.uv,tp=top.attributes.position,tn=top.attributes.normal;
 for(let i=0;i<tp.count;i++)if(tn.getY(i)>.9)assert(Math.abs(tu.getY(i)-tp.getX(i)/BOARD.h)<1e-6,'grain runs along a long table top');
});
