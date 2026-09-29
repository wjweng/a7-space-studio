import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planSvg,planPage,chainPoints,cm,itemSize,SHEET,MM} from '../dist/plan-drawing.js';
import {initialFurniture,validateFurniture,HEIGHT} from '../dist/model.js';

const items=validateFurniture(structuredClone(initialFurniture));

test('the sheet is A3 landscape in millimetres at 1:50',()=>{
  const svg=planSvg(items,{date:'2026-09-29'});
  assert.match(svg,/width="420mm" height="297mm" viewBox="0 0 420 297"/);
  assert.equal(SHEET.w,420);assert.equal(MM,20,'one metre is 20 mm on paper');
  assert.match(svg,/A3　1\/50/);assert.match(svg,/2026-09-29/);assert.match(svg,/weijie/);
});
test('every item is either labelled on the plan or numbered in the schedule',()=>{
  const svg=planSvg(items);
  for(const f of items.filter(f=>f.type!=='outlet'&&f.type!=='light'&&f.w*f.d>.02))assert(svg.includes(`>${f.name}<`)||svg.includes(`>${f.name}　`),f.name);
});
test('outer dimension chains run along the shell and add up to the overall size',()=>{
  const top=chainPoints('top');assert.deepEqual([top[0],top.at(-1)],[0,8.4]);assert(top.includes(2.82)&&top.includes(5.18),'partitions meeting the north wall');assert(top.includes(.42)&&top.includes(2.3),'the living-room window edges');
  const bottom=chainPoints('bottom');assert.deepEqual([bottom[0],bottom.at(-1)],[-.45,8.1]);
  assert(!chainPoints('right').includes(8.53),'walls set far back from an edge stay off that edge\'s chain');
});
test('sizes read in centimetres, with height, hanging height and beam depth',()=>{
  assert.equal(cm(2.05),'205');assert.equal(cm(.491),'49.1');
  assert.equal(itemSize({type:'wardrobe',w:1,d:.6,h:2.4}),'100×60×H240');
  assert.equal(itemSize({type:'hangingCabinet',w:1.2,d:.35,h:.6,elevation:1.9}),'120×35×H60（離地 190）');
  assert.equal(itemSize({type:'beam',w:2,d:.4,h:.5}),`200×40 深 50（下緣離地 ${cm(HEIGHT-.5)}）`);
});
test('names are escaped, and the page prints the sheet on A3 landscape',()=>{
  const svg=planSvg([{...items[0],name:'<櫃&子>'}]);assert(svg.includes('&lt;櫃&amp;子&gt;'));assert(!svg.includes('<櫃&子>'));
  const page=planPage(svg);assert.match(page,/@page\{size:A3 landscape;margin:0\}/);assert(page.includes('下載 SVG'));
});
test('lights keep their symbol and are listed by number in the schedule',()=>{
  const svg=planSvg(items),lights=items.filter(f=>f.type==='light');assert(lights.length>0);
  for(const f of lights)assert(svg.includes(`>${f.name}　`),f.name);
  assert(svg.includes('燈具與圖上放不下名稱者'));
});
test('the owner\'s title-block fields take typed values and are marked for the page to retype',()=>{
  const svg=planSvg(items,{project:'我的新家',title:'客廳配置',date:'2026-10-01',author:'王小明'});
  for(const [field,value] of [['project','我的新家'],['title','客廳配置'],['date','2026-10-01'],['author','王小明']])assert.match(svg,new RegExp(`data-field="${field}">${value}<`));
  assert.match(planSvg(items),/data-field="project">A7 空間配置</);
});
