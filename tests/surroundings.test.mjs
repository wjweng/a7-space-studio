import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SITE,towers,paintFacade,northFacade,eastFacade,corridor} from '../dist/surroundings.js';
import {walls,doors} from '../dist/model.js';
import {doorRects,visualLeafWidth} from '../dist/spatial.js';
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
  const share=lit/(a.width*a.height),min=t.style==='endwall'?0:.03;assert(lit>0&&share>min&&share<.5,t.id+' lit share '+share.toFixed(3));
 }
});

test('the lobby matches the floor plan as seen from A7\'s front door',()=>{
 const entry=doors.find(d=>d.name==='玄關大門'),wall=walls.find(w=>w.a[0]===-.45&&w.b[0]===-.45);
 const opening=[entry.z-entry.width,entry.z].sort((a,b)=>a-b);
 assert(corridor.z0<opening[0]&&corridor.z1>opening[1],'the doorway opens into the corridor');
 assert(corridor.x1<=wall.a[0]-.06+1e-9,'the corridor starts outside the wall');
 const at=(wallName,label)=>corridor.doors.find(d=>d.wall===wallName&&d.label===label);
 // Right (north) side, nearest first: A6 then A5.
 assert(at('north','A6').at>at('north','A5').at);
 // Left (south) side, nearest first: A2 stair, smoke lobby, A1 stair, A1.
 const smoke=(corridor.smokeLobby.x0+corridor.smokeLobby.x1)/2;
 assert(at('south','A2 梯').at>smoke&&smoke>at('south','A1 梯').at&&at('south','A1 梯').at>at('south','A1').at);
 // Straight ahead: A3 on the right (north), A2 on the left (south); A8 shares A7's end.
 assert(at('west','A3').at<at('west','A2').at);
 assert(at('east','A8').at>opening[1],'A8 is beside A7, south of its door');
 assert(corridor.smokeLobby.lifts.length===2,'the lifts are inside the smoke lobby, not on the corridor');
});
test('the front door hinges on the south jamb and opens inward, handle on the right from inside',()=>{
 const entry=doors.find(d=>d.name==='玄關大門'),open=doorRects(entry,1,entry.maxAngle)[0],closed=doorRects(entry,0);
 assert(Math.abs(entry.z-8.53)<1e-9,'hinge at the south end of the opening');
 assert(open.x>entry.x,'swings into the flat');
 assert(closed[1].z<closed[0].z,'handle towards the north: the right-hand side facing the door from inside');
 assert(visualLeafWidth(entry)>entry.width-.04,'the leaf fills the opening instead of leaving a see-through gap');
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
test('the towers sit where the owner described them',()=>{
 const centre=towers.find(t=>t.id==='north-centre'),east=towers.find(t=>t.id==='east'),rings=towers.find(t=>t.id==='north-east');
 const third=(centre.x1-centre.x0)/3;
 for(const [a,b]of[[.42,2.3],[3.37,5.01],[6.45,8.08]])assert(a>=centre.x1-third-1&&b<=centre.x1+1,'A7\'s north windows face the right third of the tower opposite');
 assert(rings.x0-centre.x1>=4,'a small lane separates the ringed tower');
 assert(east.z0>=SITE.northFace-1,'the east neighbour is set back like A7, not standing out into the lane');
});
test('A7\'s front door has the same finish as the other units\' doors',async()=>{
 const src=(await import('node:fs')).readFileSync(new URL('../dist/scene.js',import.meta.url),'utf8');
 assert.match(src,/door\.id==='door-0'\?'entryDoor'/);assert.match(src,/unit:lob\(ENTRY_DOOR\)/);
});
test('the east end wall has one column of slit windows and no glazed bay',()=>{
 const east=towers.find(t=>t.id==='east'),p=paintFacade(east,east.z1-east.z0,east.top-SITE.ground);
 assert.equal(east.slabs,undefined);
 const y=Math.floor((1.6/(east.top-SITE.ground))*p.height),dark=[];
 for(let x=0;x<p.width;x++){const k=(y*p.width+x)*4;if(p.albedo[k]<90)dark.push(x);}
 const runs=dark.filter((x,i)=>i===0||x!==dark[i-1]+1).length;
 assert.equal(runs,1,'one run of dark window pixels across a floor');
});
