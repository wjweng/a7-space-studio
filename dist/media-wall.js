import {makeCabinetDesign,resizeCabinetDesign,validateCabinetDesign} from './cabinet-design.js';
import {finishByCode} from './finishes.js';

const round=n=>Math.round(n*10000)/10000;
const text=v=>String(v??'').slice(0,80);
const id=()=>globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2);
const finite=(n,min,max,label)=>{if(!Number.isFinite(n)||n<min||n>max)throw Error(label+'超出允許範圍');return round(n);};
const sourceValues=['estimated','drawing','measured'];
export function makeMediaWall(f){
  const base={id:id(),x:0,y:0,w:Math.min(f.w-.1,1.8),h:.48,d:Math.min(f.d,.42),openCells:{}};
  base.cabinetDesign=makeCabinetDesign(base,'low');
  const upper={id:id(),x:f.w*.32,y:1.65,w:Math.min(.55,f.w*.28),h:.72,d:.3,openCells:{}};
  upper.cabinetDesign=makeCabinetDesign(upper,'closed');
  return{
    panel:{x:0,y:.4,w:Math.min(f.w-.08,2.2),h:1.65,thickness:.03,finish:''},
    base,upper,
    tv:{x:0,y:1.42,w:1.22,h:.69,mount:'wall'},
    outlets:[],conduits:[],
    survey:{wallWidth:null,wallHeight:null,wallType:'',source:'estimated',notes:''}
  };
}
export function validateMediaWall(f,input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('電視牆資料格式不正確');
  const rect=(v,label,minW=.1,minH=.1)=>{
    if(!v||typeof v!=='object')throw Error(label+'資料不正確');
    const x=finite(v.x,-f.w/2,f.w/2,label+'水平位置'),y=finite(v.y,0,f.h,label+'離地高度'),w=finite(v.w,minW,f.w,label+'寬度'),h=finite(v.h,minH,f.h,label+'高度');
    if(Math.abs(x)+w/2>f.w/2+.001||y+h>f.h+.001)throw Error(label+'超出電視牆外框');
    return{x,y,w,h};
  };
  const panel={...rect(input.panel,'背板'),thickness:finite(input.panel.thickness,.008,.15,'背板厚度'),finish:finishByCode(input.panel.finish)?input.panel.finish:''};
  const module=(v,label)=>{
    if(v===null)return null;
    const basic=rect(v,label,.2,.15),d=finite(v.d,.2,f.d,'櫃體深度');
    const cabinetDesign=validateCabinetDesign({w:basic.w,h:basic.h},v.cabinetDesign);
    const openCells={};
    for(const cell of cabinetDesign.columns.flatMap(c=>c.cells))if(cell.front!=='open'&&v.openCells?.[cell.id])openCells[cell.id]=1;
    return{...basic,id:typeof v.id==='string'?v.id:id(),d,cabinetDesign,openCells};
  };
  const base=module(input.base,'下櫃'),upper=module(input.upper,'壁掛櫃');
  const tv={...rect(input.tv,'電視',.3,.2),mount:['wall','base'].includes(input.tv.mount)?input.tv.mount:'wall'};
  if(tv.mount==='base'&&(!base||Math.abs(tv.y-base.y-base.h)>.05||Math.abs(tv.x-base.x)+tv.w/2>base.w/2+.001))throw Error('櫃上電視須位於下櫃頂面');
  const outlets=Array.isArray(input.outlets)?input.outlets:[];
  if(outlets.length>16)throw Error('插座最多 16 個');
  const checkedOutlets=outlets.map(outlet=>({
    id:typeof outlet.id==='string'?outlet.id:id(),
    x:finite(outlet.x,-f.w/2,f.w/2,'插座水平位置'),
    y:finite(outlet.y,0,f.h,'插座中心高度'),
    kind:['power','data','coax'].includes(outlet.kind)?outlet.kind:'power',
    circuit:text(outlet.circuit),spec:text(outlet.spec),
    source:sourceValues.includes(outlet.source)?outlet.source:'estimated'
  }));
  const conduits=Array.isArray(input.conduits)?input.conduits:[];
  if(conduits.length>16)throw Error('管線最多 16 條');
  const checkedConduits=conduits.map(line=>{
    if(!Array.isArray(line.points)||line.points.length<2||line.points.length>12)throw Error('管線路徑至少 2 點、最多 12 點');
    return{
      id:typeof line.id==='string'?line.id:id(),
      points:line.points.map(p=>({x:finite(p.x,-f.w/2,f.w/2,'管線點水平位置'),y:finite(p.y,0,f.h,'管線點高度')})),
      kind:['power','data','coax'].includes(line.kind)?line.kind:'power',
      pipe:text(line.pipe),wire:text(line.wire),circuit:text(line.circuit),
      source:sourceValues.includes(line.source)?line.source:'estimated'
    };
  });
  const survey=input.survey||{};
  const wallWidth=survey.wallWidth==null?null:finite(survey.wallWidth,.1,20,'實測牆寬');
  const wallHeight=survey.wallHeight==null?null:finite(survey.wallHeight,.1,10,'實測牆高');
  if(wallWidth!==null&&f.w>wallWidth+.001||wallHeight!==null&&f.h>wallHeight+.001)throw Error('電視牆外框超過輸入的實測牆面尺寸');
  return{panel,base,upper,tv,outlets:checkedOutlets,conduits:checkedConduits,survey:{
    wallWidth,wallHeight,
    wallType:text(survey.wallType),source:sourceValues.includes(survey.source)?survey.source:'estimated',notes:text(survey.notes)
  }};
}
export function resizeMediaWall(media,oldSize,newSize){
  const next=structuredClone(media),sx=newSize.w/oldSize.w,sy=newSize.h/oldSize.h;
  for(const part of[next.panel,next.tv,next.base,next.upper]){
    if(!part)continue;
    const old={w:part.w,h:part.h};
    part.x=round(part.x*sx);part.y=round(part.y*sy);part.w=round(part.w*sx);part.h=round(part.h*sy);
    if(part.cabinetDesign)part.cabinetDesign=resizeCabinetDesign(part.cabinetDesign,old,part);
  }
  for(const outlet of next.outlets){outlet.x=round(outlet.x*sx);outlet.y=round(outlet.y*sy);}
  for(const line of next.conduits)for(const point of line.points){point.x=round(point.x*sx);point.y=round(point.y*sy);}
  return next;
}
const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kindLabel={power:'電源',data:'網路',coax:'同軸'};
export function mediaWallSvg(f){
  const m=validateMediaWall(f,f.mediaWall),scale=250,w=f.w*scale,h=f.h*scale,px=x=>(x+f.w/2)*scale,py=y=>(f.h-y)*scale;
  const lines=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w+160} ${h+170}" role="img" aria-label="電視牆正面標註圖"><style>text{font:14px sans-serif;fill:#26312d}.outline{fill:none;stroke:#2f3d38;stroke-width:2}.panel{fill:#d5c8af;stroke:#594e40}.cabinet{fill:#bca788;stroke:#594e40}.tv{fill:#202a2e;stroke:#758586;stroke-width:4}.tvlabel{fill:white}.power{fill:#d17c38}.data{fill:#3c8ca2}.coax{fill:#8067a0}.conduit{fill:none;stroke:#c46e4a;stroke-width:2;stroke-dasharray:8 5}.dimension{stroke:#3c554d;stroke-width:1}</style><g transform="translate(80 55)">`],labels=[];
  const rect=(part,className,label)=>{
    if(!part)return;
    const left=px(part.x-part.w/2),top=py(part.y+part.h);
    lines.push(`<rect class="${className}" x="${left}" y="${top}" width="${part.w*scale}" height="${part.h*scale}"/>`);
    labels.push(`<text class="${className==='tv'?'tvlabel':''}" x="${left+5}" y="${top+17}">${label} ${Math.round(part.w*100)}×${Math.round(part.h*100)} · 底 ${Math.round(part.y*100)} cm</text>`);
  };
  lines.push(`<rect class="outline" width="${w}" height="${h}"/>`);
  rect(m.panel,'panel','背板');rect(m.base,'cabinet','下櫃');rect(m.upper,'cabinet','壁掛櫃');rect(m.tv,'tv','電視');
  lines.push(...labels);
  for(const outlet of m.outlets){lines.push(`<circle class="${outlet.kind}" cx="${px(outlet.x)}" cy="${py(outlet.y)}" r="7"/><text x="${px(outlet.x)+10}" y="${py(outlet.y)-7}">${escape(kindLabel[outlet.kind])} ${Math.round((outlet.x+f.w/2)*100)},${Math.round(outlet.y*100)}</text>`);}
  for(const conduit of m.conduits){lines.push(`<polyline class="conduit" points="${conduit.points.map(p=>`${px(p.x)},${py(p.y)}`).join(' ')}"/>`);}
  lines.push(`<line class="dimension" x1="0" x2="${w}" y1="${h+25}" y2="${h+25}"/><text x="${w/2}" y="${h+45}" text-anchor="middle">總寬 ${Math.round(f.w*100)} cm</text><text x="0" y="-15">總高 ${Math.round(f.h*100)} cm · 基準：完成面地坪／左側外框</text></g>`);
  const note='草案：未經現場核對，不可直接施工';
  lines.push(`<text x="80" y="${h+125}" fill="#a5412e">${note}</text><text x="80" y="${h+150}">尺寸來源：${escape(({estimated:'估算',drawing:'提供圖說',measured:'實測'})[m.survey.source])} · 管線與插座規格見下表</text></svg>`);
  return lines.join('');
}
export function mediaWallSchedule(f){
  const m=validateMediaWall(f,f.mediaWall);
  const rows=['電視牆施工協調草案','草案：未經現場核對，不可直接施工','尺寸單位：cm；基準：完成面地坪／電視牆左側外框',
    `牆面資料：寬 ${m.survey.wallWidth==null?'未提供':Math.round(m.survey.wallWidth*100)}；高 ${m.survey.wallHeight==null?'未提供':Math.round(m.survey.wallHeight*100)}；構造 ${m.survey.wallType||'未提供'}；來源 ${m.survey.source}`,
    ...[['背板',m.panel],['下櫃',m.base],['壁掛櫃',m.upper],['電視',m.tv]].filter(([,part])=>part).map(([label,part])=>`${label}：左側 ${Math.round((part.x-part.w/2+f.w/2)*100)}；底高 ${Math.round(part.y*100)}；寬 ${Math.round(part.w*100)}；高 ${Math.round(part.h*100)}`),
    `電視安裝：${m.tv.mount==='wall'?'壁掛':'放在下櫃'}`,
    '插座：'];
  for(const o of m.outlets)rows.push(`- ${kindLabel[o.kind]}，水平 ${Math.round((o.x+f.w/2)*100)}，中心高 ${Math.round(o.y*100)}；迴路 ${o.circuit||'未提供'}；規格 ${o.spec||'未提供'}；來源 ${o.source}`);
  if(!m.outlets.length)rows.push('- 尚未配置');
  rows.push('管線：');
  for(const line of m.conduits)rows.push(`- ${kindLabel[line.kind]}；路徑 ${line.points.map(p=>`(${Math.round((p.x+f.w/2)*100)},${Math.round(p.y*100)})`).join(' → ')}；管材／尺寸 ${line.pipe||'未提供'}；線材 ${line.wire||'未提供'}；迴路 ${line.circuit||'未提供'}；來源 ${line.source}`);
  if(!m.conduits.length)rows.push('- 尚未配置');
  return rows.join('\n');
}
