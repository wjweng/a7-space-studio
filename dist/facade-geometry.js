import * as T from 'three';

// Horizontal roof canopy with actual open elliptical holes. Local X/Z is the roof
// plane; only the extrusion thickness occupies Y. No painted sky-colour cutouts.
export function roofCanopyGeometry({w,depth,thickness,holes}){
  const shape=new T.Shape();
  shape.moveTo(-w/2,-depth/2);shape.lineTo(w/2,-depth/2);
  shape.lineTo(w/2,depth/2-.65);
  shape.quadraticCurveTo(0,depth/2+.65,-w/2,depth/2-.65);shape.closePath();
  const step=w/holes;
  for(let i=0;i<holes;i++){
    const hole=new T.Path();hole.absellipse(-w/2+step*(i+.5),-.12,step*.40,depth*.37,0,Math.PI*2,true);shape.holes.push(hole);
  }
  const geometry=new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:32});
  geometry.rotateX(-Math.PI/2);return geometry;
}

// A shallow annulus on the west (alley-facing) wall, never the south street facade.
export function sideRingGeometry(){
  const shape=new T.Shape();shape.absarc(0,0,1,0,Math.PI*2,false);
  const hole=new T.Path();hole.absarc(0,0,.87,0,Math.PI*2,true);shape.holes.push(hole);
  const geometry=new T.ExtrudeGeometry(shape,{depth:.10,bevelEnabled:false,curveSegments:32});
  geometry.rotateY(-Math.PI/2);return geometry;
}
