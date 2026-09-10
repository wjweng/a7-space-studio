import {corners,overlaps,signedDistance,sameRoom,EPS} from './geometry.js';
export {corners,overlaps} from './geometry.js';
export const VERSION=1;
export const LAYOUT_REVISION=6;
export const columns=[[.02,.1],[.05,6.7]].map(([x,z])=>({x,z,w:.32,d:.35,rot:0}));
// Hatched solid areas in A7: bath-A stepped wall and balcony corner blocks.
export const structuralBlocks=[
 {id:'bath-A-block',x:1.64,z:6.55,w:.48,d:.70,rot:0},
 {id:'bath-A-step',x:1.82,z:7.075,w:.12,d:.35,rot:0},
 {id:'balcony-north-block',x:7.975,z:4.625,w:.65,d:.45,rot:0},
 {id:'balcony-south-block',x:8.15,z:6.825,w:.30,d:.85,rot:0}
];
export const HEIGHT=2.79;
// Metres. A7 raster tracing calibrated against 2.24 / 2.62 / 2.61 m room dimensions.
// Unclosed drawing chains are approximations, not survey coordinates.
export const outline=[[0,0],[8.3,0],[8.3,2.7],[8.85,2.7],[8.85,4.4],[8.3,4.4],[8.3,7.25],[1.85,7.25],[1.85,8.5],[-.45,8.5],[-.45,6.65],[0,6.65]];
export const rooms=[{name:'客餐廳',x:1.3,z:3.15},{name:'臥室 A',x:3.98,z:1.35},{name:'主臥室',x:6.8,z:1.3},{name:'臥室 B',x:5.25,z:4.75},{name:'廚房',x:4.9,z:6.45},{name:'衛浴 A',x:2.25,z:5.8},{name:'衛浴 B',x:7.75,z:3.55},{name:'工作陽台',x:7.45,z:5.85},{name:'玄關',x:.75,z:7.7}];
// Wall endpoints, optional opening: distance from first endpoint, width, sill, height.
export const walls=[
 {id:'window-living',a:[0,0],b:[2.82,0],opening:[.42,1.88,.9,1.5]},
 {id:'window-A',a:[2.82,0],b:[5.18,0],opening:[.55,1.64,.9,1.5]},
 {id:'window-master',a:[5.18,0],b:[8.3,0],opening:[1.27,1.63,.9,1.5]},
 {a:[0,0],b:[0,6.65]}, {a:[8.3,0],b:[8.3,2.7]},
 {a:[8.3,2.7],b:[8.85,2.7]},{id:'window-bathB',a:[8.85,2.7],b:[8.85,4.4],opening:[.85,.72,1.5,.7]},
 {a:[8.85,4.4],b:[8.3,4.4]},{id:'balcony-railing',a:[8.3,4.4],b:[8.3,7.25],opening:[.67,1.34,.1,2.69],openingType:'railing'},
 {a:[8.3,7.25],b:[1.85,7.25]}, {a:[1.85,7.25],b:[1.85,8.5]},
 {a:[1.85,8.5],b:[-.45,8.5]}, {a:[-.45,8.5],b:[-.45,6.65],opening:[.62,.95,0,2.1]},
 {a:[-.45,6.65],b:[0,6.65]},
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
 {a:[3.08,4.75],b:[3.08,7.25],opening:[.2,.74,0,2.1]},
 {a:[1.4,7.25],b:[3.08,7.25]}
];
export const doors=walls.filter(w=>w.opening&&w.opening[2]===0).map((w,i)=>{let [s,width]=w.opening,dx=w.b[0]-w.a[0],dz=w.b[1]-w.a[1],len=Math.hypot(dx,dz);return{id:'door-'+i,swing:[-1,1,1,1,1,1,-1][i],name:['臥室 A 房門','主臥通道門','臥室 B 房門','衛浴 B 房門','陽台門','衛浴 A 房門'][i-1]||'玄關大門',x:w.a[0]+dx/len*s,z:w.a[1]+dz/len*s,angle:-Math.atan2(dz,dx),width,height:2.1};});
const f=(id,type,name,x,z,w,d,h,rot=0,doorStyle)=>({id,type,name,x,z,w,d,h,rot,open:0,...(doorStyle?{doorStyle}:{}),assumed:true});
export const initialFurniture=[
 f('sofa','sofa','三人沙發',2.03,1.23,2.05,.87,.84,-90),
 f('tv','console','電視矮櫃',.32,1.3,1.8,.4,.48,90,'drawers'),
 f('coffee','table','橢圓茶几',1.07,1.25,.55,1.04,.4),
 f('rug','rug','客廳地毯',1.34,1.32,1.8,2.5,.012),
 f('dining','table','餐桌',1.96,3.55,1.2,.75,.75),
 f('chair1','chair','餐椅 01',1.58,2.91,.44,.48,.8),
 f('chair2','chair','餐椅 02',2.34,2.91,.44,.48,.8),
 f('chair3','chair','餐椅 03',1.58,4.19,.44,.48,.8,180),
 f('chair4','chair','餐椅 04',2.34,4.19,.44,.48,.8,180),
 f('bedA','bed','臥室 A 單人床',4.56,1.35,.98,1.98,.6),
 f('wardA','wardrobe','臥室 A 衣櫃',3.24,.53,.67,.6,2.35,0,'sliding'),
 f('deskA','desk','臥室 A 書桌',3.28,1.53,.72,.48,.75,90),
 f('bedM','bed','主臥雙人床',7.35,1.31,1.52,2,.62),
 f('wardM','wardrobe','主臥衣櫃',5.58,1.27,1.85,.6,2.35,90,'sliding'),
 f('night','drawer','床頭櫃',6.32,.47,.35,.4,.53),
 f('bedB','bed','臥室 B 單人床',5.92,4.75,.95,1.9,.58),
 f('deskB','desk','臥室 B 書桌',4.47,5.37,1.0,.55,.75,180),
 f('wardB','wardrobe','臥室 B 衣櫃',4.77,4.08,.9,.55,2.2),
 f('shoe','wardrobe','玄關收納櫃',.29,6.10,.8,.42,2.3,90),
 f('kitchen','kitchen','廚具：左水槽・右爐台',5.43,6.87,2.0,.62,.9,180,'mixed'),
 f('fridge','fridge','冰箱（原圖左側設備位）',4.13,6.86,.55,.63,1.78,180,'right'),
 f('wash','washer','洗衣機',7.03,4.83,.61,.62,.87),
 f('bathSink1','sink','衛浴 A 洗手台',1.77,5.17,.55,.43,.83,90),
 f('toilet1','toilet','衛浴 A 馬桶',1.91,5.84,.4,.67,.75,90),
 f('showerA','shower','衛浴 A 乾濕分離淋浴區',2.46,6.70,1.08,.96,2.1),
 f('bathSink2','sink','衛浴 B 洗手台',8.49,3.12,.52,.42,.83,-90),
 f('toilet2','toilet','衛浴 B 馬桶',7.02,3.87,.4,.67,.75,180),
 f('showerB','shower','衛浴 B 轉角淋浴區',8.08,3.96,1.36,.76,2.1),
 f('plant','plant','落地植栽',.36,4.35,.43,.43,1.2)
];
export const palettes={oak:{name:'日光・淺橡木',wood:'#c2a17b',wall:'#f1ece3',fabric:'#d8d0c1',accent:'#536665',floor:'#bb9470'},walnut:{name:'暖暮・胡桃木',wood:'#72503c',wall:'#e7dfd3',fabric:'#b5a087',accent:'#885849',floor:'#957252'},mist:{name:'霧白・現代',wood:'#b7b1a4',wall:'#e9eded',fabric:'#9ba8ac',accent:'#3d535f',floor:'#b1ada3'}};
export const clone=v=>JSON.parse(JSON.stringify(v));
export const minimums={sofa:[1.1,.5,.45],bed:[.65,1.2,.25],chair:[.3,.3,.55],wardrobe:[.2,.2,.3],drawer:[.2,.2,.2],console:[.5,.2,.2],table:[.3,.25,.2],desk:[.4,.35,.4],kitchen:[1.2,.4,.7],fridge:[.4,.4,.9],washer:[.4,.4,.6],sink:[.3,.3,.5],toilet:[.3,.4,.5],plant:[.2,.2,.3],shower:[.6,.6,1.8],rug:[.2,.2,.005]};
export function inside(x,z){let c=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){let a=outline[i],b=outline[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
export function wallRects(){return walls.flatMap(w=>{let dx=w.b[0]-w.a[0],dz=w.b[1]-w.a[1],len=Math.hypot(dx,dz),ranges=w.opening&&w.opening[2]===0?[[0,w.opening[0]],[w.opening[0]+w.opening[1],len]]:[[0,len]];return ranges.filter(([a,b])=>b-a>.01).map(([a,b])=>({x:w.a[0]+dx/len*(a+b)/2,z:w.a[1]+dz/len*(a+b)/2,w:b-a,d:.12,rot:-Math.atan2(dz,dx)*180/Math.PI}));}).concat(columns,structuralBlocks);}
export function issues(f,items){if(f.type==='rug')return[];let messages=[];if(corners(f).some(([x,z])=>!inside(x,z)))messages.push('超出戶型邊界');if(wallRects().some(w=>signedDistance(f,w)<-EPS))messages.push('與牆體重疊');for(const other of items)if(other.id!==f.id&&other.type!=='rug'&&sameRoom(f,other)&&signedDistance(f,other)<-EPS)messages.push('與'+other.name+'重疊');return messages;}
export function validateFurniture(input){if(!Array.isArray(input)||input.length>150)throw Error('家具資料格式不正確');let ids=new Set;return input.map(f=>{if(!f||typeof f.id!=='string'||ids.has(f.id)||!initialFurniture.some(a=>a.type===f.type)||typeof f.name!=='string')throw Error('家具種類或編號不正確');ids.add(f.id);const limits=minimums[f.type];if(f.w<limits[0]||f.d<limits[1]||f.h<limits[2])throw Error('此家具最小寬／深／高為 '+limits.map(n=>Math.round(n*100)).join('／')+' cm');for(const k of['x','z','w','d','h','rot'])if(!Number.isFinite(f[k]))throw Error('尺寸必須為有效數字');if(f.w<.1||f.d<.1||f.h<.005||f.w>5||f.d>5||f.h>HEIGHT||Math.abs(f.x)>20||Math.abs(f.z)>20)throw Error('尺寸或位置超出允許範圍');return{id:f.id,type:f.type,name:f.name.slice(0,60),x:f.x,z:f.z,w:f.w,d:f.d,h:f.h,rot:f.rot,open:f.open?1:0,doorStyle:['left','right','double','multi','drawers','mixed','sliding'].includes(f.doorStyle)?f.doorStyle:'double',draft:!!f.draft,assumed:true};});}

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
 return result;
}
