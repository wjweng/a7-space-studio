export function anchorMediaWall(f,anchor,walls,wallThickness=.12){
  const wall=walls[anchor.index];
  if(!wall||wall.opening)throw Error('請選擇沒有門窗的完整牆段');
  const dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],length=Math.hypot(dx,dz);
  if(length<f.w+.04)throw Error('這段牆不足以容納電視牆寬度');
  const side=anchor.side===-1?-1:1,tx=dx/length,tz=dz/length;
  const requested=Number.isFinite(anchor.offset)?anchor.offset:(f.x-wall.a[0])*tx+(f.z-wall.a[1])*tz;
  const offset=Math.max(f.w/2+.02,Math.min(length-f.w/2-.02,requested));
  const rotation=(-Math.atan2(dz,dx)*180/Math.PI+(side<0?180:0)+360)%360;
  const angle=rotation*Math.PI/180,nx=Math.sin(angle),nz=Math.cos(angle),distance=wallThickness/2+f.d/2+.003;
  return{...f,x:wall.a[0]+tx*offset+nx*distance,z:wall.a[1]+tz*offset+nz*distance,rot:rotation,wallAnchor:{index:anchor.index,offset,side}};
}
export function mediaWallChoices(f,walls,insideShell,roomAt){
  const choices=[];
  for(const [index,wall]of walls.entries()){
    if(wall.opening)continue;
    const length=Math.hypot(wall.b[0]-wall.a[0],wall.b[1]-wall.a[1]);
    if(length<f.w+.04)continue;
    for(const side of[-1,1]){
      const candidate=anchorMediaWall(f,{index,side},walls);
      if(!insideShell(candidate))continue;
      const room=roomAt(candidate.x,candidate.z),distance=Math.hypot(candidate.x-f.x,candidate.z-f.z);
      choices.push({index,side,offset:candidate.wallAnchor.offset,label:`${room}・牆段 ${index+1}（${Math.round(length*100)} cm）`,distance});
    }
  }
  return choices.sort((a,b)=>a.distance-b.distance);
}
