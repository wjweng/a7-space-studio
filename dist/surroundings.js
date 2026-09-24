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
// North, across the lane (Street View 2025-04, seen from the ground): a brown-slab tower,
// then the dark louvred tower whose right third faces A7's three north windows (x 0-8.3),
// then, across a small lane, the grey tower with deep fins and a column of rings.
// East, on A7's side of the lane with a similar setback: the neighbour's pale end wall.
export const towers=[
  {id:'north-west',style:'slab-brown',x0:-40,x1:-18,z0:northFacade-16,z1:northFacade-1,top:top(19),faces:'south',slabs:{depth:.8}},
  {id:'north-centre',style:'louvre',x0:-16.5,x1:9,z0:northFacade-18,z1:northFacade,top:top(20),faces:'south',crown:{w:10,depth:4.5,thickness:.22,holes:7}},
  {id:'north-east',style:'rings',x0:15,x1:34,z0:northFacade-16,z1:northFacade+1.5,top:top(19),faces:'south',slabs:{depth:1.05},ringSide:{width:3.6}},
  {id:'east',style:'endwall',x0:eastFacade,x1:eastFacade+24,z0:-.5,z1:24,top:top(18),faces:'west'}
];

export const facadeRecess=t=>t.style==='louvre'?1.35:t.style==='rings'?1.05:0;
// Use the actual exposed side-wall width, excluding the recessed front facade.
// The ring band is centred between the wall's two ends, not measured from a corner.
export function ringSideLayout(width,bandWidth=3.6){
  const centre=width/2,a=centre-bandWidth/2,b=centre+bandWidth/2;
  return {centre,a,b,bays:[[.75,a-.55],[b+.55,width-.75]]};
}

const PX=.025;                                          // metres per texture pixel
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

// Widths are inferred from the supplied oblique street photographs, not a survey.
// Shared by the paint and relief so railings, openings and piers cannot drift apart.
export const northBays=[[.9,4.6],[5.5,8.1],[12.6,15.6],[16.5,20.4],[24.1,25.2]];
export const northPiers=[[0,.9],[4.6,5.5],[8.1,9],[11.7,12.6],[15.6,16.5],[20.4,21.4],[23.5,24.1],[25.2,25.5]];
export const northScreens=[[9,11.7],[21.4,23.5]];
export const eastReveals=[2.3,4.6,6.2,7.9];
export const eastVents=[3.48,6.48,7.88];
export const eastTileBand=[2.3,8.6];
export const eastPlatforms={start:10.1,end:13.3,recess:1.25};
function weather(c,width,height,seed,amount){
  for(let y=0;y<c.h;y++)for(let x=0;x<c.w;x++){
    const k=(y*c.w+x)*4,grain=(hash(x,y,seed)-.5)*amount;
    const streak=(hash(Math.floor(x/c.w*width*12),0,seed)-.5)*1.6;
    for(let ch=0;ch<3;ch++)c.albedo[k+ch]+=grain+streak;
  }
}

const painters={
  // Brown tower: grey-green stone frame, brown balcony slabs (real geometry) and a strip
  // of vertical timber slats near its east edge.
  'slab-brown'(width,height,seed){const c=canvas(width,height),fh=SITE.floorHeight;c.fill(0,0,width,height,'#66706c');
    for(let f=0,y=0;y<height;f++,y+=fh){for(let x=1.2,b=0;x<width-5;x+=3.4,b++){c.fill(x,y+.5,x+2.9,y+fh-.4,'#343b40');c.fill(x+1.43,y+.5,x+1.5,y+fh-.4,'#2a2622');nightWindow(c,x+.1,y+.6,x+2.8,y+fh-.5,f,b,seed);}c.fill(0,y+fh-.4,width,y+fh,'#6a5446');}
    c.fill(width-4.2,0,width-2.4,height,'#5a4235');for(let x=width-4.1;x<width-2.5;x+=.16)c.fill(x,0,x+.07,height,'#8a6a52');
    return c;},
  // The tower opposite: grey stone frame and piers, a dark bronze louvre strip up its
  // middle, glazed balcony bays with railing bands, and a planted column at its east end.
  louvre(width,height,seed){const c=canvas(width,height),fh=SITE.floorHeight,scale=width/25.5;
    c.fill(0,0,width,height,'#6f7471');
    // Recessed balconies: continuous dark bays behind solid parapets, not a window grid.
    for(let f=0,y=0;y<height;f++,y+=fh){
      for(const [i,[a,b]]of northBays.entries()){
        const x=a*scale,e=b*scale;
        c.fill(x,y+.23,e,y+fh-.22,'#282c2d');
        for(let k=0;k<12;k++){const v=35+k*1.15;c.fill(x,y+.24+k*.12,e,y+.36+k*.12,[v,v+2,v+3]);}
        const pane=(e-x)/3;
        for(let k=0;k<3;k++){
          const tone=hash(f,k+i*7,seed),left=x+k*pane+.06;
          c.fill(left,y+.55,left+pane-.12,y+fh-.43,tone<.25?'#444747':tone<.7?'#343c40':'#515454');
          if(tone>.76)c.fill(left+.07,y+.59,left+pane-.19,y+fh-.48,'#6b6861');
          nightWindow(c,left,y+.58,left+pane-.12,y+fh-.5,f,k+i*7,seed);
        }
        c.fill(x,y+fh-1.04,e,y+fh-.29,'#514d48');
        c.fill(x,y+fh-1.08,e,y+fh-1.01,'#92908a');
        c.fill(x,y+fh-.28,e,y+fh,'#777872');
      }
    }
    for(const [a,b]of northScreens){c.fill(a*scale,0,b*scale,height,'#302c2a');for(let x=a*scale;x<b*scale;x+=.115)c.fill(x,0,x+.042,height,'#62564c');}
    // Stone panel joints stay subordinate to the balcony openings.
    for(const [a,b]of northPiers){c.fill(a*scale,0,b*scale,height,'#858c87');for(let y=.65;y<height;y+=.65)c.fill(a*scale,y,b*scale,y+.017,'#747d78');}
    weather(c,width,height,seed,2.8);
    return c;},
  // Grey tower across the small lane: dark glass bays behind deep fins (real geometry) and
  // a dark strip carrying a column of white rings on its west side.
  rings(width,height,seed){const c=canvas(width,height),fh=SITE.floorHeight;c.fill(0,0,width,height,'#66696a');
    for(let f=0,y=0;y<height;f++,y+=fh){
      for(let x=.65,b=0;x<width-.5;x+=4.5,b++){
        const e=Math.min(width-.5,x+3.75);c.fill(x,y+.3,e,y+fh-.28,'#30383d');
        for(let k=0;k<3;k++){const a=x+k*(e-x)/3;c.fill(a,y+.45,a+.065,y+fh-.35,'#747979');nightWindow(c,a+.1,y+.5,a+(e-x)/3-.12,y+fh-.5,f,b*3+k,seed);}
        c.fill(x,y+fh-.94,e,y+fh-.33,'#4b5358');
        c.fill(x,y+fh-.98,e,y+fh-.92,'#8d9594');
      }
      c.fill(0,y+fh-.26,width,y+fh,'#7a7c78');
    }
    weather(c,width,height,seed,2);return c;},
  'ring-side'(width,height,seed,tower){
    const c=canvas(width,height),fh=SITE.floorHeight,{a,b,bays}=ringSideLayout(width,tower.ringSide.width);
    c.fill(0,0,width,height,'#696769');
    // Two flanking stacks of broad recessed openings, rather than a grid of small squares.
    for(let y=0,f=0;y<height;y+=fh,f++)for(const [i,[left,right]]of bays.entries()){
      c.fill(left,y+.30,right,y+fh-.25,'#343236');
      c.fill(left+.22,y+.62,right-.22,y+fh-.58,'#3e4247');
      const mid=(left+right)/2;
      for(const [j,[x0,x1]]of [[left+.25,mid-.045],[mid+.045,right-.25]].entries()){
        nightWindow(c,x0,y+.68,x1,y+fh-.65,f,i*2+j,seed);
      }
      c.fill(mid-.035,y+.63,mid+.035,y+fh-.58,'#6b6c6b');
      c.fill(left,y+fh-.92,right,y+fh-.27,'#575054');
      c.fill(left,y+fh-.28,right,y+fh,'#797375');
    }
    c.fill(a,0,b,height,'#343137');
    for(let x=a+.04;x<b;x+=.12)c.fill(x,0,x+.038,height,'#686169');
    for(const x of[a-.45,b]){
      c.fill(x,0,x+.45,height,'#777276');
      for(let y=.7;y<height;y+=.7)c.fill(x,y,x+.45,y+.015,'#696568');
    }
    weather(c,width,height,seed,2);return c;
  },
  // The east neighbour's end wall (Street View close-up): grey tiled panels with vertical
  // reveals, a single column of slit windows between columns of small fixings, then a deep
  // vertical recess and pale pilaster. The platform stack to the right is real geometry.
  endwall(width,height,seed){const c=canvas(width,height),fh=SITE.floorHeight;
    // Fine vertical ceramic tiles, warmer than the stone cladding across the street.
    // Subpixel grout coverage prevents a 6 mm joint becoming a whole coarse texel.
    const dx=width/c.w,dy=height/c.h;
    for(let y=0;y<c.h;y++)for(let x=0;x<c.w;x++){
      const u=(x+.5)*dx,v=(y+.5)*dy,col=Math.floor(u/.10),row=Math.floor(v/.40);
      const mx=u%.10,my=v%.40;
      const gx=Math.max(0,Math.min(1,(.003+dx/2-Math.min(mx,.10-mx))/dx));
      const gy=Math.max(0,Math.min(1,(.003+dy/2-Math.min(my,.40-my))/dy));
      const grain=hash(col,row,seed)*5-2.5,shade=8*Math.max(gx,gy),k=(y*c.w+x)*4;
      const base=u>=eastTileBand[0]&&u<eastTileBand[1]?[139,130,123]:[181,181,173];
      c.albedo[k]=base[0]+grain-shade;c.albedo[k+1]=base[1]+grain-shade;c.albedo[k+2]=base[2]+grain-shade;c.albedo[k+3]=255;
    }
    for(const x of eastReveals){c.fill(x-.08,0,x+.035,height,'#76716b');c.fill(x+.035,0,x+.13,height,'#a09b91');}
    c.fill(8.6,0,9.3,height,'#646563');c.fill(9.3,0,10.1,height,'#b4b3aa');
    for(let f=0,y=0;y<height;f++,y+=fh){
      c.fill(5.15,y+.82,5.63,y+2.35,'#686967');
      c.fill(5.21,y+.88,5.57,y+2.29,'#333d42');
      c.fill(5.25,y+.94,5.53,y+1.54,'#4b5961');
      nightWindow(c,5.25,y+.94,5.53,y+2.23,f,1,seed);
      for(const centre of eastVents){const x=centre-.08;c.fill(x-.03,y+1.56,x+.22,y+1.83,'#7c7872');c.fill(x,y+1.54,x+.16,y+1.68,'#a5a099');}
    }
    weather(c,width,height,seed,2.0);
    return c;},

};
// Albedo and night-glow pixels for a tower's facade (width x height metres).
export function paintFacade(tower,width,height,style=tower.style){
  const seed=[...tower.id].reduce((s,ch)=>Math.imul(s,31)+ch.charCodeAt(0)|0,5);
  const c=painters[style](width,height,seed,tower);
  return {width:c.w,height:c.h,albedo:c.albedo,glow:c.glow};
}

// Local facade coordinates: u along the wall, y above A7's floor, d towards A7.
// Repeated solids are instanced by colour in scene.js; they add no lights or shadows.
export function facadeRelief(t){
  const parts=[],fh=SITE.floorHeight,height=t.top-SITE.ground;
  const box=(kind,u,y,d,w,h,depth,color,shape='box')=>parts.push({kind,u,y,d,w,h,depth,color,shape});
  if(t.style==='louvre'){
    const scale=(t.x1-t.x0)/25.5;
    for(const [a,b]of northPiers){
      box('pier',(a+b)/2*scale,SITE.ground+height/2,-.56,(b-a)*scale,height,1.48,'#858c87');
      for(let y=SITE.ground+.65;y<t.top;y+=.65)box('stone-joint',(a+b)/2*scale,y,.182,(b-a)*scale,.014,.008,'#6d7771');
    }
    for(const [a,b]of northScreens){
      box('screen-back',(a+b)/2*scale,SITE.ground+height/2,-.08,(b-a)*scale,height,.15,'#302c29');
      for(let u=a*scale+.045;u<b*scale;u+=.115)box('louvre',u,SITE.ground+height/2,.075,.045,height,.25,'#716255');
    }
    for(let y=SITE.ground;y<t.top-.1;y+=fh){
      for(const [i,[a,b]]of northBays.entries()){
        const u=(a+b)/2*scale,w=(b-a)*scale;
        box('balcony-slab',u,y+.13,-.5,w,.26,1.7,'#78746c');
        box('parapet',u,y+.52,-.09,w,.67,.18,'#635950');
        box('rail',u,y+1.04,.035,w,.055,.09,'#98998f');
        box('rail-lower',u,y+.88,.02,w,.035,.06,'#555651');
        for(let x=a*scale+.18;x<b*scale;x+=.72)box('rail-post',x,y+.96,.02,.032,.19,.055,'#6d706b');
        for(let x=a*scale+.12;x<b*scale;x+=(b-a)*scale/3)box('window-frame',x,y+1.73,-1.21,.047,2.7,.065,'#51544f');
        if(i===northBays.length-1){
          box('planter',u,y+.85,-.25,w*.78,.25,.38,'#777568');
          for(let k=0;k<12;k++){
            const r=hash(k,Math.round(y*10),31),x=a*scale+.12+(w-.24)*hash(k,3,11);
            box('plant',x,y+1.02+r*.22,-.25,.18+r*.15,.20+r*.25,.18+r*.12,k%3===0?'#6e7950':k%3===1?'#4b5b3e':'#89905d','leaf');
          }
        }
      }
    }
    box('roof-edge',(t.x1-t.x0)/2,t.top+.12,-.55,t.x1-t.x0,.24,1.75,'#666b65');
  }
  if(t.style==='ring-side'){
    const width=t.z1-t.z0,{a,b,bays}=ringSideLayout(width,t.ringSide.width);
    for(const [left,right]of [[0,.75],[a-.55,a],[b,b+.55],[width-.75,width]]){
      box('side-pier',(left+right)/2,SITE.ground+height/2,.20,right-left,height,.40,'#777276');
      for(let y=SITE.ground+.7;y<t.top;y+=.7)box('side-stone-joint',(left+right)/2,y,.402,right-left,.012,.006,'#686368');
    }
    for(let y=SITE.ground;y<t.top-.1;y+=fh)for(const [left,right]of bays){
      const u=(left+right)/2,w=right-left;
      box('side-floor-blade',u,y+.12,.21,w,.24,.66,'#7b7477');
      box('side-parapet',u,y+.58,.08,w,.64,.16,'#5f575c');
      box('side-sill',u,y+.93,.12,w,.055,.24,'#90878a');
      box('side-window-mullion',u,y+1.87,.055,.055,1.65,.11,'#747274');
    }
  }
  if(t.style==='rings'){
    const width=t.x1-t.x0;
    for(let u=.2;u<width;u+=4.5){
      box('front-fin',u,SITE.ground+height/2,-.02,.28,height,1.9,'#90928e');
      for(let y=SITE.ground;y<t.top;y+=fh)box('fin-tip',u,y+.13,.78,.55,.26,.85,'#98998f');
    }
    for(let y=SITE.ground;y<t.top;y+=fh)box('front-rail',width/2,y+1.02,.04,width,.05,.075,'#959d9b');
  }
  if(t.style==='endwall'){
    for(const u of eastReveals){
      box('reveal-side',u+.09,SITE.ground+height/2,.055,.085,height,.11,'#a09b91');
      box('reveal-shadow',u-.055,SITE.ground+height/2,.014,.065,height,.027,'#77716b');
    }
    const platformMid=(eastPlatforms.start+eastPlatforms.end)/2,platformW=eastPlatforms.end-eastPlatforms.start;
    box('platform-far-pier',eastPlatforms.end+.35,SITE.ground+height/2,.12,.7,height,.38,'#b4b3aa');
    for(let y=SITE.ground;y<t.top-.1;y+=fh){
      box('platform-slab',platformMid,y+.16,-.5,platformW,.32,1.5,'#76716c');
      box('platform-back',platformMid,y+fh/2,-eastPlatforms.recess+.025,platformW,fh,.05,'#353338');
      box('platform-parapet',platformMid,y+.57,-.24,platformW,.6,.18,'#50484a');
      box('platform-cap',platformMid,y+.89,-.24,platformW,.05,.23,'#8d8580');
    }
    box('endwall-pilaster',9.7,SITE.ground+height/2,.23,.8,height,.46,'#b4b3aa');
    for(let y=SITE.ground;y<t.top-.1;y+=fh){
      // Paint coordinates start at the roof; these offsets are their ground-up equivalent.
      const sill=y+fh-2.35,head=y+fh-.82,cy=(sill+head)/2;
      for(const u of[5.175,5.605])box('slit-jamb',u,cy,.065,.05,head-sill,.13,'#787b77');
      box('slit-head',5.39,head,.06,.48,.045,.12,'#858580');
      box('slit-sill',5.39,sill,.10,.51,.065,.20,'#a39f94');
      box('slit-mullion',5.39,y+fh-1.58,.012,.34,.036,.024,'#777d7c');
      for(const u of eastVents){
        box('wall-fitting',u,y+fh-1.62,.105,.16,.14,.21,'#aaa59b');
        box('fitting-underside',u,y+fh-1.70,.095,.12,.026,.19,'#615f5a');
      }
    }
  }
  return parts;
}

// The lift lobby (梯廳) from the 5/7/9/11F plan, scaled by A7's width (4.73 cm per plan pixel) and
// measured from its east end, A7's own wall: an east-west corridor
// with A7 (north half) and A8 (south half) at its east end and A3 / A2 at its west end.
// Seen from A7's door: A6 then A5 on the right (north); on the left (south) the A2 stair,
// the smoke lobby (排煙室, fire doors held open; its lifts face west inside, out of sight),
// the A1 stair, then A1. x is along the corridor, z across it. `handle` is the side the
// handle is on seen from the corridor, read from the swing arcs (hinge opposite the handle).
export const corridor={x0:-16.97,x1:-.51,z0:7.26,z1:9.92,height:2.6,
  doors:[
    {wall:'north',at:-1.69,w:1,kind:'unit',label:'A6',handle:'left'},
    {wall:'north',at:-15.79,w:1,kind:'unit',label:'A5',handle:'right'},
    {wall:'south',at:-1.86,w:.95,kind:'stair',label:'A2 梯'},
    {wall:'south',at:-7.87,w:.95,kind:'stair',label:'A1 梯'},
    {wall:'south',at:-15.88,w:1,kind:'unit',label:'A1',handle:'left'},
    {wall:'west',at:8.01,w:1,kind:'unit',label:'A3',handle:'right'},
    {wall:'west',at:9.19,w:1,kind:'unit',label:'A2',handle:'left'},
    {wall:'east',at:9.19,w:1,kind:'unit',label:'A8',handle:'right'}
  ],
  smokeLobby:{x0:-7.18,x1:-4.86,depth:5.2,opening:1.5,lifts:[1.4,4.1]}
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
