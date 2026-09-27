import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialFurniture,doors,rooms,wallRects,issues,migrateLayout,corners,inside} from '../dist/model.js';
import {signedDistance,distanceLabel,sameRoom,roomAt,doorRects,fixedDoorLimit,pointClear,findRoute,segmentClear,showerDoorRects,resizeAtHandle,EPS} from '../dist/spatial.js';
test('wall contact and sub-centimetre penetration have consistent signed labels',()=>{
 const a={x:1,z:1,w:1,d:1,rot:0},b={...a,x:2};
 assert.equal(signedDistance(a,b),0);assert.match(distanceLabel(signedDistance(a,b)),/接觸/);
 b.x=1.999;assert(signedDistance(a,b)<0);assert.match(distanceLabel(signedDistance(a,b)),/重疊 0.1/);
 b.x=2.0005;assert.equal(distanceLabel(signedDistance(a,b)),'< 0.1 cm');
});
test('furniture across room boundaries does not produce furniture interference',()=>{
 const a={id:'a',name:'A',x:6.50,z:4.8,w:.4,d:.4,h:1,rot:0},b={...a,id:'b',name:'B',x:6.64};
 assert(!sameRoom(a,b));assert(!issues(a,[a,b]).some(x=>x.includes('B')));
});
test('resize handles preserve the opposite edge and shift the center away from the shell boundary',()=>{
 const f={id:'resize',name:'resize',type:'chair',x:.35,z:3,w:.5,d:.5,h:.8,rot:0};
 const result=resizeAtHandle(f,'w',-1,{x:-.2,z:3});
 assert.equal(result.blocked,false);assert(result.item.w>.7);assert(result.item.x>f.x);assert(result.item.x-result.item.w/2>=0);assert.equal(result.clamped,false);
});
test('a furniture edge already touching the exterior can extend from its opposite edge',()=>{
 const f={id:'contact',name:'contact',type:'chair',x:.25,z:3,w:.5,d:.5,h:.8,rot:0};
 const result=resizeAtHandle(f,'w',1,{x:1.25,z:3});
 assert.equal(result.blocked,false);assert.equal(result.clamped,false);assert(Math.abs(result.item.x-result.item.w/2)<1e-5);assert(result.item.w>.9);
});
test('beam resizing fixes the opposite end while passing through an interior wall',()=>{
 const beam={id:'beam',name:'beam',type:'beam',x:1,z:2,w:.8,d:.2,h:.3,rot:0},left=beam.x-beam.w/2;
 const result=resizeAtHandle(beam,'w',1,{x:4,z:2});
 assert.equal(result.blocked,false);assert.equal(result.clamped,false);assert(Math.abs(result.item.x-result.item.w/2-left)<1e-6);assert(wallRects().some(wall=>signedDistance(result.item,wall)<-EPS));
});
test('all fixed door slabs and both handles clear structural walls throughout opening',()=>{
 for(const d of doors){const limit=fixedDoorLimit(d);assert(limit>75,d.id);for(let i=0;i<=100;i++)for(const r of doorRects(d,i/100,limit))for(const wall of wallRects())assert(signedDistance(r,wall)>=-EPS,`${d.id} at ${i}%`);}
});
test('both shower doors sweep inward without crossing walls or bathroom fixtures',()=>{for(const shower of initialFurniture.filter(f=>f.type==='shower'))for(let step=0;step<=20;step++)for(const rect of showerDoorRects(shower,step/20)){assert(corners(rect).every(([x,z])=>inside(x,z)),`${shower.id} outside at ${step}`);for(const wall of wallRects())assert(signedDistance(rect,wall)>=-EPS,`${shower.id} wall at ${step}`);for(const item of initialFurniture)if(item.id!==shower.id&&!['rug','light','beam'].includes(item.type)&&sameRoom(shower,item))assert(signedDistance(rect,item)>=-EPS,`${shower.id} ${item.id} at ${step}`);}});
test('every default room has a continuous furniture-free route from the entrance',()=>{
 const obstacles=[...wallRects(),...initialFurniture.filter(f=>f.type!=='rug'&&f.h>.15),...doors.flatMap(d=>doorRects(d,1,fixedDoorLimit(d)))],clear=(x,z)=>pointClear(x,z,obstacles),start={x:.75,z:7.7};
 for(const room of rooms){const path=findRoute(start,room,clear);assert(path?.length,room.name);assert.equal(roomAt(path.at(-1).x,path.at(-1).z),roomAt(room.x,room.z));let last=start;for(const p of path){assert(segmentClear(last,p,clear),room.name);last=p;}}
 assert(!clear(5.58,1.27));assert(!clear(1.96,3.55));
});
test('column corrections preserve furniture that users already moved',()=>{
 const old=structuredClone(initialFurniture);old.find(f=>f.id==='shoe').z=6.14;old.find(f=>f.id==='bedM').z=1.19;
 const revised=migrateLayout(old,3);assert.equal(revised.find(f=>f.id==='shoe').z,6.10);assert.equal(revised.find(f=>f.id==='bedM').z,1.31);
 old.find(f=>f.id==='shoe').x=.4;old.find(f=>f.id==='bedM').z=1.5;const custom=migrateLayout(old,3);assert.equal(custom.find(f=>f.id==='shoe').z,6.14);assert.equal(custom.find(f=>f.id==='bedM').z,1.5);
});

test('the washer door check follows the drawn door: a washer against a wall can still open',async()=>{
  const {washerDoor,washerDoorRects,signedDistance}=await import('../dist/spatial.js');
  const {wallRects}=await import('../dist/model.js');
  // Owner's layout (2026-09-27): an 88 cm washer whose left side touches the bedroom-B / balcony wall face.
  const f={id:'wash',type:'washer',x:7.07,z:4.77,w:.88,d:.62,h:.87,rot:0};
  for(let s=1;s<=10;s++)for(const rect of washerDoorRects(f,s/10))assert(wallRects().every(w=>signedDistance(rect,w)>=-1e-9),String(s));
  const door=washerDoor(f),[open]=washerDoorRects(f,1);
  assert(Math.abs(open.x-(f.x+door.hinge[0]))<1e-9,'fully open, the leaf lies on the hinge line');
  assert(Math.abs(open.z-(f.z+door.hinge[1]+(door.from+door.to)/2))<1e-9);
  assert(open.yMin>0&&open.yMax<f.h,'the round door sits above the floor and below the top');
  // Turned 90°, the whole thing turns with the washer.
  const [turned]=washerDoorRects({...f,rot:90},1);assert(Math.abs(turned.rot)<1e-9);
});

test('a guarded move stops at contact with furniture and hops over once the target is clear',async()=>{
  const {guardedMove}=await import('../dist/spatial.js');
  const box={id:'box',type:'drawer',name:'抽屜櫃',x:1,z:3,w:.4,d:.4,h:.5,rot:0};
  const block={id:'block',type:'wardrobe',name:'高櫃',x:1.6,z:3,w:.4,d:.6,h:2,rot:0};
  const items=[box,block];
  const stuck=guardedMove(box,{x:1.6,z:3},items);
  assert.equal(stuck.reason,'與高櫃重疊');
  assert(Math.abs(stuck.item.x+box.w/2-(block.x-block.w/2))<.002,`stops at the face, x=${stuck.item.x}`);
  const beyond=guardedMove(box,{x:2.3,z:3},items);
  assert.equal(beyond.reason,'');assert.equal(beyond.item.x,2.3);
});

test('a guarded move slides along an obstacle and never blocks on a clash the item already had',async()=>{
  const {guardedMove}=await import('../dist/spatial.js');
  const box={id:'box',type:'drawer',name:'抽屜櫃',x:1,z:3,w:.4,d:.4,h:.5,rot:0};
  const block={id:'block',type:'wardrobe',name:'高櫃',x:1.6,z:3,w:.4,d:.6,h:2,rot:0};
  const slid=guardedMove(box,{x:1.6,z:3.2},[box,block]);
  assert(Math.abs(slid.item.z-3.2)<1e-9,'the free axis still follows the pointer');
  const inside={...box,x:1.5};
  const out=guardedMove(inside,{x:1.2,z:3},[inside,block]);
  assert.equal(out.reason,'');assert.equal(out.item.x,1.2);
});

test('door sweeps warn but never stop a move',async()=>{
  const {guardedMove}=await import('../dist/spatial.js');
  const {issues}=await import('../dist/model.js');
  // In bedroom A just inside its door (hinged on the corridor wall at z 2.72).
  const chair={id:'c',type:'chair',name:'椅',x:3.35,z:2.3,w:.44,d:.48,h:.8,rot:0};
  assert(issues(chair,[chair]).some(m=>m.startsWith('擋住')));
  const moved=guardedMove(chair,{x:3.4,z:2.3},[chair]);
  assert.equal(moved.reason,'');assert.equal(moved.item.x,3.4);
});

test('the largest fit stops a growing cabinet at the underside of a beam',async()=>{
  const {largestFit}=await import('../dist/spatial.js');
  const {HEIGHT}=await import('../dist/model.js');
  const cabinet={id:'c',type:'wardrobe',name:'高櫃',x:1,z:3,w:.6,d:.5,h:2,rot:0};
  const beam={id:'b',type:'beam',name:'樑',x:1,z:3,w:2,d:.3,h:.4,rot:0};
  const target=HEIGHT,steps=Math.round((target-cabinet.h)*100);
  const fit=largestFit(cabinet,k=>({...cabinet,h:cabinet.h+(target-cabinet.h)*k/steps}),steps,[cabinet,beam]);
  assert.equal(fit.reason,'與樑重疊');
  assert(Math.abs(fit.item.h-(HEIGHT-beam.h))<.0051,`h=${fit.item.h}`);
});

test('a stopped move names what the item ran into, not what lies under the pointer',async()=>{
  const {guardedMove}=await import('../dist/spatial.js');
  const box={id:'box',type:'drawer',name:'抽屜櫃',x:1,z:3,w:.4,d:.4,h:.5,rot:0};
  const near={id:'near',type:'wardrobe',name:'近的櫃',x:1.6,z:3,w:.4,d:1,h:2,rot:0};
  const far={id:'far',type:'wardrobe',name:'遠的櫃',x:2.6,z:3,w:.4,d:1,h:2,rot:0};
  assert.equal(guardedMove(box,{x:2.6,z:3},[box,near,far]).reason,'與近的櫃重疊');
});

test('a stopped resize names what the next centimetre runs into',async()=>{
  const {largestFit}=await import('../dist/spatial.js');
  const box={id:'box',type:'drawer',name:'抽屜櫃',x:1,z:3,w:.4,d:.4,h:.5,rot:0};
  const near={id:'near',type:'wardrobe',name:'近的櫃',x:1.6,z:3,w:.4,d:1,h:2,rot:0};
  // Growing to the right only (left side fixed) far past the cabinet and out of the flat.
  const steps=800,fit=largestFit(box,k=>({...box,w:box.w+8*k/steps,x:box.x+4*k/steps}),steps,[box,near]);
  assert.equal(fit.reason,'與近的櫃重疊');
  assert(Math.abs(fit.item.x+fit.item.w/2-(near.x-near.w/2))<.011);
});

test('a stopped resize lands on the same whole centimetre from any starting size',async()=>{
  const {fitSize}=await import('../dist/spatial.js');
  // Owner's balcony: the washer's left side on the bedroom-B wall face (6.63), the balcony
  // block 88 cm to the right. Dragging the right edge far out from odd widths.
  const left=6.63;
  for(const w of[.8,.853,.871,.873,.876]){
    const f={id:'wash',type:'washer',name:'洗衣機',x:left+w/2,z:4.77,w,d:.62,h:.87,rot:0,open:0};
    const next={...f,w:1.3,x:left+1.3/2};
    const fit=fitSize(f,next,[f]);
    assert.equal(fit.item.w,.88,`from ${w}: ${fit.item.w}`);
    assert(Math.abs(fit.item.x-fit.item.w/2-left)<1e-9,'the left side stays put');
  }
});

test('a stopped resize keeps millimetres: a gap of 88.35 cm stops at 88.3',async()=>{
  const {fitSize}=await import('../dist/spatial.js');
  const left=6.63-.0035;
  const f={id:'wash',type:'washer',name:'洗衣機',x:left+.4,z:4.77,w:.8,d:.62,h:.87,rot:0,open:0};
  const fit=fitSize(f,{...f,w:1.3,x:left+.65},[f]);
  // The wall face is 3.5 mm left of 6.63 here, so the item overlaps it: that clash is old and
  // does not stop the resize; the balcony block 88.35 cm from `left` does.
  assert.equal(fit.item.w,.883);
});

test('an item already touching one wall still stops at the next wall',async()=>{
  const {guardedMove}=await import('../dist/spatial.js');
  // Owner's bath-A sink, left over the west wall (face 1.58) after the 2026-09-27 wall move.
  const sink={id:'bathSink1',type:'sink',name:'衛浴 A 洗手台',x:1.7,z:5.25,w:.82,d:.43,h:.83,rot:90,open:0};
  const moved=guardedMove(sink,{x:3.1,z:5.25},[sink]);
  assert.equal(moved.reason,'與牆體重疊');
  assert(moved.item.x+sink.d/2<=3.08-.06+1e-6,`stops at the east wall face, x=${moved.item.x}`);
});

test('sockets sit flat on the nearest wall, on a cabinet top, or on a cell back panel, following the host',async()=>{
  const {placeOutlet}=await import('../dist/spatial.js');
  const {validateFurniture,WALL_THICKNESS,initialFurniture}=await import('../dist/model.js');
  const {CARCASS_T,makeCabinetDesign,cabinetCells,cellOpening}=await import('../dist/cabinet-design.js');
  const [wall]=validateFurniture([{id:'o',type:'outlet',name:'插座',x:.3,z:3,w:.1,d:.1,h:.1,rot:0,open:0}]);
  assert.deepEqual([wall.w,wall.d,wall.h,wall.elevation,wall.outletKind,wall.outletMount],[.12,.015,.075,.3,'duplex','wall']);
  const onWall=placeOutlet(wall,[wall]);
  assert(Math.abs(onWall.x-(WALL_THICKNESS/2+wall.d/2))<1e-9,`against the living room's west wall, x=${onWall.x}`);
  assert.equal(onWall.rot,90,'facing into the room');
  const kitchen=validateFurniture([initialFurniture.find(f=>f.id==='kitchen')])[0];
  const [top]=validateFurniture([{...wall,id:'t',outletMount:'top',outletKind:'duplex',supportId:'kitchen'}]);
  const placed=placeOutlet({...top,x:kitchen.x+.5,z:kitchen.z},[kitchen,top],{fromPoint:true});
  assert.equal(placed.elevation,kitchen.h);
  const moved=placeOutlet(placed,[{...kitchen,x:kitchen.x-1},placed]);
  assert(Math.abs(moved.x-(placed.x-1))<1e-9,'follows the kitchen');
  const cabinet={id:'c',type:'wardrobe',name:'櫃',x:2,z:3,w:.8,d:.5,h:2,rot:0,open:0};cabinet.cabinetDesign=makeCabinetDesign(cabinet,'shelves');
  const cell=cabinetCells(cabinet)[1],opening=cellOpening(cabinet,cell.id);
  const [inside]=validateFurniture([{...wall,id:'i',outletMount:'cell',supportId:'c',supportCell:cell.id,elevation:0}]);
  const inCell=placeOutlet(inside,[cabinet,inside]);
  assert(Math.abs(inCell.z-(cabinet.z-cabinet.d/2+CARCASS_T+inside.d/2))<1e-9,'on the back panel');
  assert(Math.abs(inCell.elevation-opening.bottom)<1e-9,'kept inside the cell');
});

test('a socket put on a surface in walk view mounts on the wall, a top, or the cell under the pointer',async()=>{
  const {socketOnSurface,placeOutlet}=await import('../dist/spatial.js');
  const {validateFurniture}=await import('../dist/model.js');
  const {makeCabinetDesign,cabinetCells}=await import('../dist/cabinet-design.js');
  const [o]=validateFurniture([{id:'o',type:'outlet',name:'插座',x:1,z:3,w:.12,d:.015,h:.075,rot:0,open:0}]);
  const cabinet={id:'c',type:'wardrobe',name:'櫃',x:2,z:3,w:.8,d:.5,h:2,rot:0,open:0};cabinet.cabinetDesign=makeCabinetDesign(cabinet,'shelves');
  const sofa={id:'s',type:'sofa',name:'沙發',x:1,z:1,w:2,d:.9,h:.8,rot:0,open:0},items=[o,cabinet,sofa];
  const at=(point,normal,id)=>socketOnSurface(o,{point:{y:0,...point},normal:{x:0,y:0,z:0,...normal},id},items);
  const wall=at({x:.06,y:1.2,z:3},{x:1},null);
  assert.equal(wall.outletMount,'wall');assert(Math.abs(wall.elevation-(1.2-o.h/2))<1e-9);
  assert.equal(at({x:1,y:0,z:3},{y:1},null),null,'floor');
  assert.equal(at({x:1,y:.8,z:1},{y:1},'s'),null,'a sofa is no host');
  assert.equal(at({x:2.1,y:2,z:3},{y:1},'c').outletMount,'top');
  const cell=cabinetCells(cabinet)[2],front=at({x:2.1,y:cell.bottom+cell.h/2,z:3.25},{z:1},'c');
  assert.deepEqual([front.outletMount,front.supportCell],['cell',cell.id]);
  assert.equal(at({x:2.4,y:cell.bottom+cell.h/2,z:3},{x:1},'c'),null,'a side panel is not a way in');
  const placed=placeOutlet(validateFurniture([front])[0],items,{fromPoint:true});
  assert(Math.abs(placed.offsetX-.1)<1e-9,'keeps the pointer\'s spot across the cell');
});

test('a socket lying on a top lies flat, turns on it and stays on it',async()=>{
  const {placeOutlet}=await import('../dist/spatial.js');
  const {validateFurniture,initialFurniture}=await import('../dist/model.js');
  const kitchen=validateFurniture([initialFurniture.find(f=>f.id==='kitchen')])[0];
  const [o]=validateFurniture([{id:'o',type:'outlet',name:'插座',x:kitchen.x,z:kitchen.z,w:.1,d:.1,h:.1,rot:0,open:0,outletMount:'top',supportId:'kitchen',offsetRot:90}]);
  assert.deepEqual([o.w,o.d,o.h],[.12,.075,.012],'a flat plate');
  const far=placeOutlet({...o,x:kitchen.x+5,z:kitchen.z},[kitchen,o],{fromPoint:true});
  assert.equal(far.rot,(kitchen.rot+90)%360);
  assert(Math.abs(far.offsetX)<=kitchen.w/2-o.d/2+1e-9,'turned, its depth runs along the counter and it stays on it');
  assert.equal(far.elevation,kitchen.h);
});

test('dropped socket kinds become duplex, and a wall socket turned upright swaps its width and height',async()=>{
  const {validateFurniture}=await import('../dist/model.js');
  const {placeOutlet}=await import('../dist/spatial.js');
  const {makeCabinetDesign,cabinetCells,cellOpening}=await import('../dist/cabinet-design.js');
  const base={type:'outlet',name:'插座',x:.3,z:3,w:.1,d:.1,h:.1,rot:0,open:0};
  const [a,b]=validateFurniture([{...base,id:'a',outletKind:'v220'},{...base,id:'b',outletKind:'popup'}]);
  assert.deepEqual([a.outletKind,b.outletKind],['duplex','duplex']);
  const [upright]=validateFurniture([{...base,id:'u',spin:100}]);
  assert.deepEqual([upright.spin,upright.w,upright.h],[90,.075,.12]);
  const [flat]=validateFurniture([{...base,id:'t',outletMount:'top',supportId:'x',spin:90}]);
  assert.equal(flat.spin,undefined,'a plate on a top turns with offsetRot instead');
  const cabinet={id:'c',type:'wardrobe',name:'櫃',x:2,z:3,w:.8,d:.5,h:2,rot:0,open:0};cabinet.cabinetDesign=makeCabinetDesign(cabinet,'shelves');
  const cell=cabinetCells(cabinet)[1],opening=cellOpening(cabinet,cell.id);
  const [inside]=validateFurniture([{...base,id:'i',outletMount:'cell',supportId:'c',supportCell:cell.id,elevation:9,spin:90}]);
  const placed=placeOutlet(inside,[cabinet,inside]);
  assert(Math.abs(placed.elevation+placed.h-(opening.bottom+opening.h))<1e-9,'the taller upright plate still fits in the cell');
});

test('in top view a socket goes onto the table or cabinet under the pointer, else the nearest wall',async()=>{
  const {socketFromTopView,placeOutlet}=await import('../dist/spatial.js');
  const {validateFurniture,initialFurniture}=await import('../dist/model.js');
  const items=validateFurniture(initialFurniture),dining=items.find(f=>f.id==='dining');
  const [o]=validateFurniture([{id:'o',type:'outlet',name:'插座',x:0,z:0,w:.12,d:.015,h:.075,rot:0,open:0}]);
  const onTable=placeOutlet(validateFurniture([socketFromTopView(o,{x:dining.x+.2,z:dining.z},items)])[0],items,{fromPoint:true});
  assert.deepEqual([onTable.outletMount,onTable.supportId,onTable.elevation],['top','dining',dining.h]);
  assert(Math.abs(onTable.x-(dining.x+.2))<1e-9,'where it was dropped');
  const back=socketFromTopView(onTable,{x:.3,z:3},items);
  assert.equal(back.outletMount,'wall');assert.equal(back.supportId,undefined);
  const inCell={...o,outletMount:'cell',supportId:'x',supportCell:'y'};
  assert.equal(socketFromTopView(inCell,{x:1,z:1},items).outletMount,'cell');
});
