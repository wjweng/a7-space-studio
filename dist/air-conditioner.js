import {HEIGHT,WALL_THICKNESS,walls,structuralSolids,wallJoints,insideOrOutline} from './model.js';
import {corners,clashes} from './geometry.js';

import {isAirConditioner,acBox} from './air-conditioner-shape.js';
export {isAirConditioner,AC_UNITS,AC_RACK,acSize,acBox} from './air-conditioner-shape.js';

// Real wall solids, including window sills and lintels. The plan-only wallRects
// deliberately fills windows and omits door lintels, so cannot validate a mount.
export function acWallSolids(){
  const solids=[];
  for(const wall of walls){
    const dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],length=Math.hypot(dx,dz);
    const add=(a,b,bottom,top)=>{if(b-a<1e-8||top-bottom<1e-8)return;solids.push({x:wall.a[0]+dx/length*(a+b)/2,z:wall.a[1]+dz/length*(a+b)/2,w:b-a,d:WALL_THICKNESS,rot:-Math.atan2(dz,dx)*180/Math.PI,bottom,top});};
    if(!wall.opening)add(0,length,0,HEIGHT);
    else {const [start,width,sill,height]=wall.opening;add(0,start,0,HEIGHT);add(start+width,length,0,HEIGHT);add(start,start+width,0,sill);add(start,start+width,sill+height,HEIGHT);}
  }
  return solids.concat([...structuralSolids,...wallJoints].map(s=>({...s,bottom:0,top:HEIGHT})));
}
function solidFaces(s){
  const a=s.rot*Math.PI/180,c=Math.cos(a),n=Math.sin(a);
  return [[0,-s.d/2,s.w,180],[0,s.d/2,s.w,0],[-s.w/2,0,s.d,-90],[s.w/2,0,s.d,90]].map(([u,v,w,turn])=>({x:s.x+u*c+v*n,z:s.z-u*n+v*c,w,bottom:s.bottom,top:s.top,rot:s.rot+turn,hostId:s.hostId}));
}
// The balcony railing is open between its curb and its top rail, so it is no wall solid, but an
// outdoor rack can be fixed to it. Its face is the wall face, flush with the curb below.
export const RAILING_TOP=1.1;
function railingSolids(){
  return walls.filter(w=>w.openingType==='railing').map(wall=>{
    const dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],length=Math.hypot(dx,dz),[start,width,sill]=wall.opening,mid=start+width/2;
    return {x:wall.a[0]+dx/length*mid,z:wall.a[1]+dz/length*mid,w:width,d:WALL_THICKNESS,rot:-Math.atan2(dz,dx)*180/Math.PI,bottom:sill,top:RAILING_TOP};
  });
}
export function acMountFaces(f,items){
  const solids=acWallSolids();
  if(f.acKind==='outdoor')solids.push(...railingSolids());
  if(f.acKind!=='outdoor')for(const b of items)if(b.type==='beam'&&b.id!==f.id&&!b.draft)solids.push({...b,bottom:HEIGHT-b.h,top:HEIGHT,hostId:b.id});
  return solids.flatMap(solidFaces);
}
// An indoor unit must cover its entire mounting rectangle, not only its corners: sweep each
// height band and merge horizontal intervals, catching openings between supported ends.
// An outdoor rack stands out from the wall on brackets, so its back only has to stand against
// some wall or railing face; height does not matter (the owner, 2026-10-05).
export function acSupported(f,items){
  const p=acBox(f),a=p.rot*Math.PI/180,nx=Math.sin(a),nz=Math.cos(a),tx=Math.cos(a),tz=-Math.sin(a),bx=p.x-nx*p.d/2,bz=p.z-nz*p.d/2,tol=1e-5;
  const outdoor=f.acKind==='outdoor';
  const rects=acMountFaces(f,items).filter(s=>Math.cos((s.rot-p.rot)*Math.PI/180)>1-1e-8&&Math.abs((s.x-bx)*nx+(s.z-bz)*nz)<tol).map(s=>{const u=(s.x-bx)*tx+(s.z-bz)*tz;return {lo:Math.max(-p.w/2,u-s.w/2),hi:Math.min(p.w/2,u+s.w/2),bottom:Math.max(p.elevation,s.bottom),top:Math.min(p.elevation+p.h,s.top)};}).filter(s=>s.hi>s.lo+tol&&(outdoor||s.top>s.bottom));
  if(outdoor)return rects.length>0;
  const ys=[...new Set([p.elevation,p.elevation+p.h,...rects.flatMap(s=>[s.bottom,s.top])])].sort((a,b)=>a-b);
  for(let i=1;i<ys.length;i++){
    if(ys[i]-ys[i-1]<tol)continue;const mid=(ys[i]+ys[i-1])/2;
    const runs=rects.filter(s=>s.bottom<=mid&&s.top>=mid).sort((a,b)=>a.lo-b.lo);let end=-p.w/2;
    for(const run of runs){if(run.lo>end+tol)break;end=Math.max(end,run.hi);}
    if(end<p.w/2-tol)return false;
  }
  return true;
}
export function acWallHits(f){
  const p=acBox(f);
  return acWallSolids().flatMap((s,i)=>p.elevation<s.top-1e-6&&p.elevation+p.h>s.bottom+1e-6&&clashes(p,s)?[i]:[]);
}
export function acMountIssues(f,items){
  const p=acBox(f),messages=[];
  if(p.elevation<.031-1e-6)messages.push(f.acKind==='outdoor'?'室外機鐵架不能碰到地面':'冷氣機不能碰到地面');
  if(p.elevation+p.h>HEIGHT-.001+1e-6)messages.push('冷氣機不能碰到天花板');
  if(!acSupported(f,items))messages.push(f.acKind==='outdoor'?'鐵架背面需靠著牆面或欄杆':'冷氣機安裝面需完整貼牆或樑');
  if(corners(p).some(([x,z])=>!insideOrOutline(x,z)))messages.push('超出戶型邊界');
  return messages;
}
export function mountAirConditioner(f,items,{clamp=true,face=null}={}){
  const p=acBox(f),surfaces=face?[face]:acMountFaces(f,items);let best=null;
  for(const s of surfaces){
    const a=s.rot*Math.PI/180,nx=Math.sin(a),nz=Math.cos(a),tx=Math.cos(a),tz=-Math.sin(a),raw=(f.x-s.x)*tx+(f.z-s.z)*tz,half=(s.w-p.w)/2;
    if(Math.abs(raw)>s.w/2+p.w/2&&!clamp)continue;
    const limit=Math.max(0,half),along=clamp?Math.max(-limit,Math.min(limit,raw)):raw;
    const candidate={...f,x:s.x+tx*along+nx*p.d/2,z:s.z+tz*along+nz*p.d/2,rot:s.rot};
    const box=acBox(candidate);if(corners(box).some(([x,z])=>!insideOrOutline(x,z)))continue;
    // Prefer a supported face only on a near tie; if the nearest face cannot fit keep a
    // visible draft, exactly like other furniture. Never shrink the unit.
    const valid=acSupported(candidate,items)&&!acWallHits(candidate).length;
    const distance=Math.hypot(candidate.x-f.x,candidate.z-f.z),score=distance+(valid?0:.01);
    if(!best||score<best.score)best={item:candidate,score};
  }
  return best?.item||f;
}
export function acOnSurface(f,surface,items){
  if(!surface||Math.abs(surface.normal.y)>.1)return null;
  const host=surface.id&&items.find(o=>o.id===surface.id);
  if(surface.id&&!(host?.type==='beam'&&f.acKind!=='outdoor'))return null;
  const {point,normal}=surface,box=acBox(f),rot=Math.atan2(normal.x,normal.z)*180/Math.PI;
  const next={...f,x:point.x+normal.x*box.d/2,z:point.z+normal.z*box.d/2,rot,elevation:Math.max(.031,Math.min(HEIGHT-box.h-.001,point.y-box.h/2))};
  // A railing's bars stand in the middle of its wall line; the rack's back goes on the wall face.
  return f.acKind==='outdoor'?mountAirConditioner(next,items):next;
}
