import {finishByCode} from './finishes.js';

// Cabinet dimensions are metres. Each column can start at a different height,
// which permits a floating column; the templates all start on the floor.
export const cabinetFronts=['open','left','right','double','sliding','drawers'];
export const cabinetTemplates={
  closed:{label:'全封閉收納櫃',columns:[{share:1,bottom:0,front:'double'}]},
  niche:{label:'中央開放收納櫃',columns:[{share:.3,bottom:0,front:'left'},{share:.4,bottom:0,front:'open'},{share:.3,bottom:0,front:'open'}]},
  shelves:{label:'開放層架',columns:[{share:1,bottom:0,front:'open',rows:4}]},
  low:{label:'低電視櫃',columns:[{share:.5,bottom:0,front:'drawers'},{share:.5,bottom:0,front:'open'}]}
};
// Fronts are full overlay: each covers its cell's carcass edges, leaving a
// FRONT_GAP reveal to its neighbours, with its back face on the carcass face.
export const FRONT_GAP=.003,FRONT_T=.018,FRONT_Z=FRONT_T/2,CARCASS_T=.018;
// Parts of a modular cabinet that can take their own board finish; a cell's
// own `finish` overrides `fronts` for that cell's door or drawer front.
export const cabinetFinishParts=[['body','櫃身'],['fronts','門片／抽屜面'],['interior','層板與背板']];
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
const isFinish=code=>!!finishByCode(code);
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
      return{id:cell.id,height:round(cell.height),front:cell.front,...(typeof cell.finish==='string'&&isFinish(cell.finish)?{finish:cell.finish}:{})};
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
    const width=cell.w-FRONT_GAP,z=f.d/2+FRONT_Z;
    const door=(hinge,sign,panelWidth)=>{
      const turn=-sign*amount*Math.PI/2,p=world(hinge+sign*Math.cos(turn)*panelWidth/2,z-sign*Math.sin(turn)*panelWidth/2);
      result.push({...p,w:panelWidth,d:.04,rot:f.rot+turn*180/Math.PI,yMin:cell.bottom,yMax:cell.bottom+cell.h,cellId:cell.id});
    };
    const left=cell.x-width/2,right=cell.x+width/2;
    if(cell.front==='left')door(left,1,width);
    if(cell.front==='right')door(right,-1,width);
    if(cell.front==='double'){door(left,1,(width-FRONT_GAP)/2);door(right,-1,(width-FRONT_GAP)/2);}
    if(cell.front==='drawers'){
      const travel=amount*f.d*.55,p=world(cell.x,z+travel/2);
      result.push({...p,w:width,d:travel,rot:f.rot,yMin:cell.bottom,yMax:cell.bottom+cell.h,cellId:cell.id});
    }
  }
  return result;
}

// The clear opening of one cell: between the side panels, above the cell's
// bottom board and below the top board when the cell reaches the top.
export function cellOpening(f,cellId){
  const cell=cabinetCells(f).find(c=>c.id===cellId);
  if(!cell)return null;
  const bottom=cell.bottom+CARCASS_T,top=cell.bottom+cell.h-(Math.abs(cell.bottom+cell.h-f.h)<.001?CARCASS_T:0);
  return{cell,x:cell.x,w:cell.w-2*CARCASS_T,bottom,h:top-bottom,depth:f.d-CARCASS_T};
}
// A TV hung inside an open cell: centred in the opening, its back on a 1 cm
// bracket against the back panel, following the cabinet's position and angle.
export const NICHE_BRACKET=.01;
export function nicheTvPlacement(tv,support,cellId){
  const opening=cellOpening(support,cellId);
  if(!opening)return null;
  const angle=support.rot*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const z=-support.d/2+CARCASS_T+NICHE_BRACKET+tv.d/2;
  return{x:support.x+opening.x*c+z*s,z:support.z-opening.x*s+z*c,rot:support.rot,elevation:round(opening.bottom+Math.max(0,(opening.h-tv.h)/2))};
}
// Warnings only: a TV that does not fit keeps its size, as the owner sets it
// from the real model.
export function nicheTvWarnings(tv,support){
  if(tv?.type!=='television'||tv.tvMount!=='niche')return[];
  if(!support?.cabinetDesign)return['找不到放電視的櫃體'];
  const opening=cellOpening(support,tv.supportCell);
  if(!opening)return['找不到放電視的櫃格，請重新選擇'];
  const cm=n=>Math.round(n*1000)/10,messages=[];
  if(opening.cell.front!=='open')messages.push('放電視的櫃格有門面，請改為開放格');
  if(tv.w>opening.w+.0005)messages.push(`電視寬 ${cm(tv.w)} cm，超過櫃格內寬 ${cm(opening.w)} cm`);
  if(tv.h>opening.h+.0005)messages.push(`電視高 ${cm(tv.h)} cm，超過櫃格內高 ${cm(opening.h)} cm`);
  if(tv.d+NICHE_BRACKET>opening.depth+.0005)messages.push(`電視厚度加壁掛架 ${cm(tv.d+NICHE_BRACKET)} cm，超過櫃格深度 ${cm(opening.depth)} cm`);
  return messages;
}
export const hostsNicheTv=(host,tv)=>tv?.type==='television'&&tv.tvMount==='niche'&&tv.supportId===host?.id;
