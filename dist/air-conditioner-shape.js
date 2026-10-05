// Pure dimensions shared by collision, mounting and rendering, without model imports.
const turned=(w,h,spin)=>{const a=spin*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));return[w*c+h*s,w*s+h*c];};
export const isAirConditioner=f=>f?.type==='airConditioner';
// Supplied unit dimensions, metres (w, d, h). The outdoor rack is additional.
export const AC_UNITS={indoor:{w:1.197,d:.262,h:.339,elevation:2.45},outdoor:{w:.8,d:.29,h:.64,elevation:.25}};
export const AC_RACK={side:.04,back:.075,front:.035,bottom:.12};
// The rack's two wall rails, each at `offset` × body width from the centre, rising from the rack
// bottom to `top` × body height above the body's underside. They are what is fixed to the wall.
export const AC_RAILS={offset:.34,width:.035,top:.91};
// Where the rails reach along the wall, from the assembly centre, after a turn in the wall plane.
export function acRailSpans(f){
  const size=acSize(f),a=(f.spin||0)*Math.PI/180,c=Math.cos(a),n=Math.sin(a),bottom=-size.h/2,top=bottom+AC_RACK.bottom+f.h*AC_RAILS.top,y=(top+bottom)/2,half=Math.abs(AC_RAILS.width/2*c)+Math.abs((top-bottom)/2*n);
  return [-1,1].map(side=>{const u=side*f.w*AC_RAILS.offset*c-y*n;return{lo:u-half,hi:u+half};});
}
export function acSize(f){
  const rack=f.acKind==='outdoor';
  return {w:f.w+(rack?AC_RACK.side*2:0),d:f.d+(rack?AC_RACK.back+AC_RACK.front:0),h:f.h+(rack?AC_RACK.bottom:0)};
}
export function acBox(f){
  const size=acSize(f),[w,h]=turned(size.w,size.h,f.spin||0);
  return {...f,type:'panel',w,d:size.d,h,elevation:f.elevation||0};
}

