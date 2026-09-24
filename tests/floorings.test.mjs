import {test} from 'node:test';
import assert from 'node:assert/strict';
import {floorings,flooringSeries,flooringByCode,flooringPixels,seriesOf,tileSize} from '../dist/floorings.js';
import {finishes,BOARD} from '../dist/finishes.js';
import {SpaceScene} from '../dist/scene.js';

const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lum=([r,g,b])=>.2126*r+.7152*g+.0722*b;

test('the flooring catalogue lists all 55 SPC colours once, apart from the furniture boards',()=>{
 assert.equal(floorings.length,55);
 assert.equal(new Set(floorings.map(f=>f.code)).size,55);
 const counts=Object.fromEntries(flooringSeries.map(s=>[s.id,floorings.filter(f=>f.series===s.id).length]));
 assert.deepEqual(counts,{rumu:31,herringbone:6,wuxian:8,dajiang:10});
 const boards=new Set(finishes.map(f=>f.code));
 for(const f of floorings){
  assert(!boards.has(f.code),f.code+' is not a furniture board');
  assert.equal(f.colors.length,5);
  const tones=f.colors.map(hex).map(lum);
  for(let i=1;i<5;i++)assert(tones[i-1]<=tones[i]+1e-9,f.code+' tones are ordered');
  assert(f.vary>=0&&f.vary<.2,f.code+' plank variation');
 }
});

test('a generated tile reproduces the measured tone distribution',()=>{
 for(const code of ['MB0601','MB0612','MB0607Y','WX0705','DJ0804']){
  const f=flooringByCode(code),{pixels,width,height}=flooringPixels(f,120),l=[];
  for(let k=0;k<width*height;k++)l.push(lum([pixels[k*4],pixels[k*4+1],pixels[k*4+2]]));
  l.sort((a,b)=>a-b);const at=q=>l[Math.floor(q*l.length)],[,p5,p50,p95]=f.colors.map(hex).map(lum);
  // Joints darken a few percent of pixels, so the dark end sits a little lower.
  assert(Math.abs(at(.5)-p50)<4,code+' median '+at(.5).toFixed(1)+' vs '+p50.toFixed(1));
  assert(Math.abs(at(.95)-p95)<4,code+' light end');
  assert(at(.05)<=p5+3&&at(.05)>p5-12,code+' dark end');
 }
});

test('planks are laid at their catalogue size, with visible joints',()=>{
 const f=flooringByCode('MB0601'),[tw,tl]=tileSize(f),s=seriesOf(f);
 assert(Math.abs(tw/s.w-Math.round(tw/s.w))<1e-9&&Math.abs(tl/s.l-Math.round(tl/s.l))<1e-9,'tile holds whole planks');
 const ppm=200,{pixels,width,height}=flooringPixels(f,ppm),col=i=>{let sum=0;for(let j=0;j<height;j++)sum+=lum([pixels[(j*width+i)*4],pixels[(j*width+i)*4+1],pixels[(j*width+i)*4+2]]);return sum/height;};
 // Long joints every 18 cm: the pixel column at each one is darker than its neighbours.
 for(let k=1;k<s.across;k++){const i=Math.round(k*s.w*ppm);assert(Math.min(col(i-1),col(i))<Math.min(col(i-3),col(i+2))-2,'joint at '+k);}
 const h=flooringByCode('MB0603Y'),[hw,hl]=tileSize(h);
 assert(Math.abs(hw-8*.126*Math.SQRT2)<1e-9&&Math.abs(hl-2*.63*Math.SQRT2)<1e-9,'herringbone repeats every whole period');
});

test('a floor material repeats its tile at true size on the board-scaled floor UVs',()=>{
 const s=Object.create(SpaceScene.prototype),m=s.flooringMaterial('WX0701'),[tw,tl]=tileSize(flooringByCode('WX0701'));
 assert(Math.abs(m.map.repeat.x-BOARD.w/tw)<1e-9&&Math.abs(m.map.repeat.y-BOARD.h/tl)<1e-9);
 assert.equal(s.flooringMaterial('WX0701'),m,'cached');
 assert.equal(s.flooringMaterial('P64'),null,'furniture boards are not floors');
});
