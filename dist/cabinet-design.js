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
// A column holds a stack of rows; a row may be split side by side into
// parts, and a part may again hold a stack of rows, to any depth. The rows
// and parts without children are the cells that carry fronts and finishes.
function checkRows(list,height,width,ids){
  if(!Array.isArray(list)||!list.length||list.length>10)throw Error('每區層格數量須為 1 至 10');
  let used=0;
  const rows=list.map(row=>{
    if(!row||typeof row.id!=='string'||ids.has(row.id)||!Number.isFinite(row.height)||row.height<.15)throw Error('層格尺寸不正確；高度至少 15 cm');
    ids.add(row.id);used+=row.height;
    if(Array.isArray(row.parts)&&row.parts.length)return{id:row.id,height:round(row.height),parts:checkParts(row.parts,width,row.height,ids)};
    return{id:row.id,height:round(row.height),...leafFields(row,width)};
  });
  if(Math.abs(used-height)>.002)throw Error('層格高度總和必須等於所在空間的高度');
  return rows;
}
function checkParts(list,width,height,ids){
  if(list.length>8)throw Error('單層直向分區最多 8 格');
  let used=0;
  const parts=list.map(part=>{
    if(!part||typeof part.id!=='string'||ids.has(part.id)||!Number.isFinite(part.width)||part.width<.15)throw Error('直向分區寬度至少 15 cm');
    ids.add(part.id);used+=part.width;
    if(Array.isArray(part.cells)&&part.cells.length)return{id:part.id,width:round(part.width),cells:checkRows(part.cells,height,part.width,ids)};
    return{id:part.id,width:round(part.width),...leafFields(part,part.width)};
  });
  if(Math.abs(used-width)>.002)throw Error('直向分區寬度總和必須等於所在空間的寬度');
  return parts;
}
function leafFields(cell,width){
  if(!cabinetFronts.includes(cell.front))throw Error('層格門面形式不正確');
  checkFront(cell.front,width);
  const finishes=ownFinishes(cell);
  if(!finishes.door&&isFinish(cell.finish))finishes.door=cell.finish; // before 2026-09-25 a cell had one front finish
  return{front:cell.front,...(cell.handle&&cell.front!=='open'?{handle:true}:{}),...(Object.keys(finishes).length?{finishes}:{})};
}
export function validateCabinetDesign(f,design){
  if(!design||!Array.isArray(design.columns)||!design.columns.length||design.columns.length>8)throw Error('櫃體分區數量須為 1 至 8');
  let total=0,ids=new Set;
  const columns=design.columns.map(column=>{
    if(!column||typeof column.id!=='string'||ids.has(column.id))throw Error('櫃體分區編號不正確');
    ids.add(column.id);
    const{width,bottom}=column,top=column.top??0;
    if(!Number.isFinite(width)||width<.2||!Number.isFinite(bottom)||bottom<0||!Number.isFinite(top)||top<0||bottom+top>f.h-.15)throw Error('櫃體分區寬度至少 20 cm，底部須保留 15 cm 以上櫃體');
    const cells=checkRows(column.cells,f.h-bottom-top,width,ids);
    total+=width;
    return{id:column.id,width:round(width),bottom:round(bottom),...(top>0?{top:round(top)}:{}),cells};
  });
  if(Math.abs(total-f.w)>.002)throw Error('分區寬度總和必須等於櫃體總寬');
  const doorGroups=checkDoorGroups(f,columns,design.doorGroups);
  return{template:typeof design.template==='string'&&cabinetTemplates[design.template]?design.template:'custom',columns,...(doorGroups.length?{doorGroups}:{})};
}
// A door may span several cells: a door group lists cells that share one
// hinged front over their combined rectangle, so the door's edges line up
// with the cells'. Members carry the same front, handle and door finish (the
// first member's wins). A group that no longer makes one rectangle of hinged
// cells, after a split, delete or new front, is dropped and each cell keeps
// its own door. Drawers and sliding doors stay single-cell: across a shelf or
// divider their boxes and leaves would run into the boards.
export const groupFronts=['left','right','double'];
export function boundsOf(cells){
  const l=Math.min(...cells.map(c=>c.x-c.w/2)),r=Math.max(...cells.map(c=>c.x+c.w/2)),b=Math.min(...cells.map(c=>c.bottom)),t=Math.max(...cells.map(c=>c.bottom+c.h));
  return{x:(l+r)/2,w:r-l,bottom:b,h:t-b,y:(b+t)/2};
}
// Cells never overlap, so they fill their bounding box exactly when the areas match.
const isRectangle=cells=>{const box=boundsOf(cells);return Math.abs(cells.reduce((sum,c)=>sum+c.w*c.h,0)-box.w*box.h)<1e-6;};
function checkDoorGroups(f,columns,list){
  if(!Array.isArray(list))return[];
  const cells=cabinetStructure({w:f.w,h:f.h,cabinetDesign:{columns}}).cells,byId=new Map(cells.map(c=>[c.id,c])),used=new Set,out=[];
  for(const group of list.slice(0,40)){
    if(!group||typeof group.id!=='string'||!Array.isArray(group.cells))continue;
    const ids=[...new Set(group.cells.filter(id=>typeof id==='string'))],members=ids.map(id=>byId.get(id));
    if(members.length<2||members.some(c=>!c||used.has(c.id)))continue;
    const front=members[0].front;
    if(!groupFronts.includes(front)||members.some(c=>c.front!==front)||!isRectangle(members))continue;
    try{checkFront(front,boundsOf(members).w);}catch{continue;}
    const lead=findLeaf({columns},ids[0]);
    for(const id of ids.slice(1)){
      const leaf=findLeaf({columns},id);
      if(lead.handle)leaf.handle=true;else delete leaf.handle;
      const door=lead.finishes?.door;
      if(door)leaf.finishes={...(leaf.finishes||{}),door};
      else if(leaf.finishes){delete leaf.finishes.door;if(!Object.keys(leaf.finishes).length)delete leaf.finishes;}
    }
    ids.forEach(id=>used.add(id));out.push({id:group.id,cells:ids});
  }
  return out;
}
export const doorGroupOf=(design,cellId)=>(design?.doorGroups||[]).find(group=>group.cells.includes(cellId))||null;
// Every front to draw or swing: a door group as one panel over its cells, any
// other cell with a front on its own. `id` (the first member) keys its open
// state; `ids` are all the cells it covers.
export function frontPanels(f){
  const cells=cabinetCells(f),out=[],seen=new Set;
  for(const cell of cells){
    if(cell.front==='open')continue;
    const group=doorGroupOf(f.cabinetDesign,cell.id);
    if(!group){out.push({id:cell.id,ids:[cell.id],front:cell.front,handle:!!cell.handle,cell,x:cell.x,y:cell.y,w:cell.w,h:cell.h,bottom:cell.bottom});continue;}
    if(seen.has(group.id))continue;
    seen.add(group.id);
    const members=cells.filter(c=>group.cells.includes(c.id)),lead=members.find(c=>c.id===group.cells[0]);
    out.push({id:lead.id,ids:[...group.cells],front:lead.front,handle:!!lead.handle,cell:lead,...boundsOf(members)});
  }
  return out;
}
// Merge the chosen cells (and any groups they already belong to) into one
// door. The door keeps the first chosen hinged front, else double (left when
// under 40 cm), a handle if any cell had one, and the first cell's door finish.
export function mergeDoorCells(f,ids){
  const design=structuredClone(f.cabinetDesign),groups=design.doorGroups||[],all=new Set(ids);
  for(const group of groups)if(group.cells.some(id=>all.has(id)))group.cells.forEach(id=>all.add(id));
  const cells=cabinetCells(f).filter(c=>all.has(c.id));
  if(cells.length<2)throw Error('請至少選兩格');
  if(!isRectangle(cells))throw Error('選到的格子要剛好拼成一個矩形，門板才能對齊格子');
  const width=boundsOf(cells).w,chosen=ids.map(id=>cells.find(c=>c.id===id)).find(c=>c&&groupFronts.includes(c.front));
  let front=chosen?.front||'double';if(front==='double'&&width<.4)front='left';
  const lead=chosen||cells.find(c=>c.id===ids[0])||cells[0],handle=cells.some(c=>c.handle),door=lead.finishes?.door;
  for(const cell of cells){
    const leaf=findLeaf(design,cell.id);leaf.front=front;
    if(handle)leaf.handle=true;else delete leaf.handle;
    if(door)leaf.finishes={...(leaf.finishes||{}),door};
    else if(leaf.finishes){delete leaf.finishes.door;if(!Object.keys(leaf.finishes).length)delete leaf.finishes;}
  }
  design.doorGroups=[...groups.filter(group=>!group.cells.some(id=>all.has(id))),{id:makeId(),cells:[lead.id,...cells.map(c=>c.id).filter(id=>id!==lead.id)]}];
  design.template='custom';
  return design;
}
export function splitDoorGroup(design,cellId){
  const next=structuredClone(design);
  next.doorGroups=(next.doorGroups||[]).filter(group=>!group.cells.includes(cellId));
  if(!next.doorGroups.length)delete next.doorGroups;
  return next;
}
export function resizeCabinetDesign(design,oldSize,newSize){
  const next=structuredClone(design);
  let x=0;
  next.columns.forEach((column,index)=>{
    column.width=index===next.columns.length-1?round(newSize.w-x):round(column.width*newSize.w/oldSize.w);
    x+=column.width;
    column.bottom=round(Math.min(column.bottom,Math.max(0,newSize.h-.15)));
    if(column.top)column.top=round(Math.min(column.top,Math.max(0,newSize.h-column.bottom-.15)));
    const old=design.columns[index],oldHeight=oldSize.h-old.bottom-(old.top||0),available=newSize.h-column.bottom-(column.top||0);
    let y=0;
    column.cells.forEach((cell,row)=>{cell.height=row===column.cells.length-1?round(available-y):round(cell.height*available/oldHeight);y+=cell.height;});
  });
  return fitDesign({h:newSize.h},next);
}
// Walk the tree into cell rects plus the lines between siblings. Each cell
// rect has its centre (x, y), size (w, h), `bottom`, `last` (its top is the
// column's top, so it carries the top board), `rowId` (the row it is or sits
// in) and `insetL`/`insetR`: the board at each side, a full side panel at
// the column's edges and half a divider inside. `partLines` are the dividers
// between side-by-side parts; `rowLines` the boundaries between rows.
export function cabinetStructure(f){
  const cells=[],rowLines=[],partLines=[],T=CARCASS_T;
  if(!f.cabinetDesign)return{cells,rowLines,partLines};
  let x=-f.w/2;
  for(const column of f.cabinetDesign.columns){
    const top=f.h-(column.top||0),atTop=(bottom,height)=>Math.abs(bottom+height-top)<1e-6;
    const rect=(node,left,width,bottom,height,insetL,insetR,rowId)=>({...node,columnId:column.id,rowId,x:left+width/2,w:width,y:bottom+height/2,h:height,height,bottom,last:atTop(bottom,height),insetL,insetR});
    const rows=(list,left,width,bottom,insetL,insetR)=>{
      let y=bottom;
      list.forEach((row,i)=>{
        if(i)rowLines.push({id:list[i-1].id,next:row.id,x:left+width/2,w:width,y,insetL,insetR});
        if(row.parts)parts(row.parts,left,width,y,row.height,insetL,insetR,row.id);
        else cells.push(rect(row,left,width,y,row.height,insetL,insetR,row.id));
        y+=row.height;
      });
    };
    const parts=(list,left,width,bottom,height,insetL,insetR,rowId)=>{
      let px=left;
      list.forEach((part,i)=>{
        const l=i?T/2:insetL,r=i<list.length-1?T/2:insetR;
        if(i<list.length-1)partLines.push({id:part.id,next:list[i+1].id,x:px+part.width,bottom,h:height});
        if(part.cells)rows(part.cells,px,part.width,bottom,l,r);
        else cells.push(rect(part,px,part.width,bottom,height,l,r,rowId));
        px+=part.width;
      });
    };
    rows(column.cells,x,column.width,column.bottom,T,T);
    x+=column.width;
  }
  return{cells,rowLines,partLines};
}
export const cabinetCells=f=>cabinetStructure(f).cells;
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
  for(const panel of frontPanels(f)){
    const amount=Math.max(0,Math.min(1,Number(amounts[panel.id])||0));
    if(amount<=0)continue;
    const width=panel.w-FRONT_GAP,z=f.d/2+FRONT_Z;
    const door=(hinge,sign,panelWidth)=>{
      const turn=-sign*amount*Math.PI/2,p=world(hinge+sign*Math.cos(turn)*panelWidth/2,z-sign*Math.sin(turn)*panelWidth/2);
      // As thick as the drawn leaf (FRONT_T), so the sweep matches what is seen.
      result.push({...p,w:panelWidth,d:FRONT_T,rot:f.rot+turn*180/Math.PI,yMin:base+panel.bottom,yMax:base+panel.bottom+panel.h,cellId:panel.id});
    };
    const left=panel.x-width/2,right=panel.x+width/2;
    if(panel.front==='left')door(left,1,width);
    if(panel.front==='right')door(right,-1,width);
    if(panel.front==='double'){door(left,1,(width-FRONT_GAP)/2);door(right,-1,(width-FRONT_GAP)/2);}
    if(panel.front==='drawers'){
      const travel=amount*f.d*.55,p=world(panel.x,z+travel/2);
      result.push({...p,w:width,d:travel,rot:f.rot,yMin:base+panel.bottom,yMax:base+panel.bottom+panel.h,cellId:panel.id});
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
// A TV standing on its foot on an open cell's shelf: centred in the
// opening, at the middle of its depth.
export const TV_STAND=.07,TV_STAND_DEPTH=.16;
export function shelfTvPlacement(tv,support,cellId){
  const opening=cellOpening(support,cellId);
  if(!opening)return null;
  const angle=support.rot*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),z=CARCASS_T/2;
  return{x:support.x+opening.x*c+z*s,z:support.z-opening.x*s+z*c,rot:support.rot,elevation:round(opening.bottom+TV_STAND)};
}
// Where a TV in a cell goes by default: among open cells it fits (with its
// foot when standing), the one whose TV centre is nearest 1.1 m, a common
// seated viewing height; if it fits nowhere, the largest open cell.
export function bestTvCell(host,tv,mount='niche'){
  const stand=mount==='cabinet'?TV_STAND:0,options=cabinetCells(host).filter(c=>c.front==='open').map(cell=>({cell,o:cellOpening(host,cell.id)}));
  if(!options.length)return null;
  const fits=({o})=>tv.w<=o.w+.0005&&tv.h+stand<=o.h+.0005&&(mount==='cabinet'?TV_STAND_DEPTH:tv.d+NICHE_BRACKET)<=o.depth+.0005;
  const centre=({o})=>mount==='cabinet'?o.bottom+stand+tv.h/2:o.bottom+o.h/2;
  const pool=options.filter(fits);
  const best=pool.length?pool.sort((a,b)=>Math.abs(centre(a)-1.1)-Math.abs(centre(b)-1.1))[0]:options.sort((a,b)=>b.o.w*b.o.h-a.o.w*a.o.h)[0];
  return best.cell.id;
}
// Warnings only: a TV that does not fit keeps its size, as the owner sets it
// from the real model. Covers TVs hung in a cell and TVs standing in one.
export function nicheTvWarnings(tv,support){
  if(tv?.type!=='television'||!tvInCell(tv))return[];
  if(!support?.cabinetDesign)return['找不到放電視的櫃體'];
  const opening=cellOpening(support,tv.supportCell);
  if(!opening)return['找不到放電視的櫃格，請重新選擇'];
  const cm=n=>Math.round(n*1000)/10,messages=[];
  const standing=tv.tvMount==='cabinet';
  if(opening.cell.front!=='open')messages.push('放電視的櫃格有門面，請改為開放格');
  if(tv.w>opening.w+.0005)messages.push(`電視寬 ${cm(tv.w)} cm，超過櫃格內寬 ${cm(opening.w)} cm`);
  if(standing&&tv.h+TV_STAND>opening.h+.0005)messages.push(`電視加腳座高 ${cm(tv.h+TV_STAND)} cm，超過櫃格內高 ${cm(opening.h)} cm`);
  if(!standing&&tv.h>opening.h+.0005)messages.push(`電視高 ${cm(tv.h)} cm，超過櫃格內高 ${cm(opening.h)} cm`);
  if(!standing&&tv.d+NICHE_BRACKET>opening.depth+.0005)messages.push(`電視厚度加壁掛架 ${cm(tv.d+NICHE_BRACKET)} cm，超過櫃格深度 ${cm(opening.depth)} cm`);
  return messages;
}
// A TV hung in, or standing in, a cell of this cabinet.
const tvInCell=tv=>tv.tvMount==='niche'||tv.tvMount==='cabinet'&&typeof tv.supportCell==='string';
export const hostsNicheTv=(host,tv)=>tv?.type==='television'&&tvInCell(tv)&&tv.supportId===host?.id;

// Which cell slots apply: no door on an open cell, no shelf on a column's
// lowest cell (that board is body), a drawer box only behind drawers.
export function cellFinishSlots(f,cell){
  const column=f.cabinetDesign.columns.find(c=>c.id===cell.columnId);
  return cabinetFinishSlots.filter(([slot])=>slot==='door'?cell.front!=='open':slot==='shelf'?cell.bottom>column.bottom+1e-6:slot==='drawerBox'?cell.front==='drawers':true);
}
const isLeaf=node=>!node.parts&&!node.cells;
const children=node=>node.parts||node.cells||[];
// Every cell object (row or part without children), in drawing order.
export const designLeaves=design=>{const out=[],walk=node=>isLeaf(node)?out.push(node):children(node).forEach(walk);design.columns.forEach(c=>c.cells.forEach(walk));return out;};
export const findLeaf=(design,id)=>designLeaves(design).find(leaf=>leaf.id===id);
// The chain from a column down to the node with this id. Each step is the
// sibling list the node sits in, its index, whether the list stacks rows or
// sets parts side by side, and the list's width and height.
export function locateCell(design,id){
  const inRows=(list,width,path)=>{
    for(const [index,row]of list.entries()){
      const step=[...path,{kind:'rows',list,index,node:row,width,height:row.height}];
      if(row.id===id)return step;
      if(row.parts){const found=inParts(row.parts,row.height,step);if(found)return found;}
    }
    return null;
  };
  const inParts=(list,height,path)=>{
    for(const [index,part]of list.entries()){
      const step=[...path,{kind:'parts',list,index,node:part,width:part.width,height}];
      if(part.id===id)return step;
      if(part.cells){const found=inRows(part.cells,part.width,step);if(found)return found;}
    }
    return null;
  };
  for(const column of design.columns){const found=inRows(column.cells,column.width,[{kind:'column',node:column}]);if(found)return found;}
  return null;
}
const nearest=(path,kind)=>{for(let i=path.length-1;i>0;i--)if(path[i].kind===kind)return i;return -1;};
export const leafIdsUnder=node=>{const out=[],walk=n=>isLeaf(n)?out.push(n.id):children(n).forEach(walk);walk(node);return out;};
// Make every stack of rows fill its height and every set of parts its width,
// all the way down, after a size changed above them. The row or part on
// `hSide` ('top'|'bottom') or `wSide` ('left'|'right') takes the difference;
// if that would leave it under 15 cm, all scale instead.
export function fitDesign(f,design=f.cabinetDesign,{hSide='top',wSide='right'}={}){
  const settle=(list,key,total,side)=>{
    const diff=total-list.reduce((sum,n)=>sum+n[key],0);if(Math.abs(diff)<1e-9)return;
    const edge=side==='bottom'||side==='left'?list[0]:list.at(-1);
    if(edge[key]+diff>=.15){edge[key]=round(edge[key]+diff);return;}
    const scale=total/(total-diff);let used=0;list.forEach((n,i)=>{n[key]=i===list.length-1?round(total-used):round(n[key]*scale);used+=n[key];});
  };
  const rows=(list,height,width)=>{settle(list,'height',height,hSide);for(const row of list)if(row.parts)parts(row.parts,width,row.height);};
  const parts=(list,width,height)=>{settle(list,'width',width,wSide);for(const part of list)if(part.cells)rows(part.cells,height,part.width);};
  for(const column of design.columns)rows(column.cells,f.h-column.bottom-(column.top||0),column.width);
  return design;
}
// Split one cell in two: 'stack' puts a new open cell above it, 'side' puts
// one to its right. The original half keeps the cell's id, front and
// finishes, so its open state carries over; a cell that becomes a
// container hands its id to that half and takes a new one. Halves are at
// least 15 cm (a stack) or 20 cm (side by side); returns null otherwise.
export function splitCabinetCell(design,leafId,makePartId=makeId,direction='side'){
  const next=structuredClone(design),path=locateCell(next,leafId);
  if(!path)return null;
  const here=path.at(-1),node=here.node,side=direction==='side';
  const size=side?here.width:here.height,half=round(size/2);
  if(size<(side?.4:.3))return null;
  const keep={id:node.id,front:node.front,...(node.finishes?{finishes:node.finishes}:{})};
  const fresh=extra=>({id:makePartId(),front:'open',...extra});
  if(side===(here.kind==='parts')){
    // Same direction as its list: add a sibling after it.
    if(here.list.length>=(side?8:10))return null;
    node[side?'width':'height']=half;
    here.list.splice(here.index+1,0,fresh({[side?'width':'height']:round(size-half)}));
  }else{
    // Across its list: the cell becomes a container of two.
    const key=side?'width':'height';
    node.id=makePartId();delete node.front;delete node.finishes;
    node[side?'parts':'cells']=[{...keep,[key]:half},fresh({[key]:round(size-half)})];
  }
  next.template='custom';
  return next;
}
// Remove the row ('rows') or part ('parts') that holds a cell; a
// neighbour in the same list takes its size. A container left with a
// single plain cell becomes that cell again, keeping the cell's id.
export function removeCabinetNode(design,leafId,kind){
  const next=structuredClone(design),path=locateCell(next,leafId);
  if(!path)return null;
  const at=nearest(path,kind);
  if(at<0)return null;
  const here=path[at],key=kind==='rows'?'height':'width';
  if(here.list.length===1)return null;
  here.list.splice(here.index,1);
  const neighbour=here.list[Math.max(0,here.index-1)];
  neighbour[key]=round(neighbour[key]+here.node[key]);
  const parent=path[at-1].node;
  if(here.list.length===1&&at>1&&isLeaf(here.list[0])){
    const [only]=here.list;
    delete parent.parts;delete parent.cells;
    Object.assign(parent,{id:only.id,front:only.front});if(only.finishes)parent.finishes=only.finishes;
  }
  next.template='custom';
  return next;
}
// Move the boundary after the row or part with this id by `delta` metres,
// trading size with the next sibling (each keeps 15 cm).
export function moveCabinetLine(f,id,delta){
  const next=structuredClone(f.cabinetDesign),path=locateCell(next,id);
  if(!path)return null;
  const here=path.at(-1),key=here.kind==='rows'?'height':'width',a=here.list[here.index],b=here.list[here.index+1];
  if(!b)return null;
  const limited=Math.max(.15-a[key],Math.min(b[key]-.15,delta));
  a[key]=round(a[key]+limited);b[key]=round(b[key]-limited);
  next.template='custom';
  return fitDesign(f,next,{hSide:'bottom',wSide:'left'});
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
    column.width=round(column.width+grow);next.w=round(f.w+grow);
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
  // Nested rows and parts follow on the dragged side only.
  fitDesign(next,next.cabinetDesign,{hSide:side==='bottom'?'bottom':'top',wSide:side==='left'?'left':'right'});
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
  }else columns[index-1].width=round(columns[index-1].width+removed.width);
  fitDesign(next,next.cabinetDesign);
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
