import {corners,overlaps,inside,insideOrOutline,walls,wallRects,exteriorWallRects,minimums} from './model.js';
import {EPS,signedDistance,roomAt,sameRoom,furnitureInterference} from './geometry.js';
export {EPS,signedDistance,roomAt,sameRoom,distanceLabel,furnitureInterference} from './geometry.js';
// Collision leaves retain their surveyed swing clearance. Their rendered
// faces use a separate close-fitting finish panel below.
const tightClosingDoor=d=>['door-3','door-4','door-5'].includes(d.id);
export const leafWidth=d=>d.width-(d.id==='door-0'?.18:.13);
export const doorInset=d=>d.id==='door-0'?.10:.085;
export const visualLeafWidth=d=>d.width-(d.id==='door-0'?.18:tightClosingDoor(d)?.025:.13);
export const visualDoorInset=d=>d.id==='door-0'?.10:tightClosingDoor(d)?.015:.085;
export function doorRects(d,amount=1,maxAngle=d.maxAngle??90){
 const inset=doorInset(d),offset=-d.swing*.055,ca=Math.cos(d.angle),sa=Math.sin(d.angle),hx=d.x+inset*ca+offset*sa,hz=d.z-inset*sa+offset*ca,angle=d.angle+d.swing*amount*maxAngle*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),w=leafWidth(d);
 const rect=(x,z,width,depth)=>({x:hx+x*c+z*s,z:hz-x*s+z*c,w:width,d:depth,rot:angle*180/Math.PI});
 return [rect(w/2,0,w,.045),rect(w-.12,.055,.105,.07),rect(w-.12,-.055,.105,.07)];
}
export function fixedDoorLimit(d){const obstacles=wallRects();let safe=0;for(let degrees=0;degrees<=90;degrees+=.25){if(doorRects(d,1,degrees).some(r=>obstacles.some(w=>signedDistance(r,w)<-EPS)))break;safe=degrees;}return Math.max(0,safe-1);}
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
export const blocksCamera=(f,eye=1.6)=>!['rug','light','beam'].includes(f.type)&&f.h>.15&&(!['table','chair','desk'].includes(f.type)||f.h>=eye-.2);
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

// Editor drags represent lifting an item. Interior conflicts remain editable drafts;
// only crossing the apartment's exterior outline blocks the pointer position.
export function placeAtTarget(f,target,items){
 const exterior=exteriorWallRects();
 const clear=item=>corners(item).every(([x,z])=>insideOrOutline(x,z))&&exterior.every(w=>signedDistance(item,w)>=-EPS);
 const desired={...f,...target};
 if(clear(desired))return{item:desired,blocked:false};
 // Resolve axes independently when the pointer also pushes into a wall. This
 // preserves the tangent component, so an item already at the shell can slide
 // along it instead of appearing stuck.
 const travel=(start,axis,value)=>{let delta=value-start[axis],n=Math.max(1,Math.ceil(Math.abs(delta)/.005)),last=start;for(let i=1;i<=n;i++){let candidate={...start,[axis]:start[axis]+delta*i/n};if(!clear(candidate)){let lo=(i-1)/n,hi=i/n;for(let j=0;j<30;j++){let mid=(lo+hi)/2,candidate={...start,[axis]:start[axis]+delta*mid};if(clear(candidate))lo=mid;else hi=mid;}return{...start,[axis]:start[axis]+delta*lo};}last=candidate;}return last;};
 const xz=travel(travel(f,'x',target.x),'z',target.z),zx=travel(travel(f,'z',target.z),'x',target.x);
 const score=p=>Math.hypot(p.x-target.x,p.z-target.z),item=score(xz)<=score(zx)?xz:zx;
 return{item,blocked:true};
}

const resizeClear=f=>corners(f).every(([x,z])=>insideOrOutline(x,z));
const beamResizeClear=resizeClear;
const resizeDirection=(f,axis,sign)=>{const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return axis==='w'?{x:sign*c,z:-sign*s}:{x:sign*s,z:sign*c};};
const shiftedResize=(candidate,direction)=>{if(resizeClear(candidate))return candidate;for(let distance=.01;distance<=12;distance+=.01){const moved={...candidate,x:candidate.x-direction.x*distance,z:candidate.z-direction.z*distance};if(resizeClear(moved))return moved;}return null;};
export function resizeAtHandle(f,axis,sign,target){
 const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=target.x-f.x,dz=target.z-f.z,local=axis==='w'?dx*c-dz*s:dx*s+dz*c,start=axis==='w'?f.w:f.d,min=minimums[f.type]?.[axis==='w'?0:1]??.1,fixed=-sign*start/2;
 let desired=Math.max(min,sign*(local-fixed));const centerFor=size=>{const shift=fixed+sign*size/2;return{x:f.x+shift*(axis==='w'?c:s),z:f.z+shift*(axis==='w'?-s:c)}};
 if(f.type==='beam'){const build=size=>({...f,...centerFor(size),[axis]:size});let fitted=build(desired);if(beamResizeClear(fitted))return{item:fitted,blocked:false,clamped:false};let lo=min,hi=desired,best=null;for(let i=0;i<28;i++){const mid=(lo+hi)/2,candidate=build(mid);if(beamResizeClear(candidate)){best=candidate;lo=mid;}else hi=mid;}return best?{item:best,blocked:false,clamped:true}:{item:f,blocked:true,clamped:true};}
 const direction=resizeDirection(f,axis,sign),build=size=>shiftedResize({...f,...centerFor(size),[axis]:size},direction);
 let fitted=build(desired);if(fitted)return{item:fitted,blocked:false,clamped:false};
 let lo=min,hi=desired,best=null;for(let i=0;i<28;i++){const mid=(lo+hi)/2,candidate=build(mid);if(candidate){best=candidate;lo=mid;}else hi=mid;}
 return best?{item:best,blocked:false,clamped:true}:{item:f,blocked:true,clamped:true};
}
