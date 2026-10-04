import {isAirConditioner,acBox} from './air-conditioner.js';
import {corners,overlaps,inside,insideOrOutline,insideShell,walls,wallRects,exteriorWallRects,minimumsFor,issues,wallsHit,turnedSize,outletSize,WALL_THICKNESS,TROUGH,troughCapacity,flatMount,flatArea} from './model.js';
import {EPS,signedDistance,roomAt,sameRoom,furnitureInterference,clashes} from './geometry.js';
import {modularCabinetRects,resizeCabinetDesign,cellOpening,cabinetCells,CARCASS_T} from './cabinet-design.js';
export {EPS,signedDistance,roomAt,sameRoom,distanceLabel,furnitureInterference} from './geometry.js';
// The rendered leaf, in the door group's frame: x runs along the opening from the hinge jamb,
// z across the wall. It closes inside the frame, flush with the wall face on its swing side,
// and turns about its hinge-side corner on that face, as butt hinges do. The hinge edge then
// stays put and the leaf never sweeps through the jamb. Every leaf fills its frame, stopping
// 2 mm short of each jamb face. Some openings start at a perpendicular wall, so the jamb face
// there is that wall's face, found by probing the opening for wall.
export const JAMB_WIDTH=.055,LEAF_THICKNESS=.045;
const leafCache=new Map;
function clearSpan(d){
 const ca=Math.cos(d.angle),sa=Math.sin(d.angle),step=.0025,solid=wallRects();
 const blocked=x=>{const probe={x:d.x+x*ca,z:d.z-x*sa,w:step,d:WALL_THICKNESS*.98,rot:d.angle*180/Math.PI};return solid.some(w=>overlaps(probe,w,1e-6));};
 let start=JAMB_WIDTH/2,end=d.width-JAMB_WIDTH/2;
 while(start<d.width/2&&blocked(start+step/2))start+=step;
 while(end>d.width/2&&blocked(end-step/2))end-=step;
 return[start,end];
}
export function doorLeaf(d){
 if(!leafCache.has(d.id)){const[start,end]=clearSpan(d);leafCache.set(d.id,{x:start+.002,width:end-start-.004});}
 const{x,width}=leafCache.get(d.id);
 return{x,z:-d.swing*WALL_THICKNESS/2,width,thickness:LEAF_THICKNESS,side:-d.swing};
}
// Collision and swing clearance use the rendered leaf (`doorLeaf`): the leaf itself and the
// handle on each face, turned about the same hinge corner the scene's pivot uses.
export function doorRects(d,amount=1,maxAngle=d.maxAngle??90){
 const leaf=doorLeaf(d),ca=Math.cos(d.angle),sa=Math.sin(d.angle),hx=d.x+leaf.x*ca+leaf.z*sa,hz=d.z-leaf.x*sa+leaf.z*ca,angle=d.angle+d.swing*amount*maxAngle*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),w=leaf.width,mid=-leaf.side*leaf.thickness/2;
 const rect=(x,z,width,depth)=>({x:hx+x*c+z*s,z:hz-x*s+z*c,w:width,d:depth,rot:angle*180/Math.PI});
 return [rect(w/2,mid,w,leaf.thickness),rect(w-.12,mid+.055,.105,.07),rect(w-.12,mid-.055,.105,.07)];
}
// Every leaf and handle rect at any angle lies within reach of the hinge, so
// only walls overlapping a square around it can stop the swing; testing just
// those gives the same limit as testing every wall, far faster.
export function fixedDoorLimit(d){const leaf=doorLeaf(d),ca=Math.cos(d.angle),sa=Math.sin(d.angle),hx=d.x+leaf.x*ca+leaf.z*sa,hz=d.z-leaf.x*sa+leaf.z*ca,reach=Math.hypot(leaf.width,.09+leaf.thickness)+.02,near={x:hx,z:hz,w:2*reach,d:2*reach,rot:0},obstacles=wallRects().filter(r=>signedDistance(r,near)<EPS);let safe=0;for(let degrees=0;degrees<=90;degrees+=.25){if(doorRects(d,1,degrees).some(r=>obstacles.some(w=>signedDistance(r,w)<-EPS)))break;safe=degrees;}return Math.max(0,safe-1);}
// A room door's whole swing, sampled every 2 degrees up to its limit (the leaf is at most
// 95 cm wide, so the far end moves about 3 cm between samples, less than the leaf's
// thickness). Furniture inside it would stop the door, so placement checks treat the swing
// as solid up to the door's height.
const sweepCache=new Map;
function doorSweep(d){
 if(!sweepCache.has(d.id)){const limit=d.maxAngle??fixedDoorLimit(d),rects=[];for(let a=0;a<limit;a+=2)rects.push(...doorRects(d,1,a));rects.push(...doorRects(d,1,limit));
  const leaf=doorLeaf(d),hinge=doorRects(d,0)[0],reach=Math.hypot(leaf.width,.09+leaf.thickness)+.02;
  sweepCache.set(d.id,{rects,x:hinge.x,z:hinge.z,reach:reach+leaf.width/2});}
 return sweepCache.get(d.id);
}
export function blocksDoor(d,f){
 if(isAirConditioner(f))f=acBox(f);
 if(['rug','light','beam'].includes(f.type)||(f.elevation||0)>=d.height-EPS)return false;
 const sweep=doorSweep(d);if(Math.hypot(f.x-sweep.x,f.z-sweep.z)>sweep.reach+Math.hypot(f.w,f.d)/2)return false;
 return sweep.rects.some(r=>signedDistance(r,f)<-EPS);
}
export function pointClear(x,z,obstacles,radius=.10){
 if(!inside(x,z))return false;
 for(const r of obstacles){const a=r.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=x-r.x,dz=z-r.z,lx=dx*c-dz*s,lz=dx*s+dz*c,ex=Math.max(Math.abs(lx)-r.w/2,0),ez=Math.max(Math.abs(lz)-r.d/2,0);if(ex*ex+ez*ez<radius*radius)return false;}
 return true;
}
export function segmentClear(a,b,clear){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.01));for(let i=0;i<=n;i++)if(!clear(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n))return false;return true;}
// Four-neighbour search, then visibility simplification. No diagonal corner cutting.
export function findRoute(start,goal,clear){
 const step=.05,room=roomAt(goal.x,goal.z),key=(x,z)=>x+','+z,cache=new Map;
 const valid=(x,z)=>{const k=key(x,z);if(!cache.has(k))cache.set(k,x>=-8&&x<=176&&z>=1&&z<=168&&clear(x*step,z*step));return cache.get(k);};
 const sx=Math.round(start.x/step),sz=Math.round(start.z/step);let seed=null;
 for(let r=0;r<=3&&!seed;r++)for(let x=sx-r;x<=sx+r&&!seed;x++)for(let z=sz-r;z<=sz+r;z++)if(valid(x,z)&&segmentClear(start,{x:x*step,z:z*step},clear)){seed=[x,z];break;}
 if(!seed)return null;
 const queue=[seed],parents=new Map([[key(...seed),null]]);let best=null,bestDist=Infinity;
 for(let head=0;head<queue.length;head++){const [x,z]=queue[head],p={x:x*step,z:z*step},dist=Math.hypot(p.x-goal.x,p.z-goal.z);if(roomAt(p.x,p.z)===room&&dist<bestDist){best=[x,z];bestDist=dist;if(dist<.12)break;}
  for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(!parents.has(k)&&valid(nx,nz)&&segmentClear(p,{x:nx*step,z:nz*step},clear)){parents.set(k,[x,z]);queue.push([nx,nz]);}}
 }
 if(!best)return null;const raw=[];for(let p=best;p;p=parents.get(key(...p)))raw.push({x:p[0]*step,z:p[1]*step});raw.reverse();raw.unshift({x:start.x,z:start.z});const route=[];let index=0;while(index<raw.length-1){let next=raw.length-1;while(next>index+1&&!segmentClear(raw[index],raw[next],clear))next--;route.push(raw[next]);index=next;}return route;
}



// Low tables/chairs can be viewed from above; tall furniture always protects the camera.
// Plants are leaves you brush past, so walking goes through them.
export const blocksCamera=(f,eye=1.6)=>isAirConditioner(f)?blocksCamera({...acBox(f),type:'television'},eye):!['rug','light','beam','plant','outlet'].includes(f.type)&&(['television','hangingCabinet'].includes(f.type)?f.elevation<eye+.1&&f.elevation+f.h>eye-.2:f.h>.15&&(!['table','chair','desk'].includes(f.type)||f.h>=eye-.2));
export function cabinetLayout(f){
 const style=f.doorStyle||'double',edge=.015;
 if(style==='drawers'){const n=f.type==='console'?Math.max(1,Math.ceil(f.w/.6)):Math.max(1,Math.ceil(f.w/.8)),pw=(f.w-edge*2)/n;return{doors:[],drawers:Array.from({length:n},(_,i)=>({x:-f.w/2+edge+pw*(i+.5),width:pw-edge,rows:f.type==='console'?1:3})),slides:[]};}
 if(style==='sliding')return{doors:[],drawers:[],slides:[{x:-f.w*.245,width:f.w*.51,sign:1},{x:f.w*.245,width:f.w*.51,sign:-1}]};
 if(style==='mixed'){
 const module=f.w/3;
  if(f.type==='kitchen')return{doors:[{hinge:f.w/2-module+edge,sign:1,width:module/2-edge},{hinge:f.w/2-edge,sign:-1,width:module/2-edge}],drawers:[{x:-module,width:module-edge,rows:3},{x:0,width:module-edge,rows:3}],slides:[]};
  return{doors:[{hinge:-f.w/2+edge,sign:1,width:module-edge},{hinge:f.w/2-edge,sign:-1,width:module-edge}],drawers:[{x:0,width:module-edge,rows:1}],slides:[]};
 }
 const n=style==='multi'?Math.max(2,Math.ceil(f.w/.6)):style==='double'?2:1,pw=(f.w-edge)/n;
 const doors=Array.from({length:n},(_,i)=>{const left=-f.w/2+edge+i*pw,right=style==='right'||style==='double'&&i===1||style==='multi'&&i%2===1;return{hinge:right?left+pw:left,sign:right?-1:1,width:pw};});
 return{doors,drawers:[],slides:[]};
}
export const cabinetLeaves=f=>cabinetLayout(f).doors;
export function cabinetRects(f,amount){
 if(f.cabinetDesign)return modularCabinetRects(f,Object.fromEntries(f.cabinetDesign.columns.flatMap(column=>column.cells).map(cell=>[cell.id,amount])));
 const layout=cabinetLayout(f),rot=f.rot*Math.PI/180,world=(x,z)=>({x:f.x+x*Math.cos(rot)+z*Math.sin(rot),z:f.z-x*Math.sin(rot)+z*Math.cos(rot)});
 const doors=layout.doors.map(leaf=>{const a=-leaf.sign*amount*Math.PI/2,x=leaf.hinge+leaf.sign*Math.cos(a)*leaf.width/2,z=f.d/2-leaf.sign*Math.sin(a)*leaf.width/2,p=world(x,z);return{...p,w:leaf.width,d:.08,rot:f.rot+a*180/Math.PI};});
 const travel=f.d*.55,drawers=layout.drawers.filter(()=>amount>0).map(drawer=>{const p=world(drawer.x,f.d/2+amount*travel/2);return{...p,w:drawer.width,d:amount*travel,rot:f.rot};});
 return [...doors,...drawers];
}
export function showerDoorLayout(f){
 if(f.id==='showerA'){const width=Math.min(.68,f.w-.12);return{hingeX:f.w/2,hingeZ:-f.d/2,endX:f.w/2-width,endZ:-f.d/2,width,swing:1};}
 const cut=Math.min(.3,f.w*.25,f.d*.45),hingeX=-f.w/2+cut,hingeZ=-f.d/2,endX=-f.w/2,endZ=-f.d/2+cut;
 return{hingeX,hingeZ,endX,endZ,width:Math.hypot(endX-hingeX,endZ-hingeZ),swing:1};
}
// A socket flat against the nearest wall or column face inside the flat, facing out.
// With `clamp` (a move) it stays on a wall run and off other walls; without (a turn, a load) it keeps
// its place on the wall it is on, even past the run's end, which `issues` then flags like a clash.
export function wallMount(f,{clamp=true}={}){
 let best=null;const rects=wallRects();
 // Wall joints only fill corners; a socket goes on a wall run or a column face.
 for(const w of rects){
  if(w.id?.startsWith('wall-joint-'))continue;
  const a=w.rot*Math.PI/180,tx=Math.cos(a),tz=-Math.sin(a),half=w.w/2-f.w/2;if(half<0&&clamp)continue;
  // Unclamped, only a run the plate still overlaps counts, not the line through a distant wall.
  const raw=(f.x-w.x)*tx+(f.z-w.z)*tz;if(!clamp&&Math.abs(raw)>w.w/2+f.w/2)continue;
  const along=clamp?Math.max(-half,Math.min(half,raw)):raw;
  for(const sign of[-1,1]){
   const nx=Math.sin(a)*sign,nz=Math.cos(a)*sign,out=w.d/2+f.d/2,x=w.x+tx*along+nx*out,z=w.z+tz*along+nz*out,rot=Math.round(Math.atan2(nx,nz)*180/Math.PI)||0;
   if(!insideOrOutline(x,z)||clamp&&rects.some(o=>o!==w&&clashes({...f,x,z,rot},o)))continue;
   const dist=Math.hypot(x-f.x,z-f.z);if(!best||dist<best.dist)best={x,z,rot,dist};
  }
 }
 return best?{x:best.x,z:best.z,rot:best.rot}:{};
}
// A wall-mounted TV flat on the nearest wall, facing out; turned in the wall by `spin`, it
// takes up its turned width along the wall.
// A back panel on that wall (a TV wall) comes between: the TV then hangs on the panel's face.
export function wallTvMount(tv,items=[],{clamp=true}={}){
 const [w,tall]=turnedSize(tv.w,tv.h,tv.spin||0),placed=wallMount({...tv,w},{clamp});if(!Number.isFinite(placed.x))return placed;
 const p=ontoPanels({...tv,...placed,w},tall,items);
 return{x:p.x,z:p.z,rot:p.rot};
}
// Pushes something flat on a wall (facing its local +z) out onto the face of any back panel
// on that wall at its height, so it sits on the panel rather than inside it.
function ontoPanels(p,tall,items){
 const a=p.rot*Math.PI/180,nx=Math.sin(a),nz=Math.cos(a),bottom=p.elevation||0;
 for(let i=0;i<4;i++){
  const panel=items.find(o=>o.type==='panel'&&o.id!==p.id&&(o.elevation||0)<bottom+tall&&bottom<(o.elevation||0)+o.h&&signedDistance(p,o)<-EPS);
  if(!panel)break;const push=-signedDistance(p,panel);p={...p,x:p.x+nx*push,z:p.z+nz*push};
 }
 return p;
}
// Things flat against a wall or back panel, which move along it and turn in its plane.
// Sockets and troughs lying face up (on a top or a shelf) turn on it instead.
export const onWallPlane=f=>isAirConditioner(f)||f?.type==='outlet'&&!flatMount(f)||f?.type==='television'&&f.tvMount==='wall';
// A turn in the wall plane keeps the plate's centre where it was, like a turn on a top: the
// stored elevation is the bottom of the turned bounding box, so it moves by half the change in
// height (validation then keeps it between the floor and the ceiling).
const planeTall=f=>isAirConditioner(f)?acBox(f).h:f.type==='outlet'?outletSize(f.outletKind,f.outletMount,f.spin||0)[2]:turnedSize(f.w,f.h,f.spin||0)[1];
export const turnAboutCentre=(before,after)=>({...after,elevation:(before.elevation||0)+(planeTall(before)-planeTall(after))/2});
// A socket in a cabinet cell dragged to `point` on the plane of its back panel: into the cell
// under that point (so crossing a divider moves it to the next cell), else kept in its own cell,
// clamped to the opening so it slides along the edge. Walk view uses it when the pointer is on
// a board edge, a divider side or anything else that is not a cell.
export function socketInCellPlane(o,point,items){
 const host=items.find(i=>i.id===o.supportId);if(!host?.cabinetDesign)return null;
 const a=host.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=point.x-host.x,dz=point.z-host.z,u=dx*c-dz*s;
 const lift=['hangingCabinet','panel','cove','television'].includes(host.type)?host.elevation||0:0,y=point.y-lift;
 const cell=cabinetCells(host).find(cell=>cell.front!=='drawers'&&u>=cell.x-cell.w/2&&u<=cell.x+cell.w/2&&y>=cell.bottom&&y<=cell.bottom+cell.h);
 return placeOutlet({...o,supportCell:cell?.id??o.supportCell,x:point.x,z:point.z,elevation:point.y-o.h/2},items,{fromPoint:true});
}
// Where a socket sits: on the nearest wall, or on its host (a cabinet's top, or a cell's back
// panel) at `offsetX`/`offsetZ` in the host's own axes, so it follows the host. With
// `fromPoint` its x/z (a drag) set that spot first.
// `stop` (a move; any `fromPoint` is one) stops it at the edges of its wall, cell or top; without it
// (a turn, a load, its host changing) it stays where it is.
export function placeOutlet(o,items,{fromPoint=false,stop=fromPoint}={}){
 // Only a move (`stop`) stops at edges; a turn or a load leaves it in place, flagged by `issues` if
 // it now runs past its wall or cell, as furniture that clashes stays put with a red frame.
 if(o.outletMount==='wall')return ontoPanels({...o,...wallMount(o,{clamp:stop})},o.h,items);
 const host=items.find(i=>i.id===o.supportId);if(!host)return o;
 const a=host.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),base=['hangingCabinet','panel','cove','television'].includes(host.type)?host.elevation||0:0;
 let u=o.offsetX||0,v=o.offsetZ||0;
 if(fromPoint){const dx=o.x-host.x,dz=o.z-host.z;u=dx*c-dz*s;v=dx*s+dz*c;}
 // A plate lying on a top may turn on it (`offsetRot`, relative to the host); one on a back panel faces out.
 const at=(u,v,elevation,turn=0)=>({...o,offsetX:u,offsetZ:v,x:host.x+u*c+v*s,z:host.z-u*s+v*c,rot:((host.rot+turn)%360+360)%360,elevation});
 if(o.outletMount==='cell'){
  const opening=host.cabinetDesign&&cellOpening(host,o.supportCell);if(!opening)return o;
  if(!stop)return at(u,-host.d/2+CARCASS_T+o.d/2,o.elevation);
  return at(clamp(u,opening.x-opening.w/2+o.w/2,opening.x+opening.w/2-o.w/2),-host.d/2+CARCASS_T+o.d/2,clamp(o.elevation,base+opening.bottom,base+opening.bottom+opening.h-o.h));
 }
 // Face up on a top, or on a cell's shelf, turned by `offsetRot` (relative to the host). Like furniture,
 // only a move (`fromPoint`: a drag or a typed position) stops at the edges of that surface; a turn
 // turns it about its centre and a host that shrinks or moves leaves it where it is, so running past
 // the edge is flagged by `issues` (a red frame), never pushed back or cut to fit. A trough placed for
 // the first time turns along the host's edge nearest a wall (in a cell, the back panel), slot on its
 // back (-z), and keeps that turn from then on; only the rotation field changes it.
 const opening=o.outletMount==='shelf'&&host.cabinetDesign&&cellOpening(host,o.supportCell);if(o.outletMount==='shelf'&&!opening)return o;
 const area=flatArea(o,host);
 let turn=Number.isFinite(o.offsetRot)?o.offsetRot:o.trough?(opening?0:troughTurn(host)):0;
 if(o.trough?.flip)turn+=180; // saved before the flip switch was dropped
 turn=((turn%360)+360)%360;
 const t=turn*Math.PI/180,ac=Math.abs(Math.cos(t)),as=Math.abs(Math.sin(t)),span=[o.w*ac+o.d*as,o.w*as+o.d*ac],fit=(v,lo,hi)=>lo<=hi?clamp(v,lo,hi):(lo+hi)/2;
 const placed=stop?at(fit(u,area.u1+span[0]/2,area.u2-span[0]/2),fit(v,area.v1+span[1]/2,area.v2-span[1]/2),opening?base+opening.bottom:base+host.h,turn):at(u,v,opening?base+opening.bottom:base+host.h,turn);
 if(o.trough){placed.offsetRot=turn;placed.trough={count:Math.min(o.trough.count,troughCapacity(o.w))};}
 return placed;
}
// Which way a trough on `host` turns (degrees, relative to the host) so its slot faces the edge of
// the top nearest a wall: 0 its back, 180 its front, 90 its left end, 270 its right end.
export function troughTurn(host){
 const a=host.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),world=(u,v)=>({x:host.x+u*c+v*s,z:host.z-u*s+v*c,w:.01,d:.01,rot:0}),rects=wallRects();
 const edges=[[0,0,-host.d/2],[180,0,host.d/2],[90,-host.w/2,0],[270,host.w/2,0]].map(([turn,u,v])=>({turn,gap:Math.min(...rects.map(r=>signedDistance(world(u,v),r)))}));
 return edges.reduce((best,e)=>e.gap<best.gap-1e-6?e:best).turn;
}
// Where a socket dragged or clicked onto a surface in walk view goes: a wall (a building face
// that stands upright) at the pointer's height; the top of a cabinet, desk or table; or, on a
// cabinet's front, door or inside, the back panel of the cell under the pointer. Anything
// else (floor, ceiling, a sofa) gives null. `surface` is {point, normal, id} from the scene.
export const socketHosts=['wardrobe','console','drawer','sink','kitchen','desk','table','hangingCabinet','cornerShelf'];
// Top view: the host whose top a point lies on (the highest one where several stack), or null.
export function topHostAt(x,z,items){
 let best=null;
 for(const f of items){
  if(!socketHosts.includes(f.type))continue;
  const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=x-f.x,dz=z-f.z;
  if(Math.abs(dx*c-dz*s)>f.w/2||Math.abs(dx*s+dz*c)>f.d/2)continue;
  const top=(['hangingCabinet'].includes(f.type)?f.elevation||0:0)+f.h;
  if(!best||top>best.top)best={f,top};
 }
 return best?.f||null;
}
// A socket clicked or dragged in top view: onto the top under the pointer, else onto the
// nearest wall. One in a cell stays in its cell (top view cannot reach inside cabinets).
export function socketFromTopView(o,point,items){
 if(o.outletMount==='cell'||o.outletMount==='shelf')return{...o,x:point.x,z:point.z};
 const host=topHostAt(point.x,point.z,items.filter(f=>f.id!==o.id)),next={...o,x:point.x,z:point.z};
 delete next.offsetX;delete next.offsetZ;
 if(host)return{...next,outletMount:'top',supportId:host.id};
 // A trough only goes on a top: off one, it stays where it was.
 if(o.trough)return o;
 delete next.supportId;delete next.supportCell;delete next.offsetRot;
 return{...next,outletMount:'wall'};
}
export function socketOnSurface(o,{point,normal,id},items){
 const base={...o,x:point.x,z:point.z};delete base.supportId;delete base.supportCell;delete base.offsetX;delete base.offsetZ;
 // A trough only lies on a surface facing up: a top or a shelf.
 if(!id){if(o.trough||Math.abs(normal.y)>.3)return null;return{...base,outletMount:'wall',elevation:point.y-o.h/2};}
 const host=items.find(item=>item.id===id);if(!host||!socketHosts.includes(host.type))return null;
 const lift=['hangingCabinet','panel','cove','television'].includes(host.type)?host.elevation||0:0;
 // A shelf top inside a modular cabinet is that shelf, not the cabinet's top.
 if(normal.y>.7&&!(host.cabinetDesign&&point.y<lift+host.h-.005))return{...base,outletMount:'top',supportId:host.id};
 if(!host.cabinetDesign)return null;
 const a=host.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=point.x-host.x,dz=point.z-host.z,u=dx*c-dz*s,y=point.y-lift+(normal.y>.7?.005:normal.y<-.7?-.005:0);
 // A board's top or underside lies on the line between two cells: it counts for the cell it faces.
 // A side panel faces sideways in the cabinet's own axes: that is not a way into a cell.
 if(Math.abs(normal.x*c-normal.z*s)>.7&&Math.abs(u)>host.w/2-.03)return null;
 const cell=cabinetCells(host).find(cell=>u>=cell.x-cell.w/2-1e-6&&u<=cell.x+cell.w/2+1e-6&&y>=cell.bottom-1e-6&&y<=cell.bottom+cell.h+1e-6);
 // Nobody puts a socket inside a drawer, and there the drawer front would hide it.
 if(!cell||cell.front==='drawers')return null;
 // A shelf's top: lying on it. Otherwise (the back panel, a board's underside) on the cell's back panel.
 if(normal.y>.7)return{...base,outletMount:'shelf',supportId:host.id,supportCell:cell.id};
 if(o.trough)return null;
 return{...base,outletMount:'cell',supportId:host.id,supportCell:cell.id,elevation:point.y-o.h/2};
}
// The desk's drawer, shared by the drawing and the opening check: 13 cm high just under the
// top (its centre 12 cm below it), 65 % of the desk's width, 30 cm deep, sliding out 30 cm.
export function deskDrawer(f){return{y:f.h-.12,height:.13,w:f.w*.65,depth:.3,z:f.d/2-.16,travel:.3};}
// The washer's round door, shared by the drawing and the opening check: hinged 0.33 w left
// of centre, 8 cm in front of the body, its leaf reaching from -0.03 w to 0.69 w past the
// hinge, with a porthole rim of radius 0.31 w centred at 0.48 h.
export function washerDoor(f){return{hinge:[-f.w*.33,f.d/2+.08],y:f.h*.48,from:-f.w*.03,to:f.w*.69,radius:f.w*.31,thickness:.08};}
export function washerDoorRects(f,amount){
 const door=washerDoor(f),a=amount*Math.PI/2,r=f.rot*Math.PI/180,mid=(door.from+door.to)/2,lx=door.hinge[0]+Math.cos(a)*mid,lz=door.hinge[1]+Math.sin(a)*mid;
 return[{x:f.x+lx*Math.cos(r)+lz*Math.sin(r),z:f.z-lx*Math.sin(r)+lz*Math.cos(r),w:door.to-door.from,d:door.thickness,rot:f.rot-amount*90,yMin:Math.max(0,door.y-door.radius),yMax:door.y+door.radius}];
}
export function showerDoorRects(f,amount){
 const door=showerDoorLayout(f),base=Math.atan2(-(door.endZ-door.hingeZ),door.endX-door.hingeX),angle=base+door.swing*amount*Math.PI/2,localX=door.hingeX+Math.cos(angle)*door.width/2,localZ=door.hingeZ-Math.sin(angle)*door.width/2,rot=f.rot*Math.PI/180,c=Math.cos(rot),s=Math.sin(rot);
 return[{x:f.x+localX*c+localZ*s,z:f.z-localX*s+localZ*c,w:door.width,d:.035,rot:f.rot+angle*180/Math.PI}];
}
// Stop at first contact, including a fractional final centimetre. Sampling prevents tunnelling.
export function constrainMove(f,target,items){
 const obstacles=[...wallRects(),...items.filter(o=>o.id!==f.id&&o.type!=='rug'&&f.type!=='rug')];
 const initial=obstacles.map(o=>signedDistance(f,o));
 const initialConflict=obstacles.map((o,i)=>o.type?furnitureInterference(f,o):initial[i]<0);
 const clear=p=>corners(p).every(([x,z])=>insideOrOutline(x,z))&&obstacles.every((o,i)=>o.type?(!furnitureInterference(p,o)||initialConflict[i]):signedDistance(p,o)>=Math.min(0,initial[i])-EPS);
 const dx=target.x-f.x,dz=target.z-f.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.01));let previous=0;
 for(let i=1;i<=n;i++){const t=i/n,p={...f,x:f.x+dx*t,z:f.z+dz*t};if(!clear(p)){let lo=previous,hi=t;for(let j=0;j<35;j++){const mid=(lo+hi)/2;if(clear({...f,x:f.x+dx*mid,z:f.z+dz*mid}))lo=mid;else hi=mid;}return{item:{...f,x:f.x+dx*lo,z:f.z+dz*lo},blocked:true};}previous=t;}
 return{item:{...f,x:target.x,z:target.z},blocked:false};
}

// The first physical problem `next` (a moved or resized `f`) has that `f` did not: leaving
// the apartment or a new clash with a wall, column or other item. Door sweeps are only
// warned about, so they never stop a move; clashes `f` already had never block it either.
export function addedProblem(f,next,items){return problemCheck(f,items)(next);}
// The same test as a function of the changed item, with `f`'s own problems worked out once.
// Walls are compared one by one: an item already touching one wall must still stop at the next.
function problemCheck(f,items){
 const others=items.filter(o=>o.id!==f.id),before=new Set(issues(f,[f,...others],{doorSweeps:false})),walls=new Set(wallsHit(f)),wall='與牆體重疊';
 return next=>{
  const found=issues(next,[next,...others],{doorSweeps:false}).find(message=>message!==wall&&!before.has(message));
  if(found)return found;
  return wallsHit(next).some(i=>!walls.has(i))?wall:'';
 };
}
// Moves `f` toward `target`: straight there when that adds no problem (so a drag can hop
// over an obstacle once the pointer reaches free space), otherwise as far as it can along
// each axis in turn, stopping at contact and sliding along what it touches.
export function guardedMove(f,target,items){
 const check=problemCheck(f,items),desired={...f,x:target.x,z:target.z};
 if(!check(desired))return{item:desired,reason:''};
 // 5 cm steps: an item plus the thinnest wall or beam is thicker, so none is stepped over.
 // The reason reported is what the item runs into, not what lies under the pointer.
 const travel=({item:start,reason},axis,value)=>{
  const delta=value-start[axis],n=Math.max(1,Math.ceil(Math.abs(delta)/.05)),at=t=>({...start,[axis]:start[axis]+delta*t});
  for(let i=1;i<=n;i++){
   const hit=check(at(i/n));if(!hit)continue;
   let lo=(i-1)/n,hi=i/n;for(let j=0;j<25;j++){const mid=(lo+hi)/2;if(check(at(mid)))hi=mid;else lo=mid;}
   return{item:at(lo),reason:reason||hit};
  }
  return{item:at(1),reason};
 };
 const first={item:f,reason:''},xz=travel(travel(first,'x',target.x),'z',target.z),zx=travel(travel(first,'z',target.z),'x',target.x);
 const score=({item})=>Math.hypot(item.x-target.x,item.z-target.z);
 return score(xz)<=score(zx)?xz:zx;
}
// Where a wall socket may slide: a wall, column or back panel behind the whole width of its
// plate (checked 5 mm behind it at both ends), so it stops at a doorway instead of sliding off
// into the air; and no wall entering the plate. Sockets are exempt from wall clashes
// (`wallsHit`) because they sit on one, so the plate is shrunk by a millimetre to tell the
// wall it lies on from a corner or partition it runs into.
export function wallSlideProblem(items){
 const backs=[...wallRects(),...items.filter(o=>o.type==='panel')],solid=[...wallRects(),...exteriorWallRects()];
 const within=(r,x,z)=>{const a=r.rot*Math.PI/180,dx=x-r.x,dz=z-r.z;return Math.abs(dx*Math.cos(a)-dz*Math.sin(a))<=r.w/2+1e-6&&Math.abs(dx*Math.sin(a)+dz*Math.cos(a))<=r.d/2+1e-6;};
 return p=>{const a=p.rot*Math.PI/180,nx=Math.sin(a),nz=Math.cos(a),tx=Math.cos(a),tz=-Math.sin(a),back=p.d/2+.005,half=Math.max(0,p.w/2-.005);
  if(! [-half,half].every(u=>{const x=p.x-nx*back+tx*u,z=p.z-nz*back+tz*u;return backs.some(r=>within(r,x,z));}))return'超出牆面';
  const plate={...p,w:p.w-.002,d:p.d-.002};return solid.some(w=>clashes(plate,w))?'與牆體重疊':'';};
}
// A wall socket moved, raised or turned: straight there when that buries it in nothing new.
// Otherwise, like `guardedMove`, it travels along the wall and up or down in turn (1 cm steps,
// as it is only 1.5 cm thick), stopping at contact and sliding along what it touches, and
// keeps whichever order ends nearer the pointer. A move from another mount that would bury it is
// refused (the socket stays as `f`); a turn on the wall turns in place and `issues` flags any clash. With `hop` false it never jumps straight to
// a clear target, so a point on the wall's plane past a partition does not carry it into the next room.
export function guardedSocket(f,next,items,{hop=true}={}){
 if(next.outletMount!=='wall')return{item:next,reason:''};
 const clash=problemCheck(f,items),wall=wallSlideProblem(items),guard=wall(f)?()=>'':wall;
 const check=p=>clash(p)||guard(p),hit=check(next);if(!hit&&hop)return{item:next,reason:''};
 // A turn on the wall turns in place: what it then covers or runs past is flagged by `issues`, like
 // furniture turned into a clash. A move onto the wall from elsewhere that would bury it is refused.
 if(f.outletMount==='wall'&&(f.spin||0)!==(next.spin||0))return{item:next,reason:''};
 if(f.outletMount!=='wall')return{item:f,reason:hit};
 return guardedPlaneMove(f,next,check,{hop});
}
// Shared wall-plane slide, with along/up contact and no tunnelling in walk view.
export function guardedAirConditioner(f,next,items,{hop=true}={}){
 const check=problemCheck(f,items);
 if((f.spin||0)!==(next.spin||0))return{item:next,reason:''};
 return guardedPlaneMove(f,next,check,{hop});
}
function guardedPlaneMove(f,next,check,{hop}){
 if(hop&&!check(next))return{item:next,reason:''};
 const travel=({item:start,reason},goal)=>{
  const at=t=>{const p={...next};for(const key of['x','z','elevation'])p[key]=(start[key]||0)+((goal[key]||0)-(start[key]||0))*t;return p;};
  const n=Math.max(1,Math.ceil(Math.hypot(goal.x-start.x,goal.z-start.z,(goal.elevation||0)-(start.elevation||0))/.01));
  for(let i=1;i<=n;i++){
   const found=check(at(i/n));if(!found)continue;
   let lo=(i-1)/n,hi=i/n;for(let j=0;j<25;j++){const mid=(lo+hi)/2;if(check(at(mid)))hi=mid;else lo=mid;}
   return{item:at(lo),reason:reason||found};
  }
  return{item:at(1),reason};
 };
 // A move to another wall (a different facing) cannot be split into along and up, so it goes straight.
 const first={item:{...next,x:f.x,z:f.z,elevation:f.elevation||0},reason:''};
 if((f.rot||0)!==(next.rot||0))return travel(first,next);
 const along=({item})=>({x:next.x,z:next.z,elevation:item.elevation}),up=({item})=>({x:item.x,z:item.z,elevation:next.elevation||0});
 const a=(r=>travel(r,up(r)))(travel(first,along(first))),b=(r=>travel(r,along(r)))(travel(first,up(first)));
 const score=({item})=>Math.hypot(item.x-next.x,item.z-next.z,(item.elevation||0)-(next.elevation||0));
 return score(a)<=score(b)?a:b;
}
// The largest step toward a bigger size that adds no problem: `make(k)` builds the item k
// whole centimetres of the way (k = 0 is `f` itself, k = steps the requested size).
export function largestFit(f,make,steps,items){
 const check=problemCheck(f,items);
 if(!check(make(steps)))return{item:make(steps),reason:'',k:steps};
 let lo=0,hi=steps;
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(check(make(mid)))hi=mid-1;else lo=mid;}
 // What the next centimetre runs into, not what the full requested size would.
 return{item:lo?make(lo):null,reason:check(make(lo+1)),k:lo};
}
// A size change a fraction t of the way from f to next (position included, so a fixed side
// stays put); cabinets resize their cells along.
export function sizedStep(f,next,t){const p={...next};for(const key of['x','z','w','d','h'])p[key]=f[key]+(next[key]-f[key])*t;if(f.cabinetDesign&&(p.w!==f.w||p.h!==f.h))p.cabinetDesign=resizeCabinetDesign(f.cabinetDesign,{w:f.w,h:f.h},{w:p.w,h:p.h});return p;}
// The largest size toward next that adds no clash. The limit is found to a micrometre, then
// the dimension that changes most is rounded down to a whole millimetre (0.1 cm, the
// precision the size fields show) measured from zero, so a drag stops at the same size
// however it got there, and at the largest size one could type.
// `k` is how far that dimension got, for comparing anchors.
export function fitSize(f,next,items){
 const key=['w','d','h'].reduce((a,b)=>Math.abs(next[b]-f[b])>Math.abs(next[a]-f[a])?b:a),from=f[key],to=next[key],span=to-from;
 const steps=1<<20,fit=largestFit(f,k=>sizedStep(f,next,k/steps),steps,items);
 if(!fit.reason||!span)return{...fit,k:Math.abs(span)};
 const limit=from+span*fit.k/steps,mm=span>0?Math.floor(limit*1000+1e-3)/1000:Math.ceil(limit*1000-1e-3)/1000,t=(mm-from)/span;
 if(t<=0)return{item:null,reason:fit.reason,k:0};
 const item=sizedStep(f,next,t);item[key]=mm;
 return{item,reason:fit.reason,k:Math.abs(mm-from)};
}
// Editor drags represent lifting an item. Interior conflicts remain editable drafts;
// only crossing the apartment's exterior outline blocks the pointer position.
export function placeAtTarget(f,target,items){
 const exterior=exteriorWallRects();
 const clear=item=>corners(item).every(([x,z])=>insideOrOutline(x,z))&&exterior.every(w=>signedDistance(item,w)>=-EPS);
 const desired={...f,...target};
 if(clear(desired))return{item:desired,blocked:false};
 // New catalogue items start at a neutral template coordinate outside the
 // apartment. Find the nearest viable point around a boundary click instead
 // of persisting that off-canvas template position.
 if(!clear(f)){for(let radius=.01;radius<=4;radius+=.01)for(let step=0;step<24;step++){const angle=step*Math.PI/12,candidate={...desired,x:desired.x+Math.cos(angle)*radius,z:desired.z+Math.sin(angle)*radius};if(clear(candidate))return{item:candidate,blocked:true};}return{item:null,blocked:true};}
 // Resolve axes independently when the pointer also pushes into a wall. This
 // preserves the tangent component, so an item already at the shell can slide
 // along it instead of appearing stuck.
 const travel=(start,axis,value)=>{let delta=value-start[axis],n=Math.max(1,Math.ceil(Math.abs(delta)/.005)),last=start;for(let i=1;i<=n;i++){let candidate={...start,[axis]:start[axis]+delta*i/n};if(!clear(candidate)){let lo=(i-1)/n,hi=i/n;for(let j=0;j<30;j++){let mid=(lo+hi)/2,candidate={...start,[axis]:start[axis]+delta*mid};if(clear(candidate))lo=mid;else hi=mid;}return{...start,[axis]:start[axis]+delta*lo};}last=candidate;}return last;};
 const xz=travel(travel(f,'x',target.x),'z',target.z),zx=travel(travel(f,'z',target.z),'x',target.x);
 const score=p=>Math.hypot(p.x-target.x,p.z-target.z),item=score(xz)<=score(zx)?xz:zx;
 return{item,blocked:true};
}

const resizeClear=f=>corners(f).every(([x,z])=>insideOrOutline(x,z));
const beamResizeClear=f=>insideShell(f);
const resizeDirection=(f,axis,sign)=>{const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return axis==='w'?{x:sign*c,z:-sign*s}:{x:sign*s,z:sign*c};};
const shiftedResize=(candidate,direction)=>{if(resizeClear(candidate))return candidate;for(let distance=.01;distance<=12;distance+=.01){const moved={...candidate,x:candidate.x-direction.x*distance,z:candidate.z-direction.z*distance};if(resizeClear(moved))return moved;}return null;};
// Typed width/depth changes grow from the centre. When that crosses the shell or
// adds a conflict, keep one edge fixed and grow toward the other side instead.
// Where a grown item can sit: centred, or shifted so it grows from one side or the other
// (along each plan axis that grew), least moved first.
export function resizeAnchors(f,next){
 const a=next.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 const shifts=axis=>{const grow=next[axis]-f[axis];return grow>1e-9&&next.rot===f.rot?[0,grow/2,-grow/2]:[0];};
 const out=[];
 for(const u of shifts('w'))for(const v of shifts('d'))out.push({x:next.x+u*c+v*s,z:next.z-u*s+v*c,moved:Math.abs(u)+Math.abs(v)});
 return out.sort((p,q)=>p.moved-q.moved);
}
export function fitResize(f,next,items){
 const others=items.filter(o=>o.id!==f.id);
 const score=p=>[insideShell(p)?0:1,issues(p,[p,...others]).length];
 let best=null;
 for(const{x,z,moved}of resizeAnchors(f,next)){
  const p={...next,x,z},[shell,conflicts]=score(p);
  if(!best||shell<best.shell||shell===best.shell&&(conflicts<best.conflicts||conflicts===best.conflicts&&moved<best.moved))best={p,shell,conflicts,moved};
 }
 return best.p;
}
// With keepRatio the other plan dimension scales along, centred, so width/depth keep their ratio.
export function resizeAtHandle(f,axis,sign,target,keepRatio=false){
 const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=target.x-f.x,dz=target.z-f.z,local=axis==='w'?dx*c-dz*s:dx*s+dz*c,start=axis==='w'?f.w:f.d,other=axis==='w'?'d':'w',limits=minimumsFor(f)||[.1,.1],fixed=-sign*start/2;
 const min=Math.max(limits[axis==='w'?0:1]??.1,keepRatio?(limits[axis==='w'?1:0]??.1)*start/f[other]:0),sized=size=>keepRatio?{[axis]:size,[other]:f[other]*size/start}:{[axis]:size};
 let desired=Math.max(min,sign*(local-fixed));const centerFor=size=>{const shift=fixed+sign*size/2;return{x:f.x+shift*(axis==='w'?c:s),z:f.z+shift*(axis==='w'?-s:c)}};
 if(f.type==='beam'){const build=size=>({...f,...centerFor(size),...sized(size)});let fitted=build(desired);if(beamResizeClear(fitted))return{item:fitted,blocked:false,clamped:false};let lo=min,hi=desired,best=null;for(let i=0;i<28;i++){const mid=(lo+hi)/2,candidate=build(mid);if(beamResizeClear(candidate)){best=candidate;lo=mid;}else hi=mid;}return best?{item:best,blocked:false,clamped:true}:{item:f,blocked:true,clamped:true};}
 const direction=resizeDirection(f,axis,sign),build=size=>shiftedResize({...f,...centerFor(size),...sized(size)},direction);
 let fitted=build(desired);if(fitted)return{item:fitted,blocked:false,clamped:false};
 let lo=min,hi=desired,best=null;for(let i=0;i<28;i++){const mid=(lo+hi)/2,candidate=build(mid);if(candidate){best=candidate;lo=mid;}else hi=mid;}
 return best?{item:best,blocked:false,clamped:true}:{item:f,blocked:true,clamped:true};
}
