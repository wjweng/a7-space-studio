import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialFurniture,validateFurniture,issues,mountDrop,linearLightDefaults} from '../dist/model.js';
import {cabinetLight,cabinetLightOnSurface,placeCabinetLight,stripPose} from '../dist/cabinet-light.js';
import {SpaceScene} from '../dist/scene.js';

const near=(a,b,eps=1e-6)=>Math.abs(a-b)<eps;
// The right leaf of the 1 m double door starts just right of the middle gap.
const FRONT_LEFT=.0015;
// A 1 m wardrobe facing +z (rot 0) at the origin: an open cell from the floor to 1 m, a door above.
const wardrobe=(over={})=>validateFurniture([{...initialFurniture.find(f=>f.type==='wardrobe'),id:'w',x:0,z:0,w:1,d:.6,h:2.2,rot:0,openCells:{},cabinetDesign:{template:'custom',columns:[{id:'c',width:1,bottom:0,cells:[{id:'low',height:1,front:'open'},{id:'high',height:1.2,front:'double'}]}]},...over}])[0];
const strip={id:'s',type:'light',name:'線燈',x:3,z:3,rot:0,lightKind:'linear',...linearLightDefaults,w:.6};
const surface=(point,normal,id='w')=>({point:new THREE.Vector3(...point),normal:new THREE.Vector3(...normal),id});
const on=(items,...args)=>{const n=cabinetLightOnSurface(strip,surface(...args),items);return n&&validateFurniture([n])[0];};

test('a linear light goes onto the cabinet face under the pointer',()=>{
 const items=[wardrobe()];
 assert.equal(on(items,[0,2.2,0],[0,1,0]).lightMount,'top');
 assert.equal(on(items,[-.5,1.5,0],[-1,0,0]).lightMount,'left');
 assert.equal(on(items,[.5,1.5,0],[1,0,0]).lightMount,'right');
 const door=on(items,[.25,1.5,.318],[0,0,1]);assert.equal(door.lightMount,'front','a door face is the front');assert.equal(door.supportCell,'high:1','on the right leaf');
 assert.equal(on(items,[0,1.5,.318],[0,0,1]),null,'not in the gap between the two leaves');
 assert.equal(on(items,[.25,.5,.3],[0,0,1]),null,'not on the front edge of an open cell');
 const back=on(items,[0,.5,-.282],[0,0,1]);assert.equal(back.lightMount,'cell');assert.equal(back.supportCell,'low');
 const under=on(items,[0,1,0],[0,-1,0]);assert.equal(under.lightMount,'under');assert.equal(under.supportCell,'low','the board above the open cell');
 assert.equal(on(items,[0,1.018,0],[0,1,0]).supportCell,'high','a shelf top gives the back panel of the cell it carries');
 assert.equal(on(items,[0,1.5,-.3],[0,0,-1]),null,'not the back against the wall');
 for(const f of items.map(()=>on(items,[0,2.2,0],[0,1,0])))assert.deepEqual(issues(f,[...items,f]),[]);
});

test('the ceiling or a beam underside makes it a ceiling light again',()=>{
 const items=[wardrobe()],mounted=on(items,[0,2.2,0],[0,1,0]);
 const back=validateFurniture([cabinetLightOnSurface(mounted,surface([2,3,2],[0,-1,0],null),items)])[0];
 assert(!cabinetLight(back));assert.equal(back.lightMount,undefined);assert(near(back.x,2)&&near(back.z,2));
 const beam={id:'b',type:'beam',name:'樑',x:2,z:2,w:2,d:.4,h:.5,rot:0};
 const under=validateFurniture([cabinetLightOnSurface(mounted,surface([2,2.5,2],[0,-1,0],'b'),[...items,beam])])[0];
 assert(!cabinetLight(under));assert.equal(mountDrop(under,[...items,beam,under]),.5,'hangs under the beam');
});

test('on its face the strip faces out, follows its cabinet and is flagged when it runs past',()=>{
 let items=[wardrobe()];const f=on(items,[.45,.5,-.282],[0,0,1]);
 assert(near(f.offsetU+f.w/2,.5-.018),'a move stops at the side panel');
 const pose=stripPose(f,items[0]);assert.deepEqual(pose.n,[0,0,1]);assert(near(pose.centre[2],-.3+.018+f.h/2));
 // The cabinet moves and turns: the strip goes with it.
 const moved=wardrobe({x:1,z:2,rot:90});items=[moved];const after=placeCabinetLight(f,items);
 assert(near(after.x,1+(-.3+.018+f.h/2))&&near(after.z,2-f.offsetU),`${after.x},${after.z}`);
 // Lengthened without a move it stays put and runs past the 96 cm opening.
 const wide=placeCabinetLight({...f,w:.99},items);assert.deepEqual(issues(wide,[...items,wide]),['超出櫃格']);
 assert.deepEqual(issues({...f,supportId:'gone'},[...items]),['找不到安裝的櫃子']);
});

test('validation keeps the mount only for a linear light',()=>{
 const items=[wardrobe()],f=on(items,[0,2.2,0],[0,1,0]);
 const pendant=validateFurniture([{...f,lightKind:'pendant',w:.3,d:.3,h:.1}])[0];assert.equal(pendant.lightMount,undefined);assert.equal(pendant.supportId,undefined);
 const spun=validateFurniture([{...f,spin:450}])[0];assert.equal(spun.spin,90);
 assert(!issues(f,[...items,f]).length);
 assert.deepEqual(issues(items[0],[...items,f]).filter(m=>m.includes('線燈')),[],'the cabinet does not clash with its light');
});

test('a cabinet strip has no lamp: its light is painted on its face and on the board below it',()=>{
 const s=Object.create(SpaceScene.prototype);
 s.m=Object.fromEntries(['wood','fabric','white','accent','dark','metal','stone','glass','leaf','glow','lightWhite','lightNatural','lightWarm'].map(k=>[k,new THREE.MeshStandardMaterial()]));
 const items=[wardrobe()],f=on(items,[0,1,0],[0,-1,0]);
 Object.assign(s,{actions:new Map,items:[...items,f],lightObjects:[]});
 const g=new THREE.Group;g.position.set(f.x,0,f.z);g.rotation.y=f.rot*Math.PI/180;s.makeFurniture(g,f);g.updateMatrixWorld(true);
 const mine=s.lightObjects.filter(o=>o.f===f);
 assert.equal(mine.length,1);assert.ok(!mine[0].point,'no spot light');assert.equal(mine[0].glows.length,2,'a glow on its own face and a pool on the board below');
 assert.equal(g.children.filter(o=>o.isLight).length,0);
 const glows=g.children.filter(o=>o.isMesh&&mine[0].glows.includes(o.material)),box=new THREE.Box3();
 const levels=glows.map(m=>box.setFromObject(m).getCenter(new THREE.Vector3()).y).sort((a,b)=>a-b);
 assert.ok(Math.abs(levels[0]-(.018+.002))<.003,`pool on the board below at ${levels[0]}`);assert.ok(Math.abs(levels[1]-(1-.002))<.003,`glow under the board at ${levels[1]}`);
 for(const m of glows){box.setFromObject(m);assert.ok(box.min.x>=-.5+.018-1e-6&&box.max.x<=.5-.018+1e-6,'clipped to the cell between its side panels');}
});

test('a share link keeps where a cabinet light is mounted, its cabinet and cell renamed together',async()=>{
 const {encodeShare,decodeShare}=await import('../dist/share.js');
 const items=[wardrobe()],f=on(items,[0,1,0],[0,-1,0]),state={furniture:[...items,f]};
 const shared=await decodeShare(await encodeShare('A',state)),host=shared.state.furniture.find(o=>o.type==='wardrobe'),light=shared.state.furniture.find(o=>o.type==='light');
 assert.equal(light.lightMount,'under');assert.equal(light.supportId,host.id);
 assert.equal(light.supportCell,host.cabinetDesign.columns[0].cells[0].id);
 assert(near(light.offsetU,f.offsetU)&&near(light.offsetV,f.offsetV));
});

test('on a sliding-door cabinet the leaves are the front, and the strip lies on them',()=>{
 const items=[wardrobe({cabinetDesign:{template:'custom',columns:[{id:'c',width:1,bottom:0,cells:[{id:'all',height:2.2,front:'sliding'}]}]}})];
 const f=on(items,[0,1.5,.294],[0,0,1]);assert.equal(f.lightMount,'front','a leaf 6 mm inside the carcass is still the front');
 assert(near(stripPose(f,items[0]).centre[2],.3-.006+f.h/2));
});

test('a typed size stops at the edge of the face, shifted inside it as far as it needs',async()=>{
 const {fitCabinetLight}=await import('../dist/cabinet-light.js');
 const items=[wardrobe()],f=on(items,[.3,.5,-.282],[0,0,1]);
 const fit=fitCabinetLight(f,{...f,w:2},items);
 assert(fit.stopped);assert(near(fit.item.w,1-2*.018,1e-3),`width ${fit.item.w}`);assert.deepEqual(issues(fit.item,[...items,fit.item]),[]);
 const side=on(items,[-.5,1.5,0],[-1,0,0]),wide=fitCabinetLight(side,{...side,w:1.2},items);
 assert(wide.item.w<=.6+1e-9,'on a 60 cm deep side a lying strip stops at 60 cm');assert.deepEqual(issues(wide.item,[...items,wide.item]),[]);
 const fine=fitCabinetLight(f,{...f,w:.7},items);assert(!fine.stopped);assert.equal(fine.item.w,.7);
});

test('a light on a door moves with the door as it opens',()=>{
 const s=Object.create(SpaceScene.prototype);
 s.m=Object.fromEntries(['wood','fabric','white','accent','dark','metal','stone','glass','leaf','glow','lightWhite','lightNatural','lightWarm'].map(k=>[k,new THREE.MeshStandardMaterial()]));
 const host=wardrobe(),items=[host],f=on(items,[.25,1.6,.318],[0,0,1]);
 Object.assign(s,{actions:new Map,items:[host,f],lightObjects:[],groups:new Map});
 const hg=new THREE.Group,lg=new THREE.Group;s.makeFurniture(hg,host);s.makeFurniture(lg,f);lg.position.set(f.x,0,f.z);s.groups.set(host.id,hg).set(f.id,lg);
 const centre=()=>{lg.updateMatrixWorld(true);return new THREE.Box3().setFromObject(lg.children[0]).getCenter(new THREE.Vector3());};
 s.syncFrontLights();const closed=centre();assert(near(closed.x,f.x,1e-3)&&closed.x>0&&closed.z>.3,'closed: on the right leaf');
 const door=s.frontPart(f).part;door.pivot.rotation.y=-door.sign*Math.PI/2;
 s.syncFrontLights();const open=centre();
 assert(open.z>closed.z+.1,`swung out with the right leaf (${open.x.toFixed(3)}, ${open.z.toFixed(3)})`);
});

test('a strip on a leaf stays within that leaf, and the pointer just past its edge keeps it there',async()=>{
 const {stayOnFace,fitNewCabinetLight}=await import('../dist/cabinet-light.js');
 const items=[wardrobe()],f=fitNewCabinetLight({...on(items,[.25,1.5,.318],[0,0,1]),w:.3},items);
 assert(f.offsetU-f.w/2>=FRONT_LEFT-1e-6&&f.offsetU+f.w/2<=.5-.0015+1e-6,'inside the right leaf');
 const edge=stayOnFace(f,{x:.53,y:1.5,z:.318},items);assert(edge&&near(edge.offsetU+edge.w/2,.5-.0015,1e-6),'2 cm past the edge: stopped at it');
 assert.equal(stayOnFace(f,{x:.7,y:1.5,z:.318},items),null,'well past it: free to go elsewhere');
});

test('the ceiling seen from below takes a light though its face normal points up; spin carries over',()=>{
 const items=[wardrobe()],f={...on(items,[.25,1.5,.318],[0,0,1]),spin:90};
 const up=cabinetLightOnSurface(f,surface([2,3,2],[0,1,0],null),items);assert(up&&!cabinetLight(up)&&near(up.x,2));
 assert.equal(cabinetLightOnSurface(f,surface([2,0,2],[0,1,0],null),items),null,'not the floor');
 assert.equal(validateFurniture([cabinetLightOnSurface(f,surface([-.5,1.5,0],[-1,0,0]),items)])[0].spin,90,'a new face keeps the turn');
});

test('a new strip on a face too small for it takes the longest length that fits',async()=>{
 const {fitNewCabinetLight}=await import('../dist/cabinet-light.js');
 const items=[wardrobe()],f=fitNewCabinetLight(validateFurniture([cabinetLightOnSurface({...strip,w:1.2},surface([-.5,1.5,0],[-1,0,0]),items)])[0],items);
 assert(near(f.w,.6,1e-3)&&!issues(f,[...items,f]).length,`length ${f.w}`);
});

test('a light moved between a cabinet and the ceiling keeps the way it runs',()=>{
 const items=[validateFurniture([{...initialFurniture.find(f=>f.type==='wardrobe'),id:'w',x:0,z:0,w:1,d:.6,h:2.2,rot:90,openCells:{},cabinetDesign:{template:'custom',columns:[{id:'c',width:1,bottom:0,cells:[{id:'low',height:1,front:'open'},{id:'high',height:1.2,front:'double'}]}]}}])[0]];
 // Under the board, turned 90° in that face: it runs front to back, along world x for a cabinet turned 90°.
 const under=validateFurniture([{...cabinetLightOnSurface({...strip,w:.3},surface([0,1,0],[0,-1,0]),items),spin:90}])[0];
 const up=validateFurniture([cabinetLightOnSurface(under,surface([3,3,3],[0,1,0],null),items)])[0];
 assert(!cabinetLight(up));assert([0,180].includes(up.rot),`rot ${up.rot}`);
 const back=validateFurniture([cabinetLightOnSurface({...up,rot:0},surface([0,2.2,0],[0,1,0]),items)])[0];
 assert.equal(back.lightMount,'top');assert([90,270].includes(back.spin),`spin ${back.spin}`);
 const along=validateFurniture([cabinetLightOnSurface({...up,rot:90},surface([0,2.2,0],[0,1,0]),items)])[0];
 assert.equal(along.spin??0,0,'a ceiling light at 90° runs along this cabinet\'s width');
});
