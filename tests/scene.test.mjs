import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {SpaceScene,floorBoardRects,ceilingOccluders,beamVisiblePieces,beamGeometry,resizeCursor,ceilingBounce,linearLightCount} from '../dist/scene.js';
import {initialFurniture,minimums,wallRects,overlaps,WALL_THICKNESS,HEIGHT} from '../dist/model.js';
function fixture(){const s=Object.create(SpaceScene.prototype);s.m=Object.fromEntries(['wood','fabric','white','accent','dark','metal','stone','glass','leaf','glow','lightWhite','lightNatural','lightWarm'].map(k=>[k,new THREE.MeshStandardMaterial()]));s.actions=new Map;s.lightObjects=[];s.resizeHandles=new THREE.Group;s.collisionWalls=wallRects();s.items=[];s.invalidHelpers=new Map;s.invalidMarkers=new Map;s.foregroundDraft=null;return s;}
test('every furniture type generates finite geometry at initial and minimum dimensions',()=>{const s=fixture();for(const f of initialFurniture)for(const dims of[[f.w,f.d,f.h],minimums[f.type]]){const g=new THREE.Group;s.makeFurniture(g,{...f,w:dims[0],d:dims[1],h:dims[2]});assert(g.children.length>0);g.traverse(o=>{if(o.geometry){const a=o.geometry.attributes.position.array;for(const n of a)assert(Number.isFinite(n),f.name);o.geometry.computeBoundingBox();assert(!o.geometry.boundingBox.isEmpty(),f.name);}});}});
test('cabinet resized parts and animation pivots share updated dimensions',()=>{const s=fixture(),g=new THREE.Group;const f={...initialFurniture.find(f=>f.type==='wardrobe'),doorStyle:'double',w:1.8,d:.7,h:2.5};s.makeFurniture(g,f);const a=s.actions.get(f.id);assert.equal(a.pivots.length,2);assert.equal(a.base,.35);assert.equal(a.item.h,2.5);assert.equal(a.pivots[0].position.y,1.25);});
test('floor boards stay clear of wall thickness at the exposed master edge',()=>{const boards=floorBoardRects(),walls=wallRects();assert(boards.length>0);for(const board of boards)for(const wall of walls)assert.equal(overlaps(board,wall),false,`${board.x},${board.z} crosses ${wall.x},${wall.z}`);});
test('both shower enclosures expose a hinged glass-door action',()=>{const s=fixture();for(const f of initialFurniture.filter(f=>f.type==='shower')){const g=new THREE.Group;s.makeFurniture(g,f);const action=s.actions.get(f.id);assert.equal(action.type,'shower');assert(action.pivot.children.length>=5);assert.equal(action.item,f);}});
test('ceiling light intensity follows lumens, dimming, size and switch state',()=>{const s=Object.create(SpaceScene.prototype),f={lumens:1200,dimming:75,w:.24,d:.24,on:true},point={intensity:0};s.hemi={intensity:0};s.sun={intensity:0};s.scene={background:{set(){}}};s.lightObjects=[{f,point}];s.night=false;s.lightsOn=true;s.updateLight();assert.equal(point.intensity,.24);f.dimming=50;f.lumens=2400;f.w=.48;f.d=.48;s.night=true;s.updateLight();assert.equal(point.intensity,1.92);s.lightsOn=false;s.updateLight();assert.equal(point.intensity,0);});
test('each lamp lens follows its own dimmer and switch, including the global switch',()=>{
 const s=fixture(),kinds=['ceiling','pendant','linear'],groups=[],lamps=[];
 for(const kind of kinds){
  const f={...initialFurniture.find(item=>item.type==='light'),id:'lens-'+kind,lightKind:kind,dimming:100,on:true};
  const g=new THREE.Group;s.makeFurniture(g,f);groups.push(g);lamps.push(f);
 }
 const lenses=lamps.map(f=>s.lightObjects.find(o=>o.f===f).lens);
 assert.equal(new Set(lenses).size,3,'fixtures do not share a mutable lens material');
 Object.assign(s,{hemi:{intensity:0},sun:{intensity:0},scene:{background:{set(){}}},night:true,lightsOn:true});
 s.updateLight();const full=lenses[0].emissiveIntensity;
 assert(full>0&&lenses.every(lens=>lens.emissiveIntensity===full));
 lamps[0].dimming=25;s.updateLight();
 assert(lenses[0].emissiveIntensity>0&&lenses[0].emissiveIntensity<full);
 assert.equal(lenses[1].emissiveIntensity,full,'another fixture stays at full brightness');
 lamps[1].on=false;s.updateLight();
 assert.equal(lenses[1].emissiveIntensity,0);assert.equal(lenses[1].color.getHexString(),'8d9295');
 lamps[0].dimming=0;s.updateLight();assert.equal(lenses[0].emissiveIntensity,0);
 s.lightsOn=false;s.updateLight();assert(lenses.every(lens=>lens.emissiveIntensity===0));
 let disposed=false;lenses[0].addEventListener('dispose',()=>{disposed=true});s.clearGroup(groups[0]);assert(disposed,'fixture material is released with its mesh');
});
test('light models use the selected colour temperature and cutaway hides beams only in orbit view',()=>{const s=fixture(),g=new THREE.Group,f={...initialFurniture.find(item=>item.type==='light'),colorTemperature:'warm'};s.makeFurniture(g,f);const point=g.children.find(item=>item.isSpotLight);assert.equal(point.color.getHexString(),'ffc26f');const beam={id:'beam',type:'beam'},beamGroup=new THREE.Group,selection={visible:true};Object.assign(s,{mode:'orbit',items:[beam],groups:new Map([[beam.id,beamGroup]]),selected:beam.id,selection,wallMeshes:[],ceiling:{visible:false},curtains:[]});s.setCutaway(true);assert.equal(beamGroup.visible,false);assert.equal(selection.visible,false);s.setCutaway(false);assert.equal(beamGroup.visible,true);assert.equal(selection.visible,true);});
test('walking collides with furniture and extended drawers',()=>{const s=fixture(),f={...initialFurniture.find(f=>f.type==='drawer'),x:1,z:3,w:.5,d:.5,h:.5};s.items=[f];s.avoidFurniture=true;s.actions.set(f.id,{type:'cabdrawer',item:f,amount:1,travel:.4});assert(!s.canWalk(1,3));assert(!s.canWalk(1,3.5));assert(s.canWalk(.6,3.7));});
test('draft furniture has a strong red editor marker and is hidden outside top view',()=>{const s=fixture(),f={...initialFurniture[0],draft:true},g=new THREE.Group;g.add(new THREE.Mesh(new THREE.BoxGeometry(f.w,f.h,f.d)));s.scene=new THREE.Scene;s.groups=new Map([[f.id,g]]);s.items=[f];s.selected=null;s.selection=null;s.mode='top';s.scene.add(g);s.refreshValidity();const marker=s.invalidMarkers.get(f.id);assert.equal(g.visible,true);assert.equal(s.invalidHelpers.get(f.id).visible,true);assert.equal(marker.visible,true);assert.equal(marker.children.length,5);assert(marker.children[0].material.opacity>=.3);s.setForegroundDraft(f.id);assert(g.position.y>0);assert(marker.position.y>g.position.y+f.h);s.mode='orbit';s.refreshValidity();assert.equal(g.visible,false);assert.equal(marker.visible,false);assert.equal(g.position.y,0);f.draft=false;s.refreshValidity();assert.equal(g.visible,true);assert.equal(s.invalidHelpers.has(f.id),false);assert.equal(s.invalidMarkers.has(f.id),false);});

test('top picking prioritizes the most recently moved interfering furniture',()=>{globalThis.document={pointerLockElement:null};const s=fixture(),large=new THREE.Group,small=new THREE.Group,largeMesh=new THREE.Mesh,smallMesh=new THREE.Mesh;large.userData.furniture='large';small.userData.furniture='small';large.add(largeMesh);small.add(smallMesh);Object.assign(s,{mode:'top',foregroundDraft:'small',host:{getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})},renderer:{domElement:{}},pointer:new THREE.Vector2,topCamera:new THREE.OrthographicCamera,furniture:new THREE.Group,building:new THREE.Group});s.ray={setFromCamera(){},intersectObjects:()=>[{object:largeMesh},{object:smallMesh}]};assert.deepEqual(s.pick({clientX:50,clientY:50}),{kind:'furniture',id:'small'});});
test('left, right and paired cabinet meshes use their selected hinges',()=>{const s=fixture();for(const doorStyle of ['left','right','double']){const f={...initialFurniture.find(f=>f.type==='wardrobe'),doorStyle},g=new THREE.Group;s.makeFurniture(g,f);const a=s.actions.get(f.id);assert.equal(a.pivots.length,doorStyle==='double'?2:1);for(const p of a.pivots){assert.equal(Math.sign(p.position.x),p.userData.swing);p.rotation.y=p.userData.swing*Math.PI/2;p.updateMatrixWorld(true);const slab=p.children[0],center=slab.getWorldPosition(new THREE.Vector3);assert(center.z>f.d/2);}}});

test('beams keep their full box when clear of walls and lose the part hidden inside a full-height wall',()=>{
  const area=pieces=>pieces.reduce((sum,piece)=>sum+Math.abs(piece.reduce((s,p,i)=>{const q=piece[(i+1)%piece.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2),0);
  const wall=ceilingOccluders().find(r=>r.bottom===0&&r.w>6);
  assert(wall,'expected a long full-height wall');
  const a=wall.rot*Math.PI/180,nx=Math.sin(a),nz=Math.cos(a),d=.3;
  const flush={id:'beam-flush',type:'beam',name:'樑',w:1,d,h:.4,rot:wall.rot,x:wall.x+nx*(WALL_THICKNESS/2-d/2),z:wall.z+nz*(WALL_THICKNESS/2-d/2)};
  const hidden=beamVisiblePieces(flush);
  assert(Math.abs(area(hidden)-flush.w*(d-WALL_THICKNESS))<1e-9,'only the part beyond the wall remains');
  for(const piece of hidden)for(const [,z] of piece)assert(z<=d/2-WALL_THICKNESS+1e-9,'no remaining vertex lies inside the wall');
  const geo=beamGeometry(flush,hidden),normals=geo.getAttribute('normal');
  for(let i=0;i<normals.count;i++)assert.notDeepEqual([normals.getX(i),normals.getY(i),normals.getZ(i)],[0,0,1],'no face is emitted along the cut wall face');
  const free={...flush,x:flush.x+nx*.5,z:flush.z+nz*.5};
  const whole=beamVisiblePieces(free);
  assert.equal(whole.length,1);
  assert(Math.abs(area(whole)-free.w*free.d)<1e-9);
});

test('a beam overhanging a wall face by a sub-millimetre remainder is drawn flush, leaving no hairline strip',()=>{
  // Exported layout from the user: dragged and resized so its face sits 0.2 mm proud of the bedroom A wall.
  const f={id:'beam-user',type:'beam',x:1.9339639913623,z:2.784,w:3.7479279827245997,d:0.11238817957503189,h:.2,rot:0};
  const pieces=beamVisiblePieces(f),wallFace=2.78+WALL_THICKNESS/2;
  assert(Math.abs(f.z+pieces.bounds[3]-wallFace)<1e-9,'the proud face snaps onto the wall face');
  for(const piece of pieces){const zs=piece.map(v=>v[1]);assert(Math.max(...zs)-Math.min(...zs)>.005,'no sub-5 mm strip survives the cut');}
  const normals=beamGeometry(f,pieces).getAttribute('normal');
  assert([...Array(normals.count).keys()].some(i=>normals.getZ(i)===1),'the visible part past the wall end keeps its front face');
});

test('clipped beams keep a full top face so top view still shows them over walls',()=>{
  const f={id:'beam-user',type:'beam',x:1.9339639913623,z:2.784,w:3.7479279827245997,d:0.11238817957503189,h:.2,rot:0};
  const pieces=beamVisiblePieces(f),[x0,x1,z0,z1]=pieces.bounds,geo=beamGeometry(f,pieces),pos=geo.getAttribute('position'),nor=geo.getAttribute('normal');
  let topArea=0;
  for(let i=0;i<pos.count;i+=3){
    if(nor.getY(i)!==1)continue;
    const ax=pos.getX(i+1)-pos.getX(i),az=pos.getZ(i+1)-pos.getZ(i),bx=pos.getX(i+2)-pos.getX(i),bz=pos.getZ(i+2)-pos.getZ(i);
    assert(ax*bz-az*bx<0,'top triangles face up');
    topArea+=Math.abs(ax*bz-az*bx)/2;
  }
  assert(Math.abs(topArea-(x1-x0)*(z1-z0))<1e-6,'the top spans the whole beam, including where a wall hides the rest');
});

test('beams hang exactly their entered depth below the ceiling',()=>{
  for(const f of[{id:'beam-free',type:'beam',x:1.4,z:3.3,w:1.6,d:.3,h:.2,rot:0},{id:'beam-user',type:'beam',x:1.9339639913623,z:2.784,w:3.7479279827245997,d:0.11238817957503189,h:.2,rot:0}]){
    const s=Object.create(SpaceScene.prototype),g=new THREE.Group;s.m={wall:new THREE.MeshStandardMaterial()};s.actions=new Map();
    s.makeFurniture(g,f);
    const beam=g.children.find(o=>o.isMesh&&o.material===s.m.wall);beam.geometry.computeBoundingBox();
    const box=beam.geometry.boundingBox;
    assert(Math.abs(beam.position.y+box.min.y-(HEIGHT-f.h))<1e-6,f.id+' bottom');
    assert(Math.abs(beam.position.y+box.max.y-HEIGHT)<1e-6,f.id+' top');
  }
});

test('moving a beam rebuilds its clipped geometry',()=>{
  const s=Object.create(SpaceScene.prototype),f={id:'beam-move',type:'beam'},calls=[];
  s.groups=new Map([[f.id,{}]]);
  s.resizeItem=item=>calls.push(item);s.updateBeamVisibility=()=>{};s.updateResizeHandles=()=>{};
  s.moveItem(f);
  assert.deepEqual(calls,[f]);
});
test('a linear light is a flush ceiling bar lit by up to three downlights sharing its output',()=>{
 assert.deepEqual([.3,1.2,1.8,3.6].map(linearLightCount),[1,2,3,3]);
 const s=fixture(),g=new THREE.Group,f={...initialFurniture.find(item=>item.type==='light'),id:'linear',lightKind:'linear',w:1.8,d:.04,h:.03,lumens:1200,dimming:100};
 s.makeFurniture(g,f);
 const spots=g.children.filter(o=>o.isSpotLight);assert.equal(spots.length,3);assert.equal(g.children.filter(o=>o.isPointLight&&!o.isSpotLight).length,0);
 for(const spot of spots)assert(spot.target.position.y<spot.position.y-1&&Math.abs(spot.target.position.x-spot.position.x)<1e-9,'aims straight down');
 const bar=g.children.find(o=>o.isMesh&&o.material.userData.fixtureLens);bar.geometry.computeBoundingBox();
 assert(Math.abs(bar.position.y+bar.geometry.boundingBox.max.y-HEIGHT)<1e-6,'bar sits flush with the ceiling');
 Object.assign(s,{hemi:{intensity:0},sun:{intensity:0},scene:{background:{set(){}}},night:true,lightsOn:true});s.updateLight();
 const total=spots.reduce((sum,p)=>sum+p.intensity,0),single={...f,lightKind:'ceiling',w:.24,d:.24},one={intensity:0,isSpotLight:true};s.lightObjects=[{f:single,point:one}];s.updateLight();
 assert(Math.abs(total-one.intensity)<1e-9,'splitting keeps the total output of a standard lamp');
});
test('resize cursors point across the grabbed edge for any rotation',()=>{
 const f={rot:0};assert.equal(resizeCursor(f,'w'),'ew-resize');assert.equal(resizeCursor(f,'d'),'ns-resize');
 f.rot=90;assert.equal(resizeCursor(f,'w'),'ns-resize');assert.equal(resizeCursor(f,'d'),'ew-resize');
 f.rot=45;assert.equal(resizeCursor(f,'w'),'nesw-resize');assert.equal(resizeCursor(f,'d'),'nwse-resize');
});
test('a shadowless fill light separates wall orientations by day and dims at night',()=>{
 const s=Object.create(SpaceScene.prototype);Object.assign(s,{hemi:{intensity:0},sun:{intensity:0},fill:{intensity:0},scene:{background:{set(){}}},lightObjects:[],lightsOn:true,night:false});
 s.updateLight();assert(s.fill.intensity>.5);const day=s.fill.intensity;s.night=true;s.updateLight();assert(s.fill.intensity<day/5);
});
test('flush ceiling lights aim a downlight at the floor while pendants keep a point source',()=>{
 const s=fixture(),base=initialFurniture.find(item=>item.type==='light');
 for(const shape of['round','square']){const g=new THREE.Group;s.makeFurniture(g,{...base,shape});
  const spots=g.children.filter(o=>o.isSpotLight);assert.equal(spots.length,1,shape);
  assert(spots[0].position.y<HEIGHT-base.h+1e-6,shape+' sits at the diffuser, below the ceiling');
  assert(spots[0].target.position.y<1e-9,shape+' aims at the floor');assert(spots[0].angle<Math.PI/2,shape+' cannot reach the ceiling');}
 const pendant=new THREE.Group;s.makeFurniture(pendant,{...base,lightKind:'pendant'});
 assert.equal(pendant.children.filter(o=>o.isPointLight&&!o.isSpotLight).length,1);
});
test('switched-off lights drop out of shading',()=>{
 const s=Object.create(SpaceScene.prototype),lamp={type:'light',lightKind:'ceiling',lumens:1200,dimming:75,on:true,w:.24,d:.24},on={intensity:0,visible:true},off={intensity:0,visible:true};
 Object.assign(s,{hemi:{intensity:0},sun:{intensity:0},scene:{background:{set(){}}},lightObjects:[{f:lamp,point:on},{f:{...lamp,on:false},point:off}],lightsOn:true,night:false});
 s.updateLight();assert.equal(on.visible,true);assert.equal(off.visible,false);
 s.lightsOn=false;s.updateLight();assert.equal(on.visible,false);
});
test('at night the ceiling gets bounce light that follows the lamps switched on',()=>{
 const lamp={type:'light',lightKind:'ceiling',lumens:1200,dimming:100,on:true,w:.24,d:.24};
 assert.equal(ceilingBounce([]),0);assert(Math.abs(ceilingBounce([lamp,lamp])-.24)<1e-9);assert.equal(ceilingBounce(Array(20).fill(lamp)),1);
 const s=Object.create(SpaceScene.prototype);Object.assign(s,{hemi:{intensity:0},sun:{intensity:0},fill:{intensity:0},bounce:{intensity:0},scene:{background:{set(){}}},lightObjects:[{f:lamp,point:{intensity:0}},{f:{...lamp,on:false},point:{intensity:0}}],lightsOn:true,night:true});
 s.updateLight();assert(Math.abs(s.bounce.intensity-.12)<1e-9,'only the switched-on lamp counts');
 s.lightsOn=false;s.updateLight();assert.equal(s.bounce.intensity,0);
 s.lightsOn=true;s.night=false;s.updateLight();assert.equal(s.bounce.intensity,0,'daylight already reaches the ceiling');
});
test('only switched-on lamps cast shadows, daylight casts none, and shadows are redrawn only after a change',()=>{
 const s=fixture(),g=new THREE.Group,lamp={...initialFurniture.find(item=>item.type==='light'),dimming:75,on:true};
 s.makeFurniture(g,lamp);const spot=g.children.find(o=>o.isSpotLight);assert.equal(spot.castShadow,true);
 Object.assign(s,{hemi:{intensity:0},sun:{intensity:0},scene:{background:{set(){}}},lightsOn:true,night:false,shadowsDirty:false});
 lamp.on=false;s.updateLight();assert.equal(spot.castShadow,false,'a switched-off lamp casts nothing');assert.equal(s.shadowsDirty,true,'relighting marks shadows stale');
 lamp.on=true;s.updateLight();assert.equal(spot.castShadow,true);
 const pendant=new THREE.Group;s.makeFurniture(pendant,{...lamp,lightKind:'pendant'});assert.equal(pendant.children.find(o=>o.isPointLight).castShadow,true);
 const shadowMap={needsUpdate:false};Object.assign(s,{renderer:{shadowMap,render(){}},mode:'top',clock:{getDelta:()=>.016},actions:new Map,activeCameraOverride:null,shadowsDirty:false});
 Object.defineProperty(s,'activeCamera',{get:()=>null});
 s.frame();assert.equal(shadowMap.needsUpdate,false,'an unchanged frame reuses the shadow maps');
 s.shadowsDirty=true;s.frame();assert.equal(shadowMap.needsUpdate,true);assert.equal(s.shadowsDirty,false);
});
test('shadow-casting lamps stay within the texture budget, nearest to the view first',()=>{
 const s=fixture(),lamps=[];
 for(let i=0;i<20;i++){const g=new THREE.Group;g.position.set(i*.5,0,0);g.updateMatrixWorld();s.makeFurniture(g,{...initialFurniture.find(item=>item.type==='light'),id:'l'+i,on:true,dimming:75});g.updateMatrixWorld(true);lamps.push(g);}
 Object.assign(s,{hemi:{intensity:0},sun:{intensity:0},scene:{background:{set(){}}},lightsOn:true,night:true,mode:'walk',camera:{position:new THREE.Vector3(9.5,1.6,0)},renderer:{capabilities:{maxTextures:16}}});
 s.updateLight();
 const casting=s.lightObjects.filter(({point})=>point.castShadow);
 assert.equal(casting.length,8,'16 texture units leave room for 8 lamp shadows');
 assert(casting.every(({point})=>point.getWorldPosition(new THREE.Vector3()).x>=6-1e-9),'the lamps nearest the camera cast');
 s.camera.position.set(0,1.6,0);s.shadowsDirty=false;s.assignLampShadows();
 assert.equal(s.lightObjects.filter(({point})=>point.castShadow).length,8,'the count never changes, so shaders are not rebuilt');
 assert(s.lightObjects.filter(({point})=>point.castShadow).every(({point})=>point.getWorldPosition(new THREE.Vector3()).x<=3.5+1e-9));
 assert.equal(s.shadowsDirty,true);
 s.renderer.capabilities.maxTextures=8;s.assignLampShadows();assert.equal(s.lightObjects.filter(({point})=>point.castShadow).length,0,'a small GPU gets no lamp shadows rather than missing furniture');
});
test('indoor light from above is not much brighter than light from below, so floors keep their colour',()=>{
 const s=Object.create(SpaceScene.prototype),hemi=new THREE.HemisphereLight(0xc4c8d0,0xb8ae9f,1);
 Object.assign(s,{hemi:{intensity:0},sun:{intensity:0},fill:{intensity:0},scene:{background:{set(){}}},lightObjects:[],lightsOn:true,night:false});
 s.updateLight();assert(s.sun.intensity<=1,'no strong light through the roof');
 const src=readFileSync(new URL('../dist/scene.js',import.meta.url),'utf8'),m=src.match(/new T\.HemisphereLight\((0x[0-9a-f]+),(0x[0-9a-f]+)/);
 const lum=c=>{const col=new THREE.Color(Number(c));return .2126*col.r+.7152*col.g+.0722*col.b;};
 assert(lum(m[1])/lum(m[2])<1.5,'sky term close to the bounce term (it was 4.5 when floors washed out)');
});

test('a modular cabinet door covers its whole cell and sits on the carcass face',()=>{
 const s=fixture(),g=new THREE.Group;
 const f={...initialFurniture.find(f=>f.type==='wardrobe'),id:'overlay',x:0,z:0,w:.6,d:.5,h:2.4,rot:0};
 f.cabinetDesign={template:'custom',columns:[{id:'c',width:.6,bottom:0,cells:[{id:'low',height:1.2,front:'left'},{id:'high',height:1.2,front:'open'}]}]};
 s.makeFurniture(g,f);g.updateMatrixWorld(true);
 const [part]=s.actions.get('overlay').parts,box=new THREE.Box3().setFromObject(part.pivot);
 const gap=.003,near=(a,b)=>Math.abs(a-b)<1e-6;
 assert(near(box.min.x,-.3+gap/2)&&near(box.max.x,.3-gap/2),`door spans ${box.min.x}..${box.max.x}`);
 assert(near(box.min.y,gap/2)&&near(box.max.y,1.2-gap/2),`door rises ${box.min.y}..${box.max.y}`);
 assert(near(box.min.z,f.d/2),'door back rests on the carcass front');
});

test('sliding leaves run inside the carcass and drawers carry a body that fits when closed',()=>{
 const s=fixture(),g=new THREE.Group,t=.018;
 const f={...initialFurniture.find(f=>f.type==='wardrobe'),id:'inset',x:0,z:0,w:.8,d:.5,h:2,rot:0};
 f.cabinetDesign={template:'custom',columns:[{id:'c',width:.8,bottom:0,cells:[{id:'drawer',height:.4,front:'drawers'},{id:'slide',height:1.6,front:'sliding'}]}]};
 s.makeFurniture(g,f);g.updateMatrixWorld(true);
 const parts=s.actions.get('inset').parts,eps=1e-6;
 const slides=parts.filter(p=>p.kind==='slide');
 assert.equal(slides.length,2);
 for(const part of slides){
  const box=new THREE.Box3().setFromObject(part.pivot);
  assert(box.min.x>=-.4+t-eps&&box.max.x<=.4-t+eps,'leaf stays between the side panels');
  assert(box.max.z<=f.d/2+eps,'leaf stays behind the carcass front');
  assert(box.min.y>=.4+t-eps&&box.max.y<=2-t+eps,'leaf stays between bottom and top boards');
 }
 const moved=slides.filter(p=>p.travel!==0);
 assert.equal(moved.length,1,'only the rear leaf moves, so opening reveals half the cell');
 assert(Math.abs(moved[0].base+moved[0].travel-slides.find(p=>p.travel===0).base)<eps,'rear leaf ends behind the front leaf');
 const drawer=parts.find(p=>p.kind==='drawer'),body=new THREE.Box3();
 for(const piece of drawer.pivot.children.slice(2))body.expandByObject(piece);
 assert(drawer.pivot.children.length>2,'drawer has a body behind its front');
 assert(body.min.z>=-f.d/2+t-eps,'closed drawer body clears the back panel');
 assert(body.min.y>=t-eps,'drawer body sits above the bottom board');
});

test('cabinet finishes resolve cell, then cabinet-wide, then the cabinet finish',()=>{
 const s=fixture(),g=new THREE.Group,[whole,doors,own,backs]=['P86','A07','B18','B35'];
 const f={...initialFurniture.find(f=>f.type==='wardrobe'),id:'parts',x:0,z:0,w:.8,d:.5,h:2,rot:0,finish:whole,partFinishes:{doors,backs}};
 f.cabinetDesign={template:'custom',columns:[{id:'c',width:.8,bottom:0,cells:[{id:'a',height:.6,front:'drawers'},{id:'b',height:1.4,front:'left',finishes:{door:own,shelf:own}}]}]};
 s.makeFurniture(g,f);
 const [drawer,door]=s.actions.get('parts').parts,leaf=part=>part.pivot.children[0].material;
 assert.equal(leaf(drawer),s.finishMaterial(doors),'a drawer front is a door');
 assert.equal(leaf(door),s.finishMaterial(own),'a cell finish overrides all doors');
 assert.equal(drawer.pivot.children[2].material,s.finishMaterial(whole),'an unset drawer box follows the cabinet finish');
 const meshes=g.children.filter(m=>m.isMesh),size=m=>m.geometry.parameters;
 const backsFound=meshes.filter(m=>Math.abs(size(m).depth-.018)<1e-9&&m.position.z<0);
 assert.equal(backsFound.length,2,'one back panel per cell');
 assert.ok(backsFound.every(m=>m.material===s.finishMaterial(backs)));
 const boards=meshes.filter(m=>Math.abs(size(m).height-.018)<1e-9&&Math.abs(size(m).depth-.5)<1e-9);
 const shelf=boards.find(m=>Math.abs(m.position.y-(.6+.009))<1e-6),bottom=boards.find(m=>Math.abs(m.position.y-.009)<1e-6);
 assert.equal(shelf.material,s.finishMaterial(own),'the board under a cell is its shelf');
 assert.equal(bottom.material,s.finishMaterial(whole),'the lowest board is body');
 const side=meshes.find(m=>Math.abs(size(m).width-.018)<1e-9&&Math.abs(size(m).depth-.5)<1e-9);
 assert.equal(side.material,s.finishMaterial(whole));
});
