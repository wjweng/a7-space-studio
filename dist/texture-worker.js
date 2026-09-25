// Generates finish and flooring textures off the main thread; see
// texture-cache.js. The pixel buffer is transferred, not copied.
import {finishByCode,finishPixels} from './finishes.js';
import {flooringByCode,flooringPixels} from './floorings.js';
import {FINISH_SIZE} from './texture-cache.js';

onmessage=({data:{id,kind,code}})=>{
  const out=kind==='finish'?{pixels:finishPixels(finishByCode(code),...FINISH_SIZE),width:FINISH_SIZE[0],height:FINISH_SIZE[1]}:flooringPixels(flooringByCode(code));
  postMessage({id,pixels:out.pixels,width:out.width,height:out.height},[out.pixels.buffer]);
};
