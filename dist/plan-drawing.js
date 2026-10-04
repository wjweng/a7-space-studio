// A 1:50 plan on an A3 sheet for the designer and carpenter: walls, columns, doors, windows,
// room names, every item's outline with its name and size, sockets, and dimension chains
// along the outside. A reference layout, not a construction drawing: no wiring, no notes on
// how to build. Plain SVG in millimetres, so it prints to scale and opens in drawing tools.
import {outline,walls,doors,rooms,wallRects,structuralSolids,inside,HEIGHT,WALL_THICKNESS,outletKinds,cabinetTypes} from './model.js';
import {corners} from './geometry.js';
import {isAirConditioner,acBox} from './air-conditioner-shape.js';
import {doorLeaf} from './spatial.js';

export const SHEET={w:420,h:297},SCALE=50,MM=1000/SCALE; // millimetres on paper per metre
const INK='#1d1d1d',THIN=.18,MID=.35,FONT='"Noto Sans TC","Microsoft JhengHei","PingFang TC",sans-serif';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const r2=v=>Math.round(v*100)/100;
// Centimetres, with one decimal only when it is not a whole number.
export const cm=v=>{const c=Math.round(v*1000)/10;return Number.isInteger(c)?String(c):c.toFixed(1);};
const bounds=outline.reduce((b,[x,z])=>({minX:Math.min(b.minX,x),maxX:Math.max(b.maxX,x),minZ:Math.min(b.minZ,z),maxZ:Math.max(b.maxZ,z)}),{minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity});
const ORIGIN={x:48,y:38};
const px=x=>r2(ORIGIN.x+(x-bounds.minX)*MM),py=z=>r2(ORIGIN.y+(z-bounds.minZ)*MM);
const pts=list=>list.map(([x,z])=>`${px(x)},${py(z)}`).join(' ');
const rectPoly=(f,attrs)=>`<polygon points="${pts(corners(isAirConditioner(f)?acBox(f):f))}" ${attrs}/>`;
const text=(x,y,s,size,extra='')=>`<text x="${r2(x)}" y="${r2(y)}" font-size="${r2(size)}" ${extra}>${esc(s)}</text>`;

// Wall pieces along the centre line: [start, end] in metres from the wall's first endpoint.
const along=(w,s)=>{const dx=w.b[0]-w.a[0],dz=w.b[1]-w.a[1],len=Math.hypot(dx,dz);return[w.a[0]+dx/len*s,w.a[1]+dz/len*s];};
const wallLength=w=>Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]);
function drawWalls(){
  const solids=new Set(structuralSolids);
  const body=wallRects().filter(r=>!solids.has(r)).map(r=>rectPoly(r,`fill="#4a4a4a"`)).join('');
  const cols=structuralSolids.map(r=>rectPoly(r,`fill="url(#hatch)" stroke="${INK}" stroke-width="${MID}"`)).join('');
  return body+cols;
}
function drawWindows(){
  return walls.filter(w=>w.opening&&w.opening[2]>0).map(w=>{
    const[s,width]=w.opening,len=wallLength(w),dx=(w.b[0]-w.a[0])/len,dz=(w.b[1]-w.a[1])/len,nx=-dz,nz=dx,t=WALL_THICKNESS/2;
    const a=along(w,s),b=along(w,s+width),line=o=>`<line x1="${px(a[0]+nx*o)}" y1="${py(a[1]+nz*o)}" x2="${px(b[0]+nx*o)}" y2="${py(b[1]+nz*o)}" stroke="${INK}" stroke-width="${THIN}"/>`;
    const box=`<polygon points="${pts([[a[0]+nx*t,a[1]+nz*t],[b[0]+nx*t,b[1]+nz*t],[b[0]-nx*t,b[1]-nz*t],[a[0]-nx*t,a[1]-nz*t]])}" fill="#fff" stroke="${INK}" stroke-width="${THIN}"/>`;
    return box+(w.openingType==='railing'?line(0):line(-t/3)+line(t/3));
  }).join('');
}
function drawDoors(){
  return doors.map(d=>{
    const leaf=doorLeaf(d),ca=Math.cos(d.angle),sa=Math.sin(d.angle),hx=d.x+leaf.x*ca+leaf.z*sa,hz=d.z-leaf.x*sa+leaf.z*ca,w=leaf.width,max=(d.maxAngle??90)*Math.PI/180;
    const end=a=>{const g=d.angle+d.swing*a;return[hx+w*Math.cos(g),hz-w*Math.sin(g)];};
    const arc=Array.from({length:19},(_,i)=>end(max*i/18)),open=end(max);
    return `<line x1="${px(hx)}" y1="${py(hz)}" x2="${px(open[0])}" y2="${py(open[1])}" stroke="${INK}" stroke-width="${MID}"/><polyline points="${pts(arc)}" fill="none" stroke="${INK}" stroke-width="${THIN}" stroke-dasharray="1 .8"/>`;
  }).join('');
}

// How each kind of item is drawn: floor items solid, overhead ones dashed, rugs dotted.
const overhead=new Set(['beam','hangingCabinet','cove','light']);
const style=f=>f.trough?`fill="#fbeceb" stroke="#b3261e" stroke-width="${MID}"`:f.type==='rug'?`fill="none" stroke="${INK}" stroke-width="${THIN}" stroke-dasharray=".4 .8"`:overhead.has(f.type)?`fill="none" stroke="${INK}" stroke-width="${THIN}" stroke-dasharray="2 1"`:cabinetTypes.includes(f.type)||f.type==='cornerShelf'?`fill="#f3ede4" stroke="${INK}" stroke-width="${MID}"`:`fill="#fff" stroke="${INK}" stroke-width="${MID}"`;
const size=f=>`${cm(f.w)}×${cm(f.d)}`;
const lift=f=>Number.isFinite(f.elevation)&&f.elevation>0?f.elevation:0;
// The size line: plan size, then what a carpenter needs: height, and where it hangs.
const socketName={duplex:'雙插座',usb:'雙插座附 USB',data:'網路／電視'};
export function itemSize(f){
  if(isAirConditioner(f)&&f.acKind==='outdoor')return`${size(f)}×H${cm(f.h)}（附鐵架，架底離地 ${cm(lift(f))}）`;
  if(f.trough)return`${size(f)}（${socketName[f.outletKind]||'雙插座'} ×${f.trough.count}）`;
  if(f.type==='beam')return`${size(f)} 深 ${cm(f.h)}（下緣離地 ${cm(HEIGHT-f.h)}）`;
  if(f.type==='rug')return size(f);
  const h=`${size(f)}×H${cm(f.h)}`;
  return lift(f)?`${h}（離地 ${cm(lift(f))}）`:h;
}
// Labels go in the item, shrunk to fit and turned along long narrow items. Where items overlap
// (a TV wall: base, TV, back panel, upper cabinet), a label slides along the item's long side
// to the first spot no earlier label covers; overhead items try their start first.
const textLength=s=>[...s].reduce((n,ch)=>n+(ch.charCodeAt(0)>255?1:.56),0);
const hit=(a,b)=>Math.max(0,Math.min(a.x2,b.x2)-Math.max(a.x1,b.x1))*Math.max(0,Math.min(a.y2,b.y2)-Math.max(a.y1,b.y1));
function labeller(taken,tagged){
  const place=(spots)=>{const scored=spots.map(b=>({b,cost:taken.reduce((n,t)=>n+hit(b,t),0)}));return scored.find(s=>s.cost===0)||null;};
  return f=>{
    const c=corners(isAirConditioner(f)?acBox(f):f),xs=c.map(p=>px(p[0])),ys=c.map(p=>py(p[1])),bw=Math.max(...xs)-Math.min(...xs),bh=Math.max(...ys)-Math.min(...ys);
    const cx=(Math.max(...xs)+Math.min(...xs))/2,cy=(Math.max(...ys)+Math.min(...ys))/2,turn=bh>bw*1.3,along=turn?bh:bw,across=turn?bw:bh;
    const lines=[f.name,itemSize(f)],widest=Math.max(...lines.map(textLength));
    const size=Math.min(2.2,(along-1)/widest,(across-.6)/2.3),long=widest*size,deep=size*2.3;
    const slide=(extent,len)=>{const free=Math.max(0,(extent-len)/2-.6);return[0,-free/2,free/2,-free,free];};
    // Along the long side, then up or down across it, overhead items starting from their start.
    const alongs=overhead.has(f.type)?slide(along,long).sort((a,b)=>a-b):slide(along,long),acrosses=slide(across,deep).slice(0,1).concat(slide(across,deep).slice(3));
    const box=(o,q,w,h)=>{const x=turn?cx+q:cx+o,y=turn?cy-o:cy+q,W=turn?h:w,H=turn?w:h;return{x,y,x1:x-W/2-.3,x2:x+W/2+.3,y1:y-H/2-.3,y2:y+H/2+.3};};
    const spot=size>=1.3&&place(alongs.flatMap(o=>acrosses.map(q=>box(o,q,long,deep))));
    if(spot){
      taken.push(spot.b);const b=spot.b,t=turn?` transform="rotate(-90 ${r2(b.x)} ${r2(b.y)})"`:'',tone=overhead.has(f.type)?'#555':INK;
      return `<g${t} text-anchor="middle" fill="${tone}">${text(b.x,b.y-size*.2,lines[0],size)}${text(b.x,b.y+size*1.05,lines[1],size*.9,'fill="#555"')}</g>`;
    }
    // No room: a numbered tag here, the name and size in the schedule beside the plan.
    const n=tagged.push(f),tagSpots=slide(along,3.6).flatMap(o=>slide(across,3.6).map(q=>box(o,q,3.4,3.4)));
    const b=(place(tagSpots)||{b:tagSpots.reduce((a,s)=>taken.reduce((m,t)=>m+hit(s,t),0)<taken.reduce((m,t)=>m+hit(a,t),0)?s:a)}).b;
    taken.push(b);
    return `<circle cx="${r2(b.x)}" cy="${r2(b.y)}" r="1.6" fill="#fff" stroke="${INK}" stroke-width="${THIN}"/>${text(b.x,b.y+.65,n,1.8,'text-anchor="middle" font-weight="600"')}`;
  };
}
// Lights keep their symbol on the plan and get a number beside it; their names go in the schedule.
const LIGHT_R=1.6,lightBox=f=>({x1:px(f.x)-LIGHT_R-.2,x2:px(f.x)+LIGHT_R+.2,y1:py(f.z)-LIGHT_R-.2,y2:py(f.z)+LIGHT_R+.2});
function lightTagger(taken,tagged){
  return f=>{
    const n=tagged.push(f),x=px(f.x),y=py(f.z),d=LIGHT_R+2,spots=[[d,0],[-d,0],[0,-d],[0,d],[d,d],[-d,d],[d,-d],[-d,-d]].map(([dx,dy])=>({x:x+dx,y:y+dy,x1:x+dx-1.9,x2:x+dx+1.9,y1:y+dy-1.9,y2:y+dy+1.9}));
    const cost=b=>taken.reduce((m,t)=>m+hit(b,t),0),b=spots.find(s=>!cost(s))||spots.reduce((a,s)=>cost(s)<cost(a)?s:a);
    taken.push(b);
    return `<circle cx="${r2(b.x)}" cy="${r2(b.y)}" r="1.6" fill="#fff" stroke="${INK}" stroke-width="${THIN}"/>${text(b.x,b.y+.65,n,1.8,'text-anchor="middle" font-weight="600"')}`;
  };
}
// The schedule for tagged items, under the notes on the right.
function schedule(tagged){
  if(!tagged.length)return'';
  const x=300,y=154,row=Math.min(4.4,(252-y-8)/tagged.length);
  return text(x,y,'編號物件（燈具與圖上放不下名稱者）',3.2,'font-weight="600"')+tagged.map((f,i)=>{const yy=y+7+i*row;return `<circle cx="${x+1.6}" cy="${r2(yy-.7)}" r="1.6" fill="#fff" stroke="${INK}" stroke-width="${THIN}"/>${text(x+1.6,yy-.05,i+1,1.8,'text-anchor="middle" font-weight="600"')}${text(x+5,yy,`${f.name}　${itemSize(f)}`,Math.min(2.3,row*.62))}`;}).join('');
}
const ROOM_SIZE=3.4,roomAt=r=>({x:px(r.x),y:py(r.z)-2.8});
const roomBox=r=>{const{x,y}=roomAt(r),w=textLength(r.name)*ROOM_SIZE;return{x1:x-w/2-.5,x2:x+w/2+.5,y1:y-ROOM_SIZE-.3,y2:y+.8};};
function drawLight(f){const x=px(f.x),y=py(f.z),r=LIGHT_R;return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="${THIN}"/><path d="M${r2(x-r)} ${r2(y-r)}L${r2(x+r)} ${r2(y+r)}M${r2(x+r)} ${r2(y-r)}L${r2(x-r)} ${r2(y+r)}" stroke="${INK}" stroke-width="${THIN}"/>`;}
const socketMark={duplex:'插',usb:'U',data:'網'};
function drawOutlet(f){
  const x=px(f.x),y=py(f.z),h=Number.isFinite(f.elevation)?`H${cm(f.elevation)}`:'';
  return `<circle cx="${x}" cy="${y}" r="1.5" fill="#fff" stroke="#b3261e" stroke-width="${MID}"/>${text(x,y+.7,socketMark[f.outletKind]||'插',1.7,'text-anchor="middle" fill="#b3261e"')}${text(x+2,y-1.4,h,1.4,'fill="#b3261e"')}`;
}

// Dimension chains on each side: an inner chain through wall ends, partitions meeting the
// shell and opening edges, and an outer chain for the overall length. Centre-line distances.
const facing=(w,side)=>{const len=wallLength(w),mx=(w.a[0]+w.b[0])/2,mz=(w.a[1]+w.b[1])/2,e=.2,probe={top:[mx,mz-e],bottom:[mx,mz+e],left:[mx-e,mz],right:[mx+e,mz]}[side],flat=Math.abs(w.a[1]-w.b[1])<1e-6,upright=Math.abs(w.a[0]-w.b[0])<1e-6;return len>.01&&(side==='top'||side==='bottom'?flat:upright)&&!inside(...probe)&&inside(...{top:[mx,mz+e],bottom:[mx,mz-e],left:[mx+e,mz],right:[mx-e,mz]}[side]);};
export function chainPoints(side){
  // Only walls near that edge of the flat: a shell wall set far back (the entry's side walls)
  // would put numbers on the chain that belong to no wall the reader can see from there.
  const reach=1.35,near=w=>side==='top'?w.a[1]<=bounds.minZ+reach:side==='bottom'?w.a[1]>=bounds.maxZ-reach:side==='left'?w.a[0]<=bounds.minX+reach:w.a[0]>=bounds.maxX-reach;
  const shell=walls.filter(w=>facing(w,side)&&near(w)),axis=side==='top'||side==='bottom'?0:1,values=[];
  const onWall=([x,z],w)=>Math.abs((w.b[0]-w.a[0])*(z-w.a[1])-(w.b[1]-w.a[1])*(x-w.a[0]))<1e-6&&x>=Math.min(w.a[0],w.b[0])-1e-6&&x<=Math.max(w.a[0],w.b[0])+1e-6&&z>=Math.min(w.a[1],w.b[1])-1e-6&&z<=Math.max(w.a[1],w.b[1])+1e-6;
  for(const w of shell){values.push(w.a[axis],w.b[axis]);if(w.opening){const[s,width]=w.opening;values.push(along(w,s)[axis],along(w,s+width)[axis]);}}
  for(const w of walls)if(!shell.includes(w))for(const p of[w.a,w.b])if(shell.some(s=>onWall(p,s)))values.push(p[axis]);
  const sorted=[...new Set(values.map(v=>Math.round(v*1000)/1000))].sort((a,b)=>a-b);
  return sorted.filter((v,i)=>i===0||v-sorted[i-1]>.03);
}
function chain(side,values,offset){
  const horizontal=side==='top'||side==='bottom',sign=side==='top'||side==='left'?-1:1,edge=horizontal?(side==='top'?py(bounds.minZ):py(bounds.maxZ)):(side==='left'?px(bounds.minX):px(bounds.maxX)),at=edge+sign*offset,pos=v=>horizontal?px(v):py(v);
  let out=`<line ${horizontal?`x1="${pos(values[0])}" y1="${r2(at)}" x2="${pos(values.at(-1))}" y2="${r2(at)}"`:`x1="${r2(at)}" y1="${pos(values[0])}" x2="${r2(at)}" y2="${pos(values.at(-1))}"`} stroke="${INK}" stroke-width="${THIN}"/>`;
  for(const v of values){const p=pos(v),from=edge+sign*3,to=at+sign*1.2;out+=horizontal?`<line x1="${p}" y1="${r2(from)}" x2="${p}" y2="${r2(to)}" stroke="${INK}" stroke-width="${THIN}"/><line x1="${r2(p-.9)}" y1="${r2(at+.9)}" x2="${r2(p+.9)}" y2="${r2(at-.9)}" stroke="${INK}" stroke-width="${MID}"/>`:`<line x1="${r2(from)}" y1="${p}" x2="${r2(to)}" y2="${p}" stroke="${INK}" stroke-width="${THIN}"/><line x1="${r2(at-.9)}" y1="${r2(p+.9)}" x2="${r2(at+.9)}" y2="${r2(p-.9)}" stroke="${INK}" stroke-width="${MID}"/>`;}
  values.slice(1).forEach((v,i)=>{const a=values[i],mid=(pos(a)+pos(v))/2,label=cm(v-a),room=Math.abs(pos(v)-pos(a)),tight=room<label.length*1.15+1,shift=tight&&i%2?sign*2.4:0,t=at-1+shift;out+=horizontal?text(mid,side==='top'?t:at+2.6+shift,label,1.9,'text-anchor="middle"'):`<g transform="rotate(-90 ${r2(side==='left'?t:at+2.6+shift)} ${r2(mid)})">${text(side==='left'?t:at+2.6+shift,mid,label,1.9,'text-anchor="middle"')}</g>`;});
  return out;
}
function dimensions(){
  let out='';
  for(const side of['top','bottom','left','right']){const values=chainPoints(side);if(values.length<2)continue;out+=chain(side,values,8)+chain(side,[values[0],values.at(-1)],15);}
  return out;
}

// The owner's fields carry data-field, so the plan page can retype them without redrawing.
export const TITLE_DEFAULTS={project:'A7 空間配置',title:'平面配置圖（含家具配置）',author:'weijie'};
function titleBlock({project,title,date,author}){
  const y=262,h=25,cells=[[10,120,'工程名稱',project,'project'],[120,230,'圖名',title,'title'],[230,285,'比例','A3　1/50'],[285,330,'單位','cm'],[330,375,'日期',date,'date'],[375,410,'繪製',author,'author']];
  return `<rect x="10" y="${y}" width="400" height="${h}" fill="none" stroke="${INK}" stroke-width="${MID}"/>`+cells.map(([a,b,k,v,field],i)=>`${i?`<line x1="${a}" y1="${y}" x2="${a}" y2="${y+h}" stroke="${INK}" stroke-width="${THIN}"/>`:''}${text(a+2.5,y+5,k,2.2,'fill="#666"')}${text(a+2.5,y+15.5,v,i<2?4.2:3.6,`font-weight="600"${field?` data-field="${field}"`:''}`)}`).join('');
}
function legend(){
  const x=300,y=42,row=(i,mark,s)=>`<g transform="translate(${x} ${y+12+i*7})">${mark}${text(12,1.4,s,2.4)}</g>`;
  const line=(dash,w=MID)=>`<line x1="0" y1="0" x2="9" y2="0" stroke="${INK}" stroke-width="${w}"${dash?` stroke-dasharray="${dash}"`:''}/>`;
  return `${text(x,y,'圖例',3.2,'font-weight="600"')}`+
    row(0,`<rect x="0" y="-2" width="9" height="4" fill="#4a4a4a"/>`,'牆（厚 12 cm）')+
    row(1,`<rect x="0" y="-2" width="9" height="4" fill="url(#hatch)" stroke="${INK}" stroke-width="${MID}"/>`,'柱、結構實牆')+
    row(2,`<rect x="0" y="-2" width="9" height="4" fill="#f3ede4" stroke="${INK}" stroke-width="${MID}"/>`,'櫃體（木作）')+
    row(3,`<rect x="0" y="-2" width="9" height="4" fill="#fff" stroke="${INK}" stroke-width="${MID}"/>`,'家具、設備')+
    row(4,line('2 1',THIN),'上方物件：樑、吊櫃、燈槽')+
    row(5,line('.4 .8',THIN),'地毯')+
    row(6,`<circle cx="4.5" cy="0" r="1.6" fill="#fff" stroke="${INK}" stroke-width="${THIN}"/><path d="M2.9 -1.6L6.1 1.6M6.1 -1.6L2.9 1.6" stroke="${INK}" stroke-width="${THIN}"/>`,'燈具（名稱見編號物件表）')+
    row(7,`<circle cx="4.5" cy="0" r="1.5" fill="#fff" stroke="#b3261e" stroke-width="${MID}"/>`,'插座：插 雙插座、U 附 USB、網 網路／電視；H 離地高度')+
    row(8,`<rect x="0" y="-1.2" width="9" height="2.4" fill="#fbeceb" stroke="#b3261e" stroke-width="${MID}"/>`,'線槽：嵌入檯面，內含插座')+
    `<g transform="translate(${x} ${y+82})">${text(0,0,'說明',3.2,'font-weight="600"')}${['配置參考圖，非施工圖；不含管線與迴路。','尺寸單位 cm；外圍尺寸為牆中心線距離。','家具標示：寬×深×高；離地為底面高度。','牆位依建案平面圖描繪，現場請以實測為準。'].map((s,i)=>text(0,7+i*5.5,s,2.4)).join('')}</g>`;
}
function northArrow(){const x=285,y=48;return `<g transform="translate(${x} ${y})"><circle r="5" fill="none" stroke="${INK}" stroke-width="${THIN}"/><path d="M0 -5L2 2L0 .8L-2 2Z" fill="${INK}"/>${text(0,-6.5,'N',2.8,'text-anchor="middle" font-weight="600"')}</g>`;}

export function planSvg(items,{date=new Date().toISOString().slice(0,10),project=TITLE_DEFAULTS.project,title=TITLE_DEFAULTS.title,author=TITLE_DEFAULTS.author}={}){
  // Troughs are drawn and labelled like furniture (on top of their desk or cabinet); other sockets get a mark.
  const list=items.filter(f=>f.type!=='outlet'||f.trough);
  const floor=list.filter(f=>!overhead.has(f.type)),above=list.filter(f=>overhead.has(f.type)&&f.type!=='light'),lights=list.filter(f=>f.type==='light'),sockets=items.filter(f=>f.type==='outlet'&&!f.trough);
  const tagged=[],taken=[...rooms.map(roomBox),...lights.map(lightBox)],byArea=(a,b)=>b.w*b.d-a.w*a.d; // big things first, so smaller ones on top of them stay visible
  const body=[
    [...floor].sort(byArea).map(f=>rectPoly(f,style(f))).join(''),
    drawWalls(),drawWindows(),drawDoors(),
    above.map(f=>rectPoly(f,style(f))).join(''),
    lights.map(drawLight).join(''),
    [...floor,...above].filter(f=>f.w*f.d>.02).map(labeller(taken,tagged)).join(''),
    lights.map(lightTagger(taken,tagged)).join(''),
    rooms.map(r=>text(roomAt(r).x,roomAt(r).y,r.name,ROOM_SIZE,'text-anchor="middle" font-weight="600" fill="#2b4f6e" paint-order="stroke" stroke="#fff" stroke-width=".8"')).join(''),
    sockets.map(drawOutlet).join(''),
    dimensions()
  ].join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET.w}mm" height="${SHEET.h}mm" viewBox="0 0 ${SHEET.w} ${SHEET.h}" font-family='${FONT}' fill="${INK}">
<defs><pattern id="hatch" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="1.6" fill="#bdbdbd"/><line x1="0" y1="0" x2="0" y2="1.6" stroke="${INK}" stroke-width=".25"/></pattern></defs>
<rect width="${SHEET.w}" height="${SHEET.h}" fill="#fff"/><rect x="10" y="10" width="400" height="277" fill="none" stroke="${INK}" stroke-width="${MID}"/>
${body}
${northArrow()}${legend()}${schedule(tagged)}${titleBlock({project,title,date,author})}
</svg>`;
}

// A page that shows the sheet, prints it on A3 landscape at 1:50 and offers the SVG file.
export function planPage(svg){
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A7 平面配置圖</title>
<style>@page{size:A3 landscape;margin:0}body{margin:0;background:#e9ecea;font-family:${FONT.replace(/"/g,"'")}}.bar{position:sticky;top:0;display:flex;gap:8px;align-items:center;padding:10px 16px;background:#fff;border-bottom:1px solid #d6dbd8;font-size:14px}.bar button{font:inherit;padding:8px 12px;border:1px solid #cfd6d2;border-radius:7px;background:#fff;cursor:pointer}.bar{flex-wrap:wrap}.bar label{display:flex;gap:4px;align-items:center;color:#445}.bar input{font:inherit;padding:6px 8px;border:1px solid #cfd6d2;border-radius:6px;width:11em}.bar input.short{width:7em}.bar span{color:#667}.sheet{padding:16px}.sheet svg{display:block;width:100%;height:auto;max-width:1400px;margin:auto;background:#fff;box-shadow:0 1px 6px #0002}@media(max-width:700px){.bar{position:static}}@media print{.bar{display:none}.sheet{padding:0}.sheet svg{width:420mm;height:297mm;max-width:none;box-shadow:none}}</style></head>
<body><div class="bar"><label>工程名稱<input data-input="project" maxlength="30"></label><label>圖名<input data-input="title" maxlength="30"></label><label>日期<input data-input="date" class="short" maxlength="20"></label><label>繪製<input data-input="author" class="short" maxlength="12"></label><button id="print">列印／存成 PDF</button><button id="svg">下載 SVG</button><span>列印時選 A3 橫向、縮放 100%，就是 1/50。</span></div><div class="sheet">${svg}</div>
<script>
// Title-block fields: typed here, shown on the sheet at once; project, title and author are
// remembered in this browser (the page shares the editor's origin), the date starts as today.
const KEY='a7-plan-titleblock',KEPT=['project','title','author'];let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{}
for(const input of document.querySelectorAll('[data-input]')){const k=input.dataset.input,t=document.querySelector('svg [data-field="'+k+'"]');input.value=KEPT.includes(k)&&typeof saved[k]==='string'?saved[k]:t.textContent;t.textContent=input.value;input.oninput=()=>{t.textContent=input.value;if(KEPT.includes(k)){saved[k]=input.value;try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{}}};}
document.getElementById('print').onclick=()=>print();
document.getElementById('svg').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([document.querySelector('.sheet svg').outerHTML],{type:'image/svg+xml'}));a.download='A7-平面配置圖.svg';a.click();};
<\/script></body></html>`;
}
