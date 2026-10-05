import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {validateFurniture,issues,HEIGHT} from '../dist/model.js';
import {AC_UNITS,acSize,acBox,acSupported,acWallHits,mountAirConditioner,acOnSurface} from '../dist/air-conditioner.js';
import {guardedAirConditioner,fitSize,turnAboutCentre,blocksCamera,nearestClearHeight} from '../dist/spatial.js';
import {furnitureInterference} from '../dist/geometry.js';
import {SpaceScene} from '../dist/scene.js';
import {encodeShare,decodeShare} from '../dist/share.js';

const ac=(kind='indoor',extra={})=>({id:'ac',name:'冷氣',type:'airConditioner',acKind:kind,...AC_UNITS[kind],x:.06+(kind==='outdoor'?.4:.262)/2,z:3,rot:90,...extra});
const beam={id:'beam',name:'樑',type:'beam',x:1.3,z:3,w:1.6,d:.25,h:.5,rot:0};
const beamAC=()=>ac('indoor',{x:1.3,z:3+.125+.131,rot:0,elevation:2.55});
const warnings=(f,others=[])=>issues(f,[f,...others],{doorSweeps:false});

test('both supplied unit sizes and wall-plane rotation survive a saved layout',()=>{
 for(const kind of ['indoor','outdoor']){const f=ac(kind,{spin:30}),saved=validateFurniture(JSON.parse(JSON.stringify([f])))[0];assert.equal(saved.acKind,kind);for(const k of ['w','d','h','elevation','spin'])assert.equal(saved[k],f[k]);}
});
test('a complete indoor back mounts on a wall and has no warning',()=>{
 const f=ac();assert(acSupported(f,[]));assert.deepEqual(warnings(f),[]);
 assert.equal(acSupported({...f,x:f.x+.01},[]),false,'a gap behind the back is unsupported');
 assert(acWallHits({...f,x:f.x-.01}).length,'sinking into the wall is still a clash');
});
test('support covers the entire rectangle, including a hole between supported corners',()=>{
 const window=ac('indoor',{w:2.1,x:1.38,z:.191,rot:0,elevation:.7,h:1.9});
 assert.equal(acSupported(window,[]),false,'window opening inside the mounting rectangle');
 const above=ac('indoor',{x:1.4,z:.191,rot:0,elevation:2.45});assert(acSupported(above,[]));assert.deepEqual(warnings(above),[]);
 assert.equal(acSupported({...above,elevation:2.2},[]),false,'bottom overlaps the window');
});
test('a door lintel supports an AC only above the opening',()=>{
 const f=ac('indoor',{x:3.5,z:2.529,rot:180,elevation:2.3});assert(acSupported(f,[]));assert.deepEqual(warnings(f),[]);
 assert.equal(acSupported({...f,elevation:2},[]),false);
});
test('a beam supports a whole back, never an overhang along width or height',()=>{
 const f=beamAC();assert(acSupported(f,[beam]));assert.deepEqual(warnings(f,[beam]),[]);assert.deepEqual(warnings(beam,[f]),[]);
 assert(!acSupported({...f,x:1.6},[beam]));assert(!acSupported({...f,elevation:2.49},[beam]));
 assert(!acSupported(f,[{...beam,h:.3}]));assert(!acSupported(f,[]));
 assert(!acSupported(f,[{...beam,draft:true}]));
});
test('outdoor mounting requires a wall even when a beam is large enough',()=>{
 const f=ac('outdoor',{x:1.3,z:3+.125+.2,rot:0,elevation:2.05});assert(!acSupported(f,[{...beam,h:1}]));
});
test('floor, ceiling, floor furniture and ceiling furniture all block an AC',()=>{
 const f=ac();assert(warnings({...f,elevation:0}).some(m=>m.includes('地面')));assert(warnings({...f,elevation:HEIGHT-f.h}).some(m=>m.includes('天花板')));
 const cabinet={id:'cab',name:'櫃',type:'wardrobe',x:.3,z:3,w:1.4,d:.6,h:2.5,rot:90};
 assert(warnings(f,[cabinet]).includes('與櫃重疊'));assert(warnings(cabinet,[f]).includes('與冷氣重疊'));
 const lamp={id:'light',name:'燈',type:'light',lightKind:'ceiling',x:f.x,z:f.z,w:.3,d:.3,h:.3,rot:0};
 assert(warnings(f,[lamp]).includes('與燈重疊'));assert(warnings(lamp,[f]).includes('與冷氣重疊'));
});
test('vertical contact stops at the existing mm precision with clearance above furniture',()=>{
 const f=ac(),cab={id:'cab',name:'櫃',type:'wardrobe',x:.3,z:3,w:1.4,d:.6,h:2.1,rot:90};
 const down=guardedAirConditioner(f,{...f,elevation:1.5},[f,cab]);assert(down.reason.includes('櫃'));assert(Math.abs(down.item.elevation-2.101)<1e-5);assert(!furnitureInterference(down.item,cab));
 const up=guardedAirConditioner(f,{...f,elevation:2.9},[f]);assert(up.reason.includes('天花板'));assert(Math.abs(up.item.elevation-(HEIGHT-f.h-.001))<1e-5);
});
test('outdoor units stack independently with rack clearance and collide symmetrically',()=>{
 const low=ac('outdoor'),top=ac('outdoor',{id:'ac2',name:'上層',elevation:1.15});assert.deepEqual(warnings(low,[top]),[]);assert.deepEqual(warnings(top,[low]),[]);
 const close={...top,elevation:low.elevation+low.h+.05};assert(furnitureInterference(low,close),'rack occupies space below the upper unit');assert(furnitureInterference(close,low));
 const move=guardedAirConditioner(top,{...top,elevation:.6},[low,top]);assert(move.reason);assert(move.item.elevation>low.elevation+acSize(low).h);
});
test('walk fallback stops at the beam edge instead of leaving its mounting face',()=>{
 const f=beamAC(),result=guardedAirConditioner(f,{...f,x:2.1},[f,beam],{hop:false});assert(result.reason.includes('安裝面'));assert(Math.abs(result.item.x-(beam.x+beam.w/2-f.w/2))<2e-5);assert(acSupported(result.item,[beam]));
 const lowered=guardedAirConditioner(f,{...f,elevation:2.2},[f,beam],{hop:false});assert(Math.abs(lowered.item.elevation-2.5)<1e-5);
});
test('surface placement accepts wall and beam sides, refusing floors and cabinet faces',()=>{
 const surface={point:{x:.06,y:2.6,z:3},normal:{x:1,y:0,z:0},id:null};const f=ac();assert(acSupported(acOnSurface(f,surface,[]),[]));
 assert.equal(acOnSurface(f,{...surface,normal:{x:0,y:1,z:0}},[]),null);
 assert.equal(acOnSurface(f,{...surface,id:'cab'},[{id:'cab',type:'wardrobe'}]),null);
 const beamSurface={point:{x:1.3,y:2.75,z:3.125},normal:{x:0,y:0,z:1},id:'beam'};assert(acSupported(acOnSurface(f,beamSurface,[beam]),[beam]));assert.equal(acOnSurface(ac('outdoor'),beamSurface,[beam]),null);
});
test('top placement snaps the back to a wall and keeps the supplied dimensions',()=>{
 for(const kind of ['indoor','outdoor']){const f=ac(kind,{x:1}),placed=mountAirConditioner(f,[]);assert(acSupported(placed,[]));assert.deepEqual(warnings(placed),[]);for(const k of ['w','d','h'])assert.equal(placed[k],f[k]);}
});
test('growing on a beam stops at its ends and rotation keeps the assembly centre',()=>{
 const f=beamAC(),fit=fitSize(f,{...f,w:2},[f,beam]);assert(fit.reason);assert.equal(fit.item.w,1.6);
 const out=ac('outdoor'),turn=turnAboutCentre(out,{...out,spin:90});assert(Math.abs(out.elevation+acBox(out).h/2-turn.elevation-acBox(turn).h/2)<1e-9);
});
test('walking can pass under a high indoor unit but is blocked by a low outdoor assembly',()=>{
 assert(!blocksCamera(ac(),1.6));assert(blocksCamera(ac('outdoor',{elevation:1.2}),1.6));
});
test('rendered geometry stays inside the same mounting and collision envelope',()=>{
 const scene=Object.create(SpaceScene.prototype);scene.m={};
 for(const kind of ['indoor','outdoor'])for(const spin of [0,30,90]){
  const f=ac(kind,{spin}),g=new T.Group;scene.makeFurniture(g,f);g.updateMatrixWorld(true);
  const actual=new T.Box3().setFromObject(g),p=acBox(f),tol=.0001;
  assert(actual.min.x>=-p.w/2-tol&&actual.max.x<=p.w/2+tol,`${kind} width ${spin}`);
  assert(actual.min.z>=-p.d/2-tol&&actual.max.z<=p.d/2+tol,`${kind} depth ${spin}`);
  assert(actual.min.y>=f.elevation-tol&&actual.max.y<=f.elevation+p.h+tol,`${kind} height ${spin}: ${actual.min.y},${actual.max.y}`);
 }
});

test('both air conditioners round-trip through an exported share link',async()=>{
 const furniture=validateFurniture([ac(),ac('outdoor',{id:'out'})]);
 const decoded=await decodeShare(await encodeShare('冷氣配置',{version:1,palette:'oak',furniture}));
 assert.deepEqual(validateFurniture(decoded.state.furniture),furniture);
});

test('a rotated unit near the shell uses its rotated footprint for boundary checks',()=>{
 const f=ac('indoor',{x:8.209,z:.3,rot:-90,spin:90,elevation:1});
 assert(acSupported(f,[]));assert.deepEqual(warnings(f),[]);
});

test('an outdoor rack mounts on the balcony railing and needs only part of its back on a face',()=>{
 const rail=mountAirConditioner(ac('outdoor',{x:8.1,z:5.7,rot:-90}),[]);
 assert(Math.abs(rail.x-(8.34-acBox(rail).d/2))<1e-6,'back on the railing wall face');assert.equal(rail.rot,-90);
 assert(acSupported(rail,[]));assert.deepEqual(warnings(rail),[]);
 assert(acSupported({...rail,elevation:1.6},[]),'height above the railing does not matter');
 const f=ac('outdoor');assert(acSupported({...f,elevation:2},[]));
 assert(!acSupported({...f,x:f.x+.05},[]),'a back standing off the wall is unsupported');
 assert(warnings({...f,x:f.x+.05}).includes('鐵架的兩根立柱都要靠著牆面或欄杆'));
 const surface={point:{x:8.38,y:.8,z:5.7},normal:{x:-1,y:0,z:0},id:null},placed=acOnSurface(ac('outdoor'),surface,[]);
 assert(Math.abs(placed.x-rail.x)<1e-6,'a click on a railing bar puts the back on the wall face');
});
test('the user layout: a unit placed into a beam may slide or leave but never sink deeper',()=>{
 const userBeam={id:'b',name:'天花板樑',type:'beam',x:1.4,z:.3025,w:2.45,d:.485,h:.3,rot:0},f=ac('indoor',{x:1.36,z:.191,rot:0,elevation:2.39999});
 assert(warnings(f,[userBeam]).includes('與天花板樑重疊'),'30 cm between the window head and this beam cannot take a 33.9 cm unit');
 const up=guardedAirConditioner(f,{...f,elevation:2.6},[f,userBeam],{hop:false});assert(up.reason.includes('天花板樑'));assert(Math.abs(up.item.elevation-f.elevation)<1e-5);
 assert.equal(guardedAirConditioner(f,{...f,x:1.5},[f,userBeam],{hop:false}).reason,'','sliding at the same depth stays allowed');
 const away={...f,x:3.4,z:.191,elevation:2.45},into=guardedAirConditioner(away,{...away,x:1.36},[away,userBeam]);assert(into.reason.includes('天花板樑'));
});
test('grille and vent lines are not pickable, so clicks beside a unit miss it',()=>{
 const scene=Object.create(SpaceScene.prototype);scene.m={};
 for(const kind of ['indoor','outdoor']){
  const f=ac(kind,{x:0,z:0,rot:0}),g=new T.Group;scene.makeFurniture(g,f);g.updateMatrixWorld(true);
  const top=f.elevation+acBox(f).h,ray=new T.Raycaster(new T.Vector3(0,top+.3,5),new T.Vector3(0,0,-1));
  // Compare a count: a failing deepEqual on hits would print whole three.js object graphs.
  assert.equal(ray.intersectObject(g,true).length,0,`${kind}: a ray 30 cm above the unit picks nothing`);
  const hit=new T.Raycaster(new T.Vector3(0,f.elevation+acBox(f).h*.6,5),new T.Vector3(0,0,-1)).intersectObject(g,true);
  assert(hit.length&&hit[0].object.isMesh,`${kind}: the body itself is still picked`);
 }
});
test('an outdoor rack needs both rails on a face and slides along it until a rail reaches the end',()=>{
 // issue/A7-空間配置_9.json: a 60 cm unit on the west face of the balcony's south column (x 8.1, z 6.46-7.31).
 const f=ac('outdoor',{w:.6,x:7.9,z:6.85,rot:-90,elevation:.031});assert(acSupported(f,[]));
 const reach=.6*.34+.035/2,edge=6.46+reach;
 assert(acSupported({...f,z:edge+.001},[]),'the north rail still on the column');assert(!acSupported({...f,z:edge-.01},[]),'the north rail past the column');
 const slid=mountAirConditioner({...f,z:6.5},[]);assert(Math.abs(slid.z-edge)<1e-6&&Math.abs(slid.x-f.x)<1e-9,'clamped where the rail reaches the column end');
});
test('a drag toward another face that cannot be reached stays put, never turned into the wall',()=>{
 const f=ac('outdoor',{w:.6,x:7.9,z:6.85,rot:-90,elevation:.031});
 const r=guardedAirConditioner(f,mountAirConditioner({...f,x:8.2,z:6.85},[f]),[f]);
 assert.equal(r.item,f);assert(r.reason);assert.deepEqual(warnings(r.item),[]);
 const north=guardedAirConditioner(f,mountAirConditioner({...f,x:7.9,z:6.0},[f]),[f]);
 assert.equal(north.item.rot,-90);assert(Math.abs(north.item.x-(8.34-acBox(f).d/2))<1e-6,'jumps onto the railing face once that spot is clear');assert.deepEqual(warnings(north.item),[]);
});
test('walk view can point at the balcony railing above its top rail, so racks can be stacked there',()=>{
 const scene=Object.create(SpaceScene.prototype),aim=(from,to)=>{scene.ray=new T.Raycaster(new T.Vector3(...from),new T.Vector3(...to).sub(new T.Vector3(...from)).normalize());};
 aim([7,1.6,5.8],[8.4,1.8,5.8]);const hit=scene.railingSurface(null);
 assert(hit&&Math.abs(hit.point.x-8.34)<1e-9&&hit.normal.x===-1&&hit.id===null,'the inner wall face, 1.8 m up');
 const placed=acOnSurface(ac('outdoor'),hit,[]);assert(acSupported(placed,[]));assert.deepEqual(warnings(placed),[]);
 const near={point:new T.Vector3(7.5,1.7,5.8),normal:new T.Vector3(-1,0,0),id:'x'};assert.equal(scene.railingSurface(near),near,'something nearer wins');
 aim([7,1.6,4.7],[8.4,1.6,4.7]);assert.equal(scene.railingSurface(null),null,'beside the opening there is no railing');
});
test('walk view drops a unit into the gap of a stack, which the pointer height alone almost never hits',()=>{
 // issue/A7-空間配置_10.json: three racks stacked on the balcony column, each stopped at contact.
 const unit=(id,elevation)=>ac('outdoor',{id,name:id,w:.8,x:7.9,z:6.75,rot:-90,elevation});
 const low=unit('low',.031),top=unit('top',1.555),mid={...unit('mid',.793),...mountAirConditioner({...unit('mid',.793),x:7.4,z:7.05},[])},items=[low,mid,top];
 assert.notEqual(mid.rot,-90,'moved onto the south wall');assert.deepEqual(warnings(mid,[low,top]),[]);
 let hits=0;
 for(let k=0;k<=60;k++){const y=.9+k/100;
  const spot=acOnSurface(mid,{point:{x:8.1,y,z:6.75},normal:{x:-1,y:0,z:0},id:null},items);
  assert(warnings(spot,[low,top]).length,'the raw pointer height clashes');
  const snapped=nearestClearHeight(mid,spot,items),r=guardedAirConditioner(mid,snapped,items);
  if(!r.reason&&r.item.rot===-90&&!warnings(r.item,[low,top]).length)hits++;
 }
 assert.equal(hits,61,'every pointer height within the stack lands in the gap');
 const fresh=ac('outdoor',{id:'new',w:.8,x:0,z:0}),spot=acOnSurface(fresh,{point:{x:8.1,y:1.2,z:6.75},normal:{x:-1,y:0,z:0},id:null},[low,top]);
 assert.equal(nearestClearHeight(fresh,spot,[low,top],{strict:true}).rot,-90);
});
test('pointing at a face near a corner slides the rack along that face to clear the wall, never onto the other wall',()=>{
 // _10.json: the column face (85 cm) meets the south wall; an 88 cm rack has under 1 mm of play there.
 const f=ac('outdoor',{id:'m',w:.8,x:7.4,z:6.984,rot:180,elevation:.793});
 for(const z of [6.6,6.8,6.95,7.1]){
  const placed=acOnSurface(f,{point:{x:8.1,y:1.17,z},normal:{x:-1,y:0,z:0},id:null},[]);
  assert.equal(placed.rot,-90,`pointer at z ${z} stays on the column face`);assert.deepEqual(warnings(placed),[],`pointer at z ${z}`);
 }
 assert.equal(acOnSurface(f,{point:{x:8.1,y:1.17,z:6.9},normal:{x:-1,y:0,z:0},id:null,action:'door-5'},[]),null,'a door leaf is no mounting surface');
});
test('the bottom of a stack, whose gap fits it to within a micron, still drops back in from any spot on the face',()=>{
 // issue/A7-空間配置_11.json, exact values: the middle unit was stopped at contact on the bottom one.
 const unit=(id,v)=>ac('outdoor',{id,name:id,w:.8,...v});
 const low=unit('low',{x:7.660000099928275,z:6.96738817862882,d:.33522364274236194,rot:-180,elevation:.030999000188277115});
 const mid=unit('mid',{x:7.894159439320522,z:6.749499999999999,d:.3016811213589538,rot:-90,elevation:.7929989002060583});
 const top=unit('top',{x:7.8999999999999995,z:6.749499999999999,d:.29,rot:-90,elevation:1.5549990002060583}),items=[low,mid,top];
 let home=0,spots=0;
 for(let i=0;i<=17;i++)for(let k=0;k<=14;k++){
  spots++;const raw=acOnSurface(low,{point:{x:8.1,y:.1+k*.05,z:6.47+i*.05},normal:{x:-1,y:0,z:0},id:null},items);
  const r=guardedAirConditioner(low,nearestClearHeight(low,raw,items)||raw,items);
  if(r.item.rot===-90&&!warnings(r.item,[mid,top]).length)home++;
 }
 assert.equal(home,spots);
});
