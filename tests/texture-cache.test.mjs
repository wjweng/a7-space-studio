import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {texturesAsync,texturePixelsNow,FINISH_SIZE} from '../dist/texture-cache.js';
import {fixedDoorLimit,doorRects} from '../dist/spatial.js';
import {doors,wallRects} from '../dist/model.js';
import {signedDistance,EPS} from '../dist/geometry.js';

test('without workers or IndexedDB, textures are generated on the spot',()=>{
  assert.equal(texturesAsync(),false);
  const finish=texturePixelsNow('finish','P86');
  assert.deepEqual([finish.width,finish.height],FINISH_SIZE);
  assert.equal(finish.pixels.length,FINISH_SIZE[0]*FINISH_SIZE[1]*4);
  const floor=texturePixelsNow('flooring','MB0601');
  assert.equal(floor.pixels.length,floor.width*floor.height*4);
});

test('the texture worker only imports modules that exist',()=>{
  const source=readFileSync('dist/texture-worker.js','utf8');
  for(const [,path]of source.matchAll(/from '\.\/([^']+)'/g))assert.ok(readFileSync('dist/'+path),path);
});

test('the fixed-door swing limit matches a scan against every wall',()=>{
  const full=d=>{const walls=wallRects();let safe=0;for(let degrees=0;degrees<=90;degrees+=.25){if(doorRects(d,1,degrees).some(r=>walls.some(w=>signedDistance(r,w)<-EPS)))break;safe=degrees;}return Math.max(0,safe-1);};
  for(const d of doors.slice(0,3))assert.equal(fixedDoorLimit(d),full(d),d.name||d.id);
});
