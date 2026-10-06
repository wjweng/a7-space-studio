import {cabinetCells,cellOpening,CARCASS_T,FRONT_T,SLIDE_SETBACK,slidingFronts} from './cabinet-design.js';

// A linear light may be mounted on a cabinet instead of the ceiling (2026-10-06): on a cell's back
// panel, under the board above a cell, or on the cabinet's top, sides or front. `lightMount` names
// the face, `supportId` the cabinet and, inside it, `supportCell` the cell. The strip lies in the
// face's plane at `offsetU`/`offsetV` (the face's own axes below) and turns in it by `spin`; its
// length is w, its width d and its thickness h, standing off the face. Under a hanging cabinet a
// light stays a ceiling light: the ceiling stack already hangs it from the cabinet's underside.
// This module imports only cabinet-design.js, so model.js can use it without an import cycle.
export const cabinetLightMounts=[['cell','櫃格背板'],['under','櫃格頂板下方'],['top','櫃子頂面'],['left','櫃子左側板外側'],['right','櫃子右側板外側'],['front','櫃子正面']];
export const cabinetLightHosts=['wardrobe','console','hangingCabinet','drawer','sink','kitchen'];
export const cabinetLight=f=>f?.type==='light'&&cabinetLightMounts.some(([k])=>k===f.lightMount);
const lift=host=>host.type==='hangingCabinet'?host.elevation||0:0;
const add=(a,b,k=1)=>a.map((v,i)=>v+b[i]*k),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
// The face a strip lies on, in the host's own axes (x across, y up from its base, z out of the
// front): origin `o`, in-plane axes `u` and `v`, outward normal `n` and the range of u and v the
// face covers. u reads left to right and v upwards (front, sides, back panel) or towards the front
// (top, under a board) as one faces it. Null when the cell is gone or is a drawer.
export function lightFace(host,mount,cellId){
  const{w,d,h}=host;
  if(mount==='top')return{o:[0,h,0],u:[1,0,0],v:[0,0,1],n:[0,1,0],u1:-w/2,u2:w/2,v1:-d/2,v2:d/2};
  // The front: on the doors and drawer fronts (full overlay, FRONT_T proud of the carcass); on
  // sliding leaves, which run 6 mm inside it; else on the carcass edge.
  if(mount==='front'){const fronts=host.cabinetDesign?cabinetCells(host).map(c=>c.front):[],z=fronts.some(k=>k!=='open'&&!slidingFronts.includes(k))?d/2+FRONT_T:fronts.some(k=>slidingFronts.includes(k))?d/2-.006:d/2;return{o:[0,0,z],u:[1,0,0],v:[0,1,0],n:[0,0,1],u1:-w/2,u2:w/2,v1:0,v2:h};}
  if(mount==='left')return{o:[-w/2,0,0],u:[0,0,1],v:[0,1,0],n:[-1,0,0],u1:-d/2,u2:d/2,v1:0,v2:h};
  if(mount==='right')return{o:[w/2,0,0],u:[0,0,-1],v:[0,1,0],n:[1,0,0],u1:-d/2,u2:d/2,v1:0,v2:h};
  if(!host.cabinetDesign)return null;
  const opening=cellOpening(host,cellId);
  if(!opening||opening.cell.front==='drawers')return null;
  const u1=opening.x-opening.w/2,u2=opening.x+opening.w/2;
  if(mount==='cell')return{o:[0,0,-d/2+CARCASS_T],u:[1,0,0],v:[0,1,0],n:[0,0,1],u1,u2,v1:opening.bottom,v2:opening.bottom+opening.h};
  // Under the board above the cell, back panel to front; sliding leaves run on tracks inside.
  if(mount==='under')return{o:[0,opening.bottom+opening.h,0],u:[1,0,0],v:[0,0,1],n:[0,-1,0],u1,u2,v1:-d/2+CARCASS_T,v2:d/2-(slidingFronts.includes(opening.cell.front)?SLIDE_SETBACK:0)};
  return null;
}
// Half the turned strip's extent along u and along v.
const extents=f=>{const t=(f.spin||0)*Math.PI/180,c=Math.abs(Math.cos(t)),s=Math.abs(Math.sin(t));return[c*f.w/2+s*f.d/2,s*f.w/2+c*f.d/2];};
// The strip's centre and axes in the host's axes: `along` its length, `n` out of the face.
export function stripPose(f,host){
  const face=lightFace(host,f.lightMount,f.supportCell);if(!face)return null;
  const t=(f.spin||0)*Math.PI/180,along=add(face.u.map(v=>v*Math.cos(t)),face.v,Math.sin(t));
  const centre=add(add(add(face.o,face.u,f.offsetU||0),face.v,f.offsetV||0),face.n,f.h/2);
  return{face,centre:[centre[0],centre[1]+lift(host),centre[2]],along,n:face.n};
}
// Where a cabinet light sits. With `point` (a drag; world x, y, z on the face) that point sets its
// place first, and `stop` (any move) keeps it inside the face; without it (a turn, a resize, a
// load, its host moving) it stays where it is and `cabinetLightIssues` flags it if it runs past.
export function placeCabinetLight(f,items,{point=null,stop=!!point}={}){
  const host=items.find(item=>item.id===f.supportId),face=host&&lightFace(host,f.lightMount,f.supportCell);
  if(!face)return f;
  const a=host.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  let u=f.offsetU||0,v=f.offsetV||0;
  if(point){const dx=point.x-host.x,dz=point.z-host.z,p=[dx*c-dz*s,point.y-lift(host),dx*s+dz*c],rel=add(p,face.o,-1);u=dot(rel,face.u);v=dot(rel,face.v);}
  if(stop){const[eu,ev]=extents(f),fit=(x,lo,hi)=>lo<=hi?Math.max(lo,Math.min(hi,x)):(lo+hi)/2;u=fit(u,face.u1+eu,face.u2-eu);v=fit(v,face.v1+ev,face.v2-ev);}
  const placed={...f,offsetU:u,offsetV:v},pose=stripPose(placed,host);
  return{...placed,x:host.x+pose.centre[0]*c+pose.centre[2]*s,z:host.z-pose.centre[0]*s+pose.centre[2]*c,rot:host.rot};
}
export function cabinetLightIssues(f,items){
  const host=items.find(item=>item.id===f.supportId);
  if(!host)return['找不到安裝的櫃子'];
  const face=lightFace(host,f.lightMount,f.supportCell);
  if(!face)return['找不到安裝的櫃格'];
  const[eu,ev]=extents(f),u=f.offsetU||0,v=f.offsetV||0,tol=1e-6;
  if(u-eu<face.u1-tol||u+eu>face.u2+tol||v-ev<face.v1-tol||v+ev>face.v2+tol)return[['cell','under'].includes(f.lightMount)?'超出櫃格':'超出櫃面'];
  return[];
}
// A linear light dragged or clicked onto a surface in walk view (`surface` is {point, normal, id}
// from the scene): the ceiling or a beam's or hanging cabinet's underside makes it a ceiling light
// at that spot; a cabinet's top, side or front, a cell's back panel or the underside of the board
// above a cell mounts it there. Anything else (a wall, the floor, a drawer) gives null.
export function cabinetLightOnSurface(f,{point,normal,id},items){
  const base={...f};for(const key of['lightMount','supportId','supportCell','offsetU','offsetV','spin'])delete base[key];
  const host=id&&items.find(item=>item.id===id);
  if(normal.y<-.7&&(!id||host?.type==='beam'||host?.type==='hangingCabinet'&&point.y<lift(host)+.005))return{...base,x:point.x,z:point.z};
  if(!host||!cabinetLightHosts.includes(host.type))return null;
  const a=host.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=point.x-host.x,dz=point.z-host.z,x=dx*c-dz*s,y=point.y-lift(host),z=dx*s+dz*c;
  const nx=normal.x*c-normal.z*s,nz=normal.x*s+normal.z*c,mount=(lightMount,supportCell)=>placeCabinetLight({...base,lightMount,supportId:host.id,...(supportCell?{supportCell}:{}),spin:f.lightMount===lightMount?f.spin:undefined},items,{point});
  const cells=host.cabinetDesign?cabinetCells(host).filter(cell=>cell.front!=='drawers'&&x>=cell.x-cell.w/2-1e-6&&x<=cell.x+cell.w/2+1e-6):[];
  if(normal.y>.7){
    if(y>host.h-.005)return mount('top');
    // A shelf's top: the back panel of the cell it carries.
    const cell=cells.find(cell=>Math.abs(cell.bottom+(cell.noBase?0:CARCASS_T)-y)<.01);
    return cell?mount('cell',cell.id):null;
  }
  if(normal.y<-.7){const cell=cells.find(cell=>Math.abs(cellOpening(host,cell.id).bottom+cellOpening(host,cell.id).h-y)<.01);return cell?mount('under',cell.id):null;}
  if(Math.abs(nx)>.7)return Math.abs(x)>host.w/2-.005?mount(nx<0?'left':'right'):null;
  if(nz>.7){
    // The front half: a door, a sliding leaf or a board's front edge. The back panel is behind.
    if(z>0)return mount('front');
    const cell=cells.find(cell=>y>=cell.bottom-1e-6&&y<=cell.bottom+cell.h+1e-6);
    return cell?mount('cell',cell.id):null;
  }
  return null;
}
// Keeps the mount fields of a saved light; a light that is not linear, or names no face, is a
// ceiling light.
export function normalizeCabinetLight(f,lightKind){
  if(lightKind!=='linear'||!cabinetLightMounts.some(([k])=>k===f.lightMount)||typeof f.supportId!=='string')return{};
  const out={lightMount:f.lightMount,supportId:f.supportId,offsetU:Number.isFinite(f.offsetU)?f.offsetU:0,offsetV:Number.isFinite(f.offsetV)?f.offsetV:0};
  if(['cell','under'].includes(f.lightMount)){if(typeof f.supportCell!=='string')return{};out.supportCell=f.supportCell;}
  const spin=((Math.round(Number(f.spin)||0)%360)+360)%360;if(spin)out.spin=spin;
  return out;
}
