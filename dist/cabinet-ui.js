import {cabinetCells,cabinetColumns,cabinetFronts,cabinetTemplates,cabinetFinishSlots,cellFinishSlots,makeCabinetDesign,validateCabinetDesign,resizeCabinetEdge,removeCabinetCell,removeCabinetColumn,designFromDoorStyle,designLeaves,findLeaf,fitParts,splitCabinetCell,removeCabinetPart,CARCASS_T} from './cabinet-design.js';

const labels={open:'開放',left:'左開門',right:'右開門',double:'對開門',sliding:'滑門',drawers:'抽屜'};
const cm=n=>Math.round(n*1000)/10;
const id=()=>crypto.randomUUID();
const elt=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
const field=(label,value,change,min=0,max=500)=>{
  const wrap=elt('label','cabinetField',label),input=elt('input');
  Object.assign(input,{type:'number',step:'0.1',min:String(min),max:String(max),value:String(cm(value))});
  input.onchange=()=>change(Number(input.value)/100);
  wrap.append(input);
  return wrap;
};
// placeTv and chooseFinish are optional: the media-wall module editor has neither.
// placeTv, chooseFinish and resizeEdges are only for standalone cabinets.
export function createCabinetEditor({getItem,commit,toggleCell,onConvert,placeTv,chooseFinish,finishLabel=code=>code||'預設',resizeEdges=false,maxHeight=Infinity,checkFit,notify,hostedTvs}){
  const dialog=elt('dialog','cabinetDialog');
  dialog.innerHTML='<div class="cabinetHead" title="拖曳可移動視窗"><div><span class="eyebrow">CABINET EDITOR</span><h2>編輯櫃體</h2></div><div class="cabinetHeadButtons"><button type="button" class="dialogFold" aria-expanded="true">收合</button><button type="button" class="dialogClose" aria-label="關閉">×</button></div></div><div class="cabinetBody"><p class="muted">點選正面圖中的格子，再修改分區、層高與門面。尺寸單位為 cm。拖曳標題可移動視窗。</p><div class="cabinetFinishes"></div><div class="cabinetToolbar"></div><div class="cabinetElevation"></div><div class="cabinetFields"></div><p class="cabinetError" role="alert"></p></div>';
  document.body.append(dialog);
  let onClose=null;
  dialog.querySelector('.dialogClose').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{if(dialog.open)return;const done=onClose;onClose=null;done?.();});
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dialog.close();}});
  // Shown without a backdrop so the cabinet stays visible and updates live;
  // the header drags the window and the fold button shrinks it to its header.
  const fold=dialog.querySelector('.dialogFold');
  fold.onclick=()=>{const folded=dialog.classList.toggle('folded');fold.textContent=folded?'展開':'收合';fold.setAttribute('aria-expanded',String(!folded));place(dialog.offsetLeft,dialog.offsetTop);};
  const place=(left,top)=>{
    const width=dialog.offsetWidth,head=dialog.querySelector('.cabinetHead').offsetHeight+24;
    dialog.style.left=Math.max(8-width+80,Math.min(innerWidth-80,left))+'px';
    const y=Math.max(8,Math.min(innerHeight-head,top));
    dialog.style.top=y+'px';
    // Scroll inside the window rather than past the bottom of the screen.
    dialog.style.maxHeight=Math.max(head,innerHeight-y-8)+'px';
  };
  dialog.querySelector('.cabinetHead').addEventListener('pointerdown',event=>{
    if(event.target.closest('button'))return;
    event.preventDefault();
    const head=event.currentTarget,dx=event.clientX-dialog.offsetLeft,dy=event.clientY-dialog.offsetTop;
    head.setPointerCapture(event.pointerId);
    head.onpointermove=move=>place(move.clientX-dx,move.clientY-dy);
    head.onpointerup=head.onpointercancel=()=>{head.onpointermove=head.onpointerup=head.onpointercancel=null;};
  });
  addEventListener('resize',()=>{if(dialog.open)place(dialog.offsetLeft,dialog.offsetTop);});
  let currentId=null,columnId=null,cellId=null,leafId=null;
  const item=()=>getItem(currentId);
  const save=design=>{
    const f=item();
    if(!f)return;
    try{const okay=commit(f,{...f,cabinetDesign:design});if(okay===false){dialog.querySelector('.cabinetError').textContent=commit.lastError||'尺寸無法套用';render();return;}dialog.querySelector('.cabinetError').textContent='';render();}
    catch(error){dialog.querySelector('.cabinetError').textContent=error.message;}
  };
  const edit=mutate=>{const f=item();if(!f)return;const next=structuredClone(f.cabinetDesign);mutate(next);save(next);};
  // Dragging an outer edge changes only the column or cells on that side and
  // keeps the opposite edge where it is; `exact` stops the commit from
  // rescaling the design or shifting the cabinet to avoid clashes.
  // A change that would take away the cell a TV hangs in (split, delete, a
  // new front or template) is refused with the TV's name, rather than
  // leaving the TV floating where the cell used to be.
  const blockedByTv=(ids,action)=>{
    const tv=hostedTvs?.(item()).find(entry=>ids.includes(entry.cell));
    if(!tv)return false;
    const message=`這格掛著「${tv.name}」，請先把電視移到別格或改成壁掛，再${action}。`;
    dialog.querySelector('.cabinetError').textContent=message;notify?.(message);
    return true;
  };
  // Item-level changes (size, position) from edge drags and deletions.
  const commitItem=(f,next,note='')=>{
    if(!f||!next)return false;
    const message=dialog.querySelector('.cabinetError');
    try{if(commit(f,next,{exact:true})===false){message.textContent=commit.lastError||'尺寸無法套用';render();return false;}message.textContent=note;render();return true;}
    catch(error){message.textContent=error.message;return false;}
  };
  // A drag that would clash or leave the apartment stops at the largest
  // clear size in whole centimetres, and says why.
  const resizeEdge=(side,delta)=>{
    const f=item();if(!f||!delta)return;
    const attempt=d=>resizeCabinetEdge(f,side,d,maxHeight),wanted=checkFit?.(f,attempt(delta));
    if(!wanted||wanted.ok){commitItem(f,attempt(delta));return;}
    const sign=Math.sign(delta);let lo=0,hi=Math.round(Math.abs(delta)*100);
    while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(checkFit(f,attempt(sign*mid/100)).ok)lo=mid;else hi=mid-1;}
    if(!lo){dialog.querySelector('.cabinetError').textContent=`${wanted.reason}，這個方向已經沒有空間`;notify?.(wanted.reason);return;}
    const next=attempt(sign*lo/100),note=`${wanted.reason}；已停在最大可用尺寸：寬 ${cm(next.w)} × 高 ${cm(next.h)} cm`;
    if(commitItem(f,next,note))notify?.(note);
  };
  const button=(text,click)=>{const b=elt('button','',text);b.type='button';b.onclick=click;return b;};
  // Level two (all doors, shelves, backs, drawer boxes) sits at the top of the
  // editor; level three (this cell's own) sits with the cell's settings.
  const partText=(f,key)=>f.partFinishes?.[key]?finishLabel(f.partFinishes[key]):'跟隨整體';
  const clearSlot=(slot,only)=>edit(next=>{for(const cell of designLeaves(next))if(cell.finishes&&(!only||cell.id===only)){delete cell.finishes[slot];if(!Object.keys(cell.finishes).length)delete cell.finishes;}});
  function renderFinishes(f,selectedCell){
    const host=dialog.querySelector('.cabinetFinishes');host.replaceChildren();
    if(!chooseFinish)return;
    const cells=designLeaves(f.cabinetDesign),hasDrawers=cells.some(c=>c.front==='drawers');
    host.append(elt('h3','','材質（整座櫃）'));
    for(const [slot,key,label]of cabinetFinishSlots){
      if(slot==='drawerBox'&&!hasDrawers)continue;
      const row=elt('div','cabinetFinishRow'),count=cells.filter(c=>c.finishes?.[slot]).length;
      row.append(elt('span','cabinetFinishName',`所有的${label}`),button(partText(f,key),()=>chooseFinish(f,{part:key})));
      if(count)row.append(elt('small','',`另有 ${count} 格另外指定`),button('全部改回跟隨',()=>clearSlot(slot)));
      host.append(row);
    }
    const fields=dialog.querySelector('.cabinetFields');
    fields.append(elt('h3','','這格的材質'));
    for(const [slot,key,label]of cellFinishSlots(f,selectedCell)){
      const own=selectedCell.finishes?.[slot],row=elt('div','cabinetFinishRow');
      row.append(elt('span','cabinetFinishName',`這格的${label}`),button(own?finishLabel(own):`跟隨：所有的${label}（${partText(f,key)}）`,()=>chooseFinish(f,{cell:selectedCell.id,slot})));
      if(own)row.append(button('改回跟隨',()=>clearSlot(slot,selectedCell.id)));
      fields.append(row);
    }
  }
  function render(){
    const f=item();if(!f?.cabinetDesign){dialog.close();return;}
    const design=f.cabinetDesign,columns=cabinetColumns(f),cells=cabinetCells(f);
    if(!design.columns.some(c=>c.id===columnId))columnId=design.columns[0].id;
    const selectedColumn=design.columns.find(c=>c.id===columnId);
    if(!selectedColumn.cells.some(c=>c.id===cellId))cellId=selectedColumn.cells[0].id;
    const selectedCell=selectedColumn.cells.find(c=>c.id===cellId);
    // The selected smallest cell: the layer itself, or one part of it.
    const rowCells=cells.filter(c=>c.rowId===cellId);
    if(!rowCells.some(c=>c.id===leafId))leafId=rowCells[0].id;
    const selectedLeaf=rowCells.find(c=>c.id===leafId);
    const toolbar=dialog.querySelector('.cabinetToolbar');toolbar.replaceChildren();
    const template=elt('select');template.setAttribute('aria-label','櫃體範本');
    template.add(new Option('自訂分格','custom'));
    for(const [key,spec]of Object.entries(cabinetTemplates)){
      const option=new Option(spec.label,key);
      try{validateCabinetDesign(f,makeCabinetDesign(f,key));}catch{option.disabled=true;}
      template.add(option);
    }
    template.value=design.template;
    template.onchange=()=>{if(blockedByTv(cells.map(c=>c.id),'換範本')){template.value=design.template;return;}save(makeCabinetDesign(f,template.value));};
    toolbar.append(template);
    if(design.columns.length>1)toolbar.append(button('－目前分區',()=>blockedByTv(cells.filter(c=>c.columnId===columnId).map(c=>c.id),'刪除分區')?null:resizeEdges?commitItem(item(),removeCabinetColumn(item(),columnId)):edit(next=>{
      if(next.columns.length===1)return;
      const index=next.columns.findIndex(c=>c.id===columnId),removed=next.columns.splice(index,1)[0],recipient=next.columns[Math.max(0,index-1)];
      recipient.width+=removed.width;columnId=recipient.id;next.template='custom';
    })));
    const elevation=dialog.querySelector('.cabinetElevation');elevation.replaceChildren();
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('role','img');svg.setAttribute('aria-label','櫃體正面分格圖');
    // The drawing is scaled to fit, so labels and grips are sized from the
    // cabinet's longer side to keep a similar on-screen size at any scale.
    // A margin of one grip lets the outer-edge grips straddle the outline.
    const span=Math.max(f.w,f.h)*1000,grip=span*.02,pad=resizeEdges?grip:0,viewW=f.w*1000+2*pad,viewH=f.h*1000+2*pad;
    svg.setAttribute('viewBox',`${-pad} ${-pad} ${viewW} ${viewH}`);
    svg.setAttribute('width',viewW);svg.setAttribute('height',viewH);
    svg.style.fontSize=`${Math.min(span*.04,Math.min(...cells.map(cell=>cell.w))*1000*.28)}px`;
    for(const cell of cells){
      const r=document.createElementNS(svg.namespaceURI,'rect'),x=(cell.x-cell.w/2+f.w/2)*1000,y=(f.h-cell.bottom-cell.h)*1000;
      for(const [key,value]of Object.entries({x,y,width:cell.w*1000,height:cell.h*1000}))r.setAttribute(key,value);
      r.setAttribute('class','cabinetCell'+(cell.id===leafId?' selected':'')+(cell.front==='open'?' open':''));
      r.addEventListener('click',()=>{columnId=cell.columnId;cellId=cell.rowId;leafId=cell.id;render();});
      svg.append(r);
      if(cell.finishes){
        // Marks a cell whose own finish overrides the cabinet-wide one.
        const mark=document.createElementNS(svg.namespaceURI,'circle');
        mark.setAttribute('cx',x+cell.w*1000-span*.03);mark.setAttribute('cy',y+span*.03);mark.setAttribute('r',span*.014);
        mark.setAttribute('class','cabinetFinishMark');mark.appendChild(document.createElementNS(svg.namespaceURI,'title')).textContent='這格另外指定了材質';
        svg.append(mark);
      }
      const text=document.createElementNS(svg.namespaceURI,'text');
      text.setAttribute('x',(cell.x+f.w/2)*1000);text.setAttribute('y',(f.h-cell.y)*1000);
      text.setAttribute('class','cabinetCellLabel');text.textContent=labels[cell.front];svg.append(text);
    }
    // Screen pixels to drawing units (mm) and metres.
    const unitsPerPixel=()=>viewW/svg.getBoundingClientRect().width;
    const handle=(attrs,cursor,onFinish,className='cabinetDivider',onMove)=>{
      const grip=document.createElementNS(svg.namespaceURI,'rect');
      for(const [key,value]of Object.entries(attrs))grip.setAttribute(key,value);
      grip.setAttribute('class',className);grip.style.cursor=cursor;
      grip.onpointerdown=event=>{
        event.preventDefault();event.stopPropagation();
        const startX=event.clientX,startY=event.clientY,originalX=Number(grip.getAttribute('x')),originalY=Number(grip.getAttribute('y'));
        grip.setPointerCapture(event.pointerId);
        grip.onpointermove=move=>{
          const dx=(move.clientX-startX)*unitsPerPixel(),dy=(move.clientY-startY)*unitsPerPixel();
          if(cursor==='ew-resize')grip.setAttribute('x',originalX+dx);
          else grip.setAttribute('y',originalY+dy);
          onMove?.(cursor==='ew-resize'?dx:dy);
        };
        grip.onpointerup=up=>{
          grip.onpointermove=null;grip.onpointerup=null;
          const delta=cursor==='ew-resize'?(up.clientX-startX)*unitsPerPixel()/1000:-(up.clientY-startY)*unitsPerPixel()/1000;
          onFinish(Math.round(delta*100)/100);
        };
      };
      svg.append(grip);
    };
    let boundary=0;
    columns.slice(0,-1).forEach((column,index)=>{
      boundary+=column.width;
      handle({x:boundary*1000-grip/2,y:0,width:grip,height:f.h*1000},'ew-resize',delta=>edit(next=>{
        const left=next.columns[index],right=next.columns[index+1],limited=Math.max(.2-left.width,Math.min(right.width-.2,delta));
        left.width=Math.round((left.width+limited)*10000)/10000;
        right.width=Math.round((right.width-limited)*10000)/10000;
        next.template='custom';
      }));
    });
    for(const [columnIndex,column]of design.columns.entries()){
      let height=column.bottom;
      column.cells.slice(0,-1).forEach((cell,rowIndex)=>{
        height+=cell.height;
        const x=columns[columnIndex].x-column.width/2+f.w/2,y=f.h-height;
        handle({x:x*1000,y:y*1000-grip/2,width:column.width*1000,height:grip},'ns-resize',delta=>edit(next=>{
          const lower=next.columns[columnIndex].cells[rowIndex],upper=next.columns[columnIndex].cells[rowIndex+1];
          const limited=Math.max(.15-lower.height,Math.min(upper.height-.15,delta));
          lower.height=Math.round((lower.height+limited)*10000)/10000;
          upper.height=Math.round((upper.height-limited)*10000)/10000;
          next.template='custom';
        }));
      });
    }
    // Dividers between the parts of a split layer.
    for(const cell of cells.filter(c=>c.insetR<CARCASS_T)){
      const x=(cell.x+cell.w/2+f.w/2)*1000,y=(f.h-cell.bottom-cell.h)*1000;
      handle({x:x-grip/2,y,width:grip,height:cell.h*1000},'ew-resize',delta=>edit(next=>{
        const row=next.columns.find(c=>c.id===cell.columnId).cells.find(r=>r.id===cell.rowId),i=row.parts.findIndex(p=>p.id===cell.id),left=row.parts[i],right=row.parts[i+1];
        const limited=Math.max(.15-left.width,Math.min(right.width-.15,delta));
        left.width=Math.round((left.width+limited)*10000)/10000;right.width=Math.round((right.width-limited)*10000)/10000;next.template='custom';
      }));
    }
    if(resizeEdges){
      // Outer edges: sides, and the top of a floor cabinet or the underside of
      // a hanging one (the other end is fixed to the floor or what it hangs
      // from). A dashed outline previews the new size while dragging.
      const preview=document.createElementNS(svg.namespaceURI,'rect');
      preview.setAttribute('class','cabinetResizePreview');preview.style.display='none';svg.append(preview);
      const show=(x,y,w,h)=>{for(const [key,value]of Object.entries({x,y,width:Math.max(1,w),height:Math.max(1,h)}))preview.setAttribute(key,value);preview.style.display='';};
      const W=f.w*1000,H=f.h*1000,hanging=f.type==='hangingCabinet';
      handle({x:-grip,y:0,width:grip,height:H},'ew-resize',delta=>resizeEdge('left',-delta),'cabinetEdge',d=>show(d,0,W-d,H));
      handle({x:W,y:0,width:grip,height:H},'ew-resize',delta=>resizeEdge('right',delta),'cabinetEdge',d=>show(0,0,W+d,H));
      if(hanging)handle({x:0,y:H,width:W,height:grip},'ns-resize',delta=>resizeEdge('bottom',-delta),'cabinetEdge',d=>show(0,0,W,H+d));
      else handle({x:0,y:-grip,width:W,height:grip},'ns-resize',delta=>resizeEdge('top',delta),'cabinetEdge',d=>show(0,d,W,H-d));
    }
    elevation.append(svg);
    const fields=dialog.querySelector('.cabinetFields');fields.replaceChildren();
    const many=design.columns.length>1;
    if(many)fields.append(elt('h3','',`分區 ${design.columns.indexOf(selectedColumn)+1}`),field('分區寬度',selectedColumn.width,value=>edit(next=>{
      const index=next.columns.findIndex(c=>c.id===columnId),other=index===next.columns.length-1?index-1:index+1;
      if(other<0)return;
      const delta=value-next.columns[index].width;
      next.columns[index].width=value;next.columns[other].width-=delta;fitParts(next.columns[index]);fitParts(next.columns[other]);next.template='custom';
    }),20));
    fields.append(field(f.type==='hangingCabinet'?'底部留空':'底部離地',selectedColumn.bottom,value=>edit(next=>{
      const c=next.columns.find(c=>c.id===columnId),delta=value-c.bottom;c.bottom=value;c.cells.at(-1).height-=delta;next.template='custom';
    }),0,cm(f.h-.15)));
    const row=elt('div','cabinetToolbar');
    row.append(button('＋層格',()=>edit(next=>{
      const c=next.columns.find(c=>c.id===columnId),cell=c.cells.find(r=>r.id===cellId);
      if(c.cells.length>=10||cell.height<.3)return;
      const half=Math.round(cell.height*5000)/10000;cell.height-=half;
      c.cells.splice(c.cells.indexOf(cell)+1,0,{id:id(),height:half,front:'open'});next.template='custom';
    })),button('＋單層直向分區',()=>{if(blockedByTv([leafId],'切分'))return;const next=splitCabinetCell(item().cabinetDesign,leafId,id);if(next)save(next);else dialog.querySelector('.cabinetError').textContent='這格寬度不足 40 cm，無法再分成兩格';}),
    ...(selectedCell.parts?[button('－目前直向分區',()=>{if(blockedByTv([leafId],'刪除'))return;const next=removeCabinetPart(item().cabinetDesign,leafId);if(next)save(next);})]:[]),button('－目前層格',()=>blockedByTv(rowCells.map(c=>c.id),'刪除層格')?null:resizeEdges?commitItem(item(),removeCabinetCell(item(),columnId,cellId)):edit(next=>{
      const c=next.columns.find(c=>c.id===columnId);if(c.cells.length===1)return;
      const index=c.cells.findIndex(r=>r.id===cellId),removed=c.cells.splice(index,1)[0],neighbor=c.cells[Math.max(0,index-1)];
      neighbor.height+=removed.height;cellId=neighbor.id;next.template='custom';
    })));
    fields.append(row,elt('h3','',`層格 ${selectedColumn.cells.indexOf(selectedCell)+1}`+(selectedCell.parts?` · 第 ${selectedCell.parts.findIndex(p=>p.id===leafId)+1} 格`:'')));
    fields.append(field('層格高度',selectedCell.height,value=>edit(next=>{
      const c=next.columns.find(c=>c.id===columnId),index=c.cells.findIndex(r=>r.id===cellId),other=index===c.cells.length-1?index-1:index+1;
      if(other<0)return;
      const delta=value-c.cells[index].height;c.cells[index].height=value;c.cells[other].height-=delta;next.template='custom';
    }),15));
    const frontLabel=elt('label','cabinetField','門面形式'),front=elt('select');
    for(const kind of cabinetFronts)front.add(new Option(labels[kind],kind));
    front.value=selectedLeaf.front;front.onchange=()=>{if(front.value!=='open'&&blockedByTv([leafId],'加上門面')){front.value=selectedLeaf.front;return;}edit(next=>{findLeaf(next,leafId).front=front.value;next.template='custom';});};
    frontLabel.append(front);fields.append(frontLabel);
    if(selectedLeaf.front!=='open')fields.append(button(f.openCells?.[leafId]?'關閉這格':'打開這格',()=>{toggleCell(f,leafId);render();}));
    if(selectedLeaf.front==='open'&&placeTv)fields.append(button('在這格掛電視',()=>placeTv(f,leafId)));
    renderFinishes(f,selectedLeaf);
  }
  return{refresh(){if(dialog.open)render();},open(f,{onClose:closed}={}){
    if(dialog.open)dialog.close();
    onClose=closed||null;
    currentId=f.id;
    const original=item();
    if(!original?.cabinetDesign){
      // Keep the existing fronts; an open cabinet stays open.
      const design=designFromDoorStyle(original),openCells=original.open?Object.fromEntries(designLeaves(design).filter(c=>c.front!=='open').map(c=>[c.id,1])):{};
      const converted=commit(original,{...original,cabinetDesign:design,openCells});
      if(converted!==false)onConvert?.(original);
    }
    const updated=item();columnId=updated.cabinetDesign.columns[0].id;cellId=updated.cabinetDesign.columns[0].cells[0].id;leafId=null;
    render();
    dialog.classList.remove('folded');fold.textContent='收合';fold.setAttribute('aria-expanded','true');
    dialog.show();
    if(!dialog.style.left)place(innerWidth>900?16:(innerWidth-dialog.offsetWidth)/2,innerWidth>900?90:70);
    else place(dialog.offsetLeft,dialog.offsetTop);
  }};
}
