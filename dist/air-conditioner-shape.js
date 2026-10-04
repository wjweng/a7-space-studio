// Pure dimensions shared by collision, mounting and rendering, without model imports.
const turned=(w,h,spin)=>{const a=spin*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));return[w*c+h*s,w*s+h*c];};
export const isAirConditioner=f=>f?.type==='airConditioner';
// Supplied unit dimensions, metres (w, d, h). The outdoor rack is additional.
export const AC_UNITS={indoor:{w:1.197,d:.262,h:.339,elevation:2.45},outdoor:{w:.8,d:.29,h:.64,elevation:.25}};
export const AC_RACK={side:.04,back:.075,front:.035,bottom:.12};
export function acSize(f){
  const rack=f.acKind==='outdoor';
  return {w:f.w+(rack?AC_RACK.side*2:0),d:f.d+(rack?AC_RACK.back+AC_RACK.front:0),h:f.h+(rack?AC_RACK.bottom:0)};
}
export function acBox(f){
  const size=acSize(f),[w,h]=turned(size.w,size.h,f.spin||0);
  return {...f,type:'panel',w,d:size.d,h,elevation:f.elevation||0};
}

