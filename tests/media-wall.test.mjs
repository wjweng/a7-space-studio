import test from 'node:test';
import assert from 'node:assert/strict';
import {makeMediaWall,validateMediaWall,resizeMediaWall,mediaWallSvg,mediaWallSchedule} from '../dist/media-wall.js';
import {anchorMediaWall,mediaWallChoices} from '../dist/wall-anchor.js';
import {walls,insideShell,validateFurniture,initialFurniture} from '../dist/model.js';
import {roomAt} from '../dist/geometry.js';

const item=()=>({id:'media',type:'mediaWall',name:'電視牆',x:1.4,z:3,w:2.4,d:.45,h:2.6,rot:0,open:0});

test('media wall retains panel, cabinets, TV and draft utility schedule',()=>{
  const f=item();
  f.mediaWall=makeMediaWall(f);
  f.mediaWall.outlets.push({id:'outlet',x:.2,y:.5,kind:'power',circuit:'',spec:'',source:'estimated'});
  f.mediaWall.conduits.push({id:'line',points:[{x:.2,y:.5},{x:.2,y:1.3}],kind:'power',pipe:'',wire:'',circuit:'',source:'estimated'});
  const saved=validateFurniture([f])[0];
  assert.equal(saved.mediaWall.outlets.length,1);
  assert.equal(saved.mediaWall.base.cabinetDesign.columns.length,2);
  assert.match(mediaWallSvg(saved),/未經現場核對，不可直接施工/);
  assert.match(mediaWallSchedule(saved),/未提供/);
  assert.throws(()=>validateMediaWall(f,{...f.mediaWall,survey:{...f.mediaWall.survey,wallWidth:2}}),/實測牆面/);
  const resized={...saved,w:2.8,h:2.8};
  resized.mediaWall=resizeMediaWall(saved.mediaWall,saved,resized);
  assert.equal(validateMediaWall(resized,resized.mediaWall).base.cabinetDesign.columns.length,2);
});

test('media wall anchor selects a complete wall and rejects openings',()=>{
  const f=item();
  f.mediaWall=makeMediaWall(f);
  const options=mediaWallChoices(f,walls,insideShell,roomAt);
  assert.ok(options.length>0);
  const anchored=anchorMediaWall(f,options[0],walls);
  assert.equal(validateFurniture([anchored])[0].wallAnchor.index,options[0].index);
  assert.throws(()=>anchorMediaWall(f,{index:0,side:1},walls),/門窗/);
});

test('standalone television validates elevation while old consoles keep legacy data',()=>{
  const tv={id:'screen',type:'television',name:'電視',x:1,z:1,w:1,d:.06,h:.6,rot:0,elevation:1.2,tvMount:'wall'};
  assert.equal(validateFurniture([tv])[0].elevation,1.2);
  assert.throws(()=>validateFurniture([{...tv,elevation:2.8}]),/電視高度/);
  const legacy=validateFurniture([initialFurniture.find(f=>f.id==='tv')])[0];
  assert.equal(legacy.cabinetDesign,undefined);
});
