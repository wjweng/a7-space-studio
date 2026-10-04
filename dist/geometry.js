import {isAirConditioner,acBox} from './air-conditioner-shape.js';
import {cabinetOccupiedRects} from './cabinet-design.js';
export const EPS=1e-7;
export function roomAt(x,z){
 if(x>=2.82&&x<=5.18&&z<=2.72)return '臥室 A';
 if(x>=3.83&&x<=6.57&&z>=3.72&&z<=5.78)return '臥室 B';
 if(x>=6.57&&z>=2.7&&z<=4.4)return '衛浴 B';
 if(x>=6.57&&z>=4.4)return '工作陽台';
 // Below the bath-A column (z 6.87) the entry reaches east to its end wall at x 1.85.
 if(x>=1.52&&x<=3.08&&z>=4.75&&z<=(x<1.85?6.87:7.25))return '衛浴 A';
 if(x>=3.08&&z>=5.78)return '廚房';
 // The master bedroom and its corridor meet in an open passage at z 2.70-2.72,
 // which must belong to them too, or it falls through to the living room.
 if((x>=5.18&&z<=2.72)||(x>=3.83&&x<=6.57&&z>=2.72&&z<=3.72))return '主臥室';
 if(x<=1.85&&z>=6.65)return '玄關';
 return '客餐廳';
}
export const sameRoom=(a,b)=>roomAt(a.x,a.z)===roomAt(b.x,b.z);
export function signedDistance(a,b){
 const aa=corners(a),bb=corners(b);
 if(overlaps(a,b,EPS)){
  let penetration=Infinity;
  for(const p of [aa,bb])for(let i=0;i<2;i++){const dx=p[i+1][0]-p[i][0],dz=p[i+1][1]-p[i][1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len,pa=aa.map(v=>v[0]*nx+v[1]*nz),pb=bb.map(v=>v[0]*nx+v[1]*nz);penetration=Math.min(penetration,Math.max(...pa)-Math.min(...pb),Math.max(...pb)-Math.min(...pa));}
  return -penetration;
 }
 const pointSegment=(p,v,w)=>{const dx=w[0]-v[0],dz=w[1]-v[1],t=Math.max(0,Math.min(1,((p[0]-v[0])*dx+(p[1]-v[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(p[0]-v[0]-t*dx,p[1]-v[1]-t*dz);};
 const gap=Math.min(...aa.flatMap(p=>bb.map((v,i)=>pointSegment(p,v,bb[(i+1)%4]))),...bb.flatMap(p=>aa.map((v,i)=>pointSegment(p,v,aa[(i+1)%4]))));
 return gap<EPS?0:gap;
}
export function distanceLabel(m){if(m< -EPS)return `重疊 ${Math.max(.1,Math.round(-m*1000)/10).toFixed(1)} cm`;if(m<=EPS)return '0.0 cm（接觸）';if(m<.001)return '< 0.1 cm';return (m*100).toFixed(1)+' cm';}
export function corners(f){const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>[f.x+c*x*f.w/2+s*z*f.d/2,f.z-s*x*f.w/2+c*z*f.d/2]);}
export function overlaps(a,b,gap=0){const ca=corners(a),cb=corners(b);for(const poly of[ca,cb])for(let i=0;i<2;i++){let p=poly[i],q=poly[i+1],nx=-(q[1]-p[1]),nz=q[0]-p[0],len=Math.hypot(nx,nz);nx/=len;nz/=len;let aa=ca.map(v=>v[0]*nx+v[1]*nz),bb=cb.map(v=>v[0]*nx+v[1]*nz);if(Math.max(...aa)<=Math.min(...bb)+gap||Math.max(...bb)<=Math.min(...aa)+gap)return false}return true}

// Tables have usable clearance below the top. In plan view only the legs and
// the chair back are solid when a chair is tucked beneath a table.
export const isTableLike=f=>['table','desk'].includes(f?.type);
const localRect=(f,x,z,w,d)=>{const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return{x:f.x+x*c+z*s,z:f.z-x*s+z*c,w,d,rot:f.rot};};
export function tableLegRects(f){const leg=Math.min(.09,Math.max(.045,Math.min(f.w,f.d)*.12)),ox=Math.max(0,f.w/2-leg*.95),oz=Math.max(0,f.d/2-leg*.95);return[[-ox,-oz],[ox,-oz],[-ox,oz],[ox,oz]].map(([x,z])=>localRect(f,x,z,leg,leg));}
export function chairBackRect(f){const depth=Math.min(.12,f.d*.28);return localRect(f,0,-f.d/2+depth/2,Math.max(.05,f.w*.9),depth);}
export function tableChairInterference(chair,table){if(!isTableLike(table))return false;return overlaps(chairBackRect(chair),table,EPS)||tableLegRects(table).some(leg=>overlaps(chair,leg,EPS));}
// Whether two rectangles overlap by more than EPS. Rectangles whose centres are farther apart
// than their half-diagonals cannot touch, which skips the full test for most pairs.
export function clashes(a,b){
 if(Math.hypot(a.x-b.x,a.z-b.z)>(Math.hypot(a.w,a.d)+Math.hypot(b.w,b.d))/2+1e-6)return false;
 return signedDistance(a,b)<-EPS;
}
// A robot vacuum dock (sized after a Dreame X60 Ultra, mm: 390 × 425 × 498): a tower 296 mm
// deep at the back, full height, and in front only the ramp and the robot, about 10.5 cm high
// (the robot is 7.95 cm, 10.28 cm with its lidar raised). scene.js draws it from the same numbers.
export const DOCK={w:.39,d:.425,h:.498,tower:.296,front:.105};
export function robotVacuumRects(f){
 const tower=DOCK.tower*f.d/DOCK.d,a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 const box=(z0,z1,top)=>{const v=(z0+z1)/2;return{x:f.x+v*s,z:f.z+v*c,w:f.w,d:z1-z0,rot:f.rot,yMin:0,yMax:top};};
 return[box(-f.d/2,-f.d/2+tower,f.h),box(-f.d/2+tower,f.d/2,Math.min(f.h,DOCK.front*f.h/DOCK.h))];
}
// Whether a wall socket is buried in something standing or hanging in front of that wall:
// a cabinet's boards, a TV, a back panel, a sofa. Tables and desks block only with their top
// and legs, so a socket may sit under a desk. Only the socket is flagged: a socket stops a
// socket, never the furniture, which moves as before. Hanging cabinets need their elevation.
export function socketCovered(s,o){
 if(isAirConditioner(o))o=acBox(o);
 if(s.outletMount!=='wall'||['rug','light','beam','outlet'].includes(o.type))return false;
 const lift=['television','hangingCabinet','panel','cove'].includes(o.type)?o.elevation||0:0,plate={...s,yMin:s.elevation||0,yMax:(s.elevation||0)+s.h};
 const parts=o.cabinetDesign?cabinetOccupiedRects(o):o.type==='robotVacuum'?robotVacuumRects(o):isTableLike(o)?[{...o,yMin:o.h-.045,yMax:o.h},...tableLegRects(o).map(leg=>({...leg,yMin:0,yMax:o.h}))]:[{...o,yMin:lift,yMax:lift+o.h}];
 return parts.some(part=>plate.yMin<part.yMax-EPS&&part.yMin<plate.yMax-EPS&&clashes(plate,part));
}
export function furnitureInterference(a,b){
 if(isAirConditioner(a)){a=acBox(a);a.elevation-=.001;a.h+=.002;}
 if(isAirConditioner(b)){b=acBox(b);b.elevation-=.001;b.h+=.002;}
 // TVs, hanging cabinets, back panels and light coves carry their underside height as `elevation`.
 const lifted=f=>['television','hangingCabinet','panel','cove'].includes(f.type)?f.elevation||0:0,ay=lifted(a),by=lifted(b);
 if(ay+a.h<=by+EPS||by+b.h<=ay+EPS)return false;
 if(['rug','light','beam','outlet'].includes(a.type)||['rug','light','beam','outlet'].includes(b.type))return false;
 if(a.type==='hangingCabinet'&&b.type==='hangingCabinet')return false; // ceiling stacking is checked separately
 const compound=f=>f.cabinetDesign||f.type==='robotVacuum';
 if(compound(a)||compound(b)){
  const parts=(f,lift)=>f.cabinetDesign?cabinetOccupiedRects(f):f.type==='robotVacuum'?robotVacuumRects(f):[{...f,yMin:lift,yMax:lift+f.h}];
  const aa=parts(a,ay),bb=parts(b,by);
  return aa.some(left=>bb.some(right=>left.yMin<right.yMax-EPS&&right.yMin<left.yMax-EPS&&clashes(left,right)));
 }
 if(a.type==='chair'&&isTableLike(b))return tableChairInterference(a,b);
 if(b.type==='chair'&&isTableLike(a))return tableChairInterference(b,a);
 return clashes(a,b);
}
