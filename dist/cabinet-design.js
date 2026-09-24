// Cabinet dimensions are metres. Each column can start at a different height,
// which permits a floating centre while the shelves beside it reach the floor.
export const cabinetFronts=['open','left','right','double','sliding','drawers'];
export const cabinetTemplates={
  closed:{label:'全封閉收納櫃',columns:[{share:1,bottom:0,front:'double'}]},
  niche:{label:'中央開放收納櫃',columns:[{share:.3,bottom:.18,front:'left'},{share:.4,bottom:.18,front:'open'},{share:.3,bottom:0,front:'open'}]},
  shelves:{label:'開放層架',columns:[{share:1,bottom:0,front:'open',rows:4}]},
  low:{label:'低電視櫃',columns:[{share:.5,bottom:.12,front:'drawers'},{share:.5,bottom:.12,front:'open'}]}
};
const round=n=>Math.round(n*10000)/10000;
const makeId=()=>globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2);
export function makeCabinetDesign(f,template=f.type==='console'?'low':'niche'){
  const spec=cabinetTemplates[template]||cabinetTemplates.closed;
  let used=0;
  const columns=spec.columns.map((entry,index)=>{
    const width=index===spec.columns.length-1?round(f.w-used):round(f.w*entry.share);
    used+=width;
    const bottom=Math.min(entry.bottom,Math.max(0,f.h-.16));
    const rows=entry.rows||1,usable=round(f.h-bottom);
    let consumed=0;
    const cells=Array.from({length:rows},(_,i)=>{const height=i===rows-1?round(usable-consumed):round(usable/rows);consumed+=height;return{id:makeId(),height,front:entry.front};});
    return{id:makeId(),width,bottom,cells};
  });
  return{template,columns};
}
export function validateCabinetDesign(f,design){
  if(!design||!Array.isArray(design.columns)||!design.columns.length||design.columns.length>8)throw Error('櫃體分區數量須為 1 至 8');
  let total=0,ids=new Set;
  const columns=design.columns.map(column=>{
    if(!column||typeof column.id!=='string'||ids.has(column.id))throw Error('櫃體分區編號不正確');
    ids.add(column.id);
    const{width,bottom}=column;
    if(!Number.isFinite(width)||width<.2||!Number.isFinite(bottom)||bottom<0||bottom>f.h-.15)throw Error('櫃體分區寬度至少 20 cm，底部須保留 15 cm 以上櫃體');
    if(!Array.isArray(column.cells)||!column.cells.length||column.cells.length>10)throw Error('每區層格數量須為 1 至 10');
    let used=0;
    const cells=column.cells.map(cell=>{
      if(!cell||typeof cell.id!=='string'||ids.has(cell.id)||!cabinetFronts.includes(cell.front)||!Number.isFinite(cell.height)||cell.height<.15)throw Error('層格尺寸或形式不正確；高度至少 15 cm');
      if(cell.front==='double'&&width<.4||cell.front==='sliding'&&width<.5||cell.front==='drawers'&&width<.25)throw Error('此分區寬度不足以使用所選門面');
      ids.add(cell.id);used+=cell.height;
      return{id:cell.id,height:round(cell.height),front:cell.front};
    });
    if(Math.abs(used+bottom-f.h)>.002)throw Error('層格高度加離地高度必須等於櫃體總高');
    total+=width;
    return{id:column.id,width:round(width),bottom:round(bottom),cells};
  });
  if(Math.abs(total-f.w)>.002)throw Error('分區寬度總和必須等於櫃體總寬');
  return{template:typeof design.template==='string'&&cabinetTemplates[design.template]?design.template:'custom',columns};
}
export function resizeCabinetDesign(design,oldSize,newSize){
  const next=structuredClone(design);
  let x=0;
  next.columns.forEach((column,index)=>{
    column.width=index===next.columns.length-1?round(newSize.w-x):round(column.width*newSize.w/oldSize.w);
    x+=column.width;
    column.bottom=round(Math.min(column.bottom,Math.max(0,newSize.h-.15)));
    const oldHeight=oldSize.h-design.columns[index].bottom,available=newSize.h-column.bottom;
    let y=0;
    column.cells.forEach((cell,row)=>{cell.height=row===column.cells.length-1?round(available-y):round(cell.height*available/oldHeight);y+=cell.height;});
  });
  return next;
}
export function cabinetCells(f){
  if(!f.cabinetDesign)return[];
  let x=-f.w/2;
  return f.cabinetDesign.columns.flatMap(column=>{
    let y=column.bottom;
    const cells=column.cells.map(cell=>{const rect={...cell,columnId:column.id,x:x+column.width/2,y:y+cell.height/2,w:column.width,h:cell.height,bottom:y};y+=cell.height;return rect;});
    x+=column.width;
    return cells;
  });
}
export function cabinetColumns(f){
  if(!f.cabinetDesign)return[];
  let x=-f.w/2;
  return f.cabinetDesign.columns.map(column=>{const result={...column,x:x+column.width/2};x+=column.width;return result;});
}
export function cabinetOccupiedRects(f){
  const angle=f.rot*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  return cabinetColumns(f).map(column=>({
    x:f.x+column.x*c,z:f.z-column.x*s,w:column.width,d:f.d,rot:f.rot,
    yMin:column.bottom,yMax:f.h
  }));
}
export function modularCabinetRects(f,amounts={}){
  const angle=f.rot*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const world=(x,z)=>({x:f.x+x*c+z*s,z:f.z-x*s+z*c});
  const result=[];
  for(const cell of cabinetCells(f)){
    const amount=Math.max(0,Math.min(1,Number(amounts[cell.id])||0));
    if(amount<=0)continue;
    const width=cell.w-.036,z=f.d/2+.012;
    const door=(hinge,sign,panelWidth)=>{
      const turn=-sign*amount*Math.PI/2,p=world(hinge+sign*Math.cos(turn)*panelWidth/2,z-sign*Math.sin(turn)*panelWidth/2);
      result.push({...p,w:panelWidth,d:.04,rot:f.rot+turn*180/Math.PI,yMin:cell.bottom,yMax:cell.bottom+cell.h,cellId:cell.id});
    };
    if(cell.front==='left')door(cell.x-cell.w/2+.018,1,width);
    if(cell.front==='right')door(cell.x+cell.w/2-.018,-1,width);
    if(cell.front==='double'){door(cell.x-cell.w/2+.018,1,width/2);door(cell.x+cell.w/2-.018,-1,width/2);}
    if(cell.front==='drawers'){
      const travel=amount*f.d*.55,p=world(cell.x,z+travel/2);
      result.push({...p,w:width,d:travel,rot:f.rot,yMin:cell.bottom,yMax:cell.bottom+cell.h,cellId:cell.id});
    }
  }
  return result;
}
