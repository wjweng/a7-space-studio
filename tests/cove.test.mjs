import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {validateFurniture,issues,HEIGHT} from '../dist/model.js';
import {SpaceScene} from '../dist/scene.js';

const cove=extra=>({id:'c',type:'cove',name:'燈槽',x:4,z:3,w:2,d:.15,h:.04,rot:0,coveGap:.25,...extra});

test('a light cove sits its gap below the ceiling and defaults to a warm, switched-on lamp',()=>{
  const [c]=validateFurniture([{...cove(),coveGap:undefined}]);
  assert.equal(c.coveGap,.25);assert.equal(c.colorTemperature,'warm');assert.equal(c.on,true);
  assert(Math.abs(c.elevation-(HEIGHT-.25-.04))<1e-9);
  assert.equal(validateFurniture([cove({coveGap:5})])[0].coveGap,1,'the gap is capped at 1 m');
});

test('coves clash with tall furniture, hanging cabinets and deep beams, but not with what passes below',()=>{
  const [c]=validateFurniture([cove()]);
  const low={id:'w',type:'wardrobe',name:'衣櫃',x:4,z:3,w:1,d:.5,h:2.2,rot:0};
  assert.deepEqual(issues(c,[c,low]).filter(m=>m.includes('衣櫃')),[]);
  const tall={...low,h:2.9};
  assert(issues(c,[c,tall]).includes('與衣櫃重疊'));assert(issues(tall,[c,tall]).includes('與燈槽重疊'));
  const shallow={id:'b',type:'beam',name:'樑',x:4,z:3,w:3,d:.3,h:.2,rot:0},deep={...shallow,h:.4};
  assert(!issues(c,[c,shallow]).includes('與樑重疊'),'a 20 cm beam stays above a cove 25 cm down');
  assert(issues(c,[c,deep]).includes('與樑重疊'));assert(issues(deep,[c,deep]).includes('與燈槽重疊'));
});

test('a cove draws its board, strip and wash, and its lamp never takes a shadow slot',()=>{
  const s=Object.create(SpaceScene.prototype);
  s.m=Object.fromEntries(['wood','fabric','white','accent','dark','metal','stone','glass','leaf','glow','lightWhite','lightNatural','lightWarm'].map(k=>[k,new THREE.MeshStandardMaterial()]));
  Object.assign(s,{actions:new Map,lightObjects:[],items:[],lightsOn:true,night:true,hemi:{},sun:{},scene:{background:new THREE.Color()}});
  s.shadowBudget=()=>8;
  const [c]=validateFurniture([cove()]),g=new THREE.Group;s.makeFurniture(g,c);
  const entry=s.lightObjects.find(o=>o.cove);
  assert(entry&&entry.glows.length===2);
  s.updateLight();
  assert(entry.point.intensity>0&&entry.glows.every(m=>m.opacity>0));
  assert.equal(entry.point.castShadow,false);
  s.lightObjects[0].f.on=false;s.updateLight();
  assert.equal(entry.point.intensity,0);assert(entry.glows.every(m=>!m.visible));
});
