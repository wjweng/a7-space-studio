import {corners,overlaps,signedDistance,sameRoom,furnitureInterference,EPS} from './geometry.js';
import {finishByCode,finishableTypes} from './finishes.js';
import {flooringByCode} from './floorings.js';
import {validateCabinetDesign,makeCabinetDesign,resizeCabinetDesign,cabinetFinishSlots,hostsNicheTv,designLeaves} from './cabinet-design.js';
// Cyclic with spatial.js; blocksDoor is only called from issues(), after both modules load.
import {blocksDoor} from './spatial.js';
export {corners,overlaps} from './geometry.js';
export const VERSION=1;
export const LAYOUT_REVISION=17;
export const WALL_THICKNESS=.12;
// Structural columns follow the outside-wall faces and dimensions printed on A7.
export const columns=[
 {id:'living-north-column',x:.20,z:.245,w:.52,d:.61,rot:0},
 {id:'entry-column',x:.01,z:7.07,w:.80,d:.84,rot:0},
 {id:'balcony-south-column',x:8.525,z:6.885,w:.85,d:.85,rot:0}
];
// Hatched solid areas in A7: bath-A column and balcony corner blocks.
export const structuralBlocks=[
 {id:'bath-A-block',x:1.64,z:6.725,w:.48,d:1.05,rot:0},
 {id:'balcony-north-block',x:7.975,z:4.625,w:.65,d:.45,rot:0}
];
export const structuralSolids=[...columns,...structuralBlocks];
// Clear floor-to-ceiling height. Doors and windows keep their own absolute heights; the
// balcony opening, curtains, beams and lights follow the ceiling.
export const HEIGHT=3;
// Metres. A7 raster tracing calibrated against 2.24 / 2.62 / 2.61 m room dimensions.
// Unclosed drawing chains are approximations, not survey coordinates.
export const outline=[[0,0],[8.3,0],[8.3,2.7],[8.85,2.7],[8.85,4.4],[8.3,4.4],[8.3,6.46],[8.95,6.46],[8.95,7.31],[8.1,7.31],[8.1,7.25],[1.85,7.25],[1.85,8.53],[-.45,8.53],[-.45,6.65],[0,6.65]];
export const rooms=[{name:'客餐廳',x:1.3,z:3.15},{name:'臥室 A',x:3.98,z:1.35},{name:'主臥室',x:6.8,z:1.3},{name:'臥室 B',x:5.25,z:4.75},{name:'廚房',x:4.9,z:6.45},{name:'衛浴 A',x:2.25,z:5.8},{name:'衛浴 B',x:7.75,z:3.55},{name:'工作陽台',x:7.45,z:5.85},{name:'玄關',x:.75,z:7.7}];
// Wall endpoints, optional opening: distance from first endpoint, width, sill, height.
// A door hinges at the opening's first-endpoint side; the entrance wall runs south to north
// so its hinge is on the south jamb and the handle is on the right seen from inside.
export const walls=[
 {id:'window-living',a:[0,0],b:[2.82,0],opening:[.42,1.88,.9,1.5]},
 {id:'window-A',a:[2.82,0],b:[5.18,0],opening:[.55,1.64,.9,1.5]},
 {id:'window-master',a:[5.18,0],b:[8.3,0],opening:[1.27,1.63,.9,1.5]},
 {a:[0,0],b:[0,6.71]}, {a:[8.3,0],b:[8.3,2.7]},
 {a:[8.3,2.7],b:[8.85,2.7]},{id:'window-bathB',a:[8.85,2.7],b:[8.85,4.4],opening:[.85,.72,1.5,.7]},
 {a:[8.85,4.4],b:[8.3,4.4]},{id:'balcony-railing',a:[8.3,4.4],b:[8.3,6.46],opening:[.67,1.34,.1,HEIGHT-.1],openingType:'railing'},
 {a:[8.1,7.25],b:[1.85,7.25]}, {a:[1.85,7.25],b:[1.85,8.53]},
 {a:[1.85,8.53],b:[-.45,8.53]}, {a:[-.45,8.53],b:[-.45,6.71],opening:[0,1.04,0,2.1]},
 {a:[-.45,6.71],b:[0,6.71]},
 {a:[2.82,0],b:[2.82,2.78]}, {a:[5.18,0],b:[5.18,2.78]},
 {a:[2.82,2.78],b:[5.18,2.78],opening:[.09,.9,0,2.1]},
 {a:[3.83,2.78],b:[3.83,3.72],opening:[.02,.9,0,2.1]},
 {a:[3.83,3.72],b:[6.57,3.72]},
 {a:[3.83,3.72],b:[3.83,5.78],opening:[.1,.9,0,2.1]},
 {a:[3.83,5.78],b:[6.57,5.78]},
 {a:[6.57,2.7],b:[8.3,2.7]},
 {a:[6.57,2.7],b:[6.57,4.4],opening:[.1,.8,0,2.1]},
 {a:[6.57,4.4],b:[8.3,4.4]},
 {id:'window-B',a:[6.57,4.4],b:[6.57,5.78],opening:[.12,1.06,.9,1.5]},
 {id:'balcony-door-wall',a:[6.57,5.78],b:[6.57,7.25],opening:[.03,.9,0,2.1]},
 {a:[1.4,4.75],b:[3.08,4.75]}, {a:[1.4,4.75],b:[1.4,7.25]},
 {a:[3.08,4.75],b:[3.08,7.25],opening:[0,.74,0,2.1]},
 {a:[1.4,7.25],b:[3.08,7.25]}
];
export const doors=walls.filter(w=>w.opening&&w.opening[2]===0).map((w,i)=>{let [s,width]=w.opening,dx=w.b[0]-w.a[0],dz=w.b[1]-w.a[1],len=Math.hypot(dx,dz);return{id:'door-'+i,swing:[-1,1,1,1,1,1,-1][i],name:['臥室 A 房門','主臥通道門','臥室 B 房門','衛浴 B 房門','陽台門','衛浴 A 房門'][i-1]||'玄關大門',x:w.a[0]+dx/len*s,z:w.a[1]+dz/len*s,angle:-Math.atan2(dz,dx),width,height:2.1};});
const curtainNames=['客廳窗簾','臥室 A 窗簾','主臥窗簾'];
export const curtains=walls.filter(w=>['window-living','window-A','window-master'].includes(w.id)).map((wall,i)=>{const openingStart=wall.a[0]+wall.opening[0],openingEnd=openingStart+wall.opening[1],columnEdge=columns[0].x+columns[0].w/2,start=wall.id==='window-living'?Math.max(openingStart-.06,columnEdge):openingStart-.06,end=openingEnd+.06;return{id:'curtain-'+i,name:curtainNames[i],x:(start+end)/2,z:.15,w:end-start};});
const onWall=([x,z],wall)=>Math.abs((wall.b[0]-wall.a[0])*(z-wall.a[1])-(wall.b[1]-wall.a[1])*(x-wall.a[0]))<EPS&&x>=Math.min(wall.a[0],wall.b[0])-EPS&&x<=Math.max(wall.a[0],wall.b[0])+EPS&&z>=Math.min(wall.a[1],wall.b[1])-EPS&&z<=Math.max(wall.a[1],wall.b[1])+EPS;
const endpoints=[...new Map(walls.flatMap(w=>[w.a,w.b]).map(point=>[point.join(','),point])).values()];
export const wallJoints=endpoints.filter(point=>walls.filter(wall=>onWall(point,wall)).length>1).map(([x,z],i)=>({id:'wall-joint-'+i,x,z,w:WALL_THICKNESS,d:WALL_THICKNESS,rot:0}));
const f=(id,type,name,x,z,w,d,h,rot=0,doorStyle,extra={})=>({id,type,name,x,z,w,d,h,rot,open:0,...(doorStyle?{doorStyle}:{}),...extra,assumed:true});
const light=(id,name,x,z,lumens=1200)=>f(id,'light',name,x,z,.24,.24,.12,0,undefined,{lightKind:'ceiling',shape:'round',colorTemperature:'white',lumens,dimming:75,pendantLength:.45,on:true});
export const initialFurniture=[
 f('sofa','sofa','三人沙發',2.03,1.23,2.05,.87,.84,-90),
 f('tv','console','電視矮櫃',.32,1.57,1.8,.4,.48,90,'drawers'),
 f('coffee','table','橢圓茶几',1.07,1.25,.55,1.04,.4),
 f('rug','rug','客廳地毯',1.34,1.32,1.8,2.5,.012),
 f('dining','table','餐桌',1.96,3.55,1.2,.75,.75),
 f('chair1','chair','餐椅 01',1.72,3.29,.44,.48,.8),
 f('chair2','chair','餐椅 02',2.20,3.29,.44,.48,.8),
 f('chair3','chair','餐椅 03',1.72,3.81,.44,.48,.8,180),
 f('chair4','chair','餐椅 04',2.20,3.81,.44,.48,.8,180),
 f('bedA','bed','臥室 A 單人床',4.56,1.35,.98,1.98,.6),
 f('wardA','wardrobe','臥室 A 衣櫃',3.24,.53,.67,.6,2.35,0,'sliding'),
 f('deskA','desk','臥室 A 書桌',3.28,1.53,.72,.48,.75,90),
 f('bedM','bed','主臥雙人床',7.35,1.31,1.52,2,.62),
 f('wardM','wardrobe','主臥衣櫃',5.58,1.27,1.85,.6,2.35,90,'sliding'),
 f('night','drawer','床頭櫃',6.32,.47,.35,.4,.53),
 f('bedB','bed','臥室 B 單人床',5.92,4.75,.95,1.9,.58),
 f('deskB','desk','臥室 B 書桌',4.47,5.37,1.0,.55,.75,180),
 f('wardB','wardrobe','臥室 B 衣櫃',5.095,4.08,.68,.55,2.2,0,'sliding'),
 f('shoe','wardrobe','玄關收納櫃',.29,6.10,.8,.42,2.3,90),
 f('kitchen','kitchen','廚具：左水槽・右爐台',5.47,6.90,2.08,.58,.9,180,'mixed',{kitchenParts:{sink:{w:.57,d:.41},cooktop:{w:.56,d:.45}}}),
 f('fridge','fridge','冰箱（原圖左側設備位）',4.13,6.86,.55,.63,1.78,180,'right'),
 f('wash','washer','洗衣機',7.03,4.83,.61,.62,.87),
 f('bathSink1','sink','衛浴 A 洗手台',1.675,5.22,.82,.43,.83,90,undefined,{basin:{w:.533,d:.236}}),
 f('toilet1','toilet','衛浴 A 馬桶',1.795,5.92,.4,.67,.75,90),
 f('showerA','shower','衛浴 A 乾濕分離淋浴區',2.46,6.70,1.08,.96,2.1),
 f('bathSink2','sink','衛浴 B 洗手台',8.58,3.17,.82,.42,.83,-90,undefined,{basin:{w:.533,d:.231}}),
 f('toilet2','toilet','衛浴 B 馬桶',7.02,4.005,.4,.67,.75,180),
 f('showerB','shower','衛浴 B 轉角淋浴區',8.08,3.96,1.36,.76,2.1),
 f('plant','plant','落地植栽',.36,4.35,.43,.43,1.2),
 light('light-living','客餐廳主燈',1.3,3.15),
 light('light-bedroomA','臥室 A 主燈',3.98,1.35),
 light('light-master','主臥主燈',6.8,1.3),
 light('light-bedroomB','臥室 B 主燈',5.25,4.75),
 light('light-kitchen','廚房主燈',4.9,6.45),
 light('light-bathA','衛浴 A 主燈',2.25,5.8,900),
 light('light-bathB','衛浴 B 主燈',7.75,3.55,900),
 light('light-balcony','工作陽台主燈',7.45,5.85),
 light('light-entry','玄關主燈',.75,7.7)
];
export const palettes={oak:{name:'日光・淺橡木',wood:'#c2a17b',wall:'#f1ece3',fabric:'#d8d0c1',accent:'#536665',floor:'#bb9470'},walnut:{name:'暖暮・胡桃木',wood:'#72503c',wall:'#e7dfd3',fabric:'#b5a087',accent:'#885849',floor:'#957252'},mist:{name:'霧白・現代',wood:'#b7b1a4',wall:'#e9eded',fabric:'#9ba8ac',accent:'#3d535f',floor:'#b1ada3'}};
export const clone=v=>JSON.parse(JSON.stringify(v));
// Upholstery colour per item: absent means the palette's fabric.
export const fabricTypes=['sofa','chair','bed'];
export const fabricColors=[['#e6dfd2','米白'],['#cdbfa6','燕麥'],['#bdbab3','淺灰'],['#6b6c6b','深灰'],['#34373a','炭黑'],['#a8693e','焦糖'],['#8c4a3d','磚紅'],['#c49a3a','芥末黃'],['#4a6552','墨綠'],['#7e95a3','霧藍'],['#2f3f5a','藏青']];
export const normalizeFabric=color=>typeof color==='string'&&/^#[0-9a-f]{6}$/i.test(color)?color.toLowerCase():null;
// Floor per room: an SPC flooring code (floorings.js); absent means the palette's timber
// floor, or tiles in wet rooms. Codes that are not floorings, such as the board finishes
// rooms could take before 2026-09-24, are dropped and the room returns to its default.
export const wetRooms=['衛浴 A','衛浴 B','工作陽台'];
export function normalizeFloors(input){const out={};if(input&&typeof input==='object'&&!Array.isArray(input))for(const [room,code]of Object.entries(input))if(rooms.some(r=>r.name===room)&&flooringByCode(code))out[room]=code;return out;}
// Types built from a modular cabinet design (columns, cells, fronts).
export const cabinetTypes=['wardrobe','console','hangingCabinet'];
export const minimums={sofa:[1.1,.5,.45],bed:[.65,1.2,.25],chair:[.3,.3,.55],wardrobe:[.2,.2,.3],drawer:[.2,.2,.2],console:[.5,.2,.15],panel:[.1,.01,.1],television:[.3,.04,.2],table:[.3,.25,.2],desk:[.4,.35,.4],kitchen:[1.2,.4,.7],fridge:[.4,.4,.9],washer:[.4,.4,.6],sink:[.3,.3,.5],toilet:[.3,.4,.5],plant:[.2,.2,.3],shower:[.6,.6,1.8],rug:[.2,.2,.005],light:[.1,.1,.02],cove:[.3,.08,.02],cornerShelf:[.2,.2,.3],beam:[.05,.05,.05],hangingCabinet:[.2,.2,.2]};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:min));
export const lightKinds=['ceiling','pendant','linear'];
// A recessed linear light is only a few centimetres wide; round and square lights keep the 10 cm floor.
// Its height is how far the bar drops below the ceiling, so 1 cm reads as nearly flush.
export const minimumsFor=f=>f?.type==='light'&&f.lightKind==='linear'?[.1,.02,.01]:minimums[f?.type];
export const linearLightDefaults={w:1.2,d:.04,h:.01};
export const lightShapes=['round','square'];
export const lightColorTemperatures=['white','natural','warm'];
// A light cove: a board on the wall below the ceiling with an LED strip on
// top that washes the ceiling and the wall above it. `coveGap` is the space
// from the board's top to the ceiling; the board's underside height is kept as
// `elevation`, like TVs and back panels, so clashes use the usual rules.
export function normalizeCove(f){const light=normalizeLight({...f,colorTemperature:f.colorTemperature??'warm',lumens:f.lumens??1000});return{coveGap:clamp(f.coveGap??.25,.05,1),colorTemperature:light.colorTemperature,lumens:light.lumens,dimming:light.dimming,on:light.on};}
// A corner shelf: a quarter-round open shelf unit whose square corner sits in
// the corner it fills (local back-right; rotate it for the other corners). Its
// shelves are a one-column cabinet design whose cells are all open, so the
// cabinet editor edits it (shelf heights, adding and removing shelves, edge
// drags); each cell's shelf is the board at its bottom. `cap` is the top board.
export const CORNER_BOARD=.025;
const cornerId=()=>globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2);
// Layouts saved before 2026-09-27 kept shelf-top heights in `shelves`.
function cornerDesignFromShelves(f){
  const h=f.h,given=Array.isArray(f.shelves)?f.shelves:[1,2,3].map(i=>h*i/4+CORNER_BOARD);
  const cuts=[];for(const top of [...given].filter(Number.isFinite).sort((a,b)=>a-b)){const cut=round4(top-CORNER_BOARD);if(cut-(cuts.at(-1)??0)>=.15&&h-cut>=.15)cuts.push(cut);}
  const edges=[0,...cuts,h];
  return{template:'custom',columns:[{id:cornerId(),width:f.w,bottom:0,cells:edges.slice(1).map((edge,i)=>({id:cornerId(),height:round4(edge-edges[i]),front:'open'}))}]};
}
export function normalizeCornerShelf(f){
  // Fronts are cleared before validating: a 30 cm unit could not hold one anyway.
  const given=f.cabinetDesign&&typeof f.cabinetDesign==='object'?structuredClone(f.cabinetDesign):cornerDesignFromShelves(f);
  if(Array.isArray(given.columns))for(const cell of designLeaves(given)){cell.front='open';delete cell.handle;delete cell.finishes?.door;delete cell.finishes?.drawerBox;}
  delete given.doorGroups;
  const design=validateCabinetDesign(f,given);
  return{cabinetDesign:design,cap:f.cap!==false};
}
export function normalizeLight(f){const legacyLumens=Number.isFinite(f.lumens)?f.lumens:Number.isFinite(f.watts)?f.watts*50:1200;return{lightKind:lightKinds.includes(f.lightKind)?f.lightKind:'ceiling',shape:lightShapes.includes(f.shape)?f.shape:'round',colorTemperature:lightColorTemperatures.includes(f.colorTemperature)?f.colorTemperature:'white',lumens:clamp(legacyLumens,100,10000),dimming:clamp(f.dimming??f.brightness??75,0,100),pendantLength:clamp(f.pendantLength??.45,.05,HEIGHT-.12),on:f.on!==false};}
export function normalizeSinkBasin(f){
 const maxW=Math.max(.08,f.w-.08),maxD=Math.max(.08,f.d-.08),basin=f.basin||{};
 return {w:clamp(basin.w??f.w*.65,.08,maxW),d:clamp(basin.d??f.d*.55,.08,maxD)};
}
export function normalizeKitchenParts(f){
 const maxW=Math.max(.08,f.w-.08),maxD=Math.max(.08,f.d-.08),parts=f.kitchenParts||{},sink=parts.sink||{},cooktop=parts.cooktop||{};
 // Each component remains inside the countertop zone at its fixed design position.
 const sinkMaxW=Math.min(maxW,Math.max(.08,f.w*.54-.08)),cooktopMaxW=Math.min(maxW,Math.max(.08,f.w*.40-.08));
 return {sink:{w:clamp(sink.w??.57,.08,sinkMaxW),d:clamp(sink.d??.41,.08,maxD)},cooktop:{w:clamp(cooktop.w??.56,.08,cooktopMaxW),d:clamp(cooktop.d??.45,.08,maxD)}};
}
export function inside(x,z){let c=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){let a=outline[i],b=outline[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
// A point on the drawn shell is valid too.  The ray-cast above deliberately
// treats that point as outside, which is useful for geometry tests but wrong
// for an object resting exactly against the exterior wall.
export const onOutline=(x,z)=>outline.some((a,i)=>{const b=outline[(i+1)%outline.length],dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz,t=length?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/length)):0;return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t)<=1e-7;});
export const insideOrOutline=(x,z)=>inside(x,z)||onOutline(x,z);
export function wallRects(){return walls.flatMap(w=>{let dx=w.b[0]-w.a[0],dz=w.b[1]-w.a[1],len=Math.hypot(dx,dz),ranges=w.opening&&w.opening[2]===0?[[0,w.opening[0]],[w.opening[0]+w.opening[1],len]]:[[0,len]];return ranges.filter(([a,b])=>b-a>.01).map(([a,b])=>({x:w.a[0]+dx/len*(a+b)/2,z:w.a[1]+dz/len*(a+b)/2,w:b-a,d:WALL_THICKNESS,rot:-Math.atan2(dz,dx)*180/Math.PI}));}).concat(wallJoints,structuralSolids);}
// Only wall segments whose centre lies on the exterior polygon are the hard
// shell. Interior partitions intentionally remain editable draft conflicts.
export function exteriorWallRects(){return wallRects().filter(w=>onOutline(w.x,w.z));}
// Within the outline and clear of the exterior walls' thickness: the rule drags,
// nudges and beam resizing all enforce.
export const insideShell=f=>corners(f).every(([x,z])=>insideOrOutline(x,z))&&exteriorWallRects().every(w=>signedDistance(f,w)>=-EPS);
// A light whose whole footprint lies under a beam hangs from the beam's underside instead of
// clashing with it; one that only partly overlaps would float and is still flagged.
// Ceiling items stack ceiling -> beam -> hanging cabinet -> light: a later
// kind whose whole footprint lies under an earlier one hangs from its
// underside. A hanging cabinet is also the stack for lights below it.
export const ceilingRank={beam:1,hangingCabinet:2,light:3},ceilingTypes=Object.keys(ceilingRank);
export const mountedOn=(item,host)=>ceilingRank[item?.type]>ceilingRank[host?.type]&&(()=>{const a=host.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),tol=1e-6;return corners(item).every(([x,z])=>{const dx=x-host.x,dz=z-host.z;return Math.abs(c*dx-s*dz)<=host.w/2+tol&&Math.abs(s*dx+c*dz)<=host.d/2+tol;});})();
// Distance from the ceiling down to an item's top: the lowest underside among
// the (non-draft) items it hangs from.
export const mountDrop=(item,items,depth=0)=>!ceilingRank[item?.type]||item.type==='beam'||depth>3?0:Math.max(0,...items.filter(host=>host.id!==item.id&&!host.draft&&mountedOn(item,host)).map(host=>Math.min(HEIGHT,mountDrop(host,items,depth+1)+host.h)));
export const lightMountDrop=(light,items)=>light?.type==='light'?mountDrop(light,items):0;
// A hanging cabinet's underside height above the floor.
export const hangingElevation=(f,items)=>Math.max(0,HEIGHT-mountDrop(f,items)-f.h);
// A light's vertical reach: from the underside of whatever it hangs from down to the bottom
// of its fixture (a pendant adds its cord and about 0.6 of the shade height, as drawn).
export const lightSpan=(f,items)=>{const light=normalizeLight(f),t=Math.max(.02,Math.min(.3,f.h)),top=HEIGHT-mountDrop(f,items),reach=light.lightKind==='pendant'?Math.max(.05,Math.min(HEIGHT-.12,light.pendantLength))+t*.6:t;return{yMin:top-reach,yMax:top};};
// Lights clash with floor furniture the way hanging cabinets do: same room, overlapping in
// plan and in height. The light is checked as a solid block over that span.
const lightReaches=(light,other,items)=>{if(['rug',...ceilingTypes].includes(other.type)||!sameRoom(light,other))return false;const{yMin,yMax}=lightSpan(light,items);return furnitureInterference({x:light.x,z:light.z,w:light.w,d:light.d,rot:light.rot,type:'hangingCabinet',elevation:yMin,h:yMax-yMin},other);};
// A wall-hung TV hangs on a back panel; they touch by design.
const tvOnPanel=(a,b)=>[a.type,b.type].includes('panel')&&[a,b].some(x=>x.type==='television'&&x.tvMount==='wall');
// A beam and a light cove clash where they overlap in plan and the beam reaches down past the cove's top.
const beamCoveClash=(beam,cove)=>overlaps(beam,cove)&&HEIGHT-beam.h<(cove.elevation||0)+cove.h-EPS;
const ceilingClash=(a,b)=>!mountedOn(a,b)&&!mountedOn(b,a)&&overlaps(a,b);
export function issues(f,items){const lift=g=>g.type==='hangingCabinet'?{...g,elevation:hangingElevation(g,items)}:g;if(ceilingTypes.includes(f.type)){let messages=items.filter(other=>other.id!==f.id&&ceilingTypes.includes(other.type)&&ceilingClash(f,other)).map(other=>'與'+other.name+'重疊');if(f.type!=='beam'&&wallRects().some(w=>signedDistance(f,w)<-EPS))messages.push('與牆體重疊');if(f.type==='beam'&&!insideShell(f))messages.push('超出戶型邊界');if(f.type==='beam')for(const other of items)if(other.type==='cove'&&beamCoveClash(f,other))messages.push('與'+other.name+'重疊');if(f.type==='light'){if(lightSpan(f,items).yMin<-EPS)messages.push('燈具垂到地面以下');for(const other of items)if(other.id!==f.id&&lightReaches(f,other,items))messages.push('與'+other.name+'重疊');}if(f.type==='hangingCabinet'){if(corners(f).some(([x,z])=>!insideOrOutline(x,z)))messages.push('超出戶型邊界');if(mountDrop(f,items)+f.h>HEIGHT+EPS)messages.push('吊櫃加上方的樑超過天花板高度');for(const other of items)if(other.id!==f.id&&!['rug',...ceilingTypes].includes(other.type)&&sameRoom(f,other)&&furnitureInterference(lift(f),other))messages.push('與'+other.name+'重疊');for(const d of doors)if(blocksDoor(d,lift(f)))messages.push('擋住'+d.name+'開啟範圍');}return messages;}if(f.type==='rug')return[];let messages=[];if(corners(f).some(([x,z])=>!insideOrOutline(x,z)))messages.push('超出戶型邊界');if(f.type!=='television'&&wallRects().some(w=>signedDistance(f,w)<-EPS))messages.push('與牆體重疊');for(const other of items)if(other.id!==f.id&&!['rug','light','beam'].includes(other.type)&&!hostsNicheTv(f,other)&&!hostsNicheTv(other,f)&&!tvOnPanel(f,other)&&sameRoom(f,other)&&furnitureInterference(f,lift(other)))messages.push('與'+other.name+'重疊');for(const other of items)if(other.type==='light'&&lightReaches(other,f,items))messages.push('與'+other.name+'重疊');if(f.type==='cove')for(const other of items)if(other.type==='beam'&&beamCoveClash(other,f))messages.push('與'+other.name+'重疊');for(const d of doors)if(blocksDoor(d,f))messages.push('擋住'+d.name+'開啟範圍');return messages;}
// The TV wall used to be one composite item (back panel, base and upper cabinets, TV, plus
// construction notes). It is now ordinary furniture, so a saved TV wall is split into a
// back panel, a TV cabinet, a hanging cabinet and a TV where they stood; the construction
// notes are dropped. Parts sit in front of the panel, which is on the wall side (local -z).
const round4=n=>Math.round(n*10000)/10000;
export function splitMediaWall(f){
 const m=f.mediaWall||{},a=(f.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),back=-f.d/2,panel=m.panel,t=panel?.thickness||0;
 const at=(lx,lz)=>({x:f.x+lx*c+lz*s,z:f.z-lx*s+lz*c,rot:f.rot||0});
 const out=[];
 if(panel)out.push({id:f.id+'-panel',type:'panel',name:(f.name||'電視牆')+' 背板',...at(panel.x,back+t/2),w:panel.w,d:t,h:panel.h,elevation:panel.y,open:0,...(panel.finish?{finish:panel.finish}:{})});
 // The old editor allowed smaller modules than ordinary furniture (a 15 cm
 // plinth), so a part below its type's minimum grows to it rather than making
 // the whole layout unreadable. An "upper" module that starts under 1 m is a
 // tall cabinet standing on the floor, not one hung from the ceiling: it
 // becomes a storage cabinet whose body keeps its height, raised on an empty
 // bottom to where it stood (at least above the plinth it stood on).
 const module=(v,type,name,id,bottom=0)=>{
  if(!v)return null;
  const [minW,minD,minH]=minimums[type],w=Math.max(v.w,minW),d=Math.max(v.d,minD),body=Math.max(v.h,minH);
  let design=v.cabinetDesign&&(w!==v.w||body!==v.h)?resizeCabinetDesign(v.cabinetDesign,{w:v.w,h:v.h},{w,h:body}):v.cabinetDesign;
  if(design&&bottom>0){design=structuredClone(design);for(const column of design.columns)column.bottom=round4((column.bottom||0)+bottom);}
  const part={id:f.id+id,type,name:(f.name||'電視牆')+' '+name,...at(v.x,back+t+d/2),w,d,h:round4(body+bottom),open:0,cabinetDesign:design,openCells:v.openCells||{},...(f.finish?{finish:f.finish}:{})};
  out.push(part);return part;
 };
 const base=module(m.base,'console','電視櫃','-base');
 const standing=m.upper&&m.upper.y<1;
 module(m.upper,standing?'wardrobe':'hangingCabinet',standing?'高櫃':'吊櫃','-upper',standing?Math.max(m.upper.y,base?base.h:0):0);
 const tv=m.tv;if(tv){const standing=tv.mount==='base'&&m.base;out.push({id:f.id+'-tv',type:'television',name:(f.name||'電視牆')+' 電視',...at(tv.x,standing?back+t+m.base.d/2:back+t+.03),w:tv.w,d:.06,h:tv.h,open:0,elevation:tv.y,tvMount:standing?'cabinet':'wall',...(standing?{supportId:f.id+'-base'}:{})});}
 return out;
}
export function validateFurniture(input){if(!Array.isArray(input))throw Error('家具資料格式不正確');input=input.flatMap(f=>f?.type==='mediaWall'?splitMediaWall(f):[f]);if(input.length>150)throw Error('家具資料格式不正確');let ids=new Set;return input.map(f=>{if(!f||typeof f.id!=='string'||ids.has(f.id)||!minimums[f.type]||typeof f.name!=='string')throw Error('家具種類或編號不正確');ids.add(f.id);const limits=minimumsFor(f),absoluteMin=f.type==='beam'?.05:Math.min(.1,limits[1]);if(f.w<limits[0]||f.d<limits[1]||f.h<limits[2])throw Error('此家具最小寬／深／高為 '+limits.map(n=>Math.round(n*100)).join('／')+' cm');for(const k of['x','z','w','d','h','rot'])if(!Number.isFinite(f[k]))throw Error('尺寸必須為有效數字');if(f.w<absoluteMin||f.d<absoluteMin||f.h<.005||f.w>5||f.d>5||f.h>HEIGHT||Math.abs(f.x)>20||Math.abs(f.z)>20)throw Error('尺寸或位置超出允許範圍');const next={id:f.id,type:f.type,name:f.name.slice(0,60),x:f.x,z:f.z,w:f.w,d:f.d,h:f.h,rot:f.rot,open:f.open?1:0,doorStyle:['left','right','double','multi','drawers','mixed','sliding'].includes(f.doorStyle)?f.doorStyle:'double',draft:!!f.draft,assumed:true};if(finishableTypes.includes(f.type)&&finishByCode(f.finish))next.finish=f.finish;if(f.cabinetDesign&&f.partFinishes&&typeof f.partFinishes==='object'){const given={...f.partFinishes},parts={};given.doors??=given.fronts;given.shelves??=given.interior;given.backs??=given.interior;if(!next.finish&&finishByCode(given.body))next.finish=given.body;for(const [,key]of cabinetFinishSlots)if(finishByCode(given[key]))parts[key]=given[key];if(Object.keys(parts).length)next.partFinishes=parts;}if(fabricTypes.includes(f.type)&&normalizeFabric(f.fabric))next.fabric=normalizeFabric(f.fabric);if(f.type==='sink')next.basin=normalizeSinkBasin(f);if(f.type==='kitchen')next.kitchenParts=normalizeKitchenParts(f);if(f.type==='light')Object.assign(next,normalizeLight(f));if(f.type==='cornerShelf')Object.assign(next,normalizeCornerShelf(f));if(f.type==='cove'){Object.assign(next,normalizeCove(f));next.elevation=round4(HEIGHT-next.coveGap-f.h);if(next.elevation<0)throw Error('燈槽離天花板太遠');}if(f.type==='panel'){const elevation=Number.isFinite(f.elevation)?f.elevation:0;if(elevation<0||elevation+f.h>HEIGHT+EPS)throw Error('背板高度超出空間');next.elevation=elevation;}if(f.type==='television'){if(!Number.isFinite(f.elevation)||f.elevation<0||f.elevation+f.h>HEIGHT)throw Error('電視高度超出空間');next.elevation=f.elevation;next.tvMount=['wall','cabinet','niche'].includes(f.tvMount)?f.tvMount:'wall';if(next.tvMount==='niche'&&(typeof f.supportId!=='string'||typeof f.supportCell!=='string'))next.tvMount='wall';if(next.tvMount!=='wall'&&typeof f.supportId==='string')next.supportId=f.supportId;if(next.tvMount==='niche'||next.tvMount==='cabinet'&&typeof f.supportCell==='string')next.supportCell=f.supportCell;}if(f.type==='hangingCabinet'&&Number.isFinite(f.elevation))next.elevation=Math.max(0,Math.min(HEIGHT-f.h,f.elevation));if(cabinetTypes.includes(f.type)&&(f.cabinetDesign||f.type==='hangingCabinet')){next.cabinetDesign=validateCabinetDesign(f,f.cabinetDesign||makeCabinetDesign(f,'closed'));next.openCells={};for(const cell of designLeaves(next.cabinetDesign))if(cell.front!=='open'&&f.openCells?.[cell.id])next.openCells[cell.id]=1;}return next;});}

// Only the fixtures explicitly corrected from A7 migrate; other furniture edits are retained.
export function migrateLayout(items,revision){
 if(revision>=LAYOUT_REVISION)return items;
 const corrected=new Set(['kitchen','fridge','bathSink1','toilet1','bathSink2','toilet2','showerA','showerB']);
 const result=items.map(item=>revision<3&&corrected.has(item.id)?clone(initialFurniture.find(f=>f.id===item.id)):clone(item));
 if(revision<3)for(const id of ['showerA','showerB'])if(!result.some(f=>f.id===id))result.push(clone(initialFurniture.find(f=>f.id===id)));
 const bed=result.find(f=>f.id==='bedM');if(bed&&Math.abs(bed.x-7.35)<1e-6&&Math.abs(bed.z-1.19)<1e-6&&Math.abs(bed.w-1.52)<1e-6&&Math.abs(bed.d-2)<1e-6)bed.z=1.31;
 const shoe=result.find(f=>f.id==='shoe');if(shoe&&Math.abs(shoe.x-.29)<1e-6&&Math.abs(shoe.z-6.14)<1e-6&&Math.abs(shoe.w-.8)<1e-6&&Math.abs(shoe.d-.42)<1e-6&&shoe.rot===90)shoe.z=6.10;
 const shower=result.find(f=>f.id==='showerA');if(shower&&Math.abs(shower.x-2.24)<1e-6&&Math.abs(shower.w-1.48)<1e-6){shower.x=2.46;shower.w=1.08;}
 if(revision<6)for(const id of ['tv','wardA','wardM','kitchen','fridge']){const item=result.find(f=>f.id===id),fresh=initialFurniture.find(f=>f.id===id);if(item&&fresh)item.doorStyle=fresh.doorStyle;}
 const tv=result.find(f=>f.id==='tv');if(revision<7&&tv&&Math.abs(tv.x-.32)<1e-6&&Math.abs(tv.z-1.3)<1e-6&&Math.abs(tv.w-1.8)<1e-6&&Math.abs(tv.d-.4)<1e-6&&tv.rot===90)tv.z=1.57;
 if(revision<9){const updates={bathSink1:{old:[1.77,5.17,.55,.43,90],next:initialFurniture.find(f=>f.id==='bathSink1')},toilet1:{old:[1.91,5.84,.4,.67,90],next:initialFurniture.find(f=>f.id==='toilet1')},bathSink2:{old:[8.49,3.12,.52,.42,-90],next:initialFurniture.find(f=>f.id==='bathSink2')},toilet2:{old:[7.02,3.87,.4,.67,180],next:initialFurniture.find(f=>f.id==='toilet2')}};for(const [id,{old,next}]of Object.entries(updates)){const item=result.find(f=>f.id===id);if(item&&['x','z','w','d','rot'].every((key,index)=>Math.abs(item[key]-old[index])<1e-6))Object.assign(item,clone(next));}}
 if(revision<10){const updates={kitchen:{old:[5.43,6.87,2,.62,180],next:initialFurniture.find(f=>f.id==='kitchen')},toilet1:{old:[1.795,5.84,.4,.67,90],next:initialFurniture.find(f=>f.id==='toilet1')}};for(const [id,{old,next}]of Object.entries(updates)){const item=result.find(f=>f.id===id);if(item&&['x','z','w','d','rot'].every((key,index)=>Math.abs(item[key]-old[index])<1e-6))Object.assign(item,clone(next));}}
 if(revision<11){const toilet=result.find(f=>f.id==='toilet1'),fresh=initialFurniture.find(f=>f.id==='toilet1');if(toilet&&fresh&&Math.abs(toilet.x-1.795)<1e-6&&Math.abs(toilet.z-6.00)<1e-6&&Math.abs(toilet.w-.4)<1e-6&&Math.abs(toilet.d-.67)<1e-6&&toilet.rot===90)toilet.z=fresh.z;for(const item of result){if(item.type==='kitchen'&&!item.kitchenParts)item.kitchenParts=clone(normalizeKitchenParts(item));if(item.type==='sink'&&!item.basin)item.basin=clone(normalizeSinkBasin(item));}}
 if(revision<12){const chairUpdates={chair1:[1.58,2.91,0],chair2:[2.34,2.91,0],chair3:[1.58,4.19,180],chair4:[2.34,4.19,180]};for(const [id,[x,z,rot]]of Object.entries(chairUpdates)){const item=result.find(f=>f.id===id),fresh=initialFurniture.find(f=>f.id===id);if(item&&fresh&&Math.abs(item.x-x)<1e-6&&Math.abs(item.z-z)<1e-6&&item.rot===rot){item.x=fresh.x;item.z=fresh.z;}}}
 if(revision<14){for(const light of initialFurniture.filter(f=>f.type==='light'))if(!result.some(item=>item.id===light.id))result.push(clone(light));for(const item of result)if(item.type==='light')Object.assign(item,normalizeLight(item));}
 if(revision<14)for(const item of result)if(item.type==='light')item.colorTemperature='white';
 if(revision<15){for(const light of initialFurniture.filter(f=>f.type==='light'))if(!result.some(item=>item.id===light.id))result.push(clone(light));for(const item of result)if(item.type==='light')Object.assign(item,normalizeLight(item));}
 // Beams left at the catalogue template's untouched (0,0) spot by the pre-2026-09-12 placement flow.
 if(revision<16)return result.filter(item=>!(item.type==='beam'&&item.x===0&&item.z===0&&item.w===1.2&&item.d===.18&&item.h===.3&&item.rot===0));
 return result;
}
