import {makeCabinetDesign,resizeCabinetDesign} from './cabinet-design.js';
import {mediaWallSchedule,mediaWallSvg,mediaWallWarnings} from './media-wall.js';
import {finishes} from './finishes.js';

const cm=n=>Math.round(n*1000)/10;
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const sourceLabels={estimated:'估算',drawing:'提供圖說',measured:'實測'};
const kindLabels={power:'電源',data:'網路',coax:'同軸'};
const siteLabels={opening:'門窗洞口',beam:'樑',column:'柱',outlet:'既有插座',other:'其他'};
const saveFile=(text,name,type)=>{const url=URL.createObjectURL(new Blob([text],{type})),a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
export function createMediaWallEditor({getItem,commit,onEditModule,showMarkers,wallChoices,setWall}){
  const dialog=node('dialog');
  dialog.className='mediaDialog';
  dialog.innerHTML='<div class="cabinetHead"><div><span class="eyebrow">MEDIA WALL EDITOR</span><h2>電視牆配置</h2></div><button type="button" class="dialogClose" aria-label="關閉">×</button></div><p class="mediaDraft">草案：未經現場核對，不可直接施工</p><div class="mediaPreview"></div><div class="mediaWarnings"></div><div class="mediaActions"></div><div class="mediaSections"></div><p class="cabinetError" role="alert"></p>';
  document.body.append(dialog);
  dialog.querySelector('.dialogClose').onclick=()=>dialog.close();
  let currentId=null;
  const item=()=>getItem(currentId);
  const button=(label,fn)=>{const b=node('button',label);b.type='button';b.onclick=fn;return b;};
  const section=(title)=>{const details=node('details'),summary=node('summary',title);details.append(summary);dialog.querySelector('.mediaSections').append(details);return details;};
  const input=(parent,label,value,onchange,{min=-500,max=500,unit='cm',type='number'}={})=>{
    const wrap=node('label'),title=node('span',label),field=node('input');wrap.className='mediaField';
    field.type=type;if(type==='number'){field.step='0.1';field.min=String(min);field.max=String(max);field.value=value==null?'':String(unit==='cm'?cm(value):value);}else field.value=value||'';
    field.onchange=()=>onchange(type==='number'?(field.value===''?null:Number(field.value)/(unit==='cm'?100:1)):field.value);
    wrap.append(title,field);parent.append(wrap);return field;
  };
  const select=(parent,label,value,values,onchange)=>{
    const wrap=node('label'),title=node('span',label),field=node('select');wrap.className='mediaField';
    for(const [key,text]of Object.entries(values))field.add(new Option(text,key));
    field.value=value;field.onchange=()=>onchange(field.value);wrap.append(title,field);parent.append(wrap);return field;
  };
  const update=change=>{
    const f=item();if(!f)return;
    const media=structuredClone(f.mediaWall);
    change(media);
    const okay=commit(f,{...f,mediaWall:media});
    dialog.querySelector('.cabinetError').textContent=okay===false?commit.lastError||'設定無法套用':'';
    render();
  };
  const rectInputs=(parent,part,label)=>{
    const f=item(),data=f.mediaWall[part];
    if(!data){parent.append(button('加入'+label,()=>update(m=>{
      const isBase=part==='base',width=isBase?Math.min(f.w-.1,1.8):Math.min(.5,f.w*.3),height=isBase?.48:.65;
      const entry={id:crypto.randomUUID(),x:0,y:isBase?0:Math.min(1.6,f.h-height),w:width,h:height,d:isBase?Math.min(f.d,.42):.3,openCells:{},source:'estimated'};
      entry.cabinetDesign=makeCabinetDesign(entry,isBase?'low':'closed');m[part]=entry;
    })));return;}
    for(const [key,name]of[['x','中心水平位置'],['y','底部離地'],['w','寬'],['h','高']])input(parent,label+'・'+name,data[key],v=>update(m=>{
      const target=m[part],old={w:target.w,h:target.h};
      target[key]=v;
      if(target.cabinetDesign&&['w','h'].includes(key))target.cabinetDesign=resizeCabinetDesign(target.cabinetDesign,old,target);
      if(part==='base'&&m.tv.mount==='base'&&['y','h'].includes(key))m.tv.y=target.y+target.h;
    }));
    select(parent,label+'・尺寸來源',data.source||'estimated',sourceLabels,v=>update(m=>m[part].source=v));
    if(part==='panel'){
      input(parent,'背板厚度',data.thickness,v=>update(m=>m.panel.thickness=v),{min:.8,max:15});
      const options={'':'沿用電視牆木作材質'};
      for(const finish of finishes)options[finish.code]=finish.code+' '+finish.name;
      select(parent,'背板材質',data.finish||'',options,v=>update(m=>m.panel.finish=v));
    }
    else{
      input(parent,label+'・深',data.d,v=>update(m=>m[part].d=v),{min:20,max:100});
      parent.append(button('編輯'+label+'分格',()=>onEditModule(f,part)));
      parent.append(button('移除'+label,()=>update(m=>{m[part]=null;if(part==='base'&&m.tv.mount==='base')m.tv.mount='wall';})));
    }
  };
  function render(){
    const f=item();if(!f?.mediaWall){dialog.close();return;}
    const m=f.mediaWall;
    dialog.querySelector('.mediaPreview').innerHTML=mediaWallSvg(f);
    const warningHost=dialog.querySelector('.mediaWarnings');warningHost.replaceChildren();
    const warnings=mediaWallWarnings(f);
    if(warnings.length){const title=node('strong','待核對：'),list=node('ul');for(const warning of warnings)list.append(node('li',warning));warningHost.append(title,list);}
    const actions=dialog.querySelector('.mediaActions');actions.replaceChildren();
    actions.append(button('匯出 SVG 與明細草案',()=>{
      saveFile(mediaWallSvg(item()),'A7-電視牆-施工協調草案.svg','image/svg+xml');
      saveFile(mediaWallSchedule(item()),'A7-電視牆-插座管線明細草案.txt','text/plain;charset=utf-8');
    }));
    const markers=node('label'),check=node('input');check.type='checkbox';check.checked=!!showMarkers();check.onchange=()=>showMarkers(check.checked);markers.append(check,node('span','3D 顯示插座與管線標記'));actions.append(markers);
    const host=dialog.querySelector('.mediaSections'),openSections=[...host.children].map((entry,index)=>entry.open?index:-1).filter(index=>index>=0);host.replaceChildren();
    const wall=section('固定牆面');
    const choices=wallChoices(f),options={'':'尚未指定牆面'};
    for(const choice of choices)options[`${choice.index}:${choice.side}`]=choice.label;
    const selected=f.wallAnchor?`${f.wallAnchor.index}:${f.wallAnchor.side}`:'';
    select(wall,'牆段',selected,options,value=>{setWall(f,value);render();});
    wall.append(node('p',f.wallAnchor?'電視牆已貼附選定牆段，可在俯視圖沿牆移動。':'請先選擇沒有門窗的完整牆段；未指定時只是自由擺放草案。'));
    const panel=section('背板');rectInputs(panel,'panel','背板');
    const base=section('下櫃');rectInputs(base,'base','下櫃');
    const upper=section('壁掛櫃');rectInputs(upper,'upper','壁掛櫃');
    const tv=section('電視');
    select(tv,'安裝方式',m.tv.mount,{wall:'壁掛',base:'放在下櫃'},v=>update(media=>{
      media.tv.mount=v;
      if(v==='base'&&media.base){media.tv.y=media.base.y+media.base.h;media.tv.x=media.base.x;media.tv.w=Math.min(media.tv.w,media.base.w);}
    }));
    for(const [key,label]of[['x','中心水平位置'],['y','底部離地'],['w','寬'],['h','高']])input(tv,label,m.tv[key],v=>update(media=>media.tv[key]=v));
    select(tv,'電視位置來源',m.tv.source||'estimated',sourceLabels,v=>update(media=>media.tv.source=v));
    const survey=section('牆面現場資料與來源');
    input(survey,'實測牆寬',m.survey.wallWidth,v=>update(media=>media.survey.wallWidth=v),{min:10,max:2000});
    input(survey,'實測牆高',m.survey.wallHeight,v=>update(media=>media.survey.wallHeight=v),{min:10,max:1000});
    input(survey,'實測牆厚',m.survey.wallThickness,v=>update(media=>media.survey.wallThickness=v),{min:3,max:100});
    input(survey,'牆體構造',m.survey.wallType,v=>update(media=>media.survey.wallType=v),{type:'text'});
    input(survey,'電視型號與安裝需求',m.survey.tvModel,v=>update(media=>media.survey.tvModel=v),{type:'text'});
    input(survey,'壁掛架／五金規格',m.survey.mountModel,v=>update(media=>media.survey.mountModel=v),{type:'text'});
    input(survey,'既有配電與迴路資料',m.survey.circuitNotes,v=>update(media=>media.survey.circuitNotes=v),{type:'text'});
    select(survey,'資料來源',m.survey.source,sourceLabels,v=>update(media=>media.survey.source=v));
    input(survey,'現場備註',m.survey.notes,v=>update(media=>media.survey.notes=v),{type:'text'});
    const facts=section(`現場既有項目（${m.siteFacts?.length||0}）`);
    facts.append(button('＋記錄門窗／樑柱／既有插座',()=>update(media=>{media.siteFacts??=[];media.siteFacts.push({id:crypto.randomUUID(),kind:'opening',description:'',x:0,y:0,w:.5,h:.5,source:'estimated'});}))) ;
    for(const [index,fact]of (m.siteFacts||[]).entries()){
      const row=node('div');row.className='mediaEntry';row.append(node('strong',`現場項目 ${index+1}`));
      const set=(key,v)=>update(media=>media.siteFacts[index][key]=v);
      select(row,'種類',fact.kind,siteLabels,v=>set('kind',v));
      input(row,'描述與來源識別',fact.description,v=>set('description',v),{type:'text'});
      for(const [key,label]of [['x','中心水平'],['y','底部離地'],['w','寬'],['h','高']])input(row,label,fact[key],v=>set(key,v));
      select(row,'資料來源',fact.source,sourceLabels,v=>set('source',v));
      row.append(button('移除',()=>update(media=>media.siteFacts.splice(index,1))));facts.append(row);
    }
    const outlets=section(`插座（${m.outlets.length}）`);
    outlets.append(button('＋插座',()=>update(media=>media.outlets.push({id:crypto.randomUUID(),x:0,y:.45,kind:'power',circuit:'',spec:'',source:'estimated'}))));
    for(const [index,outlet]of m.outlets.entries()){
      const row=node('div');row.className='mediaEntry';row.append(node('strong',`插座 ${index+1}`));
      const set=(key,v)=>update(media=>media.outlets[index][key]=v);
      select(row,'種類',outlet.kind,kindLabels,v=>set('kind',v));
      input(row,'水平位置',outlet.x,v=>set('x',v));
      input(row,'中心離地',outlet.y,v=>set('y',v));
      input(row,'迴路編號',outlet.circuit,v=>set('circuit',v),{type:'text'});
      input(row,'面板／設備規格',outlet.spec,v=>set('spec',v),{type:'text'});
      select(row,'資料來源',outlet.source,sourceLabels,v=>set('source',v));
      row.append(button('移除',()=>update(media=>media.outlets.splice(index,1))));outlets.append(row);
    }
    const conduits=section(`管線（${m.conduits.length}）`);
    conduits.append(button('＋管線',()=>update(media=>media.conduits.push({id:crypto.randomUUID(),kind:'power',pipe:'',wire:'',circuit:'',source:'estimated',points:[{x:0,y:.45},{x:0,y:1.15}]}))));
    for(const [index,line]of m.conduits.entries()){
      const row=node('div');row.className='mediaEntry';row.append(node('strong',`管線 ${index+1}`));
      const set=(key,v)=>update(media=>media.conduits[index][key]=v);
      select(row,'種類',line.kind,kindLabels,v=>set('kind',v));
      input(row,'管材／尺寸',line.pipe,v=>set('pipe',v),{type:'text'});
      input(row,'線材規格',line.wire,v=>set('wire',v),{type:'text'});
      input(row,'迴路編號',line.circuit,v=>set('circuit',v),{type:'text'});
      select(row,'資料來源',line.source,sourceLabels,v=>set('source',v));
      line.points.forEach((point,pointIndex)=>{
        const pointRow=node('div');pointRow.className='mediaPoint';pointRow.append(node('span',`路徑點 ${pointIndex+1}`));
        input(pointRow,'水平',point.x,v=>update(media=>media.conduits[index].points[pointIndex].x=v));
        input(pointRow,'離地',point.y,v=>update(media=>media.conduits[index].points[pointIndex].y=v));
        if(pointIndex>0&&pointIndex<line.points.length-1)pointRow.append(button('移除此點',()=>update(media=>media.conduits[index].points.splice(pointIndex,1))));
        row.append(pointRow);
      });
      row.append(button('＋轉折點',()=>update(media=>{
        const points=media.conduits[index].points,a=points.at(-2),b=points.at(-1);
        if(points.length<12)points.splice(points.length-1,0,{x:(a.x+b.x)/2,y:(a.y+b.y)/2});
      })),button('移除管線',()=>update(media=>media.conduits.splice(index,1))));
      conduits.append(row);
    }
    const service=section(`出線孔與檢修口（${m.servicePoints?.length||0}）`);
    service.append(button('＋出線孔／檢修口',()=>update(media=>{media.servicePoints??=[];media.servicePoints.push({id:crypto.randomUUID(),kind:'exit',x:0,y:.6,w:.08,h:.08,note:'',source:'estimated'});}))) ;
    for(const [index,point]of (m.servicePoints||[]).entries()){
      const row=node('div');row.className='mediaEntry';row.append(node('strong',`檢修點 ${index+1}`));
      const set=(key,v)=>update(media=>media.servicePoints[index][key]=v);
      select(row,'形式',point.kind,{exit:'出線孔',access:'檢修口'},v=>set('kind',v));
      for(const [key,label]of [['x','中心水平'],['y','底部離地'],['w','寬'],['h','高']])input(row,label,point[key],v=>set(key,v));
      input(row,'用途／檢修需求',point.note,v=>set('note',v),{type:'text'});
      select(row,'資料來源',point.source,sourceLabels,v=>set('source',v));
      row.append(button('移除',()=>update(media=>media.servicePoints.splice(index,1))));service.append(row);
    }
    for(const index of openSections)if(host.children[index])host.children[index].open=true;
  }
  return{open(f){currentId=f.id;render();dialog.showModal();},refresh(){if(dialog.open)render();}};
}
