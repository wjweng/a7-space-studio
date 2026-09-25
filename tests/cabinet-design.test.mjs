import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCabinetDesign,validateCabinetDesign,resizeCabinetDesign,cabinetCells,cabinetOccupiedRects,modularCabinetRects,cabinetTemplates,FRONT_GAP,FRONT_Z} from '../dist/cabinet-design.js';
import {furnitureInterference} from '../dist/geometry.js';
import {validateFurniture} from '../dist/model.js';

const item=()=>({id:'modular',type:'wardrobe',name:'收納櫃',x:4,z:1,w:1.2,d:.5,h:2.4,rot:0,open:0});

test('a niche cabinet retains independently floating columns through validation and resize',()=>{
  const f=item();
  f.cabinetDesign=makeCabinetDesign(f,'niche');
  f.cabinetDesign.columns[0].bottom=f.cabinetDesign.columns[1].bottom=.18;
  f.cabinetDesign.columns[0].cells[0].height-=.18;f.cabinetDesign.columns[1].cells[0].height-=.18;
  const original=validateCabinetDesign(f,f.cabinetDesign);
  assert.equal(original.columns.length,3);
  assert.deepEqual(original.columns.map(c=>c.bottom),[.18,.18,0]);
  assert.equal(cabinetCells(f).length,3);
  const wider={...f,w:1.8,h:2.7};
  wider.cabinetDesign=resizeCabinetDesign(original,f,wider);
  const result=validateCabinetDesign(wider,wider.cabinetDesign);
  assert.ok(Math.abs(result.columns.reduce((sum,c)=>sum+c.width,0)-wider.w)<.001);
  assert.deepEqual(result.columns.map(c=>c.bottom),[.18,.18,0]);
  assert.ok(result.columns.every(c=>Math.abs(c.cells.reduce((sum,r)=>sum+r.height,c.bottom)-wider.h)<.001));
  assert.equal(validateFurniture([wider])[0].cabinetDesign.columns.length,3);
});

test('cabinet column height affects interference and open-front sweep',()=>{
  const f=item();
  f.cabinetDesign=makeCabinetDesign(f,'closed');
  f.cabinetDesign.columns[0].bottom=1.1;
  f.cabinetDesign.columns[0].cells[0].height=1.3;
  const low={id:'low',type:'table',x:4,z:1,w:.8,d:.4,h:.75,rot:0};
  assert.equal(furnitureInterference(f,low),false);
  assert.equal(cabinetOccupiedRects(f)[0].yMin,1.1);
  low.h=1.2;
  assert.equal(furnitureInterference(f,low),true);
  const cell=f.cabinetDesign.columns[0].cells[0];
  const sweep=modularCabinetRects(f,{[cell.id]:1});
  assert.equal(sweep.length,2);
  assert.ok(sweep.every(r=>Math.abs(r.yMin-1.1)<1e-6&&Math.abs(r.yMax-2.4)<1e-6));
});

test('invalid dimensions and unsupported fronts cannot enter saved furniture',()=>{
  const f=item();
  f.cabinetDesign=makeCabinetDesign(f,'niche');
  f.cabinetDesign.columns[0].width=.05;
  assert.throws(()=>validateFurniture([f]),/分區寬度/);
  f.cabinetDesign=makeCabinetDesign(f,'niche');
  f.cabinetDesign.columns[0].cells[0].front='double';
  assert.throws(()=>validateFurniture([f]),/寬度不足/);
});

test('every cabinet template starts on the floor by default',()=>{
  for(const template of Object.keys(cabinetTemplates)){
    const f=item();
    assert.ok(makeCabinetDesign(f,template).columns.every(c=>c.bottom===0),template);
  }
});

test('cabinet fronts overlay the carcass and leave only the reveal gap',()=>{
  const f=item();
  f.cabinetDesign=makeCabinetDesign(f,'closed');
  const cell=f.cabinetDesign.columns[0].cells[0];
  cell.front='left';
  const [leaf]=modularCabinetRects(f,{[cell.id]:1e-9});
  assert.ok(Math.abs(leaf.w-(f.w-FRONT_GAP))<1e-9);
  assert.ok(Math.abs(leaf.x-f.x)<1e-6);
  assert.ok(Math.abs(leaf.z-(f.z+f.d/2+FRONT_Z))<1e-6);
});
