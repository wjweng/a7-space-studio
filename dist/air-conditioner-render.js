import * as T from 'three';
import {acSize,acBox,AC_RACK,AC_RAILS} from './air-conditioner.js';

// Grille and vent lines are decoration on solid boxes. A raycaster picks lines within
// `params.Line.threshold` (1 m by default), so a click anywhere near a unit selected it.
const noPick=()=>{};
// Original geometry based on the supplied references; no supplier images or logos.
export function makeAirConditioner(scene,g,f){
  const {w,d,h}=f,size=acSize(f),bounds=acBox(f),unit=new T.Group;
  unit.position.y=(f.elevation||0)+bounds.h/2;unit.rotation.z=(f.spin||0)*Math.PI/180;g.add(unit);
  const mat=(color,roughness=.45)=>{const key=color+roughness;return (scene.acMaterials??={})[key]??=new T.MeshStandardMaterial({color,roughness});};
  const white=mat('#e9eae7'),front=mat('#f0f0ed',.32),dark=mat('#272e32'),steel=mat('#aeb7bd',.3),fin=mat('#46575c');
  const box=(ww,hh,dd,x,y,z,m=white,r=0)=>scene.box(unit,ww,hh,dd,x,y,z,m,r);
  const lines=(points,color)=>{const geometry=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));const mesh=new T.LineSegments(geometry,((scene.acLineMaterials??={})[color]??=new T.LineBasicMaterial({color})));mesh.raycast=noPick;unit.add(mesh);return mesh;};
  if(f.acKind!=='outdoor'){
    box(w,h*.96,d*.9,0,h*.02,-d*.05,white,Math.min(.028,h*.12,d*.15));
    // Swept front cover and a dark lower outlet with a broad open vane.
    box(w*.985,h*.76,d*.23,0,h*.105,d*.365,front,Math.min(.026,h*.1));
    box(w*.87,h*.15,d*.18,-w*.015,-h*.36,d*.36,dark,.009);
    const vane=box(w*.87,h*.035,d*.22,-w*.015,-h*.445,d*.35,white,.003);vane.rotation.x=-.18;
    for(let i=0;i<5;i++)box(.006,h*.12,d*.12,-w*.39+i*w*.185,-h*.36,d*.38,steel);
    box(w*.075,h*.022,.001,w*.39,-h*.19,d*.482,mat('#a9b5b8'));
    const vents=[];for(let i=0;i<22;i++){const x=-w*.41+i*w*.82/21;vents.push([x,h*.495,-d*.3],[x,h*.495,d*.08]);}lines(vents,'#afb5b5');
    return;
  }
  const bottom=-size.h/2,bodyBottom=bottom+AC_RACK.bottom,cy=bodyBottom+h/2,cz=(AC_RACK.back-AC_RACK.front)/2;
  box(w,h,d,0,cy,cz,white,.008);
  // Full rectangular grille, with the large fan and coil visible behind it.
  const gx=w*.1,gw=w*.73,gh=h*.87,z=cz+d/2;
  box(gw,gh,.003,gx,cy,z+.001,fin);
  const fan=new T.Group;fan.position.set(gx,cy,z+.004);unit.add(fan);const radius=Math.min(gw,gh)*.45;
  const disc=new T.Mesh(new T.CircleGeometry(radius,40),dark);fan.add(disc);
  for(let i=0;i<5;i++){
    const shape=new T.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(radius*.3,radius*.8,radius*.9,radius*.2);shape.quadraticCurveTo(radius*.8,-radius*.25,radius*.3,-radius*.15);shape.closePath();
    const blade=new T.Mesh(new T.ShapeGeometry(shape),mat('#394348'));blade.position.z=.001;blade.rotation.z=i*Math.PI*2/5;fan.add(blade);
  }
  const hub=new T.Mesh(new T.CircleGeometry(radius*.15,20),steel);hub.position.z=.002;fan.add(hub);
  const grid=[];
  for(let i=0;i<=25;i++){const y=cy-gh/2+gh*i/25;grid.push([gx-gw/2,y,z+.012],[gx+gw/2,y,z+.012]);}
  for(let i=0;i<=7;i++){const x=gx-gw/2+gw*i/7;grid.push([x,cy-gh/2,z+.012],[x,cy+gh/2,z+.012]);}
  lines(grid,'#bcc3c4');
  for(const x of[gx-gw/2,gx+gw/2])box(.012,gh+.02,.013,x,cy,z+.007,white);
  for(const y of[cy-gh/2,cy+gh/2])box(gw+.012,.012,.013,gx,y,z+.007,white);
  box(w*.002,h*.91,.002,-w*.285,cy,z+.002,steel);
  box(w*.11,h*.014,.002,-w*.385,cy+h*.37,z+.002,steel);
  // Two slotted wall rails and triangular shelf brackets move with the unit.
  const back=-size.d/2+.012,frontZ=size.d/2-.012,railTop=bodyBottom+h*AC_RAILS.top;
  for(const x of[-w*AC_RAILS.offset,w*AC_RAILS.offset]){
    box(AC_RAILS.width,railTop-bottom,.024,x,(railTop+bottom)/2,back,steel,.002);
    for(let y=bottom+.055;y<railTop-.02;y+=.075)box(.009,.032,.001,x,y,back+.0125,dark,.003);
    box(.03,.03,size.d-.024,x,bottom+.04,0,steel,.002);
    box(.045,.042,.065,x,bodyBottom-.021,cz-d*.23,dark,.004);
    box(.045,.042,.065,x,bodyBottom-.021,cz+d*.23,dark,.004);
    const start=new T.Vector3(x,bottom+.02,back),end=new T.Vector3(x,bodyBottom-.05,frontZ),delta=end.clone().sub(start);
    const brace=new T.Mesh(new T.CylinderGeometry(.011,.011,delta.length(),8),steel);brace.position.copy(start).add(end).multiplyScalar(.5);brace.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());unit.add(brace);
  }
  for(const z0 of[cz-d*.3,cz+d*.3])box(size.w,.026,.03,0,bottom+.065,z0,steel,.002);
}
