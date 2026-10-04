import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {validateFurniture,issues,HEIGHT} from '../dist/model.js';
import {AC_UNITS,acSize,acBox,acSupported,acWallHits,mountAirConditioner,acOnSurface} from '../dist/air-conditioner.js';
import {guardedAirConditioner,fitSize,turnAboutCentre,blocksCamera} from '../dist/spatial.js';
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
