import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateFurniture,issues,HEIGHT} from '../dist/model.js';
import {makeCabinetDesign} from '../dist/cabinet-design.js';

// A TV wall as the old composite editor saved it (construction notes included).
const oldWall=rot=>{const base={id:'b',x:0,y:0,w:1.8,h:.48,d:.42,openCells:{}},upper={id:'u',x:.77,y:1.65,w:.55,h:.72,d:.3,openCells:{}};
 base.cabinetDesign=makeCabinetDesign(base,'low');upper.cabinetDesign=makeCabinetDesign(upper,'closed');
 return{id:'mw',type:'mediaWall',name:'電視牆',x:4,z:3,w:2.4,d:.45,h:2.6,rot,open:0,finish:'P87',wallAnchor:{index:3,offset:1,side:1},
  mediaWall:{panel:{x:0,y:.4,w:2.2,h:1.65,thickness:.03,finish:''},base,upper,tv:{x:0,y:1.42,w:1.22,h:.69,mount:'wall'},
   outlets:[{id:'o',x:0,y:.3,kind:'power'}],conduits:[],servicePoints:[],siteFacts:[],survey:{}}};};

test('a saved TV wall loads as a back panel, TV cabinet, hanging cabinet and wall TV',()=>{
 for(const rot of[0,90,-90,180]){
  const parts=validateFurniture([oldWall(rot)]);
  assert.deepEqual(parts.map(f=>f.type),['panel','console','hangingCabinet','television']);
  const [panel,base,upper,tv]=parts;
  assert.equal(panel.elevation,.4);assert.equal(panel.d,.03);assert.equal(tv.elevation,1.42);assert.equal(tv.tvMount,'wall');
  assert(base.cabinetDesign&&upper.cabinetDesign);assert.equal(base.finish,'P87');
  for(const f of parts)assert.equal(f.rot,rot);
  for(const f of parts)assert(!('mediaWall' in f)&&!('wallAnchor' in f),'construction data is dropped');
  // Everything stands in front of the panel along the wall normal (local +z).
  const a=rot*Math.PI/180,depth=f=>(f.x-4)*Math.sin(a)+(f.z-3)*Math.cos(a);
  assert(Math.abs(depth(panel)-(-.225+.015))<1e-9);
  assert(Math.abs(depth(base)-(-.225+.03+.21))<1e-9);
  for(const f of parts){const clash=issues(f,parts).filter(m=>parts.some(o=>m==='與'+o.name+'重疊'));assert.deepEqual(clash,[],`${f.name} at ${rot}°`);}
 }
});

test('back panels sit at their elevation for clashes and a wall TV may hang on one',()=>{
 const panel={id:'p',type:'panel',name:'背板',x:4,z:3,w:2,d:.03,h:1.6,rot:0,elevation:.8};
 const low={id:'c',type:'console',name:'矮櫃',x:4,z:3,w:1.8,d:.4,h:.5,rot:0};
 assert.deepEqual(issues(low,[low,panel]).filter(m=>m.includes('背板')),[],'a low cabinet fits under a raised panel');
 const tall={...low,h:1.2};
 assert(issues(tall,[tall,panel]).includes('與背板重疊'));
 const tv={id:'t',type:'television',name:'電視',x:4,z:3,w:1.2,d:.06,h:.7,rot:0,elevation:1.2,tvMount:'wall'};
 assert(!issues(tv,[tv,panel]).includes('與背板重疊'));
 assert.throws(()=>validateFurniture([{...panel,elevation:HEIGHT-1}]),/背板高度超出空間/);
 assert.equal(validateFurniture([{...panel,elevation:undefined}])[0].elevation,0);
});
