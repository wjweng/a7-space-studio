// What A7 (14F, 勝旺家, 新莊頭前) looks out on, in metres in the apartment's frame:
// x east, z south, y up from the unit's floor. Street View (2025-04) gave the kinds of
// building; distances are the owner's estimates. Everything is painted in code.
export const SITE={
  floorHeight:3.2,
  ground:-13*3.2,              // 14F: thirteen storeys below the unit's floor
  northFace:-.06,              // outside faces of the apartment's north and east walls
  eastFace:8.91,
  northGap:18,                 // across 福美街172巷 to the tower opposite
  eastGap:8                    // to the taller neighbour on the east
};
export const northFacade=SITE.northFace-SITE.northGap;
export const eastFacade=SITE.eastFace+SITE.eastGap;
const top=floors=>SITE.ground+floors*SITE.floorHeight;

// Towers are boxes whose facing side carries a painted facade. `style` picks the painter.
export const towers=[
  {id:'north-west',style:'slab-brown',x0:-26,x1:-5,z0:northFacade-16,z1:northFacade,top:top(19),faces:'south'},
  {id:'north-centre',style:'louvre',x0:-5,x1:15,z0:northFacade-16,z1:northFacade,top:top(20),faces:'south',crown:4},
  {id:'north-east',style:'rings',x0:15,x1:34,z0:northFacade-16,z1:northFacade+1.5,top:top(19),faces:'south'},
  {id:'east',style:'slab-light',x0:eastFacade,x1:eastFacade+22,z0:-12,z1:24,top:top(18),faces:'west',slabs:1.1}
];

const PX=.05;                                          // metres per texture pixel
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const hash=(a,b,seed)=>{let h=Math.imul(a,374761393)^Math.imul(b,668265263)^Math.imul(seed,2246822519);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};

function canvas(width,height){
  const w=Math.max(8,Math.min(1536,Math.round(width/PX))),h=Math.max(8,Math.min(1536,Math.round(height/PX)));
  const albedo=new Uint8ClampedArray(w*h*4),glow=new Uint8ClampedArray(w*h*4);
  // Rectangles in metres from the facade's top-left corner; rings blend their edge pixels.
  const fill=(buf,x0,y0,x1,y1,color)=>{const c=typeof color==='string'?hex(color):color;const a=Math.max(0,Math.floor(x0/width*w)),b=Math.min(w,Math.ceil(x1/width*w)),t=Math.max(0,Math.floor(y0/height*h)),u=Math.min(h,Math.ceil(y1/height*h));for(let y=t;y<u;y++)for(let x=a;x<b;x++){const k=(y*w+x)*4;buf[k]=c[0];buf[k+1]=c[1];buf[k+2]=c[2];buf[k+3]=255;}};
  const ring=(cx,cy,r,thick,color)=>{const c=hex(color);for(let y=Math.floor((cy-r)/height*h);y<=Math.ceil((cy+r)/height*h);y++)for(let x=Math.floor((cx-r)/width*w);x<=Math.ceil((cx+r)/width*w);x++){if(x<0||y<0||x>=w||y>=h)continue;const d=Math.hypot((x+.5)/w*width-cx,(y+.5)/h*height-cy),px=width/w,cover=Math.max(0,Math.min(1,(thick/2-Math.abs(d-(r-thick/2)))/px+.5));if(cover>0){const k=(y*w+x)*4;for(let ch=0;ch<3;ch++)albedo[k+ch]+= (c[ch]-albedo[k+ch])*cover;albedo[k+3]=255;}}};
  fill(glow,0,0,width,height,'#000000');
  return {w,h,albedo,glow,fill:(...a)=>fill(albedo,...a),light:(...a)=>fill(glow,...a),ring};
}
// A lit window at night: about a third of homes, warm more often than cool.
function nightWindow(c,x0,y0,x1,y1,a,b,seed){const r=hash(a,b,seed);if(r<.34)c.light(x0,y0,x1,y1,r<.26?'#ffc27a':'#dfe7ff');}

const painters={
  // Brown tower: deep horizontal slab every floor, glazing between.
  'slab-brown'(width,height,seed){const c=canvas(width,height),fh=SITE.floorHeight;c.fill(0,0,width,height,'#5e4d42');
    for(let f=0,y=0;y<height;f++,y+=fh){for(let x=.6,b=0;x<width-.6;x+=3.4,b++){c.fill(x,y+.55,x+2.9,y+fh-.45,'#3c4247');c.fill(x+1.43,y+.55,x+1.5,y+fh-.45,'#2a2622');nightWindow(c,x+.1,y+.65,x+2.8,y+fh-.55,f,b,seed);}c.fill(0,y+fh-.45,width,y+fh,'#7a6656');c.fill(0,y+fh-.45,width,y+fh-.38,'#8d7867');}
    return c;},
  // Dark tower: stone piers, bronze vertical louvres over the glazing, dark balcony bands.
  louvre(width,height,seed){const c=canvas(width,height),fh=SITE.floorHeight;c.fill(0,0,width,height,'#4a4f4d');
    for(let x=0,b=0;x<width;x+=5,b++){c.fill(x,0,x+1.1,height,'#66706c');for(let f=0,y=0;y<height;f++,y+=fh){c.fill(x+1.1,y+.4,x+5,y+fh-.35,'#2f3436');nightWindow(c,x+1.3,y+.5,x+4.8,y+fh-.45,f,b,seed);for(let l=x+1.25;l<x+5;l+=.24)c.fill(l,y+.4,l+.08,y+fh-.35,'#3b3230');c.fill(x+1.1,y+fh-.35,x+5,y+fh,'#262221');}}
    return c;},
  // Grey tower with a column of ring ornaments beside the balconies.
  rings(width,height,seed){const c=canvas(width,height),fh=SITE.floorHeight;c.fill(0,0,width,height,'#5b5f61');
    for(let f=0,y=0;y<height;f++,y+=fh){for(let x=3,b=0;x<width-.5;x+=3.2,b++){c.fill(x,y+.5,x+2.7,y+fh-.5,'#384046');nightWindow(c,x+.1,y+.6,x+2.6,y+fh-.6,f,b,seed);}c.fill(0,y+fh-.5,width,y+fh,'#43464a');}
    c.fill(.4,0,2.4,height,'#3a3c3f');for(let y=1.6;y<height;y+=fh)c.ring(1.4,y,.8,.14,'#c9ccc9');
    return c;},
  // Champagne tower: pale walls, dark glass bays; its deep slabs are real geometry.
  'slab-light'(width,height,seed){const c=canvas(width,height),fh=SITE.floorHeight;c.fill(0,0,width,height,'#cbbca8');
    for(let f=0,y=0;y<height;f++,y+=fh)for(let x=1,b=0;x<width-1;x+=4.2,b++){c.fill(x,y+.5,x+3.4,y+fh-.3,'#3f474e');for(const m of[x+1.13,x+2.26])c.fill(m,y+.5,m+.06,y+fh-.3,'#9c9488');nightWindow(c,x+.1,y+.6,x+3.3,y+fh-.4,f,b,seed);}
    return c;}
};
// Albedo and night-glow pixels for a tower's facade (width x height metres).
export function paintFacade(tower,width,height){
  const seed=[...tower.id].reduce((s,ch)=>Math.imul(s,31)+ch.charCodeAt(0)|0,5);
  const c=painters[tower.style](width,height,seed);
  return {width:c.w,height:c.h,albedo:c.albedo,glow:c.glow};
}

// The lift lobby outside the entrance: A7's door opens onto the east end of a corridor
// that runs west past A6 (north side), A8 (south side) and the lifts (5/7/9/11F plan).
export const corridor={x0:-14,x1:-.51,z0:6.95,z1:9.15,height:2.6,
  doors:[{side:'north',x:-3.6,w:1.05,kind:'unit'},{side:'south',x:-2.4,w:1.05,kind:'unit'},{side:'south',x:-7.2,w:1.1,kind:'lift'},{side:'south',x:-9,w:1.1,kind:'lift'},{side:'north',x:-10.5,w:.9,kind:'stair'}]};
