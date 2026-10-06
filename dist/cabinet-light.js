import {cabinetCells,cellOpening,frontPanels,FRONT_GAP,CARCASS_T,FRONT_T,SLIDE_SETBACK,slidingFronts,hingedFronts} from './cabinet-design.js';

// Every door leaf, drawer front and sliding leaf on a cabinet's front, closed, in the cabinet's
// axes (y from its base): `key` is the panel's id and the leaf's index, `z` its front face. A
// light on the front lies on one of them, never across a gap or on the carcass edge. The numbers
// follow makeModularCabinet in scene.js.
export function frontLeaves(host){
  if(!host.cabinetDesign)return[];
  const cells=cabinetCells(host),out=[],d=host.d,t=CARCASS_T;
  for(const panel of frontPanels(host)){
    if(panel.front==='open')continue;
    const w=panel.w-FRONT_GAP,y1=panel.y-(panel.h-FRONT_GAP)/2,y2=panel.y+(panel.h-FRONT_GAP)/2,z=d/2+FRONT_T,x1=panel.x-w/2,x2=panel.x+w/2;
    if(slidingFronts.includes(panel.front)){
      const m=cells.filter(c=>panel.ids.includes(c.id)),left=m.reduce((a,c)=>c.x-c.w/2<a.x-a.w/2?c:a),right=m.reduce((a,c)=>c.x+c.w/2>a.x+a.w/2?c:a),low=m.reduce((a,c)=>c.bottom<a.bottom?c:a),high=m.reduce((a,c)=>c.bottom+c.h>a.bottom+a.h?c:a);
      const a=Math.min(...m.map(c=>c.x-c.w/2))+left.insetL,b=Math.max(...m.map(c=>c.x+c.w/2))-right.insetR,bottom=Math.min(...m.map(c=>c.bottom))+(low.noBase?0:t),top=Math.max(...m.map(c=>c.bottom+c.h))-(high.last?t:0);
      const lap=.02,count=panel.front==='sliding4'?4:2,leafW=count===4?(b-a+2*lap)/4:(b-a+lap)/2,frontZ=d/2-.006-FRONT_T/2,backZ=frontZ-FRONT_T-.004,mid=(bottom+top)/2,leafH=top-bottom-.02;
      const leaves=count===4?[[a,frontZ],[(a+b)/2-leafW,backZ],[(a+b)/2,backZ],[b-leafW,frontZ]]:[[a,backZ],[b-leafW,frontZ]];
      leaves.forEach(([lx,lz],i)=>out.push({key:`${panel.id}:${i}`,x1:lx,x2:lx+leafW,y1:mid-leafH/2,y2:mid+leafH/2,z:lz+FRONT_T/2}));
      continue;
    }
    if(panel.front==='double'||panel.front==='grooved'){const half=(w-FRONT_GAP)/2;out.push({key:`${panel.id}:0`,x1,x2:x1+half,y1,y2,z},{key:`${panel.id}:1`,x1:x2-half,x2,y1,y2,z});continue;}
    out.push({key:`${panel.id}:0`,x1,x2,y1,y2,z});
  }
  return out;
}

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
  if(mount==='front'&&cellId){const leaf=frontLeaves(host).find(l=>l.key===cellId);return leaf?{o:[0,0,leaf.z],u:[1,0,0],v:[0,1,0],n:[0,0,1],u1:leaf.x1,u2:leaf.x2,v1:leaf.y1,v2:leaf.y2}:null;}
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
  if(!face)return[f.lightMount==='front'?'找不到安裝的門片':'找不到安裝的櫃格'];
  const[eu,ev]=extents(f),u=f.offsetU||0,v=f.offsetV||0,tol=1e-6;
  if(u-eu<face.u1-tol||u+eu>face.u2+tol||v-ev<face.v1-tol||v+ev>face.v2+tol)return[['cell','under'].includes(f.lightMount)?'超出櫃格':'超出櫃面'];
  return[];
}
// A linear light dragged or clicked onto a surface in walk view (`surface` is {point, normal, id}
// from the scene): the ceiling or a beam's or hanging cabinet's underside makes it a ceiling light
// at that spot; a cabinet's top, side or front, a cell's back panel or the underside of the board
// above a cell mounts it there. Anything else (a wall, the floor, a drawer) gives null.
// Which way a linear light runs in plan, in degrees like a ceiling light's `rot` (its length along
// (cos, -sin)): a ceiling light's own turn, or a cabinet light's length seen from above (one
// standing upright on a side or front runs along that face). A light moved between the ceiling
// and a cabinet keeps this direction rather than going back to 0.
function planTurn(f,items){
  if(!cabinetLight(f))return f.rot||0;
  const host=items.find(item=>item.id===f.supportId),pose=host&&stripPose(f,host);if(!pose)return f.rot||0;
  const dir=Math.hypot(pose.along[0],pose.along[2])>.3?pose.along:pose.face.u,a=host.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  const x=dir[0]*c+dir[2]*s,z=-dir[0]*s+dir[2]*c;
  return ((Math.round(Math.atan2(-z,x)*180/Math.PI)%360)+360)%360;
}
// The turn in a level face (a top, under a board) that runs a ceiling light the same way.
function faceTurn(turn,host,mount){
  if(!['top','under'].includes(mount))return undefined;
  const r=turn*Math.PI/180,dx=Math.cos(r),dz=-Math.sin(r),a=host.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return ((Math.round(Math.atan2(dx*s+dz*c,dx*c-dz*s)*180/Math.PI)%360)+360)%360;
}
export function cabinetLightOnSurface(f,{point,normal,id},items){
  const base={...f};for(const key of['lightMount','supportId','supportCell','offsetU','offsetV'])delete base[key];
  const host=id&&items.find(item=>item.id===id);
  // The ceiling is one double-sided plane whose face normal points up, so from below it reads as
  // facing up: any upright-normal building face high above the floor is the ceiling.
  if(!id&&Math.abs(normal.y)>.7&&point.y>1.5||normal.y<-.7&&(host?.type==='beam'||host?.type==='hangingCabinet'&&point.y<lift(host)+.005)){const out={...base,x:point.x,z:point.z,rot:planTurn(f,items)};delete out.spin;return out;}
  if(!host||!cabinetLightHosts.includes(host.type))return null;
  const a=host.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=point.x-host.x,dz=point.z-host.z,x=dx*c-dz*s,y=point.y-lift(host),z=dx*s+dz*c;
  const nx=normal.x*c-normal.z*s,nz=normal.x*s+normal.z*c,mount=(lightMount,supportCell)=>placeCabinetLight({...base,lightMount,supportId:host.id,...(supportCell?{supportCell}:{}),spin:cabinetLight(f)?f.spin:faceTurn(f.rot||0,host,lightMount)},items,{point});
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
    // The front half: the door, drawer front or sliding leaf under the pointer, the frontmost one
    // where leaves overlap; a board edge or a gap between fronts takes nothing. The back panel is behind.
    if(z>0){const leaf=frontLeaves(host).filter(l=>x>=l.x1-1e-6&&x<=l.x2+1e-6&&y>=l.y1-1e-6&&y<=l.y2+1e-6&&Math.abs(z-l.z)<.03).sort((a,b)=>b.z-a.z)[0];return leaf?mount('front',leaf.key):null;}
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
  if(f.lightMount==='front'&&typeof f.supportCell==='string')out.supportCell=f.supportCell;
  const spin=((Math.round(Number(f.spin)||0)%360)+360)%360;if(spin)out.spin=spin;
  return out;
}
// A typed size on a cabinet light stops like furniture: at the largest size between the old and
// the requested one that still fits its face (whole millimetres), shifted inside the face as far
// as it needs. A strip that already ran past (after a turn) keeps the requested size, flagged.
export function fitCabinetLight(before,next,items){
  const host=items.find(item=>item.id===next.supportId),face=host&&lightFace(host,next.lightMount,next.supportCell);
  if(!face)return{item:next,stopped:false};
  const fits=f=>{const[eu,ev]=extents(f);return 2*eu<=face.u2-face.u1+1e-9&&2*ev<=face.v2-face.v1+1e-9;};
  if(fits(next))return{item:placeCabinetLight(next,items,{stop:true}),stopped:false};
  if(!fits({...next,w:before.w,d:before.d}))return{item:next,stopped:false};
  let lo=0,hi=1;
  for(let i=0;i<40;i++){const k=(lo+hi)/2;if(fits({...next,w:before.w+(next.w-before.w)*k,d:before.d+(next.d-before.d)*k}))lo=k;else hi=k;}
  const size=key=>next[key]>before[key]?Math.floor((before[key]+(next[key]-before[key])*lo)*1000+1e-6)/1000:next[key];
  return{item:placeCabinetLight({...next,w:size('w'),d:size('d')},items,{stop:true}),stopped:true};
}

// While a light on a cabinet is dragged, the pointer just past the edge of its face (`margin`,
// in the face's plane) keeps it on that face, stopped at the edge, rather than jumping to the
// face beyond. `point` is where the pointer ray meets the face's plane (see `facePlane`).
export function facePlane(f,items){
  const host=items.find(item=>item.id===f.supportId),pose=host&&stripPose(f,host);if(!pose)return null;
  const a=host.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),world=([x,y,z])=>({x:x*c+z*s,y,z:-x*s+z*c}),at=world(pose.face.o),n=world(pose.face.n);
  return{point:{x:host.x+at.x,y:pose.face.o[1]+lift(host),z:host.z+at.z},normal:n};
}
export function stayOnFace(f,point,items,margin=.05){
  const host=items.find(item=>item.id===f.supportId),face=host&&lightFace(host,f.lightMount,f.supportCell);if(!face||!point)return null;
  const a=host.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=point.x-host.x,dz=point.z-host.z,rel=add([dx*c-dz*s,point.y-lift(host),dx*s+dz*c],face.o,-1),u=dot(rel,face.u),v=dot(rel,face.v);
  if(u<face.u1-margin||u>face.u2+margin||v<face.v1-margin||v>face.v2+margin)return null;
  return placeCabinetLight(f,items,{point});
}
// A new strip (or a copy) put on a face too small for it takes the longest length that fits.
export function fitNewCabinetLight(f,items){
  if(!cabinetLight(f))return f;
  const fit=fitCabinetLight({...f,w:.02},f,items);return fit.item;
}
