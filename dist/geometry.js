export const EPS=1e-7;
export function roomAt(x,z){
 if(x>=2.82&&x<=5.18&&z<=2.78)return '臥室 A';
 if(x>=3.83&&x<=6.57&&z>=3.72&&z<=5.78)return '臥室 B';
 if(x>=6.57&&z>=2.7&&z<=4.4)return '衛浴 B';
 if(x>=6.57&&z>=4.4)return '工作陽台';
 if(x>=1.4&&x<=3.08&&z>=4.75&&z<=7.25)return '衛浴 A';
 if(x>=3.08&&z>=5.78)return '廚房';
 if((x>=5.18&&z<=2.7)||(x>=3.83&&x<=6.57&&z>=2.78&&z<=3.72))return '主臥室';
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
export function furnitureInterference(a,b){if(['rug','light','beam'].includes(a.type)||['rug','light','beam'].includes(b.type))return false;if(a.type==='chair'&&isTableLike(b))return tableChairInterference(a,b);if(b.type==='chair'&&isTableLike(a))return tableChairInterference(b,a);return signedDistance(a,b)<-EPS;}
