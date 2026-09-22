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

// The lift lobby (梯廳) from the 5/7/9/11F plan, scaled by A7's width: an east-west corridor
// with A7 (north half) and A8 (south half) at its east end and A3 / A2 at its west end.
// Seen from A7's door: A6 then A5 on the right (north); on the left (south) the A2 stair,
// the smoke lobby (排煙室, fire doors held open; its lifts face west inside, out of sight),
// the A1 stair, then A1. x is along the corridor, z across it.
export const corridor={x0:-19.1,x1:-.51,z0:7.26,z1:9.92,height:2.6,
  doors:[
    {wall:'north',at:-2.78,w:1,kind:'unit',label:'A6'},
    {wall:'north',at:-16.9,w:1,kind:'unit',label:'A5'},
    {wall:'south',at:-3.05,w:.95,kind:'stair',label:'A2 梯'},
    {wall:'south',at:-8.97,w:.95,kind:'stair',label:'A1 梯'},
    {wall:'south',at:-17,w:1,kind:'unit',label:'A1'},
    {wall:'west',at:8.01,w:1,kind:'unit',label:'A3'},
    {wall:'west',at:9.19,w:1,kind:'unit',label:'A2'},
    {wall:'east',at:9.19,w:1,kind:'unit',label:'A8'}
  ],
  smokeLobby:{x0:-8.35,x1:-6,depth:5.2,opening:1.5,lifts:[1.4,4.1]}
};

// Polished light marble floor like the ground-floor lobby: 80 cm tiles, soft grey veins.
export function paintMarble(size=512,tile=.8){
  const px=new Uint8ClampedArray(size*size*4),seed=11,base=hex('#e8e5e0'),vein=hex('#a8a198');
  const noise=(u,v,p)=>{const x0=Math.floor(u),y0=Math.floor(v),fx=u-x0,fy=v-y0,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),w=n=>((n%p)+p)%p,a=hash(w(x0),w(y0),seed),b=hash(w(x0+1),w(y0),seed),c=hash(w(x0),w(y0+1),seed),d=hash(w(x0+1),w(y0+1),seed);return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size;let f=0,amp=.5;for(let o=0,p=4;o<4;o++,p*=2,amp/=2)f+=amp*noise(u*p+f*2,v*p,p);
    const line=Math.pow(1-Math.abs(Math.sin((u*3+v*1.5+f*2.2)*Math.PI)),14),t=Math.min(1,line*.85+(f-.45)*.3);
    const k=(y*size+x)*4,edge=x===0||y===0?.85:1;
    for(let ch=0;ch<3;ch++)px[k+ch]=(base[ch]+(vein[ch]-base[ch])*Math.max(0,t))*edge;px[k+3]=255;
  }
  return {width:size,height:size,pixels:px,tile};
}
