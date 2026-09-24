import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SITE,towers,paintFacade,northFacade,eastFacade,corridor,facadeRelief,eastVents,facadeRecess,ringSideLayout} from '../dist/surroundings.js';
import {roofCanopyGeometry} from '../dist/facade-geometry.js';
import {walls,doors,HEIGHT,WALL_THICKNESS} from '../dist/model.js';
import {doorRects,doorLeaf,JAMB_WIDTH} from '../dist/spatial.js';
import {SpaceScene} from '../dist/scene.js';

test('neighbouring towers stand at the estimated distances and rise above the 14th floor',()=>{
 assert.equal(SITE.ground,-13*SITE.floorHeight);
 assert(Math.abs(northFacade-(SITE.northFace-18))<1e-9,'the tower opposite is 18 m north');
 assert(Math.abs(eastFacade-(SITE.eastFace+8))<1e-9,'the neighbour is 8 m east');
 for(const t of towers){
  assert(t.top>HEIGHT,t.id+' is taller than A7');
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
 // On the plan A6 and the A2 stair open right beside A7's end wall (about 1.2 m to their centres).
 for(const d of[at('north','A6'),at('south','A2 梯')])assert(corridor.x1-d.at<1.5,d.label+' sits next to A7\'s door');
});
test('the front door hinges on the south jamb and opens inward, handle on the right from inside',()=>{
 const entry=doors.find(d=>d.name==='玄關大門'),open=doorRects(entry,1,entry.maxAngle)[0],closed=doorRects(entry,0);
 assert(Math.abs(entry.z-8.53)<1e-9,'hinge at the south end of the opening');
 assert(open.x>entry.x,'swings into the flat');
 assert(closed[1].z<closed[0].z,'handle towards the north: the right-hand side facing the door from inside');
 const leaf=doorLeaf(entry);assert(leaf.x<=WALL_THICKNESS/2+.0021&&entry.width-JAMB_WIDTH/2-(leaf.x+leaf.width)<=.0021,'the leaf runs from the south wall face to the north jamb instead of leaving a see-through gap');
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

// A ray from A7 must reach the balcony's back wall farther away than its stone piers.
// This catches a solid tower box accidentally filling the newly recessed balcony space.
test('north balconies have real depth and east fixtures stay on the facing side',()=>{
 const s=Object.create(SpaceScene.prototype);
 Object.assign(s,{scene:new THREE.Scene(),mode:'walk',night:false,camera:{position:new THREE.Vector3()}});
 s.buildSurroundings();s.surroundings.updateMatrixWorld(true);
 const hit=(origin,direction)=>new THREE.Raycaster(new THREE.Vector3(...origin),new THREE.Vector3(...direction),0,30).intersectObjects(s.surroundings.children,true)[0];
 const bay=hit([1.8,1.8,0],[0,0,-1]),pier=hit([4.3,1.8,0],[0,0,-1]);
 assert(bay&&pier);
 assert(bay.distance-pier.distance>1.3,'balcony glazing is behind the projecting stone frame');
 const slit=hit([SITE.eastFace,1.5,4.89],[1,0,0]);
 const fitting=hit([SITE.eastFace,1.58,2.98],[1,0,0]);
 assert(slit&&fitting);
 assert(fitting.distance<slit.distance-.15,'small wall fixtures project towards A7');
 assert(slit.distance>7.8,'east window remains near the estimated eight-metre gap');
});


test('roof ornament lies horizontally and its elliptical openings are real holes',()=>{
 const spec=towers.find(t=>t.crown).crown,geo=roofCanopyGeometry(spec);
 geo.computeBoundingBox();const size=geo.boundingBox.getSize(new THREE.Vector3());
 assert(size.y<.3&&size.z>4,'thin roof plane, not a standing billboard');
 const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld();
 const ray=x=>new THREE.Raycaster(new THREE.Vector3(x,2,.12),new THREE.Vector3(0,-1,0)).intersectObject(mesh);
 const step=spec.w/spec.holes;
 for(let i=0;i<spec.holes;i++)assert.equal(ray(-spec.w/2+step*(i+.5)).length,0,'each hole admits a ray');
 assert(ray(-spec.w/2+.02).length>0,'solid edge remains around the holes');
});

test('rings face the alley, with three vent columns and a recessed platform stack to the east',()=>{
 const s=Object.create(SpaceScene.prototype);
 Object.assign(s,{scene:new THREE.Scene(),mode:'walk',night:false,camera:{position:new THREE.Vector3()}});
 s.buildSurroundings();s.surroundings.updateMatrixWorld(true);
 const rings=s.surroundings.getObjectByName('north-east-alley-rings'),tower=towers.find(t=>t.ringSide);
 assert(rings?.isInstancedMesh);rings.geometry.computeBoundingBox();
 const size=rings.geometry.boundingBox.getSize(new THREE.Vector3());
 assert(size.x<.11&&size.z>1.9,'ring plane faces west, not south');
 const matrix=new THREE.Matrix4,position=new THREE.Vector3;
 for(let i=0;i<rings.count;i++){rings.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);assert(position.x<tower.x0,'all rings sit on the alley-facing wall');assert(Math.abs(position.z-(tower.z0+tower.z1-facadeRecess(tower))/2)<1e-5,'rings are centred on the exposed side wall, not next to its front edge');}
 const east=towers.find(t=>t.style==='endwall');
 const vents=facadeRelief(east).filter(p=>p.kind==='wall-fitting');
 assert.equal(new Set(vents.map(p=>p.u)).size,3);
 assert.deepEqual([...new Set(vents.map(p=>p.u))],eastVents);
 assert.equal(vents.length,3*Math.round((east.top-SITE.ground)/SITE.floorHeight),'three fittings on each storey');
 const ray=z=>new THREE.Raycaster(new THREE.Vector3(SITE.eastFace,1.8,z),new THREE.Vector3(1,0,0),0,20).intersectObjects(s.surroundings.children,true)[0];
 assert(ray(11).distance>ray(5).distance+1,'right-hand platforms are set back from the wall facing A7');
 const paint=paintFacade(east,east.z1-east.z0,east.top-SITE.ground);
 const pixel=u=>paint.albedo.slice((Math.floor(paint.height*.013)*paint.width+Math.floor(u/(east.z1-east.z0)*paint.width))*4).slice(0,3);
 const pale=pixel(1),warm=pixel(4);
 assert(pale[0]>warm[0]+25&&pale[1]>warm[1]+25,'central tiled strip is visibly darker than flanking tiles');
});


test('central ring band has a recessed window stack on each side',()=>{
 const t=towers.find(t=>t.ringSide),width=t.z1-t.z0-facadeRecess(t),height=t.top-SITE.ground;
 const {a,b,centre,bays}=ringSideLayout(width,t.ringSide.width);
 assert.equal(centre,width/2);assert(Math.abs(a-(width-b))<1e-8);
 assert(bays[0][1]<a&&bays[1][0]>b,'window stacks flank the centre band');
 const paint=paintFacade(t,width,height,'ring-side');
 const average=(left,right)=>{let sum=0,n=0;const row=Math.floor(1.3/height*paint.height);for(let x=Math.ceil(left/width*paint.width);x<right/width*paint.width;x++){sum+=paint.albedo[(row*paint.width+x)*4];n++;}return sum/n;};
 for(const [left,right]of bays)assert(average(left+.3,right-.3)<80,'broad dark opening on each side');
 assert(average(a-.4,a-.1)>100&&average(b+.1,b+.4)>100,'stone frames border both sides of the central strip');
 const side=facadeRelief({...t,style:'ring-side',faces:'west',z1:t.z1-facadeRecess(t)});
 const blades=side.filter(p=>p.kind==='side-floor-blade');
 assert.equal(blades.length,2*Math.round(height/SITE.floorHeight));
 assert(blades.some(p=>p.u<a)&&blades.some(p=>p.u>b),'projecting floor blades exist on both sides');
});

test('neighbours\' front-door handles follow the plan\'s swing arcs',()=>{
 const side=Object.fromEntries(corridor.doors.filter(d=>d.kind==='unit').map(d=>[d.label,d.handle]));
 assert.deepEqual(side,{A6:'left',A5:'right',A1:'left',A3:'right',A2:'left',A8:'right'});
});
