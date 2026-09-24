import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {roofCanopyGeometry,sideRingGeometry} from './facade-geometry.js';
import {BOARD,finishByCode,finishPixels} from './finishes.js';
import {flooringByCode,flooringPixels} from './floorings.js';
import {SITE,towers,paintFacade,paintMarble,corridor,eastFacade,northFacade,facadeRelief,eastPlatforms,facadeRecess,ringSideLayout} from './surroundings.js';
import {HEIGHT,WALL_THICKNESS,outline,rooms,walls,doors,curtains,palettes,inside,wallRects,overlaps,wallJoints,structuralSolids,normalizeKitchenParts,normalizeSinkBasin,normalizeLight,normalizeFabric,lightMountDrop} from './model.js';
import {doorRects,doorLeaf,JAMB_WIDTH,fixedDoorLimit,pointClear,findRoute,roomAt,blocksCamera,cabinetLayout,cabinetRects,showerDoorLayout,resizeAtHandle} from './spatial.js';
const BEAM_FLUSH_SNAP=.005;
// A flush fitting sends all of its light downward and glows like a panel, so straight below
// it is several times brighter than under a bare bulb of the same output.
const DOWNLIGHT_GAIN=3;
// Every unit's front door on the floor shares one finish, A7's included.
const ENTRY_DOOR='#5f4d40';
// Only lamps cast shadows; daylight is soft sky light with none. Lamp shadow maps are
// redrawn only when something changes (see markShadows), not on every frame.
function lampShadow(light,size){light.castShadow=true;light.shadow.mapSize.set(size,size);light.shadow.camera.near=.05;light.shadow.camera.far=6;light.shadow.bias=-.0005;light.shadow.normalBias=.02;}
// A linear light gets a downlight about every 60 cm, at most three, sharing its lumens.
export const linearLightCount=length=>Math.max(1,Math.min(3,Math.round(length/.6)));
// Night-time ceiling bounce, in proportion to the lamps switched on (1200 lm at 100% = 1).
export const ceilingBounce=lights=>Math.min(1,.12*lights.reduce((sum,light)=>sum+light.lumens/1200*light.dimming/100,0));
// Board finishes map one 122 x 244 cm board onto every face at true scale, grain running
// along the face's longer side, with a per-panel offset so neighbouring panels differ.
export function boardUV(geo,offset=[0,0]){
  const pos=geo.attributes.position,nor=geo.attributes.normal,uv=geo.attributes.uv;geo.computeBoundingBox();const size=geo.boundingBox.getSize(new T.Vector3());
  for(let i=0;i<pos.count;i++){
    const nx=Math.abs(nor.getX(i)),ny=Math.abs(nor.getY(i)),nz=Math.abs(nor.getZ(i));
    let [a,b,ea,eb]=nx>=ny&&nx>=nz?[pos.getZ(i),pos.getY(i),size.z,size.y]:ny>=nz?[pos.getX(i),pos.getZ(i),size.x,size.z]:[pos.getX(i),pos.getY(i),size.x,size.y];
    if(ea>eb)[a,b]=[b,a];
    uv.setXY(i,a/BOARD.w+offset[0],b/BOARD.h+offset[1]);
  }
  uv.needsUpdate=true;return geo;
}
export const resizeCursor=(f,axis)=>{const a=f.rot*Math.PI/180,[dx,dy]=axis==='w'?[Math.cos(a),-Math.sin(a)]:[Math.sin(a),Math.cos(a)],angle=((Math.atan2(dy,dx)*180/Math.PI)%180+180)%180;return angle<22.5||angle>=157.5?'ew-resize':angle<67.5?'nwse-resize':angle<112.5?'ns-resize':'nesw-resize';};
// A beam may run inside a wall. Its hidden faces then sit exactly on the wall's
// visible face, and their edges poke through as a dashed seam; a depth offset
// only moves the seam to the wall corner. So the part of a beam hidden by a solid
// that covers its full height is cut away, and no face is emitted along the cut.
export function ceilingOccluders(){
  const rects=walls.flatMap(w=>{
    const dx=w.b[0]-w.a[0],dz=w.b[1]-w.a[1],len=Math.hypot(dx,dz),rot=-Math.atan2(dz,dx)*180/Math.PI;
    const spans=w.opening?[[0,w.opening[0],0],[w.opening[0]+w.opening[1],len,0],[w.opening[0],w.opening[0]+w.opening[1],w.opening[2]+w.opening[3]]]:[[0,len,0]];
    return spans.filter(([a,b,bottom])=>b-a>.005&&bottom<HEIGHT).map(([a,b,bottom])=>({x:w.a[0]+dx/len*(a+b)/2,z:w.a[1]+dz/len*(a+b)/2,w:b-a,d:WALL_THICKNESS,rot,bottom}));
  });
  return rects.concat([...wallJoints,...structuralSolids].map(s=>({x:s.x,z:s.z,w:s.w,d:s.d,rot:0,bottom:0})));
}
const cross2=(p,q,v)=>(q[0]-p[0])*(v[1]-p[1])-(q[1]-p[1])*(v[0]-p[0]);
const polygonArea=poly=>poly.reduce((sum,p,i)=>{const q=poly[(i+1)%poly.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2;
function clipPolygon(poly,p,q,side){
  const out=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],ca=side*cross2(p,q,a),cb=side*cross2(p,q,b);
    if(ca>=0)out.push(a);
    if((ca>0&&cb<0)||(ca<0&&cb>0)){const t=ca/(ca-cb);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
  }
  return out.length>=3&&Math.abs(polygonArea(out))>1e-9?out:null;
}
// Convex pieces of the beam footprint, in the beam's local x (width) / z (depth) frame.
// A face that overhangs a wall face by less than BEAM_FLUSH_SNAP (dragging and resizing
// leave sub-millimetre remainders) is snapped flush first; otherwise the overhang
// survives the cut as a hairline strip that renders as the very seam being removed.
export function beamVisiblePieces(f){
  const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),bottom=HEIGHT-f.h;
  const solids=ceilingOccluders().filter(solid=>solid.bottom<=bottom+1e-6).map(solid=>{
    const sa=solid.rot*Math.PI/180,sc=Math.cos(sa),ss=Math.sin(sa);
    const poly=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>{const dx=solid.x+sc*x*solid.w/2+ss*z*solid.d/2-f.x,dz=solid.z-ss*x*solid.w/2+sc*z*solid.d/2-f.z;return[dx*c-dz*s,dx*s+dz*c];});
    if(polygonArea(poly)<0)poly.reverse();
    return poly;
  });
  let[x0,x1,z0,z1]=[-f.w/2,f.w/2,-f.d/2,f.d/2];
  for(const poly of solids){
    const xs=poly.map(v=>v[0]),zs=poly.map(v=>v[1]),ox0=Math.min(...xs),ox1=Math.max(...xs),oz0=Math.min(...zs),oz1=Math.max(...zs);
    if(Math.abs(polygonArea(poly)-(ox1-ox0)*(oz1-oz0))>1e-9)continue;
    if(ox0>=x1||ox1<=x0||oz0>=z1||oz1<=z0)continue;
    if(z1>oz1&&z1-oz1<BEAM_FLUSH_SNAP)z1=oz1;
    if(z0<oz0&&oz0-z0<BEAM_FLUSH_SNAP)z0=oz0;
    if(x1>ox1&&x1-ox1<BEAM_FLUSH_SNAP)x1=ox1;
    if(x0<ox0&&ox0-x0<BEAM_FLUSH_SNAP)x0=ox0;
  }
  let pieces=[[[x0,z0],[x1,z0],[x1,z1],[x0,z1]]];
  for(const poly of solids){
    pieces=pieces.flatMap(piece=>{
      const outside=[];let rest=piece;
      for(let i=0;i<poly.length&&rest;i++){
        const p=poly[i],q=poly[(i+1)%poly.length],part=clipPolygon(rest,p,q,-1);
        if(part)outside.push(part);
        rest=clipPolygon(rest,p,q,1);
      }
      return rest?outside:[piece];
    });
  }
  pieces.bounds=[x0,x1,z0,z1];
  return pieces;
}
// Bottom faces for every piece and side faces only on the beam's own outline. The top
// covers the whole outline: the original box always drew its top (a single-material
// mesh ignores face groups), sitting above the ceiling, and top view shows exactly that.
export function beamGeometry(f,pieces){
  const[x0,x1,z0,z1]=pieces.bounds||[-f.w/2,f.w/2,-f.d/2,f.d/2],hh=f.h/2,eps=1e-6,position=[],normal=[];
  const tri=(p,q,r,n)=>{const u=[q[0]-p[0],q[1]-p[1],q[2]-p[2]],v=[r[0]-p[0],r[1]-p[1],r[2]-p[2]];if((u[1]*v[2]-u[2]*v[1])*n[0]+(u[2]*v[0]-u[0]*v[2])*n[1]+(u[0]*v[1]-u[1]*v[0])*n[2]<0)[q,r]=[r,q];position.push(...p,...q,...r);normal.push(...n,...n,...n);};
  const outline=(p,q)=>Math.abs(p[0]-x1)<eps&&Math.abs(q[0]-x1)<eps?[1,0,0]:Math.abs(p[0]-x0)<eps&&Math.abs(q[0]-x0)<eps?[-1,0,0]:Math.abs(p[1]-z1)<eps&&Math.abs(q[1]-z1)<eps?[0,0,1]:Math.abs(p[1]-z0)<eps&&Math.abs(q[1]-z0)<eps?[0,0,-1]:null;
  for(const piece of pieces){
    for(let i=1;i<piece.length-1;i++)tri([piece[0][0],-hh,piece[0][1]],[piece[i][0],-hh,piece[i][1]],[piece[i+1][0],-hh,piece[i+1][1]],[0,-1,0]);
    for(let i=0;i<piece.length;i++){
      const p=piece[i],q=piece[(i+1)%piece.length],n=outline(p,q);
      if(n){tri([p[0],-hh,p[1]],[q[0],-hh,q[1]],[q[0],hh,q[1]],n);tri([p[0],-hh,p[1]],[q[0],hh,q[1]],[p[0],hh,p[1]],n);}
    }
  }
  tri([x0,hh,z0],[x1,hh,z0],[x1,hh,z1],[0,1,0]);tri([x0,hh,z0],[x1,hh,z1],[x0,hh,z1],[0,1,0]);
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(position,3));
  geo.setAttribute('normal',new T.Float32BufferAttribute(normal,3));
  return geo;
}
// Boards butt end to end with a 3 mm joint; a wider gap shows the slab and the board's
// end face, which reads as a missing piece rather than a joint.
export const BOARD_LENGTH=1.117;
export function floorBoardRects(){const flooringWalls=wallRects(),boards=[];for(let x=-.45;x<8.85;x+=.19)for(let z=0;z<8.5;z+=1.12){let zz=z+((Math.round((x+.45)/.19)%2)*.56),board={x:x+.093,z:zz+BOARD_LENGTH/2,w:.186,d:BOARD_LENGTH,rot:0};if(inside(x+.09,zz+BOARD_LENGTH/2)&&inside(x,zz)&&inside(x+.185,zz+BOARD_LENGTH)&&!flooringWalls.some(w=>overlaps(board,w)))boards.push(board);}return boards;}
// The floor of one room as top-facing strips on a 2 cm grid, inside the outline, textured
// at true board scale with the grain running north-south like the timber boards.
export const FLOOR_TOP=.008;
export function roomFloorGeometry(room,step=.02){
  const position=[],uv=[],normal=[];
  for(let z=-.2;z<8.7;z+=step){let start=null;
    for(let x=-.6;x<=9.1+step;x+=step){const cx=x+step/2,cz=z+step/2,hit=x<=9.1&&inside(cx,cz)&&roomAt(cx,cz)===room;
      if(hit&&start===null)start=x;
      if(!hit&&start!==null){const x0=start,x1=x,z0=z,z1=z+step;for(const [px,pz]of[[x0,z0],[x0,z1],[x1,z1],[x0,z0],[x1,z1],[x1,z0]]){position.push(px,FLOOR_TOP,pz);uv.push(px/BOARD.w,pz/BOARD.h);normal.push(0,1,0);}start=null;}}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(position,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normal,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return geo;
}
export class SpaceScene{
 constructor(host,onSelect,onDrag,onDragEnd,onOperate){this.host=host;this.onSelect=onSelect;this.onDrag=onDrag;this.onDragEnd=onDragEnd;this.onOperate=onOperate;this.collisionWalls=wallRects();this.mode='orbit';this.palette='oak';this.items=[];this.groups=new Map;this.invalidHelpers=new Map;this.invalidMarkers=new Map;this.foregroundDraft=null;this.actions=new Map;this.lightObjects=[];this.resizeHandles=new T.Group;this.openStates={};this.keys=new Set;this.night=false;this.lightsOn=true;this.eye=1.6;this.cutaway=true;this.selected=null;this.viewStates={};this.avoidFurniture=true;this.placing=false;doors.forEach(d=>d.maxAngle=fixedDoorLimit(d));this.route=[];
 this.renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.shadowMap.autoUpdate=false;this.shadowsDirty=true;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;host.append(this.renderer.domElement);
 this.scene=new T.Scene();this.scene.background=new T.Color('#dce4e2');this.scene.fog=new T.Fog('#dce4e2',35,75);
 this.camera=new T.PerspectiveCamera(43,1,.025,100);this.camera.position.set(13,15,18);this.topCamera=new T.OrthographicCamera(-6,6,6,-6,.1,60);this.topCamera.position.set(4,25,4);this.topCamera.up.set(0,0,-1);this.topCamera.lookAt(4,0,4);
 this.controls=new OrbitControls(this.camera,host);this.controls.target.set(4,0,3.9);this.controls.enableDamping=true;this.controls.minDistance=2;this.controls.maxDistance=28;this.controls.maxPolarAngle=Math.PI*.485;
 // Indoor ambient: the ceiling hides the sky, so light from above is no brighter than light
 // bounced up from the floor. A strong sky term washed out floors (walnut read as light oak)
 // and left ceilings brown.
 this.hemi=new T.HemisphereLight(0xc4c8d0,0xb8ae9f,2.2);this.scene.add(this.hemi);
 // The hemisphere light shades every vertical face alike, so wall corners and columns
 // vanish indoors. A low, shadowless fill gives each wall orientation its own tone.
 this.fill=new T.DirectionalLight(0xfff4e6,1);this.fill.position.set(5,2.2,3);this.fill.castShadow=false;this.scene.add(this.fill);
 // Ceiling lights only shine down, so at night nothing reached the ceiling. This stands in
 // for light bounced off floors and walls: it comes from below and follows the lamps' output.
 this.bounce=new T.HemisphereLight(0x000000,0xfff1e0,0);this.scene.add(this.bounce);this.sun=new T.DirectionalLight(0xffeed8,3.1);this.sun.position.set(-3,10,-5);this.sun.castShadow=false;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.5,far:40});this.sun.shadow.bias=-.0004;this.sun.shadow.normalBias=.025;this.scene.add(this.sun);
 this.building=new T.Group;this.furniture=new T.Group;this.scene.add(this.building,this.furniture,this.resizeHandles);this.ray=new T.Raycaster;this.pointer=new T.Vector2;this.plane=new T.Plane(new T.Vector3(0,1,0),0);this.walkYaw=Math.PI;this.walkPitch=0;this.clock=new T.Clock;
 this.makeMaterials();this.buildHouse();this.buildSurroundings();this.bind();this.resize();new ResizeObserver(()=>this.resize()).observe(host);this.renderer.setAnimationLoop(()=>this.frame());}
 texture(kind){const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');let seed=45;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};ctx.fillStyle=kind==='wood'?'#c9b59a':'#e3e0d9';ctx.fillRect(0,0,512,512);for(let i=0;i<(kind==='wood'?1500:22000);i++){const v=Math.floor(80+rand()*100);ctx.strokeStyle=`rgba(${v},${v*.87},${v*.7},${kind==='wood'?.12:.1})`;ctx.fillStyle=ctx.strokeStyle;if(kind==='wood'){let x=rand()*512,y=rand()*512;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+rand()*7,y+40,x-8,y+100,x+2,y+150);ctx.stroke()}else ctx.fillRect(rand()*512,rand()*512,1,2)}const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.anisotropy=this.renderer.capabilities.getMaxAnisotropy();return tx;}
 makeMaterials(){const p=palettes[this.palette];if(!this.woodTexture){this.woodTexture=this.texture('wood');this.fabricTexture=this.texture('fabric');}this.m={};const mat=(color,roughness=.8,extra={})=>new T.MeshStandardMaterial({color,roughness,...extra});this.m.wall=mat(p.wall);this.m.wood=mat(p.wood,.6,{map:this.woodTexture});this.m.entryDoor=mat(ENTRY_DOOR,.5);this.m.floor=mat(p.floor,.55,{map:this.woodTexture});this.m.fabric=mat(p.fabric,.98,{map:this.fabricTexture});this.m.accent=mat(p.accent,.9,{map:this.fabricTexture});this.m.white=mat('#f4f1e9',.7);this.m.tile=mat('#cecfc7',.35);this.m.stone=mat('#e4e0d7',.35);this.m.dark=mat('#27383a',.6);this.m.metal=mat('#929b98',.3,{metalness:.8});this.m.glass=mat('#b9d5da',.1,{transparent:true,opacity:.24,metalness:.1,depthWrite:false});this.m.glow=mat('#fff3b0',.25,{emissive:'#ffd36a',emissiveIntensity:1.5});this.m.lightWhite=mat('#f7fbff',.2,{emissive:'#dcecff',emissiveIntensity:1.9});this.m.lightNatural=mat('#fff4dc',.22,{emissive:'#ffe6af',emissiveIntensity:1.8});this.m.lightWarm=mat('#ffd7a0',.25,{emissive:'#ffb55d',emissiveIntensity:1.75});this.m.leaf=mat('#496649',.9);}
 box(parent,w,h,d,x,y,z,mat,round=0){if(mat==='wood'&&this.woodOverride)mat=this.woodOverride;if(mat==='fabric'&&this.fabricOverride)mat=this.fabricOverride;let geo=round?new RoundedBoxGeometry(w,h,d,3,Math.min(round,w/3,h/3,d/3)):new T.BoxGeometry(w,h,d);if(mat?.userData?.board)boardUV(geo,[(x*7.3+z*3.1+y*1.7)%1,(x*2.9+z*5.3)%1]);let mesh=new T.Mesh(geo,typeof mat==='string'?this.m[mat]:mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 cyl(parent,r1,r2,h,x,y,z,mat){if(mat==='wood'&&this.woodOverride)mat=this.woodOverride;if(mat==='fabric'&&this.fabricOverride)mat=this.fabricOverride;let m=new T.Mesh(new T.CylinderGeometry(r1,r2,h,32),typeof mat==='string'?this.m[mat]:mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 clearGroup(g){if(g===this.furniture&&this.lightObjects)this.lightObjects=[];g.traverse(o=>{if(o.geometry)o.geometry.dispose()});g.clear();}
 updateResizeHandles(){if(!this.resizeHandles)return;this.resizeHandles.traverse(o=>o.geometry?.dispose());this.resizeHandles.clear();this.resizeHandles.visible=false;}
 resizeAtPointer(e){if(this.mode!=='top'||!this.selected||this.placing)return null;const f=this.items.find(item=>item.id===this.selected);if(!f)return null;const p=this.ground(e);if(!p)return null;const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=p.x-f.x,dz=p.z-f.z,lx=dx*c-dz*s,lz=dx*s+dz*c,margin=Math.min(.075,Math.max(.012,Math.min(f.w,f.d)*.3)),candidates=[];if(Math.abs(lz)<=f.d/2+margin)candidates.push({axis:'w',sign:lx<0?-1:1,distance:Math.abs(Math.abs(lx)-f.w/2)});if(Math.abs(lx)<=f.w/2+margin)candidates.push({axis:'d',sign:lz<0?-1:1,distance:Math.abs(Math.abs(lz)-f.d/2)});const edge=candidates.filter(hit=>hit.distance<=margin).sort((a,b)=>a.distance-b.distance)[0];return edge?{kind:'resize',id:f.id,...edge}:null;}
 buildHouse(){this.clearGroup(this.building);this.wallMeshes=[];this.staticActions=[];this.actions.clear();let shape=new T.Shape(outline.map(([x,z])=>new T.Vector2(x,-z)));let floor=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:false}),[this.m.floor,this.m.wall]);floor.rotation.x=-Math.PI/2;floor.position.y=-.16;floor.receiveShadow=true;this.building.add(floor);
 // Individual narrow boards make scale and plank direction legible at human eye height.
 // A room with a chosen board finish gets one continuous floor over its whole footprint
 // (the decorative boards and tiles leave gaps); other rooms keep boards or tiles.
 const finished=room=>!!this.floors?.[room];
 for(const room of Object.keys(this.floors||{})){const mesh=new T.Mesh(roomFloorGeometry(room),this.flooringMaterial(this.floors[room]));mesh.receiveShadow=true;this.building.add(mesh);}
 for(const board of floorBoardRects())if(!finished(roomAt(board.x,board.z)))this.box(this.building,board.w,.009,board.d,board.x,.002,board.z,'floor');
 for(const [x,z,w,d,room]of[[2.24,6,1.55,2.4,'衛浴 A'],[7.7,3.55,2.13,1.55,'衛浴 B'],[7.45,5.83,1.62,2.7,'工作陽台']]){if(finished(room))continue;this.box(this.building,w,.018,d,x,.018,z,'tile');for(let xx=x-w/2;xx<x+w/2;xx+=.4)this.box(this.building,.004,.002,d,xx,.029,z,'white');for(let zz=z-d/2;zz<z+d/2;zz+=.4)this.box(this.building,w,.002,.004,x,.029,zz,'white');}
 for(const w of walls){let dx=w.b[0]-w.a[0],dz=w.b[1]-w.a[1],len=Math.hypot(dx,dz);const group=new T.Group;group.position.set(w.a[0],0,w.a[1]);group.rotation.y=-Math.atan2(dz,dx);this.building.add(group);const segment=(a,b,y,h)=>{if(b-a<.005||h<=0)return;let mesh=this.box(group,b-a,h,WALL_THICKNESS,(a+b)/2,y+h/2,0,'wall');this.wallMeshes.push({mesh,h,y});if(y===0)this.box(group,b-a,.075,WALL_THICKNESS,.5*(a+b),.038,0,'white');};if(w.opening){let[s,ow,sill,oh]=w.opening;segment(0,s,0,HEIGHT);segment(s+ow,len,0,HEIGHT);segment(s,s+ow,0,sill);segment(s,s+ow,sill+oh,HEIGHT-sill-oh);if(sill>0&&w.openingType==='railing'){for(let y of[.45,.8,1.1])this.box(group,ow,.035,.04,s+ow/2,y,0,'metal');for(let x=s;x<=s+ow+.01;x+=ow/6)this.box(group,.025,1,.04,x,.6,0,'metal');}else if(sill>0){let frame=new T.Group;group.add(frame);this.box(frame,ow,oh,.035,s+ow/2,sill+oh/2,0,'glass');for(let yy of[sill,sill+oh])this.box(frame,ow,.045,.07,s+ow/2,yy,0,'dark');for(let xx of[s,s+ow/2,s+ow])this.box(frame,.035,oh,.07,xx,sill+oh/2,0,'dark');}}
 else segment(0,len,0,HEIGHT);}
 for(const {x,z,w,d}of[...wallJoints,...structuralSolids]){let m=this.box(this.building,w,HEIGHT,d,x,HEIGHT/2,z,'wall');this.wallMeshes.push({mesh:m,h:HEIGHT,y:0});}
 this.ceiling=new T.Mesh(new T.ShapeGeometry(shape),this.m.wall);this.ceiling.rotation.x=-Math.PI/2;this.ceiling.position.y=HEIGHT;this.ceiling.material=new T.MeshStandardMaterial({color:palettes[this.palette].wall,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});this.building.add(this.ceiling);
 for(const door of doors){const g=new T.Group;g.position.set(door.x,0,door.z);g.rotation.y=door.angle;this.building.add(g);const pivot=new T.Group;g.add(pivot);const leaf=doorLeaf(door),width=leaf.width,mid=-leaf.side*leaf.thickness/2;pivot.position.set(leaf.x,0,leaf.z);this.box(pivot,width,door.height,leaf.thickness,width/2,door.height/2,mid,door.id==='door-0'?'entryDoor':'wood',.009);for(const side of[-1,1])this.box(pivot,.105,.025,.07,width-.12,1.02,mid+side*.055,'metal',.01);pivot.userData.action=door.id;this.actions.set(door.id,{type:'door',pivot,base:0,def:door,amount:this.openStates[door.id]||0});for(const x of[0,door.width])this.box(g,JAMB_WIDTH,2.15,WALL_THICKNESS,x,1.075,0,'white');this.box(g,door.width+.1,.06,WALL_THICKNESS,door.width/2,2.13,0,'white');}
 this.curtains=[];for(const curtain of curtains){const{id,x,z,w}=curtain,g=new T.Group;g.position.set(x,0,z);g.userData.action=id;this.building.add(g);this.box(g,w,.05,.07,0,HEIGHT-.21,0,'dark');const panels=[];for(const sign of[-1,1]){let pg=new T.Group;g.add(pg);for(let j=0;j<16;j++){let fold=this.box(pg,w/32,HEIGHT-.41,.045,(j+.5)*w/32,.17+(HEIGHT-.41)/2,Math.sin(j*Math.PI/2)*.04,'fabric',.015);fold.castShadow=false;}panels.push({g:pg,sign});}this.actions.set(id,{type:'curtain',panels,width:w,amount:this.openStates[id]||0,group:g});this.curtains.push(g);}

 this.setCutaway(this.cutaway);this.updateLight();}
 buildFurniture(items){this.stopTour();this.items=items;for(const h of this.invalidHelpers.values()){this.scene.remove(h);h.geometry.dispose();h.material.dispose();}this.invalidHelpers.clear();for(const marker of this.invalidMarkers.values()){this.scene.remove(marker);marker.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}this.invalidMarkers.clear();this.clearGroup(this.furniture);this.groups.clear();for(const [id,a]of this.actions)if(a.item)this.actions.delete(id);for(const f of items){let g=new T.Group;g.position.set(f.x,0,f.z);g.rotation.y=f.rot*Math.PI/180;g.userData.furniture=f.id;this.furniture.add(g);this.groups.set(f.id,g);this.makeFurniture(g,f);}this.updateLight();this.highlight(this.selected);this.refreshValidity();this.ensureSafeCamera();}
 resizeItem(f){const old=this.groups.get(f.id);if(!old)return this.buildFurniture(this.items);old.traverse(o=>o.geometry?.dispose());this.furniture.remove(old);this.groups.delete(f.id);if(this.actions.get(f.id)?.item)this.actions.delete(f.id);this.lightObjects=(this.lightObjects||[]).filter(light=>light.f.id!==f.id);const marker=this.invalidMarkers.get(f.id);if(marker){this.scene.remove(marker);marker.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});this.invalidMarkers.delete(f.id);}const g=new T.Group;g.position.set(f.x,0,f.z);g.rotation.y=f.rot*Math.PI/180;g.userData.furniture=f.id;this.furniture.add(g);this.groups.set(f.id,g);this.makeFurniture(g,f);this.updateLight();this.highlight(this.selected);this.refreshValidity();}
 // Every light source costs shading work on every pixel, so flush and linear lights use cheap
 // spot lights aimed at the floor: nothing lights the ceiling around the fitting, and a
 // switched-off lamp (intensity 0) is hidden so it drops out of shading entirely.
 // Each shadow-casting lamp takes a texture unit in every lit material. Past the GPU's limit
 // (often 16) textured materials fail to compile and vanish, so only the lamps nearest the
 // view focus cast shadows; the count stays fixed, so moving never recompiles shaders.
 shadowBudget(){return Math.max(0,Math.min(8,(this.renderer?.capabilities?.maxTextures??16)-8));}
 viewFocus(){if(this.mode==='walk')return this.camera?.position;if(this.mode==='top')return this.topCamera?.position;return this.controls?.target||this.camera?.position;}
 assignLampShadows(){const focus=this.viewFocus?.(),budget=this.shadowBudget(),lamps=(this.lightObjects||[]).map(({point})=>point).filter(point=>point.visible);const at=new T.Vector3,dist=point=>focus?Math.hypot(point.getWorldPosition(at).x-focus.x,at.z-focus.z):0;const chosen=new Set(lamps.map(point=>({point,d:dist(point)})).sort((a,b)=>a.d-b.d).slice(0,budget).map(({point})=>point));let changed=false;for(const {point}of this.lightObjects||[]){const cast=chosen.has(point);if(point.castShadow!==cast){point.castShadow=cast;changed=true;}}if(changed)this.shadowsDirty=true;this.shadowFocus=focus?{x:focus.x,z:focus.z}:null;}
 downlight(g,x,y,color){const spot=new T.SpotLight(color,0,6,1.25,.6,2);spot.position.set(x,y,0);spot.target.position.set(x,0,0);lampShadow(spot,512);g.add(spot,spot.target);return spot;}
 // Neighbouring towers, street, sky and the lift lobby. Shown only in walk view, where they
 // are seen through windows and the front door; they neither cast nor receive shadows.
 buildSurroundings(){
  if(this.surroundings){this.scene.remove(this.surroundings);this.surroundings.traverse(o=>{o.geometry?.dispose();for(const m of[].concat(o.material||[])){m.userData.dayMap?.dispose();m.userData.nightMap?.dispose();}});}
  const g=new T.Group;g.visible=this.mode==='walk';this.surroundings=g;this.scene.add(g);this.outdoor=[];this.lobby=[];
  // Outside is unlit (indoor lamps and bounce must not reach it) with a painted day and
  // night look; the lobby is lit like the rooms.
  const material=(color,extra={},list=this.outdoor)=>{if(list===this.outdoor){const m=new T.MeshBasicMaterial({color});m.userData.day=new T.Color(color);m.userData.night=new T.Color(color).multiplyScalar(.1);list.push(m);return m;}const m=new T.MeshStandardMaterial({color,roughness:.9,...extra});list.push(m);return m;};
  const texture=(pixels,w,h)=>{const t=new T.DataTexture(pixels,w,h,T.RGBAFormat);Object.assign(t,{colorSpace:T.SRGBColorSpace,magFilter:T.LinearFilter,minFilter:T.LinearMipmapLinearFilter,generateMipmaps:true,needsUpdate:true});t.repeat.set(1,-1);t.offset.set(0,1);return t;};
  const solid=(w,h,d,x,y,z,mat)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);g.add(m);return m;};
  const side=material('#4a4e51'),roof=material('#5a5e61');
  const painted=(paint)=>{const night=new Uint8ClampedArray(paint.albedo.length);for(let k=0;k<night.length;k+=4){const lit=paint.glow[k]+paint.glow[k+1]+paint.glow[k+2]>0;for(let ch=0;ch<3;ch++)night[k+ch]=lit?paint.glow[k+ch]*.72:paint.albedo[k+ch]*.1;night[k+3]=255;}
   const m=material('#ffffff');m.userData.dayMap=texture(paint.albedo,paint.width,paint.height);m.userData.nightMap=texture(night,paint.width,paint.height);m.userData.night=new T.Color('#ffffff');m.map=m.userData.dayMap;return m;};
  // Face shading is baked into vertex colours: neighbours keep depth without adding
  // shadow maps or allowing indoor light to illuminate their exterior.
  const addRelief=t=>{
   const batches=new Map;
   for(const part of facadeRelief(t)){const key=part.shape+part.color;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(part);}
   const transform=new T.Object3D;
   for(const parts of batches.values()){
    const first=parts[0],leaf=first.shape==='leaf',geo=leaf?new T.IcosahedronGeometry(.5,0):new T.BoxGeometry(1,1,1);
    const normals=geo.attributes.normal,colors=[];
    for(let i=0;i<normals.count;i++){
     const shade=normals.getY(i)>.5?1:normals.getY(i)<-.5?.51:Math.abs(normals.getX(i))>.5?.73:.91;
     colors.push(shade,shade,shade);
    }
    geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    const mat=material(first.color);mat.vertexColors=true;
    const mesh=new T.InstancedMesh(geo,mat,parts.length);mesh.name=t.id+'-'+first.shape+'-'+first.color;
    parts.forEach((part,i)=>{
     const west=t.faces==='west';
     transform.position.set(west?t.x0-part.d:t.x0+part.u,part.y,west?t.z0+part.u:t.z1+part.d);
     transform.scale.set(west?part.depth:part.w,part.h,west?part.w:part.depth);
     transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();g.add(mesh);
   }
  };
  for(const t of towers){
   const w=t.x1-t.x0,d=t.z1-t.z0,h=t.top-SITE.ground,west=t.faces==='west',faceWidth=west?d:w,front=painted(paintFacade(t,faceWidth,h));
   const faces=[side,side,roof,side,side,side];faces[west?1:4]=front;
   if(t.ringSide)faces[1]=painted(paintFacade(t,d-facadeRecess(t),h,'ring-side'));
   const recess=facadeRecess(t);
   // Split the east box so the right-hand platform stack is genuinely recessed.
   if(t.style==='endwall'){
    const a=t.z0+eastPlatforms.start,b=t.z0+eastPlatforms.end;
    const addSection=(z0,z1,inset)=>{
     const geo=new T.BoxGeometry(w-inset,h,z1-z0),uv=geo.attributes.uv;
     for(let i=4;i<8;i++)uv.setX(i,(z0-t.z0+uv.getX(i)*(z1-z0))/d);
     const mesh=new T.Mesh(geo,faces);mesh.position.set((t.x0+inset+t.x1)/2,SITE.ground+h/2,(z0+z1)/2);g.add(mesh);
    };
    addSection(t.z0,a,0);addSection(a,b,eastPlatforms.recess);addSection(b,t.z1,0);
   }else{
    const geo=new T.BoxGeometry(w,h,d-recess);
    const box=new T.Mesh(geo,faces);box.position.set((t.x0+t.x1)/2,SITE.ground+h/2,(t.z0+t.z1-recess)/2);g.add(box);
   }
   addRelief(t);
   if(t.crown){
    const canopy=new T.Mesh(roofCanopyGeometry(t.crown),[material('#575b56'),material('#74776f')]);
    canopy.name='north-roof-canopy';canopy.position.set((t.x0+t.x1)/2,t.top+.35,t.z1+t.crown.depth/2-.1);g.add(canopy);
    for(const sign of[-1,1])solid(.25,.55,.4,(t.x0+t.x1)/2+sign*(t.crown.w/2-.15),t.top+.15,t.z1,material('#74776f'));
   }
   if(t.ringSide){
    const sideEnd=t.z1-recess,layout=ringSideLayout(sideEnd-t.z0,t.ringSide.width);
    addRelief({...t,style:'ring-side',faces:'west',z1:sideEnd});
    const ringMat=material('#c0c1b9'),ringGeo=sideRingGeometry();
    const count=Math.round(h/SITE.floorHeight),ringLevels=Array.from({length:count},(_,i)=>i).filter(i=>i%4!==3);
    const rings=new T.InstancedMesh(ringGeo,ringMat,ringLevels.length);rings.name='north-east-alley-rings';
    const matrix=new T.Matrix4;
    ringLevels.forEach((f,i)=>{matrix.makeTranslation(t.x0-.035,SITE.ground+(f+.55)*SITE.floorHeight,t.z0+layout.centre);rings.setMatrixAt(i,matrix);});
    rings.computeBoundingSphere();g.add(rings);
   }
   // Balcony slabs or fins along part of the facing side, one per floor.
   if(t.slabs){const {depth,from=0,to=faceWidth}=t.slabs,len=to-from,slab=material('#9d948a'),edge=material('#8a827a'),under=material('#5c5650'),sf=[edge,edge,slab,under,edge,edge];
    for(let y=SITE.ground+SITE.floorHeight;y<=t.top;y+=SITE.floorHeight){const m=new T.Mesh(west?new T.BoxGeometry(depth,.3,len):new T.BoxGeometry(len,.3,depth),sf);if(west)m.position.set(t.x0-depth/2,y-.15,t.z0+from+len/2);else m.position.set(t.x0+from+len/2,y-.15,t.z1+depth/2);g.add(m);}}
  }
  // Street level, forty metres down: planted setbacks either side of the lane, then trees.
  const ground=SITE.ground,green=material('#566f45'),lane=material('#55585a'),walk=material('#8d8a82');
  solid(200,.2,200,4,ground-.1,4,lane);
  for(const [x0,x1,z0,z1,m]of[[-40,50,-5,SITE.northFace,green],[-40,50,northFacade,-13,green],[-40,50,-5.6,-5,walk],[-40,50,-13,-12.4,walk],[SITE.eastFace,eastFacade,-12,24,green]])solid(x1-x0,.05,z1-z0,(x0+x1)/2,ground+.03,(z0+z1)/2,m);
  const leaves=material('#4a6b37');for(let x=-30;x<45;x+=6.5)for(const z of[-3,-15.5])solid(3.6,3.2,3.6,x+(z<-10?3:0),ground+5,z,leaves);
  // Sky dome that follows the camera; its colours are set per day and night.
  const sky=new T.Mesh(new T.SphereGeometry(95,24,12),new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide,depthWrite:false,fog:false}));sky.geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(sky.geometry.attributes.position.count*3),3));sky.renderOrder=-1;this.sky=sky;g.add(sky);
  // Lift lobby (see corridor in surroundings.js): marble floor, doors on every wall, and the
  // smoke lobby whose fire doors stand open with the lifts inside on its east wall.
  const c=corridor,sl=c.smokeLobby,lob=(color,extra={})=>material(color,extra,this.lobby),wallM=lob('#e4dfd6'),ceilM=lob('#efece6');ceilM.userData.ceiling=true;
  const marble=paintMarble(),marbleTex=new T.DataTexture(marble.pixels,marble.width,marble.height,T.RGBAFormat);Object.assign(marbleTex,{colorSpace:T.SRGBColorSpace,wrapS:T.RepeatWrapping,wrapT:T.RepeatWrapping,magFilter:T.LinearFilter,minFilter:T.LinearMipmapLinearFilter,generateMipmaps:true,needsUpdate:true});
  const floor=(x0,x1,z0,z1)=>{const map=marbleTex.clone();map.needsUpdate=true;map.repeat.set((x1-x0)/marble.tile,(z1-z0)/marble.tile);solid(x1-x0,.16,z1-z0,(x0+x1)/2,-.08,(z0+z1)/2,lob('#ffffff',{map,emissiveMap:map,roughness:.22}));solid(x1-x0,.12,z1-z0,(x0+x1)/2,c.height+.06,(z0+z1)/2,ceilM);};
  const wall=(x0,x1,z0,z1)=>solid(Math.max(.12,x1-x0),c.height,Math.max(.12,z1-z0),(x0+x1)/2,c.height/2,(z0+z1)/2,wallM);
  floor(c.x0,c.x1,c.z0,c.z1);floor(sl.x0,sl.x1,c.z1,c.z1+sl.depth);
  const gap0=(sl.x0+sl.x1)/2-sl.opening/2,gap1=gap0+sl.opening;
  wall(c.x0,c.x1,c.z0-.12,c.z0);wall(c.x0,gap0,c.z1,c.z1+.12);wall(gap1,c.x1,c.z1,c.z1+.12);
  wall(c.x0-.12,c.x0,c.z0,c.z1);wall(c.x1,c.x1+.12,8.59,c.z1);
  wall(sl.x0-.12,sl.x0,c.z1,c.z1+sl.depth);wall(sl.x1,sl.x1+.12,c.z1,c.z1+sl.depth);wall(sl.x0,sl.x1,c.z1+sl.depth,c.z1+sl.depth+.12);
  const leafM={unit:lob(ENTRY_DOOR),stair:lob('#8b918f',{metalness:.3,roughness:.5}),lift:lob('#b5bbbe',{metalness:.7,roughness:.3})},frameM=lob('#3b3e40'),metalM=lob('#c9cdce',{metalness:.8,roughness:.3});
  // A door on a wall face; local +z points into the room it is seen from.
  const doorAt=(x,z,turn,w,kind,handle='right')=>{const d=new T.Group;d.position.set(x,0,z);d.rotation.y=turn;g.add(d);const h=kind==='lift'?2.2:2.1,part=(pw,ph,pd,px,py,pz,m)=>{const mesh=new T.Mesh(new T.BoxGeometry(pw,ph,pd),m);mesh.position.set(px,py,pz);d.add(mesh);};
   part(w+.12,h+.06,.03,0,(h+.06)/2,.015,frameM);
   if(kind==='lift'){for(const s of[-1,1])part(w/2-.006,h,.03,s*w/4,h/2,.04,leafM.lift);part(.14,.3,.02,w/2+.28,1.1,.01,metalM);}
   else{part(w,h,.045,0,h/2,.05,leafM[kind]);if(kind==='stair')part(w*.8,.05,.05,0,1,.1,metalM);else part(.14,.03,.05,(handle==='left'?-1:1)*(w/2-.12),1.05,.1,metalM);}};
  const facing={north:0,south:Math.PI,west:Math.PI/2,east:-Math.PI/2};
  for(const door of c.doors){const [x,z]=door.wall==='north'?[door.at,c.z0]:door.wall==='south'?[door.at,c.z1]:door.wall==='west'?[c.x0,door.at]:[c.x1,door.at];doorAt(x,z,facing[door.wall],door.w,door.kind,door.handle);}
  for(const at of sl.lifts)doorAt(sl.x1,c.z1+at,facing.east,1,'lift');
  // The smoke lobby's fire doors are held open against its side walls.
  for(const [hinge,sign]of[[gap0,1],[gap1,-1]]){const leaf=new T.Mesh(new T.BoxGeometry(.045,2.1,sl.opening/2-.01),leafM.stair);leaf.position.set(hinge+sign*.03,1.05,c.z1+.12+sl.opening/4);g.add(leaf);}
  const lamp=lob('#fff7e8',{emissive:'#fff1d6',emissiveIntensity:1});lamp.userData.lamp=true;
  for(let x=c.x1-1.4;x>c.x0;x-=2.4)solid(.5,.02,.5,x,c.height-.01,(c.z0+c.z1)/2,lamp);solid(.5,.02,.5,(sl.x0+sl.x1)/2,c.height-.01,c.z1+sl.depth/2,lamp);
  g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  this.updateOutdoor?.();
 }
 // Day or night on everything outside: sky colours, lit windows, the lobby's own lighting.
 updateOutdoor(){
  if(!this.sky)return;const night=this.night,[zenith,horizon]=night?['#070b12','#1f232b']:['#8db4d6','#e2e9ec'];
  const pos=this.sky.geometry.attributes.position,col=this.sky.geometry.attributes.color,a=new T.Color(zenith),b=new T.Color(horizon),mix=new T.Color();
  for(let i=0;i<pos.count;i++){const t=Math.max(0,pos.getY(i)/95);mix.copy(b).lerp(a,Math.pow(t,.6));col.setXYZ(i,mix.r,mix.g,mix.b);}col.needsUpdate=true;
  for(const m of this.outdoor){m.color.copy(night?m.userData.night:m.userData.day);if(m.userData.dayMap){m.map=night?m.userData.nightMap:m.userData.dayMap;m.needsUpdate=true;}}
  // The lobby has no lamps of its own in the scene; a steady self-lit tone stands in for its
  // ceiling lights, a little stronger on the ceiling, which the hemisphere barely reaches.
  for(const m of this.lobby){if(m.userData.lamp)continue;m.emissive.copy(m.color);m.emissiveIntensity=(m.userData.ceiling?.55:.25)*(night?1.15:1);}
 }
 // An SPC flooring: one repeating tile of planks, scaled to the floor's board-sized UVs.
 flooringMaterial(code){
  const flooring=flooringByCode(code);if(!flooring)return null;
  if(!this.flooringMaterials)this.flooringMaterials=new Map;
  if(!this.flooringMaterials.has(code)){
   const {pixels,width,height,size}=flooringPixels(flooring),texture=new T.DataTexture(pixels,width,height,T.RGBAFormat);
   Object.assign(texture,{wrapS:T.RepeatWrapping,wrapT:T.RepeatWrapping,magFilter:T.LinearFilter,minFilter:T.LinearMipmapLinearFilter,generateMipmaps:true,colorSpace:T.SRGBColorSpace,anisotropy:this.renderer?.capabilities.getMaxAnisotropy()||1,needsUpdate:true});
   texture.repeat.set(BOARD.w/size[0],BOARD.h/size[1]);
   this.flooringMaterials.set(code,new T.MeshStandardMaterial({map:texture,roughness:.5}));
  }
  return this.flooringMaterials.get(code);
 }
 finishMaterial(code){
  const finish=finishByCode(code);if(!finish)return null;
  if(!this.finishMaterials)this.finishMaterials=new Map;
  if(!this.finishMaterials.has(code)){
   const texture=new T.DataTexture(finishPixels(finish,512,1024),512,1024,T.RGBAFormat);
   Object.assign(texture,{wrapS:T.RepeatWrapping,wrapT:T.RepeatWrapping,magFilter:T.LinearFilter,minFilter:T.LinearMipmapLinearFilter,generateMipmaps:true,colorSpace:T.SRGBColorSpace,anisotropy:this.renderer?.capabilities.getMaxAnisotropy()||1,needsUpdate:true});
   const material=new T.MeshStandardMaterial({map:texture,roughness:.62});material.userData.board=true;this.finishMaterials.set(code,material);
  }
  return this.finishMaterials.get(code);
 }
 // Upholstery colours share the palette fabric's weave and differ only in colour.
 fabricMaterial(color){
  if(!this.fabricMaterials)this.fabricMaterials=new Map;
  if(!this.fabricMaterials.has(color))this.fabricMaterials.set(color,new T.MeshStandardMaterial({color,roughness:.98,map:this.fabricTexture||null}));
  return this.fabricMaterials.get(color);
 }
 makeFurniture(g,f){const fabric=normalizeFabric(f.fabric);this.woodOverride=f.finish?this.finishMaterial(f.finish):null;this.fabricOverride=fabric?this.fabricMaterial(fabric):null;try{return this.makeFurnitureParts(g,f);}finally{this.woodOverride=null;this.fabricOverride=null;}}
 makeFurnitureParts(g,f){let{w,d,h,type}=f;const box=(ww,hh,dd,x,y,z,m='wood',r=0)=>this.box(g,ww,hh,dd,x,y,z,m,r);const legs=(height,offset=.07)=>{for(let x of[-w/2+offset,w/2-offset])for(let z of[-d/2+offset,d/2-offset])box(.045,height,.045,x,height/2,z,'wood',.008);};
 if(type==='rug'){box(w,.01,d,0,.012,0,'accent',.005);return}
 if(type==='beam'){const pieces=beamVisiblePieces(f),clipped=Math.abs(pieces.reduce((sum,piece)=>sum+Math.abs(polygonArea(piece)),0)-w*d)>1e-9;let geo;if(clipped)geo=beamGeometry(f,pieces);else{geo=new T.BoxGeometry(w,h,d);geo.clearGroups();for(const face of[0,1,3,4,5])geo.addGroup(face*6,6,0);}const beam=new T.Mesh(geo,this.m.wall);beam.position.y=HEIGHT-h/2;beam.castShadow=false;beam.receiveShadow=true;g.add(beam);const hitMaterial=new T.MeshBasicMaterial();hitMaterial.colorWrite=false;hitMaterial.depthWrite=false;hitMaterial.depthTest=false;const hit=new T.Mesh(new T.BoxGeometry(Math.max(w,.3),.02,Math.max(d,.3)),hitMaterial);hit.position.y=HEIGHT-h/2;hit.castShadow=false;hit.receiveShadow=false;g.add(hit);return;}
 if(type==='light'){const light=normalizeLight(f),thickness=Math.max(.02,Math.min(.3,h)),mountY=HEIGHT-thickness/2,round=light.shape==='round',size=Math.max(.08,Math.min(w,d)),temperature={white:['lightWhite','#eef6ff'],natural:['lightNatural','#fff0cf'],warm:['lightWarm','#ffc26f']}[light.colorTemperature],lightMat=temperature[0];if(light.lightKind==='linear'){const depth=Math.max(.005,Math.min(.3,h));box(w,depth,d,0,HEIGHT-depth/2,0,lightMat);const hitMaterial=new T.MeshBasicMaterial();hitMaterial.colorWrite=false;hitMaterial.depthWrite=false;hitMaterial.depthTest=false;const hit=new T.Mesh(new T.BoxGeometry(w,.02,Math.max(d,.2)),hitMaterial);hit.position.y=HEIGHT-depth/2;hit.castShadow=false;hit.receiveShadow=false;g.add(hit);if(!this.lightObjects)this.lightObjects=[];const count=linearLightCount(w);for(let i=0;i<count;i++){const x=-w/2+w*(i+.5)/count;this.lightObjects.push({f,point:this.downlight(g,x,HEIGHT-depth-.005,temperature[1]),share:1/count,span:w/count});}return;}if(light.lightKind==='pendant'){const drop=Math.max(.05,Math.min(HEIGHT-.12,light.pendantLength)),lampY=HEIGHT-drop;this.cyl(g,Math.max(.04,size*.20),Math.max(.04,size*.20),.025,0,HEIGHT-.013,0,'white');box(.014,Math.max(.03,drop-thickness*.8),.014,0,HEIGHT-(drop-thickness*.8)/2,0,'metal');if(round){this.cyl(g,size*.46,size*.34,thickness*1.45,0,lampY+thickness*.18,0,'white');this.cyl(g,size*.40,size*.40,thickness*.62,0,lampY-thickness*.28,0,lightMat);}else{box(w+.035,thickness*1.25,d+.035,0,lampY+thickness*.12,0,'white',Math.min(.05,w/5,d/5));box(Math.max(.04,w-.045),thickness*.55,Math.max(.04,d-.045),0,lampY-thickness*.28,0,lightMat,Math.min(.04,w/5,d/5));}}else if(round){this.cyl(g,size*.52,size*.52,thickness*.38,0,HEIGHT-thickness*.18,0,'white');this.cyl(g,size*.46,size*.46,thickness*.78,0,mountY-thickness*.08,0,lightMat);}else{box(w+.035,thickness*.5,d+.035,0,HEIGHT-thickness*.24,0,'white',Math.min(.05,w/5,d/5));box(Math.max(.04,w-.045),thickness*.78,Math.max(.04,d-.045),0,mountY-thickness*.08,0,lightMat,Math.min(.04,w/5,d/5));}if(!this.lightObjects)this.lightObjects=[];if(light.lightKind==='ceiling'){this.lightObjects.push({f,point:this.downlight(g,0,HEIGHT-thickness-.005,temperature[1])});return;}const point=new T.PointLight(temperature[1],0,Math.max(2.8,5.5+size*2),2);point.position.set(0,Math.max(.1,HEIGHT-light.pendantLength)-.03,0);lampShadow(point,256);g.add(point);this.lightObjects.push({f,point});return;}
 if(type==='bed'){const scale=h/.65;const raw=box;const bedbox=(ww,hh,dd,x,y,z,m,r)=>raw(ww,hh*scale,dd,x,y*scale,z,m,r);bedbox(w,.25,d,0,.17,0,'wood',.045);bedbox(w-.02,.22,d-.04,0,.41,0,'white',.08);bedbox(w+.025,.65,.075,0,.325,-d/2,'fabric',.025);bedbox(w-.08,.055,d*.67,0,.547,d*.11,'fabric',.025);bedbox(w-.07,.02,d*.21,0,.58,d*.29,'accent',.01);for(let x of w>1.3?[-w*.24,w*.24]:[0])bedbox(w>1.3?w*.42:w*.8,.11,.4,x,.59,-d*.32,'white',.075);return;}
 if(type==='sofa'){g.scale.y=h/.84;h=.84;legs(.12,.12);box(w,.23,d,0,.22,0,'fabric',.07);box(w,h-.22,.16,0,(h+.22)/2,-d/2+.08,'fabric',.055);for(let x of[-w/2+.09,w/2-.09])box(.18,h*.68,d,x,h*.34+.1,0,'fabric',.055);for(let i=0;i<3;i++){let x=-w/2+.23+(w-.46)/6+i*(w-.46)/3;box((w-.49)/3,.18,d-.22,x,.425,.06,'fabric',.07);box((w-.5)/3,.3,.17,x,.64,-d/2+.2,'fabric',.06);}let pillow=box(.3,.3,.11,w*.31,.59,-.12,'accent',.065);pillow.rotation.z=-.18;return;}
 if(['table','desk'].includes(type)){legs(h-.04);let top=box(w,.045,d,0,h-.022,0,'wood',type==='table'?.08:.01);if(type==='desk'){const drawer=new T.Group;drawer.position.set(0,h-.12,d/2-.16);g.add(drawer);this.box(drawer,w*.65,.13,.3,0,0,0,'wood');this.box(drawer,.16,.018,.02,0,0,.16,'metal');this.actions.set(f.id,{type:'drawer',pivot:drawer,base:drawer.position.z,travel:.3,item:f,amount:f.open||0});}return;}
 if(type==='chair'){legs(h*.52);box(w,.065,d,0,h*.52,0,'fabric',.03);box(w,h*.43,.055,0,h*.75,-d/2+.02,'wood',.035);return;}
 if(['wardrobe','drawer','console','kitchen','fridge'].includes(type)){const bodyMat=type==='fridge'?'white':'wood';box(w,h,.025,0,h/2,-d/2,bodyMat);for(let x of[-w/2+.012,w/2-.012])box(.024,h,d,x,h/2,0,bodyMat);for(let y of[.04,h-.015])box(w,.028,d,0,y,0,bodyMat);for(let y=.45;y<h-.1;y+=.45)box(w-.05,.02,d-.04,0,y,0,'white');const layout=type==='drawer'?{doors:[],drawers:[{x:0,width:w-.03,rows:3}],slides:[]}:cabinetLayout(f),pivots=[],drawers=[],slides=[];for(const leaf of layout.doors){const p=new T.Group;p.position.set(leaf.hinge,h/2,d/2);p.userData.swing=-leaf.sign;g.add(p);this.box(p,leaf.width-.008,h-.065,.025,leaf.sign*leaf.width/2,0,0,bodyMat,.006);this.box(p,.018,.12,.028,leaf.sign*(leaf.width-.055),0,.03,'metal',.006);pivots.push(p);}for(const front of layout.drawers){const rows=front.rows||3;for(let row=0;row<rows;row++){const p=new T.Group;p.position.set(front.x,(row+.5)*h/rows,d/2);g.add(p);this.box(p,front.width-.008,h/rows-.018,.025,0,0,0,bodyMat,.006);this.box(p,Math.min(.18,front.width*.35),.018,.03,0,0,.03,'metal',.006);drawers.push(p);}}for(const front of layout.slides){const p=new T.Group;p.position.set(front.x,h/2,d/2+(front.sign>0?.012:.027));p.userData.baseX=front.x;p.userData.travelX=front.sign*front.width*.82;g.add(p);this.box(p,front.width,h-.065,.025,0,0,0,bodyMat,.006);this.box(p,.018,.12,.03,-front.sign*(front.width/2-.035),0,.03,'metal',.006);slides.push(p);}this.actions.set(f.id,{type:type==='drawer'?'cabdrawer':'cabinet',pivots,drawers,slides,item:f,travel:d*(type==='drawer'?.75:.55),base:d/2,amount:f.open||0});if(type==='console'){box(w*.78,.72,.04,0,h+.48,-d*.3,'dark',.025);box(w*.74,.66,.01,0,h+.48,-d*.3+.027,'accent');box(.05,.12,.1,0,h+.08,-d*.3,'dark');}
 if(type==='kitchen'){const parts=normalizeKitchenParts(f),sink=parts.sink,cooktop=parts.cooktop,sinkX=w*.23,cooktopX=-w*.30;box(w+.03,.04,d+.03,0,h,0,'stone',.008);box(sink.w,.015,sink.d,sinkX,h+.028,0,'metal',Math.min(.05,sink.w/4,sink.d/4));box(Math.max(.04,sink.w-.1),.018,Math.max(.04,sink.d-.09),sinkX,h+.037,0,'dark',.05);let faucet=this.cyl(g,.016,.016,.25,sinkX,h+.13,-Math.min(d*.29,sink.d*.35),'metal');box(.02,.025,.15,sinkX,h+.25,-Math.min(d*.18,sink.d*.24),'metal',.01);box(cooktop.w,.018,cooktop.d,cooktopX,h+.035,0,'dark',.03);for(let x of[cooktopX-cooktop.w*.27,cooktopX+cooktop.w*.27])this.cyl(g,Math.min(.09,cooktop.w*.14),Math.min(.09,cooktop.w*.14),.015,x,h+.055,0,'metal');}
 return;}
 if(type==='washer'){box(w,h,d,0,h/2,0,'white',.035);box(w*.76,h*.7,.045,0,h*.47,d/2+.024,'dark',.06);let drum=this.cyl(g,w*.29,w*.29,.035,0,h*.47,d/2+.052,'dark');drum.rotation.x=Math.PI/2;let door=new T.Group;door.position.set(-w*.33,h*.48,d/2+.08);g.add(door);this.box(door,w*.72,.055,.06,w*.33,0,0,'white',.035);let glass=this.cyl(door,w*.25,w*.25,.035,w*.33,0,.038,'glass');glass.rotation.x=Math.PI/2;let rim=this.cyl(door,w*.31,w*.31,.025,w*.33,0,.03,'metal');rim.rotation.x=Math.PI/2;box(w*.75,.08,.015,0,h*.86,d/2+.01,'metal',.008);this.actions.set(f.id,{type:'washer',pivot:door,item:f,amount:f.open||0});return;}
 if(type==='shower'){
 const cut=f.id==='showerB'?Math.min(.3,w*.25):0;
 const points=cut?[[-w/2,-d/2+cut],[-w/2+cut,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]]:[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];
 const shape=new T.Shape(points.map(([x,z])=>new T.Vector2(x,-z)));const tray=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false}),this.m.white);tray.rotation.x=-Math.PI/2;tray.position.y=.03;tray.receiveShadow=true;g.add(tray);
 const pane=(ax,az,bx,bz)=>{const width=Math.hypot(bx-ax,bz-az),pg=new T.Group;pg.position.set((ax+bx)/2,0,(az+bz)/2);pg.rotation.y=-Math.atan2(bz-az,bx-ax);g.add(pg);this.box(pg,width,h-.1,.012,0,(h+.1)/2,0,'glass');for(const y of[.1,h])this.box(pg,width,.025,.025,0,y,0,'metal');for(const x of[-width/2,width/2])this.box(pg,.02,h-.1,.02,x,(h+.1)/2,0,'metal');return pg;};
 const door=showerDoorLayout(f);if(cut){pane(door.hingeX,-d/2,w/2,-d/2);pane(-w/2,-d/2+cut,-w/2,d/2);}else pane(-w/2,-d/2,door.endX,-d/2);
 const pivot=new T.Group,base=Math.atan2(-(door.endZ-door.hingeZ),door.endX-door.hingeX);pivot.position.set(door.hingeX,0,door.hingeZ);pivot.rotation.y=base;g.add(pivot);this.box(pivot,door.width,h-.1,.012,door.width/2,(h+.1)/2,0,'glass');for(const y of[.1,h])this.box(pivot,door.width,.025,.025,door.width/2,y,0,'metal');for(const x of[0,door.width])this.box(pivot,.02,h-.1,.02,x,(h+.1)/2,0,'metal');this.box(pivot,.025,.15,.035,door.width*.72,1.0,-.035,'metal');this.actions.set(f.id,{type:'shower',pivot,base,swing:door.swing,item:f,amount:f.open||0});
 box(.09,.015,.09,0,.094,d*.2,'metal');this.cyl(g,.018,.018,h*.67,0,h*.58,d/2-.05,'metal');box(.025,.025,.24,0,h*.91,d/2-.16,'metal');this.cyl(g,.105,.105,.025,0,h*.90,d/2-.27,'metal');box(.2,.035,.055,0,h*.5,d/2-.07,'metal',.015);return;
 }
 if(type==='sink'){const basin=normalizeSinkBasin(f);box(w,h*.8,d,0,h*.4,0,'wood');box(w+.03,.1,d+.03,0,h-.05,0,'white',.045);box(basin.w,.018,basin.d,0,h+.003,0,'metal',Math.min(.055,basin.w/4,basin.d/4));box(Math.max(.04,basin.w-.08),.012,Math.max(.04,basin.d-.07),0,h+.014,0,'dark',.04);this.cyl(g,.015,.015,.15,0,h+.075,-Math.min(d*.3,basin.d*.38),'metal');box(.025,.025,.1,0,h+.15,-Math.min(d*.2,basin.d*.26),'metal');return;}
 if(type==='toilet'){box(w*.85,h*.5,d*.7,0,h*.25,.07,'white',.1);box(w,.08,d*.7,0,h*.51,.08,'white',.09);box(w,h*.5,d*.25,0,h*.75,-d*.34,'white',.04);return;}
 if(type==='plant'){this.cyl(g,w*.37,w*.29,h*.32,0,h*.16,0,'stone');for(let i=0;i<12;i++){let a=i*2.4,yy=h*.36+i*h*.04;this.cyl(g,.008,.008,yy,0,yy/2,0,'wood');let leaf=new T.Mesh(new T.SphereGeometry(1,10,8),this.m.leaf);leaf.scale.set(w*.24,.03,w*.12);leaf.position.set(Math.sin(a)*w*.28,yy,Math.cos(a)*w*.28);leaf.rotation.set(.3,a,.4);g.add(leaf);}}
 }
 setPalette(name){this.palette=name;this.makeMaterials();this.buildHouse();this.buildFurniture(this.items);}
 setFloors(floors){this.floors=floors;this.buildHouse();this.buildFurniture(this.items);}
 setCutaway(v){this.cutaway=v;const cut=v&&this.mode!=='walk';for(const {mesh,h,y}of this.wallMeshes){let nh=Math.max(0,Math.min(y+h,.85)-y);mesh.visible=!cut||nh>0;mesh.scale.y=cut?nh/h:1;mesh.position.y=y+(cut?nh:h)/2;}this.ceiling.visible=this.mode==='walk';for(const c of this.curtains)c.visible=this.mode!=='top';this.updateBeamVisibility();}
 updateBeamVisibility(){const hidden=this.mode==='orbit'&&this.cutaway;for(const f of this.items||[]){if(f.type!=='beam')continue;const g=this.groups?.get(f.id);if(g)g.visible=hidden?false:(this.mode==='top'||!f.draft);}const selected=this.items?.find(f=>f.id===this.selected);if(this.selection&&selected?.type==='beam')this.selection.visible=hidden?false:(this.mode==='top'||!selected.draft);}
 updateLight(){this.updateOutdoor?.();this.hemi.intensity=this.night?.28:2.2;if(this.fill)this.fill.intensity=this.night?.1:1.05;this.sun.intensity=this.night?.08:.6;this.scene.background.set(this.night?'#77818a':'#dce4e2');for(const {f,point,share=1,span=Math.max(f.w,f.d)}of this.lightObjects||[]){const light=normalizeLight(f),spread=light.lightKind==='linear'?1:Math.max(.75,Math.min(1.6,Math.sqrt(Math.max(.01,f.w*f.d)/.0576))),base=(light.lumens/1200)*spread*share,color={white:'#eef6ff',natural:'#fff0cf',warm:'#ffc26f'}[light.colorTemperature];point.color?.set(color);point.distance=Math.max(2.8,5.5+span*2);const intensity=this.lightsOn&&light.on?(base*(light.dimming/100))*(this.night?1.2:.32):0;point.intensity=intensity*(point.isSpotLight?DOWNLIGHT_GAIN:1);point.visible=intensity>0;}this.assignLampShadows();if(this.bounce)this.bounce.intensity=this.night?ceilingBounce(this.lightsOn?[...new Set((this.lightObjects||[]).map(({f})=>f))].map(normalizeLight).filter(light=>light.on):[]):0;}
 resize(){let w=this.host.clientWidth,h=this.host.clientHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();let span=6;this.topCamera.left=-span*w/h;this.topCamera.right=span*w/h;this.topCamera.top=span;this.topCamera.bottom=-span;this.topCamera.updateProjectionMatrix();}
 get activeCamera(){return this.mode==='top'?this.topCamera:this.camera;}
 setMode(mode){
 if(mode===this.mode)return;
 this.cancelGesture?.();this.stopTour();this.keys.clear();
 if(this.mode==='orbit'){this.controls.enableDamping=false;this.controls.update();this.controls.enableDamping=true;}
 if(this.mode!=='top')this.viewStates[this.mode]={position:this.camera.position.clone(),quaternion:this.camera.quaternion.clone(),target:this.controls.target.clone(),fov:this.camera.fov,yaw:this.walkYaw,pitch:this.walkPitch};
 this.mode=mode;this.controls.enabled=mode==='orbit';
 const state=this.viewStates[mode];
 if(mode!=='top'&&state){this.camera.position.copy(state.position);this.camera.quaternion.copy(state.quaternion);this.camera.fov=state.fov;this.controls.target.copy(state.target);this.walkYaw=state.yaw;this.walkPitch=state.pitch;}
 else if(mode==='walk'){this.camera.position.set(.65,this.eye,7.65);this.walkYaw=0;this.walkPitch=0;this.camera.fov=70;}
 this.camera.updateProjectionMatrix();this.setCutaway(this.cutaway);this.updateGrid?.();this.refreshValidity();this.updateBeamVisibility();this.updateResizeHandles();this.ensureSafeCamera();
 }
 jump(x,z){this.camera.position.set(x,this.eye,z);this.ensureSafeCamera();this.walkYaw=0;this.walkPitch=0;}
 focus(f){if(this.mode==='walk'){this.startTour({x:f.x,z:f.z});return;}if(this.mode==='top'){this.topCamera.position.set(f.x,25,f.z);this.topCamera.lookAt(f.x,0,f.z);return}this.controls.target.set(f.x,f.h/2,f.z);this.camera.position.set(f.x+3,3.5,f.z+3);}
 startPlacement(){this.placing=true;this.host.classList?.add('placing');}
 cancelPlacement(notify=true){if(!this.placing)return;this.placing=false;this.host.classList?.remove('placing');if(notify)this.onCancelPlacement?.();}
 pick(e){const r=this.host.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);if(document.pointerLockElement===this.renderer.domElement)this.pointer.set(0,0);this.ray.setFromCamera(this.pointer,this.activeCamera);const hits=this.ray.intersectObjects([this.resizeHandles,this.furniture,this.building],true),targets=[];for(const hit of hits){if(!hit.object.visible)continue;let p=hit.object,target=null;while(p){if(p.userData.resize){target={kind:'resize',...p.userData.resize};break}if(p.userData.furniture){target={kind:'furniture',id:p.userData.furniture};break}if(p.userData.action){target={kind:'action',id:p.userData.action};break}p=p.parent;}if(target)targets.push(target);else if(hit.object.material===this.m.wall&&this.mode==='walk')break;}if(this.mode==='top'&&this.foregroundDraft)return targets.find(t=>t.kind==='resize'||t.kind==='furniture'&&t.id===this.foregroundDraft)||targets[0]||null;return targets[0]||null;}
 ground(e){const r=this.host.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.activeCamera);return this.ray.ray.intersectPlane(this.plane,new T.Vector3);}
 setForegroundDraft(id){this.foregroundDraft=this.items.some(f=>f.id===id&&f.draft)?id:null;this.refreshValidity();}
 makeInvalidMarker(f){const marker=new T.Group,fill=new T.MeshBasicMaterial({color:0xef3434,transparent:true,opacity:.32,depthTest:false,depthWrite:false}),edge=new T.MeshBasicMaterial({color:0xd91515,transparent:true,opacity:.96,depthTest:false,depthWrite:false});this.box(marker,f.w,.014,f.d,0,0,0,fill);for(const z of[-f.d/2,f.d/2])this.box(marker,f.w+.06,.022,.04,0,.006,z,edge);for(const x of[-f.w/2,f.w/2])this.box(marker,.04,.022,f.d+.06,x,.006,0,edge);return marker;}
 highlight(id){this.selected=id;if(this.selection){this.scene.remove(this.selection);this.selection.geometry.dispose();this.selection.material.dispose();this.selection=null}const f=this.items.find(i=>i.id===id);if(f){this.selection=new T.BoxHelper(this.groups.get(id),f.draft?0xd91515:0xc67748);this.selection.visible=this.mode==='top'||!f.draft;this.scene.add(this.selection);}this.refreshValidity();this.updateBeamVisibility();this.updateResizeHandles();}
 // A light mounted under a beam drops by the beam's depth. Top view looks down on the beam's
 // top, so there the light is lifted just above it instead, where it can be seen and picked.
 mountOffset(f){const drop=lightMountDrop(f,this.items||[]);if(!drop)return 0;if(this.mode!=='top')return -drop;const light=normalizeLight(f);return(light.lightKind==='pendant'?light.pendantLength:0)+Math.max(.02,f.h)+.01;}
 refreshValidity(){if(!this.invalidHelpers||!this.invalidMarkers)return;for(const f of this.items){const g=this.groups.get(f.id);if(!g)continue;const foreground=f.draft&&f.id===this.foregroundDraft;g.visible=(this.mode==='top'||!f.draft)&&!(f.type==='beam'&&this.mode==='orbit'&&this.cutaway);g.position.y=(this.mode==='top'&&foreground?HEIGHT+.12:0)+this.mountOffset(f);g.traverse(o=>{if(o.isMesh)o.renderOrder=foreground?200:0;});let h=this.invalidHelpers.get(f.id),marker=this.invalidMarkers.get(f.id);if(f.draft&&!h){h=new T.BoxHelper(g,0xd91515);this.invalidHelpers.set(f.id,h);this.scene.add(h);}if(f.draft&&!marker){marker=this.makeInvalidMarker(f);this.invalidMarkers.set(f.id,marker);this.scene.add(marker);}if(h){h.update();h.visible=f.draft&&this.mode==='top'&&f.id!==this.selected;if(!f.draft){this.scene.remove(h);h.geometry.dispose();h.material.dispose();this.invalidHelpers.delete(f.id);}}if(marker){marker.position.set(f.x,this.mode==='top'?(foreground?HEIGHT*2+.2:HEIGHT+.08):0,f.z);marker.rotation.y=f.rot*Math.PI/180;marker.visible=f.draft&&this.mode==='top';marker.traverse(o=>{if(o.isMesh)o.renderOrder=foreground?301:300;});if(!f.draft){this.scene.remove(marker);marker.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});this.invalidMarkers.delete(f.id);}}}if(this.foregroundDraft&&!this.items.some(f=>f.id===this.foregroundDraft&&f.draft))this.foregroundDraft=null;const selected=this.items.find(f=>f.id===this.selected);if(this.selection&&selected){this.selection.material.color.set(selected.draft?0xd91515:0xc67748);this.selection.visible=this.mode==='top'||!selected.draft;this.selection.update();}}
 bind(){
 const canvas=this.renderer.domElement;
 this.cancelGesture=()=>{if(this.drag?.moved)this.onDragEnd();if(this.resizeDrag?.moved)this.onResizeEnd?.();this.drag=null;this.resizeDrag=null;this.lookDrag=null;this.panDrag=null;this.down=null;};
 canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0&&e.button!==1)return;this.cancelGesture();if(this.mode==='walk')this.stopTour();
  this.down={x:e.clientX,y:e.clientY,id:e.pointerId,moved:false};canvas.setPointerCapture(e.pointerId);
  const hit=this.placing?null:(this.resizeAtPointer(e)||this.pick(e));
  if(this.mode==='top'&&hit?.kind==='resize'&&e.button===0){const f=this.items.find(f=>f.id===hit.id);if(f){this.onSelect(f.id);this.resizeDrag={id:f.id,axis:hit.axis,sign:hit.sign,start:{...f},moved:false};}}
  else if(this.mode==='top'&&hit?.kind==='furniture'&&e.button===0){const f=this.items.find(f=>f.id===hit.id),g=this.ground(e);this.drag={id:f.id,dx:f.x-g.x,dz:f.z-g.z,moved:false};}
  else if(this.mode==='top')this.panDrag={x:e.clientX,y:e.clientY};
  else if(this.mode==='walk')this.lookDrag={x:e.clientX,y:e.clientY};
 });
 canvas.addEventListener('pointermove',e=>{
  if(!this.down){const edge=this.resizeAtPointer(e);if(canvas.style)canvas.style.cursor=edge?resizeCursor(this.items.find(item=>item.id===edge.id),edge.axis):'';return;}
  if(e.pointerId!==this.down.id)return;
  if(e.pointerType!=='touch'&&!(e.buttons&3)){this.cancelGesture();return;}
  if(Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>5)this.down.moved=true;
  if(this.resizeDrag&&this.down.moved){let p=this.ground(e);if(p){this.resizeDrag.moved=true;this.onResize?.(this.resizeDrag.id,resizeAtHandle(this.resizeDrag.start,this.resizeDrag.axis,this.resizeDrag.sign,p,!!this.keepRatio).item);}}
  else if(this.drag&&this.down.moved){if(!this.drag.moved)this.onSelect(this.drag.id);let p=this.ground(e);if(p){this.drag.moved=true;this.onDrag(this.drag.id,p.x+this.drag.dx,p.z+this.drag.dz);}}
  else if(this.panDrag){const dx=e.clientX-this.panDrag.x,dy=e.clientY-this.panDrag.y,c=this.topCamera;const scale=(c.top-c.bottom)/c.zoom/this.host.clientHeight;c.position.x-=dx*scale;c.position.z-=dy*scale;this.panDrag={x:e.clientX,y:e.clientY};}
  else if(this.lookDrag){this.walkYaw+=(e.clientX-this.lookDrag.x)*.003;this.walkPitch=T.MathUtils.clamp(this.walkPitch+(e.clientY-this.lookDrag.y)*.003,-1.2,1.2);this.lookDrag={x:e.clientX,y:e.clientY};}
 });
 const release=e=>{if(!this.down||e.pointerId!==this.down.id)return;const click=!this.down.moved;if(this.drag?.moved)this.onDragEnd();if(this.resizeDrag?.moved)this.onResizeEnd?.();this.drag=null;this.resizeDrag=null;if(click&&this.placing&&this.mode==='top'){const p=this.ground(e);if(p)this.onPlace?.(p.x,p.z);}else if(click){const hit=this.pick(e);if(hit){this.onSelect(hit.id);if(this.actions.has(hit.id))this.onOperate(hit.id);}}this.cancelGesture();if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
 canvas.addEventListener('pointerup',release);
 canvas.addEventListener('pointercancel',this.cancelGesture);
 canvas.addEventListener('lostpointercapture',this.cancelGesture);
 window.addEventListener('pointerup',()=>this.cancelGesture());
 window.addEventListener('blur',()=>{this.cancelGesture();this.keys.clear();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){this.cancelGesture();this.keys.clear();}});
 canvas.addEventListener('wheel',e=>{if(this.mode==='top'){e.preventDefault();this.topCamera.zoom=T.MathUtils.clamp(this.topCamera.zoom*(e.deltaY>0?.92:1.08),.55,4);this.topCamera.updateProjectionMatrix();}else if(this.mode==='walk'){e.preventDefault();this.camera.fov=T.MathUtils.clamp(this.camera.fov+e.deltaY*.025,45,95);this.camera.updateProjectionMatrix();this.onFov?.(this.camera.fov);}},{passive:false});
 window.addEventListener('keydown',e=>{if(e.code==='Escape'&&!document.querySelector('dialog[open]')){this.keys.clear();if(this.placing)this.cancelPlacement();else this.onSelect(null);e.target?.blur?.();return;}if(this.items.some(f=>f.id===this.selected)&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&!['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();this.keys.clear();this.onNudge?.(this.selected,e.code,e.shiftKey);return;}if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||document.querySelector('dialog[open]'))return;if(this.mode==='walk'&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();this.keys.add(e.code);}if(e.code==='KeyE'&&!e.repeat&&this.selected)this.onOperate(this.selected);});
 window.addEventListener('keyup',e=>this.keys.delete(e.code));
 }
 updateGrid(){if(!this.snapGrid){this.snapGrid=new T.GridHelper(12,240,0x688679,0x91aaa0);this.snapGrid.position.set(4,.042,4);this.snapGrid.material.transparent=true;this.snapGrid.material.opacity=.32;this.snapGrid.material.depthWrite=false;this.scene.add(this.snapGrid);}this.snapGrid.visible=this.mode==='top'&&this.snapEnabled!==false;}
 moveItem(f){if(f.type==='beam'&&this.groups.has(f.id)){this.resizeItem(f);this.updateBeamVisibility();this.updateResizeHandles();return;}let g=this.groups.get(f.id);g.position.set(f.x,0,f.z);g.rotation.y=f.rot*Math.PI/180;this.refreshValidity();this.updateBeamVisibility();this.updateResizeHandles();}
 walkObstacles(includeDoors=true){
 const obstacles=[...this.collisionWalls,...this.items.filter(f=>!f.draft&&blocksCamera(f,this.eye))];
 for(const a of this.actions.values()){
  if(a.type==='door'){obstacles.push(...doorRects(a.def,includeDoors?a.amount:1));continue;}
  if(!a.item||a.amount<=.01||!blocksCamera(a.item,this.eye))continue;
  const f=a.item,ang=f.rot*Math.PI/180,local=(x,z)=>({x:f.x+x*Math.cos(ang)+z*Math.sin(ang),z:f.z-x*Math.sin(ang)+z*Math.cos(ang)});
 if(['drawer','cabdrawer'].includes(a.type)){const p=local(0,f.d/2+a.amount*a.travel/2);obstacles.push({...p,w:f.w*.8,d:a.amount*a.travel,rot:f.rot});}
    if(a.type==='cabinet')obstacles.push(...cabinetRects(f,a.amount));
    if(a.type==='washer'){const p=local(0,f.d/2+.15);obstacles.push({...p,w:f.w,d:.35,rot:f.rot});}
 }
 return obstacles;
 }
 canWalk(x,z){return pointClear(x,z,this.walkObstacles());}
 ensureSafeCamera(){
  if(this.mode!=='walk')return;
  const p=this.camera.position,obstacles=this.walkObstacles();if(pointClear(p.x,p.z,obstacles))return;
  const room=roomAt(p.x,p.z);for(let r=.05;r<3;r+=.05)for(let i=0;i<48;i++){const x=p.x+Math.cos(i*Math.PI/24)*r,z=p.z+Math.sin(i*Math.PI/24)*r;if(roomAt(x,z)===room&&pointClear(x,z,obstacles)){p.x=x;p.z=z;this.stopTour();return;}}
  this.onNavigationNotice?.('這個房間目前沒有安全站位，請先調整家具配置。');this.setMode('orbit');
 }
 stopTour(){this.route=[];this.routeWait=0;this.onRouteChange?.(false);}
 startTour(goal){
  this.ensureSafeCamera();const p=this.camera.position,obstacles=this.walkObstacles(false),clear=(x,z)=>pointClear(x,z,obstacles),path=findRoute({x:p.x,z:p.z},goal,clear);
  if(!path){this.onNavigationNotice?.('目前配置沒有可通行路線，請先移開擋路家具。');return false;}
  this.route=path;this.routeWait=0;this.keys.clear();
  for(const d of doors)if(path.some(point=>Math.hypot(point.x-d.x,point.z-d.z)<1.2)||path.some((point,i)=>{const from=i?path[i-1]:p,dx=point.x-from.x,dz=point.z-from.z,t=Math.max(0,Math.min(1,((d.x-from.x)*dx+(d.z-from.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(d.x-from.x-t*dx,d.z-from.z-t*dz)<1.3;}))this.openStates[d.id]=1;
  this.onDoorOpen?.();this.onRouteChange?.(true);return true;
 }
 followTour(dt){
  if(!this.route?.length)return false;if(this.keys.size){this.stopTour();return false;}
  const p=this.camera.position,target=this.route[0],dx=target.x-p.x,dz=target.z-p.z,len=Math.hypot(dx,dz);if(len<1e-5){this.route.shift();if(!this.route.length)this.stopTour();return true;}
  const step=Math.min(len,dt*1.2),x=p.x+dx/len*step,z=p.z+dz/len*step;
  if(this.canWalk(x,z)){p.x=x;p.z=z;this.routeWait=0;const yaw=Math.atan2(-dx,-dz),delta=Math.atan2(Math.sin(yaw-this.walkYaw),Math.cos(yaw-this.walkYaw));this.walkYaw+=delta*Math.min(1,dt*5);}else{this.routeWait+=dt;if(this.routeWait>2){this.stopTour();this.onNavigationNotice?.('路線被開啟的門片或家具擋住，請調整後再前往。');}}
  return true;
 }
 frame(){let dt=Math.min(this.clock.getDelta(),.04);if(this.mode==='orbit')this.controls.update();if(this.mode==='walk'){this.ensureSafeCamera();this.followTour(dt);const forward=(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)-(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0),side=(this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0),norm=Math.max(1,Math.hypot(forward,side)),speed=dt*1.5/norm;this.walkYaw+=((this.keys.has('ArrowLeft')?1:0)-(this.keys.has('ArrowRight')?1:0))*dt*1.3;let dx=(-Math.sin(this.walkYaw)*forward+Math.cos(this.walkYaw)*side)*speed,dz=(-Math.cos(this.walkYaw)*forward-Math.sin(this.walkYaw)*side)*speed;let p=this.camera.position;if(this.canWalk(p.x+dx,p.z))p.x+=dx;if(this.canWalk(p.x,p.z+dz))p.z+=dz;p.y=this.eye;this.camera.rotation.order='YXZ';this.camera.rotation.set(this.walkPitch,this.walkYaw,0);}
 let moving=false;for(const [id,a]of this.actions){let target=a.item?a.item.open||0:this.openStates[id]||0;if(Math.abs(a.amount-target)>1e-4)moving=true;a.amount=T.MathUtils.damp(a.amount,target,7,dt);if(a.type==='door')a.pivot.rotation.y=a.def.swing*a.amount*(a.def.maxAngle??89)*Math.PI/180;if(a.type==='shower')a.pivot.rotation.y=a.base+a.swing*a.amount*Math.PI/2;if(a.type==='washer')a.pivot.rotation.y=-a.amount*Math.PI*.5;if(a.type==='cabinet'){a.pivots.forEach(p=>p.rotation.y=(p.userData.swing??-1)*a.amount*Math.PI*.5);a.drawers.forEach(p=>p.position.z=a.base+a.amount*a.travel);a.slides.forEach(p=>p.position.x=p.userData.baseX+p.userData.travelX*a.amount);}if(a.type==='cabdrawer')a.drawers.forEach(p=>p.position.z=a.base+a.amount*a.travel);if(a.type==='drawer')a.pivot.position.z=a.base+a.amount*a.travel;if(a.type==='curtain')for(const p of a.panels){let factor=1-.8*a.amount;p.g.scale.x=factor;p.g.position.x=p.sign<0?-a.width/2:a.width/2-a.width/2*factor;}}
 if(this.surroundings){this.surroundings.visible=this.mode==='walk';if(this.sky)this.sky.position.copy(this.camera.position);}
 const focus=this.viewFocus?.();if(focus&&(!this.shadowFocus||Math.hypot(focus.x-this.shadowFocus.x,focus.z-this.shadowFocus.z)>.5))this.assignLampShadows();
 const shadowMap=this.renderer.shadowMap;if(shadowMap&&(this.shadowsDirty||moving)){shadowMap.needsUpdate=true;this.shadowsDirty=false;}
 this.selection?.update();this.renderer.render(this.scene,this.activeCamera);this.onFrame?.();}
 dispose(){this.renderer.setAnimationLoop(null);this.renderer.dispose();}
}
// Anything that moves, adds, hides or relights geometry makes the lamp shadows stale.
for(const name of['buildHouse','buildFurniture','moveItem','resizeItem','updateLight','setCutaway','setMode','refreshValidity','updateBeamVisibility','setForegroundDraft','highlight']){const method=SpaceScene.prototype[name];if(method)SpaceScene.prototype[name]=function(...args){const result=method.apply(this,args);this.shadowsDirty=true;return result;};}
