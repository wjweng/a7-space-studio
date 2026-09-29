import {fridgeColors} from './model.js';
import {fridgeFronts,fridgeLayouts,fridgeDesign,CARCASS_T,doorGroupOf,mergeDoorCells,splitDoorGroup,groupFronts,boundsOf,cabinetCells,cabinetColumns,cabinetFronts,cabinetTemplates,cabinetFinishSlots,cellFinishSlots,makeCabinetDesign,validateCabinetDesign,resizeCabinetEdge,removeCabinetCell,removeCabinetColumn,designFromDoorStyle,designLeaves,findLeaf,fitDesign,splitCabinetCell,removeCabinetNode,moveCabinetLine,locateCell,leafIdsUnder,cabinetStructure} from './cabinet-design.js';

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
// placeTv, chooseFinish and resizeEdges are only for standalone cabinets.
// shelvesOnly(f) marks open shelving edited as one column of open cells (a
// corner shelf): no fronts, side-by-side parts, columns or bottom gap, and
// a top-board switch instead.
export function createCabinetEditor({getItem,commit,toggleCell,onConvert,placeTv,chooseFinish,finishLabel=code=>code||'預設',resizeEdges=false,maxHeight=Infinity,checkFit,notify,hostedTvs,shelvesOnly,sockets,moveSocket}){
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
  // `picked` holds the cells chosen for a merge: Shift, Ctrl or Cmd click, or
  // any click while the touch-friendly multi-select switch is on.
  let currentId=null,columnId=null,leafId=null,picked=new Set,multi=false;
  const item=()=>getItem(currentId);
  const save=design=>{
    const f=item();
    if(!f)return;
    try{const okay=commit(f,{...f,cabinetDesign:design});if(okay===false){dialog.querySelector('.cabinetError').textContent=commit.lastError||'尺寸無法套用';render();return;}dialog.querySelector('.cabinetError').textContent='';render();}
    catch(error){dialog.querySelector('.cabinetError').textContent=error.message;}
  };
  const edit=mutate=>{const f=item();if(!f)return;const next=structuredClone(f.cabinetDesign);mutate(next);save(fitDesign(f,next));};
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
  function renderFinishes(f,selectedCell,simple){
    const host=dialog.querySelector('.cabinetFinishes');host.replaceChildren();
    // A fridge has a colour, not board finishes: the four finishes or any colour.
    if(f.type==='fridge'){
      host.append(elt('h3','','顏色'));const row=elt('div','cabinetFridgeRow'),current=f.fridgeColor||'steel';
      for(const [key,label,colour]of fridgeColors){const b=button(label,()=>commitItem(item(),{...item(),fridgeColor:key}));b.style.borderLeft=`14px solid ${colour}`;b.setAttribute('aria-pressed',String(current===key));if(current===key)b.classList.add('active');row.append(b);}
      const pick=elt('label','cabinetField checkline','自選顏色'),input=elt('input');input.type='color';input.value=/^#/.test(current)?current:'#8a9aa0';input.onchange=()=>commitItem(item(),{...item(),fridgeColor:input.value});pick.append(input);row.append(pick);
      host.append(row);return;
    }
    if(!chooseFinish)return;
    const cells=designLeaves(f.cabinetDesign),hasDrawers=cells.some(c=>c.front==='drawers');
    host.append(elt('h3','',simple?'材質（整座層架）':'材質（整座櫃）'));
    for(const [slot,key,label]of cabinetFinishSlots){
      if(slot==='drawerBox'&&!hasDrawers||simple&&slot==='door')continue;
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
    const simple=!!shelvesOnly?.(f),fridge=f.type==='fridge';
    dialog.querySelector('.cabinetHead h2').textContent=fridge?'編輯冰箱':simple?'編輯層架':'編輯櫃體';
    dialog.querySelector('.cabinetBody > .muted').textContent=simple?'點選正面圖中的格子，再修改層高；拖曳格線可調整層板位置，拖曳外框可調整寬度與高度。尺寸單位為 cm。拖曳標題可移動視窗。':'點選正面圖中的格子，再修改分區、層高與門面。尺寸單位為 cm。拖曳標題可移動視窗。';
    const design=f.cabinetDesign,columns=cabinetColumns(f),structure=cabinetStructure(f),cells=structure.cells;
    // The selected cell, and the row and part (if any) it belongs to: the
    // nearest stacked row and side-by-side part above it in the tree.
    if(!cells.some(c=>c.id===leafId))leafId=cells[0].id;
    picked=new Set([...picked].filter(id=>cells.some(c=>c.id===id)));if(!picked.size)picked.add(leafId);
    const selectedLeaf=cells.find(c=>c.id===leafId);columnId=selectedLeaf.columnId;
    const selectedColumn=design.columns.find(c=>c.id===columnId);
    const path=locateCell(design,leafId),stepOf=kind=>{for(let i=path.length-1;i>0;i--)if(path[i].kind===kind)return{...path[i],depth:i};return null;};
    const rowStep=stepOf('rows'),partStep=stepOf('parts');
    const toolbar=dialog.querySelector('.cabinetToolbar');toolbar.replaceChildren();dialog.querySelector('.cabinetFridgePresets')?.remove();
    // New cabinets start from a preset layout; after that every cabinet is
    // edited cell by cell, so there is no template picker here.
    if(simple){
      const capLabel=elt('label','cabinetField checkline','頂部頂板'),cap=elt('input');cap.type='checkbox';cap.checked=f.cap!==false;
      cap.onchange=()=>commitItem(item(),{...item(),cap:cap.checked});
      capLabel.append(cap);toolbar.append(capLabel);
    }else{
      // Fridges start from one of the common layouts; the cells stay editable after.
      if(fridge){const presets=elt('div','cabinetFridgeRow cabinetFridgePresets');presets.append(elt('small','cabinetHint','套用常見格局：'));for(const [key,{label}]of Object.entries(fridgeLayouts))presets.append(button(label,()=>save(fridgeDesign(item(),key))));toolbar.parentNode.insertBefore(presets,toolbar);}
      const multiButton=button(multi?'多選：開':'多選：關',()=>{multi=!multi;if(!multi)picked=new Set([leafId]);render();});
      multiButton.setAttribute('aria-pressed',String(multi));
      toolbar.append(multiButton,elt('small','cabinetHint','Shift／Ctrl＋點選可多選，合併成一片門板'));
    }
    if(!simple&&design.columns.length>1)toolbar.append(button('－目前分區',()=>blockedByTv(cells.filter(c=>c.columnId===columnId).map(c=>c.id),'刪除分區')?null:resizeEdges?commitItem(item(),removeCabinetColumn(item(),columnId)):edit(next=>{
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
      r.setAttribute('class','cabinetCell'+(picked.has(cell.id)?' selected':'')+(cell.front==='open'?' open':''));
      r.addEventListener('click',event=>{
        if(!simple&&(event.shiftKey||event.ctrlKey||event.metaKey||multi)){
          if(picked.has(cell.id)&&picked.size>1){picked.delete(cell.id);if(leafId===cell.id)leafId=[...picked][0];}
          else{picked.add(cell.id);leafId=cell.id;}
        }else{picked=new Set([cell.id]);leafId=cell.id;}
        render();
      });
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
      text.setAttribute('class','cabinetCellLabel');text.textContent=labels[cell.front];
      if(!doorGroupOf(design,cell.id))svg.append(text);
    }
    // Sides extended to the floor under a raised column, and a dashed edge
    // where a cell has no bottom board.
    const shape=(tag,attrs,className)=>{const node=document.createElementNS(svg.namespaceURI,tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,value);node.setAttribute('class',className);svg.append(node);};
    for(const column of columns)if(column.sidesToFloor)for(const x of[column.x-column.width/2,column.x+column.width/2-CARCASS_T])shape('rect',{x:(x+f.w/2)*1000,y:(f.h-column.bottom)*1000,width:CARCASS_T*1000,height:column.bottom*1000},'cabinetLeg');
    for(const cell of cells)if(cell.noBase){const y=(f.h-cell.bottom)*1000;shape('line',{x1:(cell.x-cell.w/2+f.w/2)*1000,x2:(cell.x+cell.w/2+f.w/2)*1000,y1:y,y2:y},'cabinetNoBase');}
    // A shared door is outlined over all its cells and labelled once, in its
    // largest cell: the door's own centre often falls on a shelf between cells.
    for(const group of design.doorGroups||[]){
      const members=cells.filter(c=>group.cells.includes(c.id)),box=boundsOf(members),home=members.reduce((a,b)=>b.w*b.h>a.w*a.h?b:a),outline=document.createElementNS(svg.namespaceURI,'rect');
      for(const [key,value]of Object.entries({x:(box.x-box.w/2+f.w/2)*1000,y:(f.h-box.bottom-box.h)*1000,width:box.w*1000,height:box.h*1000}))outline.setAttribute(key,value);
      outline.setAttribute('class','cabinetDoorGroup');svg.append(outline);
      const text=document.createElementNS(svg.namespaceURI,'text');
      text.setAttribute('x',(home.x+f.w/2)*1000);text.setAttribute('y',(f.h-home.y)*1000);text.setAttribute('class','cabinetCellLabel');
      text.textContent=labels[home.front];svg.append(text);
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
    // Boundaries between stacked rows and between side-by-side parts, at
    // every depth: dragging trades size with the next sibling.
    for(const line of structure.rowLines)handle({x:(line.x-line.w/2+f.w/2)*1000,y:(f.h-line.y)*1000-grip/2,width:line.w*1000,height:grip},'ns-resize',delta=>{const next=moveCabinetLine(item(),line.id,delta);if(next)save(next);});
    for(const line of structure.partLines)handle({x:(line.x+f.w/2)*1000-grip/2,y:(f.h-line.bottom-line.h)*1000,width:grip,height:line.h*1000},'ew-resize',delta=>{const next=moveCabinetLine(item(),line.id,delta);if(next)save(next);});
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
    // Sockets inside this cabinet's cells, for fine-tuning: drag one in the drawing to move it
    // along its cell and up or down, or into another cell.
    for(const o of sockets?.(f)||[]){
      const base=f.type==='hangingCabinet'?f.elevation||0:0,rect=document.createElementNS(svg.namespaceURI,'rect');
      const place=(u,y)=>{rect.setAttribute('x',(u+f.w/2-o.w/2)*1000);rect.setAttribute('y',(f.h-y-o.h)*1000);};
      rect.setAttribute('width',o.w*1000);rect.setAttribute('height',o.h*1000);rect.setAttribute('class','cabinetSocket');place(o.offsetX||0,o.elevation-base);
      rect.appendChild(document.createElementNS(svg.namespaceURI,'title')).textContent=`${o.name}（拖曳可移動）`;
      rect.addEventListener('pointerdown',event=>{
        event.stopPropagation();rect.setPointerCapture(event.pointerId);
        const at=e=>{const m=svg.getScreenCTM().inverse(),p=new DOMPoint(e.clientX,e.clientY).matrixTransform(m);return{u:p.x/1000-f.w/2,y:f.h-p.y/1000-o.h/2};};
        let last=null;
        rect.onpointermove=e=>{last=at(e);place(last.u,last.y);};
        rect.onpointerup=e=>{rect.onpointermove=rect.onpointerup=null;if(last)moveSocket(o.id,{u:last.u,elevation:base+last.y});};
      });
      svg.append(rect);
    }
    elevation.append(svg);
    const fields=dialog.querySelector('.cabinetFields');fields.replaceChildren();
    if(!simple&&picked.size>1){
      dialog.querySelector('.cabinetFinishes').replaceChildren();
      const ids=[...picked];
      fields.append(elt('h3','',`已選 ${ids.length} 格`),elt('p','cabinetHint','選到的格子要剛好拼成一個矩形；合併後共用一片平開門板，門板邊緣對齊這些格子。'));
      const row=elt('div','cabinetToolbar');
      row.append(button('合併成一片門板',()=>{if(blockedByTv(ids,'合併門板'))return;try{const next=mergeDoorCells(item(),ids);picked=new Set([leafId]);save(next);}catch(error){dialog.querySelector('.cabinetError').textContent=error.message;}}),button('取消多選',()=>{picked=new Set([leafId]);render();}));
      fields.append(row);
      return;
    }
    const many=!simple&&design.columns.length>1;
    if(many)fields.append(elt('h3','',`分區 ${design.columns.indexOf(selectedColumn)+1}`),field('分區寬度',selectedColumn.width,value=>edit(next=>{
      const index=next.columns.findIndex(c=>c.id===columnId),other=index===next.columns.length-1?index-1:index+1;
      if(other<0)return;
      const delta=value-next.columns[index].width;
      next.columns[index].width=value;next.columns[other].width-=delta;next.template='custom';
    }),20));
    if(!simple&&!fridge)fields.append(field(f.type==='hangingCabinet'?'底部留空':'底部離地',selectedColumn.bottom,value=>edit(next=>{
      const c=next.columns.find(c=>c.id===columnId),delta=value-c.bottom;c.bottom=value;c.cells.at(-1).height-=delta;next.template='custom';
    }),0,cm(f.h-.15)));
    // A raised floor cabinet can stand on its sides, keeping the space under it open.
    if(!simple&&!fridge&&f.type!=='hangingCabinet'&&selectedColumn.bottom>0){
      const label=elt('label','cabinetField checkline'),box=elt('input');box.type='checkbox';box.checked=!!selectedColumn.sidesToFloor;
      box.onchange=()=>edit(next=>{const c=next.columns.find(c=>c.id===columnId);if(box.checked)c.sidesToFloor=true;else delete c.sidesToFloor;});
      label.append(document.createTextNode('側板延伸到地面'),box);fields.append(label);
    }
    // Splitting works on the selected cell; removing works on the row or
    // part it sits in. A floor cabinet's top row (a hanging cabinet's bottom
    // row) leaves a gap when removed standalone, as before.
    const split=direction=>{if(blockedByTv([leafId],'切分'))return;const next=splitCabinetCell(item().cabinetDesign,leafId,id,direction);if(next)save(next);else dialog.querySelector('.cabinetError').textContent=direction==='side'?'這格寬度不足 40 cm，無法再左右切分':'這格高度不足 30 cm，無法再上下切分';};
    const removeRow=()=>{if(blockedByTv(leafIdsUnder(rowStep.node),'刪除層格'))return;if(rowStep.depth===1&&resizeEdges)commitItem(item(),removeCabinetCell(item(),columnId,rowStep.node.id));else{const next=removeCabinetNode(item().cabinetDesign,leafId,'rows');if(next)save(next);}};
    const removePart=()=>{if(blockedByTv(leafIdsUnder(partStep.node),'刪除直向分區'))return;const next=removeCabinetNode(item().cabinetDesign,leafId,'parts');if(next)save(next);};
    const row=elt('div','cabinetToolbar');
    row.append(button(simple?'＋層板':'＋層格',()=>split('stack')));if(!simple)row.append(button('＋單層直向分區',()=>split('side')));
    if(rowStep.list.length>1)row.append(button('－目前層格',removeRow));
    if(!simple&&partStep&&partStep.list.length>1)row.append(button('－目前直向分區',removePart));
    fields.append(row,elt('h3','','所選的格'));
    // Height of the row the cell is in, and width of its part: the change
    // is traded with the next sibling (the previous one for the last).
    const resizeStep=(step,key,value)=>{const own=step.node[key],delta=value-own,after=step.index<step.list.length-1;const next=moveCabinetLine(item(),after?step.node.id:step.list[step.index-1].id,after?delta:-delta);if(next)save(next);};
    if(rowStep.list.length>1)fields.append(field('層格高度',rowStep.node.height,value=>resizeStep(rowStep,'height',value),15));
    if(partStep)fields.append(field('這格寬度',partStep.node.width,value=>resizeStep(partStep,'width',value),15));
    if(!simple){
    // A column's lowest cells may leave out their bottom board, e.g. for a robot vacuum dock.
    if(!fridge&&Math.abs(selectedLeaf.bottom-selectedColumn.bottom)<1e-6){
      const label=elt('label','cabinetField checkline'),box=elt('input');box.type='checkbox';box.checked=!!selectedLeaf.noBase;
      box.onchange=()=>edit(next=>{const leaf=findLeaf(next,leafId);if(box.checked)leaf.noBase=true;else delete leaf.noBase;next.template='custom';});
      label.append(document.createTextNode('拿掉底板'),box);fields.append(label);
    }
    // The door this cell belongs to: its own, or one shared with other cells.
    const group=doorGroupOf(design,leafId),members=group?group.cells:[leafId],setAll=apply=>edit(next=>{for(const cellId of members)apply(findLeaf(next,cellId));next.template='custom';});
    fields.append(elt('h3','',group?`門板（${members.length} 格共用）`:'門板'));
    const frontLabel=elt('label','cabinetField','門面形式'),front=elt('select');
    for(const kind of fridge?fridgeFronts:cabinetFronts)front.add(new Option(labels[kind],kind));
    front.value=selectedLeaf.front;front.onchange=()=>{
      if(front.value!=='open'&&blockedByTv(members,'加上門面')){front.value=selectedLeaf.front;return;}
      if(group&&front.value==='sliding'&&boundsOf(cabinetCells({...f,cabinetDesign:design}).filter(c=>members.includes(c.id))).w<.5){dialog.querySelector('.cabinetError').textContent='滑門寬度至少要 50 cm';front.value=selectedLeaf.front;return;}
      if(group&&front.value!=='open'&&!groupFronts.includes(front.value)){dialog.querySelector('.cabinetError').textContent='抽屜只能用在單一格，請先拆開門板';front.value=selectedLeaf.front;return;}
      setAll(leaf=>{leaf.front=front.value;if(front.value==='open')delete leaf.handle;});
    };
    frontLabel.append(front);fields.append(frontLabel);
    if(selectedLeaf.front!=='open'){
      if(!fridge){const handleLabel=elt('label','cabinetField checkline'),handle=elt('input');handle.type='checkbox';handle.checked=!!selectedLeaf.handle;
      handle.onchange=()=>setAll(leaf=>{if(handle.checked)leaf.handle=true;else delete leaf.handle;});
      handleLabel.append(document.createTextNode('畫出手把'),handle);fields.append(handleLabel);}
      fields.append(button(f.openCells?.[members[0]]?'關閉門板':'打開門板',()=>{toggleCell(f,members);render();}));
      if(group)fields.append(button('拆開門板',()=>save(splitDoorGroup(design,leafId))));
    }
    if(selectedLeaf.front==='open'&&placeTv)fields.append(button('在這格掛電視',()=>placeTv(f,leafId)));
    }
    renderFinishes(f,selectedLeaf,simple);
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
    leafId=null;
    render();
    dialog.classList.remove('folded');fold.textContent='收合';fold.setAttribute('aria-expanded','true');
    dialog.show();
    if(!dialog.style.left)place(innerWidth>900?16:(innerWidth-dialog.offsetWidth)/2,innerWidth>900?90:70);
    else place(dialog.offsetLeft,dialog.offsetTop);
  }};
}
