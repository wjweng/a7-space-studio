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
// Finishes form three levels: the cabinet's `finish` (sides, top and each
// column's lowest board), then `partFinishes` for all doors, shelves, backs or
// drawer boxes, then a cell's own `finishes`. An unset level follows the one
// above, down to the cabinet's finish or the palette's wood.
// A cell's shelf is the board under it; a column's lowest board is body.
// [cell slot, cabinet-wide key, label]; doors include drawer and sliding fronts.
export const cabinetFinishSlots=[['door','doors','門'],['shelf','shelves','層板'],['back','backs','背板'],['drawerBox','drawerBoxes','抽屜盒']];
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
const ownFinishes=cell=>{const finishes={};for(const [slot]of cabinetFinishSlots)if(isFinish(cell.finishes?.[slot]))finishes[slot]=cell.finishes[slot];return finishes;};
const checkFront=(front,width)=>{if(front==='double'&&width<.4||front==='sliding'&&width<.5||front==='drawers'&&width<.25)throw Error('此格寬度不足以使用所選門面');};
export function validateCabinetDesign(f,design){
  if(!design||!Array.isArray(design.columns)||!design.columns.length||design.columns.length>8)throw Error('櫃體分區數量須為 1 至 8');
  let total=0,ids=new Set;
  const columns=design.columns.map(column=>{
    if(!column||typeof column.id!=='string'||ids.has(column.id))throw Error('櫃體分區編號不正確');
    ids.add(column.id);
    const{width,bottom}=column,top=column.top??0;
    if(!Number.isFinite(width)||width<.2||!Number.isFinite(bottom)||bottom<0||!Number.isFinite(top)||top<0||bottom+top>f.h-.15)throw Error('櫃體分區寬度至少 20 cm，底部須保留 15 cm 以上櫃體');
    if(!Array.isArray(column.cells)||!column.cells.length||column.cells.length>10)throw Error('每區層格數量須為 1 至 10');
    let used=0;
    const cells=column.cells.map(cell=>{
      if(!cell||typeof cell.id!=='string'||ids.has(cell.id)||!cabinetFronts.includes(cell.front)||!Number.isFinite(cell.height)||cell.height<.15)throw Error('層格尺寸或形式不正確；高度至少 15 cm');
      ids.add(cell.id);used+=cell.height;
      const finishes=ownFinishes(cell);
      if(!finishes.door&&isFinish(cell.finish))finishes.door=cell.finish; // before 2026-09-25 a cell had one front finish
      if(Array.isArray(cell.parts)&&cell.parts.length>1){
        // A layer split side by side: each part is a cell of its own.
        if(cell.parts.length>8)throw Error('單層直向分區最多 8 格');
        let partWidth=0;
        const parts=cell.parts.map(part=>{
          if(!part||typeof part.id!=='string'||ids.has(part.id)||!cabinetFronts.includes(part.front)||!Number.isFinite(part.width)||part.width<.15)throw Error('單層直向分區寬度至少 15 cm');
          checkFront(part.front,part.width);ids.add(part.id);partWidth+=part.width;
          const own=ownFinishes(part);
          return{id:part.id,width:round(part.width),front:part.front,...(Object.keys(own).length?{finishes:own}:{})};
        });
        if(Math.abs(partWidth-width)>.002)throw Error('單層直向分區寬度總和必須等於分區寬度');
        return{id:cell.id,height:round(cell.height),front:cell.front,parts};
      }
      checkFront(cell.front,width);
      return{id:cell.id,height:round(cell.height),front:cell.front,...(Object.keys(finishes).length?{finishes}:{})};
    });
    if(Math.abs(used+bottom+top-f.h)>.002)throw Error('層格高度加上下留空必須等於櫃體總高');
    total+=width;
    return{id:column.id,width:round(width),bottom:round(bottom),...(top>0?{top:round(top)}:{}),cells};
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
    fitParts(column);
    column.bottom=round(Math.min(column.bottom,Math.max(0,newSize.h-.15)));
    if(column.top)column.top=round(Math.min(column.top,Math.max(0,newSize.h-column.bottom-.15)));
    const old=design.columns[index],oldHeight=oldSize.h-old.bottom-(old.top||0),available=newSize.h-column.bottom-(column.top||0);
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
    // One rect per smallest cell: a layer, or each part of a split layer.
    // `last` marks the column's top layer, which carries the top board;
    // `rowId` names the layer; insets are the side board thickness at each
    // side, a full board at the column's sides and half a divider inside.
    const cells=column.cells.flatMap((cell,row)=>{
      const shared={columnId:column.id,rowId:cell.id,y:y+cell.height/2,h:cell.height,bottom:y,last:row===column.cells.length-1};
      y+=cell.height;
      if(!cell.parts)return[{...cell,...shared,x:x+column.width/2,w:column.width,insetL:CARCASS_T,insetR:CARCASS_T}];
      let px=x;
      return cell.parts.map((part,i)=>{const rect={...part,...shared,height:cell.height,x:px+part.width/2,w:part.width,insetL:i?CARCASS_T/2:CARCASS_T,insetR:i<cell.parts.length-1?CARCASS_T/2:CARCASS_T};px+=part.width;return rect;});
    });
    x+=column.width;
    return cells;
  });
}
export function cabinetColumns(f){
  if(!f.cabinetDesign)return[];
  let x=-f.w/2;
  return f.cabinetDesign.columns.map(column=>{const result={...column,x:x+column.width/2};x+=column.width;return result;});
}
// A hanging cabinet's heights start at its underside (`elevation`).
const baseHeight=f=>f.type==='hangingCabinet'?f.elevation||0:0;
export function cabinetOccupiedRects(f){
  const angle=f.rot*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),base=baseHeight(f);
  return cabinetColumns(f).map(column=>({
    x:f.x+column.x*c,z:f.z-column.x*s,w:column.width,d:f.d,rot:f.rot,
    yMin:base+column.bottom,yMax:base+f.h-(column.top||0)
  }));
}
export function modularCabinetRects(f,amounts={}){
  const angle=f.rot*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const world=(x,z)=>({x:f.x+x*c+z*s,z:f.z-x*s+z*c}),base=baseHeight(f);
  const result=[];
  for(const cell of cabinetCells(f)){
    const amount=Math.max(0,Math.min(1,Number(amounts[cell.id])||0));
    if(amount<=0)continue;
    const width=cell.w-FRONT_GAP,z=f.d/2+FRONT_Z;
    const door=(hinge,sign,panelWidth)=>{
      const turn=-sign*amount*Math.PI/2,p=world(hinge+sign*Math.cos(turn)*panelWidth/2,z-sign*Math.sin(turn)*panelWidth/2);
      result.push({...p,w:panelWidth,d:.04,rot:f.rot+turn*180/Math.PI,yMin:base+cell.bottom,yMax:base+cell.bottom+cell.h,cellId:cell.id});
    };
    const left=cell.x-width/2,right=cell.x+width/2;
    if(cell.front==='left')door(left,1,width);
    if(cell.front==='right')door(right,-1,width);
    if(cell.front==='double'){door(left,1,(width-FRONT_GAP)/2);door(right,-1,(width-FRONT_GAP)/2);}
    if(cell.front==='drawers'){
      const travel=amount*f.d*.55,p=world(cell.x,z+travel/2);
      result.push({...p,w:width,d:travel,rot:f.rot,yMin:base+cell.bottom,yMax:base+cell.bottom+cell.h,cellId:cell.id});
    }
  }
  return result;
}

// The clear opening of one cell: between the side panels, above the cell's
// bottom board and below the top board when the cell reaches the top.
export function cellOpening(f,cellId){
  const cell=cabinetCells(f).find(c=>c.id===cellId);
  if(!cell)return null;
  const bottom=cell.bottom+CARCASS_T,top=cell.bottom+cell.h-(cell.last?CARCASS_T:0);
  return{cell,x:cell.x+(cell.insetL-cell.insetR)/2,w:cell.w-cell.insetL-cell.insetR,bottom,h:top-bottom,depth:f.d-CARCASS_T};
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

// Which cell slots apply: no door on an open cell, no shelf on a column's
// lowest cell (that board is body), a drawer box only behind drawers.
export function cellFinishSlots(f,cell){
  const column=f.cabinetDesign.columns.find(c=>c.id===cell.columnId);
  return cabinetFinishSlots.filter(([slot])=>slot==='door'?cell.front!=='open':slot==='shelf'?column.cells[0].id!==cell.rowId:slot==='drawerBox'?cell.front==='drawers':true);
}
// The design objects that hold a front, finishes and an open state: every
// unsplit layer and every part of a split one.
export const designLeaves=design=>design.columns.flatMap(column=>column.cells.flatMap(cell=>cell.parts||[cell]));
export const findLeaf=(design,id)=>designLeaves(design).find(leaf=>leaf.id===id);
// After a column's width changed, let its layers' parts follow: the part on
// `side` takes the difference, or all scale if that would leave one too thin.
export function fitParts(column,side='right'){
  for(const cell of column.cells){
    if(!cell.parts)continue;
    const diff=column.width-cell.parts.reduce((sum,p)=>sum+p.width,0),edge=side==='left'?cell.parts[0]:cell.parts.at(-1);
    if(Math.abs(diff)<1e-9)continue;
    if(edge.width+diff>=.15)edge.width=round(edge.width+diff);
    else{const scale=column.width/(column.width-diff);let used=0;cell.parts.forEach((p,i)=>{p.width=i===cell.parts.length-1?round(column.width-used):round(p.width*scale);used+=p.width;});}
  }
}
// Split one smallest cell side by side into two equal parts; the left keeps
// its front and finishes. Returns null when too narrow (parts are 20 cm+).
export function splitCabinetCell(design,leafId,makePartId=makeId){
  const next=structuredClone(design);
  for(const column of next.columns)for(const cell of column.cells){
    const parts=cell.parts||[{id:cell.id,width:column.width,front:cell.front,...(cell.finishes?{finishes:cell.finishes}:{})}],index=parts.findIndex(p=>p.id===leafId);
    if(index<0)continue;
    const part=parts[index];
    if(part.width<.4||parts.length>=8)return null;
    const half=round(part.width/2),left={...part,width:half};
    if(!cell.parts){left.id=makePartId();delete cell.finishes;}
    const right={id:makePartId(),width:round(part.width-half),front:'open'};
    parts.splice(index,1,left,right);cell.parts=parts;next.template='custom';
    return next;
  }
  return null;
}
// Remove one part of a split layer; its left neighbour (or right, for the
// first) takes the width. A layer left with one part becomes unsplit again.
export function removeCabinetPart(design,partId){
  const next=structuredClone(design);
  for(const column of next.columns)for(const cell of column.cells){
    const index=cell.parts?.findIndex(p=>p.id===partId)??-1;
    if(index<0)continue;
    const [removed]=cell.parts.splice(index,1),neighbour=cell.parts[Math.max(0,index-1)];
    neighbour.width=round(neighbour.width+removed.width);
    if(cell.parts.length===1){const [only]=cell.parts;cell.front=only.front;if(only.finishes)cell.finishes=only.finishes;delete cell.parts;}
    next.template='custom';
    return next;
  }
  return null;
}
// Resolved finish code for a cell slot, or '' for the level-one fallback.
export function cellFinish(f,cell,slot){
  const key=cabinetFinishSlots.find(([s])=>s===slot)[1];
  return cell.finishes?.[slot]||f.partFinishes?.[key]||'';
}

// Drag one outer edge of a modular cabinet by `delta` metres (outward
// positive): only the column or cells on that side change, and the opposite
// edge stays put, so a side edge also moves the centre by half the change.
// Top is for floor cabinets, bottom for hanging ones.
export function resizeCabinetEdge(f,side,delta,maxHeight=Infinity){
  const next=structuredClone(f),columns=next.cabinetDesign.columns;
  if(side==='left'||side==='right'){
    const column=side==='right'?columns.at(-1):columns[0],grow=Math.max(.2-column.width,delta),shift=(side==='right'?1:-1)*grow/2,angle=f.rot*Math.PI/180;
    column.width=round(column.width+grow);next.w=round(f.w+grow);fitParts(column,side);
    next.x=f.x+shift*Math.cos(angle);next.z=f.z-shift*Math.sin(angle);
  }else{
    const top=side==='top',gapKey=top?'top':'bottom',edgeCell=column=>top?column.cells.at(-1):column.cells[0];
    const grow=Math.min(maxHeight-f.h,Math.max(...columns.map(column=>.15-edgeCell(column).height-(column[gapKey]||0)),delta));
    for(const column of columns){
      // A column with a gap on the dragged side widens the gap when growing
      // and uses it up first when shrinking; its cells keep their size.
      const gap=column[gapKey]||0;
      if(gap>0){const next=Math.max(0,gap+grow);edgeCell(column).height=round(edgeCell(column).height+grow-(next-gap));if(next>0)column[gapKey]=round(next);else if(top)delete column.top;else column.bottom=0;}
      else edgeCell(column).height=round(edgeCell(column).height+grow);
    }
    next.h=round(f.h+grow);
  }
  next.cabinetDesign.template='custom';
  return next;
}

// Deleting a cell or column never makes its neighbours grow to fill the
// space at the cabinet's free edge: a floor cabinet's top cell or a hanging
// cabinet's bottom cell leaves a gap in its column, and an end column takes
// its width with it (the opposite edge stays put). When every column has a
// gap at the free edge, the cabinet shrinks by the smallest one. A cell
// elsewhere is absorbed by its neighbour, a middle column by its left one.
export function removeCabinetCell(f,columnId,cellId){
  const next=structuredClone(f),column=next.cabinetDesign.columns.find(c=>c.id===columnId);
  if(!column||column.cells.length===1)return null;
  const index=column.cells.findIndex(c=>c.id===cellId),hanging=f.type==='hangingCabinet';
  if(index<0)return null;
  const [removed]=column.cells.splice(index,1);
  if(!hanging&&index===column.cells.length)column.top=round((column.top||0)+removed.height);
  else if(hanging&&index===0)column.bottom=round(column.bottom+removed.height);
  else{const neighbour=column.cells[Math.max(0,index-1)];neighbour.height=round(neighbour.height+removed.height);}
  next.cabinetDesign.template='custom';
  return trimCabinetGap(next);
}
export function removeCabinetColumn(f,columnId){
  const next=structuredClone(f),columns=next.cabinetDesign.columns,index=columns.findIndex(c=>c.id===columnId);
  if(index<0||columns.length===1)return null;
  const [removed]=columns.splice(index,1);
  if(index===0||index===columns.length){
    const shift=(index===0?1:-1)*removed.width/2,angle=f.rot*Math.PI/180;
    next.w=round(f.w-removed.width);next.x=f.x+shift*Math.cos(angle);next.z=f.z-shift*Math.sin(angle);
  }else{columns[index-1].width=round(columns[index-1].width+removed.width);fitParts(columns[index-1]);}
  next.cabinetDesign.template='custom';
  return trimCabinetGap(next);
}
function trimCabinetGap(f){
  const key=f.type==='hangingCabinet'?'bottom':'top',columns=f.cabinetDesign.columns,gap=Math.min(...columns.map(c=>c[key]||0));
  if(gap<=0)return f;
  for(const column of columns){const rest=round((column[key]||0)-gap);if(key==='top'&&!rest)delete column.top;else column[key]=rest;}
  f.h=round(f.h-gap);
  return f;
}

// The modular design that looks like a pre-modular cabinet's `doorStyle`,
// so opening the editor for the first time keeps the cabinet's fronts
// instead of swapping in a template. Mirrors `cabinetLayout` in spatial.js.
export function designFromDoorStyle(f){
  const style=f.doorStyle||'double',fit=(front,width)=>front==='sliding'&&width<.5?fit('double',width):front==='double'&&width<.4||front==='drawers'&&width<.25?'left':front;
  let spec;
  if(style==='drawers'){const count=f.type==='console'?Math.ceil(f.w/.6):Math.ceil(f.w/.8);spec=Array(Math.max(1,count)).fill(['drawers',f.type==='console'?1:3]);}
  else if(style==='mixed')spec=[['left',1],['drawers',1],['right',1]];
  else if(style==='multi')spec=Array.from({length:Math.max(2,Math.ceil(f.w/.6))},(_,i)=>[i%2?'right':'left',1]);
  else spec=[[['left','right','sliding'].includes(style)?style:'double',1]];
  spec=spec.slice(0,Math.max(1,Math.floor(f.w/.2+1e-9)));
  let usedW=0;
  const columns=spec.map(([front,rows],index)=>{
    const width=index===spec.length-1?round(f.w-usedW):round(f.w/spec.length);usedW+=width;
    const count=f.h/rows>=.15?rows:1;let usedH=0;
    const cells=Array.from({length:count},(_,row)=>{const height=row===count-1?round(f.h-usedH):round(f.h/count);usedH+=height;return{id:makeId(),height,front:fit(front,width)};});
    return{id:makeId(),width,bottom:0,cells};
  });
  return{template:'custom',columns};
}
