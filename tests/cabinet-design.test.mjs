import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCabinetDesign,validateCabinetDesign,resizeCabinetDesign,cabinetCells,cabinetOccupiedRects,modularCabinetRects,cabinetTemplates,FRONT_GAP,FRONT_Z,CARCASS_T,NICHE_BRACKET,cellOpening,cellFinish,cellFinishSlots,resizeCabinetEdge,removeCabinetCell,removeCabinetColumn,nicheTvPlacement,nicheTvWarnings,designFromDoorStyle,splitCabinetCell,removeCabinetPart,designLeaves} from '../dist/cabinet-design.js';
import {finishes} from '../dist/finishes.js';
import {furnitureInterference} from '../dist/geometry.js';
import {validateFurniture,issues} from '../dist/model.js';

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

test('a niche TV hangs centred in its open cell and follows the cabinet angle',()=>{
  const f={...item(),x:2,z:3,w:1.2,d:.45,h:2,rot:90};
  f.cabinetDesign={template:'custom',columns:[{id:'c',width:1.2,bottom:0,cells:[{id:'low',height:.6,front:'drawers'},{id:'tv',height:1,front:'open'},{id:'top',height:.4,front:'double'}]}]};
  const tv={id:'tv',type:'television',name:'電視',w:1,h:.56,d:.06,rot:0,tvMount:'niche',supportId:f.id,supportCell:'tv'};
  const placed=nicheTvPlacement(tv,f,'tv'),opening=cellOpening(f,'tv');
  assert.ok(Math.abs(opening.w-(1.2-2*CARCASS_T))<1e-9);
  assert.ok(Math.abs(placed.elevation-(.6+CARCASS_T+(opening.h-.56)/2))<1e-4);
  assert.equal(placed.rot,90);
  // rot 90: local +z (towards the front) points along world +x
  assert.ok(Math.abs(placed.x-(2+(-f.d/2+CARCASS_T+NICHE_BRACKET+tv.d/2)))<1e-9);
  assert.ok(Math.abs(placed.z-3)<1e-9);
  assert.deepEqual(nicheTvWarnings({...tv,...placed},f),[]);
});

test('a niche TV that does not fit is warned about, never resized',()=>{
  const f=item();
  f.cabinetDesign={template:'custom',columns:[{id:'c',width:1.2,bottom:0,cells:[{id:'tv',height:.5,front:'open'},{id:'door',height:1.9,front:'left'}]}]};
  const tv={type:'television',w:1.4,h:.8,d:.06,tvMount:'niche',supportId:f.id,supportCell:'tv'};
  const warnings=nicheTvWarnings(tv,f);
  assert.equal(warnings.length,2);
  assert.ok(warnings[0].includes('寬')&&warnings[1].includes('高'));
  assert.equal(tv.w,1.4);
  assert.ok(nicheTvWarnings({...tv,w:.5,h:.3,supportCell:'door'},f)[0].includes('門面'));
  assert.ok(nicheTvWarnings({...tv,supportCell:'gone'},f)[0].includes('找不到'));
});

test('cell finishes keep valid slots, drop unknown codes and migrate the old single front finish',()=>{
  const f=item();
  f.cabinetDesign=makeCabinetDesign(f,'closed');
  const cell=f.cabinetDesign.columns[0].cells[0];
  cell.finishes={door:'nope',back:finishes[1].code,other:finishes[2].code};
  assert.deepEqual(validateCabinetDesign(f,f.cabinetDesign).columns[0].cells[0].finishes,{back:finishes[1].code});
  delete cell.finishes;cell.finish=finishes[0].code;
  const migrated=validateCabinetDesign(f,f.cabinetDesign).columns[0].cells[0];
  assert.deepEqual(migrated.finishes,{door:finishes[0].code});
  assert.equal(migrated.finish,undefined);
});

test('cell finishes follow the cabinet-wide level, then the cabinet finish',()=>{
  const f=item();
  f.cabinetDesign={template:'custom',columns:[{id:'c',width:1.2,bottom:0,cells:[{id:'low',height:.6,front:'drawers'},{id:'high',height:1.8,front:'open',finishes:{back:'B18'}}]}]};
  f.partFinishes={backs:'A07',drawerBoxes:'P86'};
  const [low,high]=f.cabinetDesign.columns[0].cells;
  assert.equal(cellFinish(f,high,'back'),'B18');
  assert.equal(cellFinish(f,low,'back'),'A07');
  assert.equal(cellFinish(f,low,'drawerBox'),'P86');
  assert.equal(cellFinish(f,low,'door'),'','unset levels fall back to the cabinet finish');
  const [lowRect,highRect]=cabinetCells(f);
  assert.deepEqual(cellFinishSlots(f,lowRect).map(([slot])=>slot),['door','back','drawerBox'],'lowest cell has no shelf of its own');
  assert.deepEqual(cellFinishSlots(f,highRect).map(([slot])=>slot),['shelf','back'],'open cell has no door');
});

test('furniture validation keeps niche mounting and cabinet part finishes',()=>{
  const cabinet=item();
  cabinet.cabinetDesign=makeCabinetDesign(cabinet,'niche');
  cabinet.partFinishes={body:finishes[0].code,fronts:'bad',interior:finishes[1].code,extra:finishes[2].code,drawerBoxes:finishes[3].code};
  const cell=cabinet.cabinetDesign.columns[1].cells[0].id;
  const tv={id:'tv',type:'television',name:'電視',x:cabinet.x,z:cabinet.z,w:.3,h:.2,d:.06,rot:0,open:0,elevation:1,tvMount:'niche',supportId:cabinet.id,supportCell:cell};
  const [c,t]=validateFurniture([cabinet,tv]);
  // the first release's body/fronts/interior map onto the three-level keys
  assert.deepEqual(c.partFinishes,{shelves:finishes[1].code,backs:finishes[1].code,drawerBoxes:finishes[3].code});
  assert.equal(c.finish,finishes[0].code,'an old body finish becomes the cabinet finish when none is set');
  assert.equal(t.tvMount,'niche');assert.equal(t.supportCell,cell);
  assert.equal(validateFurniture([{...tv,id:'x',supportCell:undefined}])[0].tvMount,'wall');
  assert.ok(!issues(t,[c,t]).some(m=>m.includes(c.name)),'the host cabinet is not an interference');
  assert.ok(!issues(c,[c,t]).some(m=>m.includes(t.name)));
});

test('dragging an outer edge changes only that side and keeps the opposite edge in place',()=>{
  const f={...item(),x:4,z:1,rot:90};
  f.cabinetDesign={template:'custom',columns:[{id:'a',width:.4,bottom:0,cells:[{id:'a1',height:1,front:'left'},{id:'a2',height:1.4,front:'open'}]},{id:'b',width:.8,bottom:.2,cells:[{id:'b1',height:2.2,front:'double'}]}]};
  const edge=(g,side)=>{const a=g.rot*Math.PI/180,sign=side==='right'?1:-1;return{x:g.x+sign*g.w/2*Math.cos(a),z:g.z-sign*g.w/2*Math.sin(a)};};
  const right=resizeCabinetEdge(f,'right',.3);
  assert.ok(Math.abs(right.w-1.5)<1e-9);
  assert.deepEqual(right.cabinetDesign.columns.map(c=>c.width),[.4,1.1],'only the right column widens');
  for(const k of['x','z'])assert.ok(Math.abs(edge(right,'left')[k]-edge(f,'left')[k])<1e-9,'the left edge stays put');
  const left=resizeCabinetEdge(f,'left',-.5);
  assert.deepEqual(left.cabinetDesign.columns.map(c=>c.width),[.2,.8],'a column never drops below 20 cm');
  for(const k of['x','z'])assert.ok(Math.abs(edge(left,'right')[k]-edge(f,'right')[k])<1e-9,'the right edge stays put');
  const taller=resizeCabinetEdge(f,'top',.3,2.6);
  assert.ok(Math.abs(taller.h-2.6)<1e-9,'height stops at the ceiling limit');
  assert.deepEqual(taller.cabinetDesign.columns.map(c=>c.cells.at(-1).height),[1.6,2.4],'only the top cells grow');
  assert.equal(taller.cabinetDesign.columns[0].cells[0].height,1);
  assert.equal(taller.x,f.x);
  for(const g of[right,left,taller])validateCabinetDesign(g,g.cabinetDesign);
});

test('a hanging cabinet grows downward from its lowest cells, widening a bottom gap first',()=>{
  const f={...item(),type:'hangingCabinet',h:.6};
  f.cabinetDesign={template:'custom',columns:[{id:'a',width:.6,bottom:0,cells:[{id:'a1',height:.6,front:'left'}]},{id:'b',width:.6,bottom:.1,cells:[{id:'b1',height:.2,front:'open'},{id:'b2',height:.3,front:'open'}]}]};
  const deeper=resizeCabinetEdge(f,'bottom',.2);
  assert.ok(Math.abs(deeper.h-.8)<1e-9);
  assert.equal(deeper.cabinetDesign.columns[0].cells[0].height,.8);
  assert.equal(deeper.cabinetDesign.columns[1].bottom,.3,'the gap widens, the cells keep their size');
  const shallower=resizeCabinetEdge(f,'bottom',-.3);
  assert.ok(Math.abs(shallower.h-.45)<1e-9,'shrinking stops when a cell would fall under 15 cm');
  assert.equal(shallower.cabinetDesign.columns[1].bottom,0);
  assert.ok(Math.abs(shallower.cabinetDesign.columns[1].cells[0].height-.15)<1e-9);
  for(const g of[deeper,shallower])validateCabinetDesign(g,g.cabinetDesign);
});

test('deleting a floor cabinet top cell leaves a gap instead of stretching the cell below',()=>{
  const f=item();
  f.cabinetDesign={template:'custom',columns:[{id:'a',width:.6,bottom:0,cells:[{id:'a1',height:1.4,front:'left'},{id:'a2',height:1,front:'open'}]},{id:'b',width:.6,bottom:0,cells:[{id:'b1',height:2.4,front:'double'}]}]};
  const next=removeCabinetCell(f,'a','a2');
  assert.equal(next.h,2.4,'the other column still reaches the top');
  assert.equal(next.cabinetDesign.columns[0].cells[0].height,1.4);
  assert.equal(next.cabinetDesign.columns[0].top,1);
  validateCabinetDesign(next,next.cabinetDesign);
  const cells=cabinetCells(next);
  assert.ok(cells.find(c=>c.id==='a1').last,'the remaining cell now carries the top board');
  assert.ok(Math.abs(cabinetOccupiedRects(next)[0].yMax-1.4)<1e-9,'the empty space no longer counts as cabinet');
  // once every column has a top gap, the cabinet itself gets shorter
  const both=removeCabinetCell({...f,cabinetDesign:{...f.cabinetDesign,columns:[f.cabinetDesign.columns[0],{id:'b',width:.6,bottom:0,cells:[{id:'b1',height:1.8,front:'double'},{id:'b2',height:.6,front:'open'}]}]}},'b','b2');
  const shorter=removeCabinetCell(both,'a','a2');
  assert.ok(Math.abs(shorter.h-1.8)<1e-9);
  assert.deepEqual(shorter.cabinetDesign.columns.map(c=>c.top??0).map(n=>Math.round(n*100)),[40,0]);
  validateCabinetDesign(shorter,shorter.cabinetDesign);
  const middle=removeCabinetCell({...f,cabinetDesign:{template:'custom',columns:[{id:'a',width:1.2,bottom:0,cells:[{id:'x',height:.8,front:'open'},{id:'y',height:.8,front:'open'},{id:'z',height:.8,front:'open'}]}]}},'a','y');
  assert.deepEqual(middle.cabinetDesign.columns[0].cells.map(c=>c.height),[1.6,.8],'a middle cell is absorbed by the one below');
  assert.equal(removeCabinetCell(f,'b','b1'),null,'a column keeps at least one cell');
});

test('a hanging cabinet losing its bottom cell leaves a gap below the cell above',()=>{
  const f={...item(),type:'hangingCabinet',h:.8};
  f.cabinetDesign={template:'custom',columns:[{id:'a',width:.6,bottom:0,cells:[{id:'a1',height:.3,front:'open'},{id:'a2',height:.5,front:'left'}]},{id:'b',width:.6,bottom:0,cells:[{id:'b1',height:.8,front:'left'}]}]};
  const next=removeCabinetCell(f,'a','a1');
  assert.equal(next.h,.8);
  assert.equal(next.cabinetDesign.columns[0].bottom,.3);
  assert.equal(next.cabinetDesign.columns[0].cells[0].height,.5);
  validateCabinetDesign(next,next.cabinetDesign);
});

test('deleting an end column narrows the cabinet and keeps the opposite edge in place',()=>{
  const f={...item(),x:3,z:2,rot:0};
  f.cabinetDesign={template:'custom',columns:[{id:'a',width:.3,bottom:0,cells:[{id:'a1',height:2.4,front:'open'}]},{id:'b',width:.5,bottom:0,cells:[{id:'b1',height:2.4,front:'open'}]},{id:'c',width:.4,bottom:0,cells:[{id:'c1',height:2.4,front:'open'}]}]};
  const right=removeCabinetColumn(f,'c');
  assert.ok(Math.abs(right.w-.8)<1e-9);
  assert.deepEqual(right.cabinetDesign.columns.map(c=>c.width),[.3,.5],'the neighbour does not widen');
  assert.ok(Math.abs((right.x-right.w/2)-(f.x-f.w/2))<1e-9,'left edge fixed');
  const left=removeCabinetColumn(f,'a');
  assert.ok(Math.abs((left.x+left.w/2)-(f.x+f.w/2))<1e-9,'right edge fixed');
  const middle=removeCabinetColumn(f,'b');
  assert.equal(middle.w,f.w);
  assert.deepEqual(middle.cabinetDesign.columns.map(c=>c.width),[.8,.4],'a middle column is absorbed by its left neighbour');
  for(const g of[right,left,middle])validateCabinetDesign(g,g.cabinetDesign);
});

test('a top edge drag over a column with a top gap widens the gap',()=>{
  const f=item();
  f.cabinetDesign={template:'custom',columns:[{id:'a',width:.6,bottom:0,top:.4,cells:[{id:'a1',height:2,front:'left'}]},{id:'b',width:.6,bottom:0,cells:[{id:'b1',height:2.4,front:'left'}]}]};
  const taller=resizeCabinetEdge(f,'top',.2);
  assert.ok(Math.abs(taller.cabinetDesign.columns[0].top-.6)<1e-9);
  assert.equal(taller.cabinetDesign.columns[0].cells[0].height,2);
  const lower=resizeCabinetEdge(f,'top',-.5);
  assert.equal(lower.cabinetDesign.columns[0].top,undefined,'a used-up gap disappears');
  validateCabinetDesign(lower,lower.cabinetDesign);
});

test('a pre-modular cabinet converts to the fronts it already had',()=>{
  const fronts=g=>g.columns.map(c=>c.cells.map(r=>r.front).join('+'));
  const base={...item(),w:1.2,h:2.4};
  assert.deepEqual(fronts(designFromDoorStyle({...base,doorStyle:'double'})),['double']);
  assert.deepEqual(fronts(designFromDoorStyle({...base,doorStyle:'multi'})),['left','right']);
  assert.deepEqual(fronts(designFromDoorStyle({...base,doorStyle:'mixed'})),['left','drawers','right']);
  assert.deepEqual(fronts(designFromDoorStyle({...base,doorStyle:'drawers'})),['drawers+drawers+drawers','drawers+drawers+drawers']);
  assert.deepEqual(fronts(designFromDoorStyle({...base,doorStyle:'sliding'})),['sliding']);
  assert.deepEqual(fronts(designFromDoorStyle({...base,w:.35,doorStyle:'double'})),['left'],'too narrow for a pair');
  assert.deepEqual(fronts(designFromDoorStyle({...base,type:'console',w:1.8,h:.48,doorStyle:'drawers'})),['drawers','drawers','drawers']);
  for(const style of['double','left','right','multi','mixed','drawers','sliding']){const f={...base,doorStyle:style};validateCabinetDesign(f,designFromDoorStyle(f));}
});

test('a single layer splits side by side into parts that act as cells of their own',()=>{
  const f=item();
  f.cabinetDesign={template:'custom',columns:[{id:'c',width:1.2,bottom:0,cells:[{id:'low',height:.5,front:'drawers',finishes:{door:'P86'}},{id:'tv',height:1.3,front:'open'},{id:'top',height:.6,front:'double'}]}]};
  let n=0;const next=splitCabinetCell(f.cabinetDesign,'low',()=>'p'+(++n));
  const low=next.columns[0].cells[0];
  assert.deepEqual(low.parts.map(p=>[p.id,p.width,p.front]),[['low',.6,'drawers'],['p2',.6,'open']],'the left part keeps the layer id');
  assert.equal(low.id,'p1','the layer itself takes a new id');
  assert.deepEqual(low.parts[0].finishes,{door:'P86'},'the left part keeps the layer finishes');
  assert.equal(low.finishes,undefined);
  const g={...f,cabinetDesign:validateCabinetDesign(f,next)};
  const rects=cabinetCells(g).filter(c=>c.rowId==='p1');
  assert.deepEqual(rects.map(c=>c.id),['low','p2']);
  assert.ok(Math.abs(rects[0].insetR-CARCASS_T/2)<1e-9&&Math.abs(rects[1].insetL-CARCASS_T/2)<1e-9,'half a divider on each side of the split');
  const opening=cellOpening(g,'p2');
  assert.ok(Math.abs(opening.w-(.6-CARCASS_T*1.5))<1e-9);
  assert.ok(Math.abs((opening.x+opening.w/2)-(.6-CARCASS_T))<1e-9,'the opening ends at the side panel');
  assert.deepEqual(designLeaves(g.cabinetDesign).map(l=>l.id),['low','p2','tv','top']);
  const three=splitCabinetCell(next,'p2',()=>'p3');
  assert.deepEqual(three.columns[0].cells[0].parts.map(p=>p.id),['low','p2','p3'],'a further split keeps the left id too');
  assert.deepEqual(three.columns[0].cells[0].parts.map(p=>p.width),[.6,.3,.3]);
  assert.equal(splitCabinetCell(three,'p3'),null,'a 30 cm part is too narrow to split');
  const merged=removeCabinetPart(removeCabinetPart(three,'p3'),'p2');
  assert.equal(merged.columns[0].cells[0].parts,undefined,'one part left becomes a plain layer again');
  assert.equal(merged.columns[0].cells[0].id,'low','and takes that part id, so its open state carries over');
  assert.equal(merged.columns[0].cells[0].front,'drawers');
  assert.deepEqual(merged.columns[0].cells[0].finishes,{door:'P86'});
});

test('split layers keep their widths through resizes and validate their parts',()=>{
  const f={...item(),w:1.2};
  f.cabinetDesign={template:'custom',columns:[{id:'c',width:1.2,bottom:0,cells:[{id:'a',height:2.4,front:'open',parts:[{id:'l',width:.4,front:'left'},{id:'r',width:.8,front:'open'}]}]}]};
  const wider=resizeCabinetEdge(f,'right',.3);
  assert.deepEqual(wider.cabinetDesign.columns[0].cells[0].parts.map(p=>p.width),[.4,1.1],'only the part on the dragged side changes');
  const leftWider=resizeCabinetEdge(f,'left',.2);
  assert.deepEqual(leftWider.cabinetDesign.columns[0].cells[0].parts.map(p=>p.width),[.6,.8]);
  const scaled=resizeCabinetDesign(f.cabinetDesign,{w:1.2,h:2.4},{w:1.5,h:2.4});
  validateCabinetDesign({...f,w:1.5},scaled);
  const bad=structuredClone(f.cabinetDesign);bad.columns[0].cells[0].parts[1].width=.5;
  assert.throws(()=>validateCabinetDesign(f,bad),/總和/);
  const narrow=structuredClone(f.cabinetDesign);narrow.columns[0].cells[0].parts[0].front='sliding';
  assert.throws(()=>validateCabinetDesign(f,narrow),/寬度不足/);
});
