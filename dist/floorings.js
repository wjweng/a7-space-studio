// SPC floorings modelled on a supplier's floor catalogue (2025), kept apart from the board
// finishes in finishes.js, which are for furniture. Only measured colours, a plank layout
// and a pattern type live here; every texture is generated, so no supplier image is stored.
import {hash,noise} from './finishes.js';

// Plank sizes in metres: w across, l along. `plank` staggers each row of planks at random,
// `herringbone` lays them at 45 degrees, `tile` is a half-offset running bond. Planks run
// north-south like the timber boards; herringbone's spine does too.
export const flooringSeries=[
 {id:'rumu',name:'如沐',layout:'plank',w:.18,l:1.22,across:8,along:2},
 {id:'herringbone',name:'如沐人字拼',layout:'herringbone',w:.126,l:.63,across:8,along:2},
 {id:'wuxian',name:'無限',layout:'plank',w:.229,l:1.522,across:6,along:2},
 {id:'dajiang',name:'大匠',layout:'tile',w:.475,l:.95,across:4,along:2}
];
// colors: the 1st, 5th, 50th, 95th and 99th percentile tones of the catalogue swatch, so a
// generated tile has the same tone distribution, veins and chips included. vary: the spread
// of mean tone between patches about a plank wide, relative to the mean; each plank or
// tile gets its own tone from it.
export const floorings=[
 {code:'MB0601',name:'歐式灰橡',series:'rumu',pattern:'oak',vary:0.04,colors:['#917a5a','#998261','#a89172','#b6a082','#bba587']},
 {code:'MB0602',name:'經典原橡',series:'rumu',pattern:'oak',vary:0.02,colors:['#9c7746','#cea570','#dab37f','#e3bd8b','#e7c290']},
 {code:'MB0603',name:'拿鐵橡',series:'rumu',pattern:'knotty',vary:0.058,colors:['#8a5d33','#9d7045','#b2865b','#c39b71','#c8a177']},
 {code:'MB0604',name:'瑞典灰橡',series:'rumu',pattern:'oak',vary:0.027,colors:['#9e8664','#b49a76','#c5ac89','#ceb896','#d1bb9a']},
 {code:'MB0605',name:'雪白橡',series:'rumu',pattern:'oak',vary:0.011,colors:['#ad9e83','#d4c5a8','#dfd0b4','#e7d9be','#ebddc2']},
 {code:'MB0606',name:'大地灰橡',series:'rumu',pattern:'oak',vary:0.032,colors:['#968974','#beb199','#cec2ad','#d8ceb9','#dcd2bd']},
 {code:'MB0607',name:'冰河灰橡',series:'rumu',pattern:'oak',vary:0.095,colors:['#6e5e50','#776759','#998c7c','#b0a498','#b9ada3']},
 {code:'MB0608',name:'挪威灰橡',series:'rumu',pattern:'oak',vary:0.06,colors:['#5c4935','#634f3c','#705c47','#816d55','#87735b']},
 {code:'MB0609',name:'北美印橡',series:'rumu',pattern:'oak',vary:0.069,colors:['#776856','#837361','#a0917f','#afa190','#b4a594']},
 {code:'MB0610',name:'復古棕橡',series:'rumu',pattern:'knotty',vary:0.036,colors:['#9c7651','#b48d68','#c59e76','#d0aa80','#d3ae85']},
 {code:'MB0611',name:'奶茶棕橡',series:'rumu',pattern:'knotty',vary:0.036,colors:['#a2805c','#c39d73','#d2b08a','#dfc1a1','#e2c6a8']},
 {code:'MB0612',name:'英倫古銅',series:'rumu',pattern:'knotty',vary:0.114,colors:['#5e422a','#6b4e34','#8c6e50','#aa8f6d','#b39877']},
 {code:'MB0621',name:'紐伯里淺橡',series:'rumu',pattern:'knotty',vary:0.055,colors:['#ab916c','#b69c77','#d3b891','#e9cfa8','#efd7b1']},
 {code:'MB0622',name:'摩卡棕橡',series:'rumu',pattern:'oak',vary:0.072,colors:['#5f391e','#6c4528','#7c5336','#8a6043','#8e6548']},
 {code:'MB0623',name:'亞麻棕橡',series:'rumu',pattern:'oak',vary:0.052,colors:['#7a6e5c','#908370','#a59986','#b4a996','#b8ad9b']},
 {code:'MB0624',name:'橄欖棕橡',series:'rumu',pattern:'oak',vary:0.066,colors:['#6f6044','#78684c','#8f7e5e','#a08e6c','#a59371']},
 {code:'MB0625',name:'冷霧灰橡',series:'rumu',pattern:'oak',vary:0.034,colors:['#a29e8d','#aeab99','#c5bfaf','#d0cbba','#d3cebe']},
 {code:'MB0626',name:'琥珀棕橡',series:'rumu',pattern:'oak',vary:0.046,colors:['#71593f','#786046','#886f53','#967d5d','#9b8362']},
 {code:'MB0627',name:'奶油白橡',series:'rumu',pattern:'oak',vary:0.012,colors:['#c2b5a5','#cec0ae','#d6c9b8','#dcd0bf','#ded3c2']},
 {code:'MB0628',name:'黎木茶棕',series:'rumu',pattern:'oak',vary:0.027,colors:['#a97f58','#af855e','#bb9169','#c69e74','#cba379']},
 {code:'MB0631',name:'歐本棕橡',series:'rumu',pattern:'oak',vary:0.029,colors:['#9d8a69','#a2906e','#ae9c79','#b8a684','#bba986']},
 {code:'MB0632',name:'唐茶暖橡',series:'rumu',pattern:'oak',vary:0.012,colors:['#c5a072','#c8a376','#cda97c','#d2b084','#d4b388']},
 {code:'MB0633',name:'烈日原橡',series:'rumu',pattern:'oak',vary:0.043,colors:['#a57443','#a87949','#b38758','#bf9566','#c59c6d']},
 {code:'MB0634',name:'北方淺橡',series:'rumu',pattern:'oak',vary:0.007,colors:['#e2d3be','#e4d5c1','#ebdac7','#efdecc','#f0e0ce']},
 {code:'MB0635',name:'香草白橡',series:'rumu',pattern:'oak',vary:0.006,colors:['#d5cbb9','#dbd0be','#dfd4c4','#e2d9c7','#e4dbca']},
 {code:'MB0636',name:'山脈灰橡',series:'rumu',pattern:'oak',vary:0.037,colors:['#b0a796','#b6ad9c','#c2b9a8','#d0c7b8','#d4cbbc']},
 {code:'MB0637',name:'霧霜灰橡',series:'rumu',pattern:'oak',vary:0.013,colors:['#a79a89','#aa9e8d','#b0a594','#b7ac9b','#b9af9e']},
 {code:'MB0638',name:'暮靄深橡',series:'rumu',pattern:'oak',vary:0.024,colors:['#53483c','#574b3f','#5d5145','#64574a','#675a4d']},
 {code:'MB0639',name:'香榭灰橡',series:'rumu',pattern:'oak',vary:0.038,colors:['#7f6f5f','#887868','#998978','#a69686','#aa9a8a']},
 {code:'MB0640',name:'核桃暖橡',series:'rumu',pattern:'knotty',vary:0.039,colors:['#a9895e','#b19166','#c1a378','#cfb288','#d5b990']},
 {code:'MB0641',name:'丹麥淺橡',series:'rumu',pattern:'oak',vary:0.01,colors:['#ccab8d','#d0af91','#d6b596','#dabb9d','#dcbea1']},
 {code:'MB0603Y',name:'拿鐵橡',series:'herringbone',pattern:'knotty',vary:0.037,colors:['#855b31','#976d44','#af865e','#c29d77','#c8a27d']},
 {code:'MB0607Y',name:'冰河灰橡',series:'herringbone',pattern:'oak',vary:0.044,colors:['#7a6f5e','#867a69','#a99e8d','#bfb4a4','#c4b9a9']},
 {code:'MB0608Y',name:'挪威灰橡',series:'herringbone',pattern:'oak',vary:0.046,colors:['#755b43','#7c624a','#8b7158','#9f8568','#a58c6e']},
 {code:'MB0609Y',name:'北美印橡',series:'herringbone',pattern:'oak',vary:0.058,colors:['#6b5d4a','#746553','#8c7d6b','#9d907f','#a39684']},
 {code:'MB0611Y',name:'奶茶棕橡',series:'herringbone',pattern:'knotty',vary:0.024,colors:['#b3916b','#be9d74','#cdac86','#ddc09f','#e3c6a6']},
 {code:'MB0612Y',name:'英倫古銅',series:'herringbone',pattern:'knotty',vary:0.067,colors:['#5d4730','#665039','#876e54','#a78d72','#af957a']},
 {code:'WX0701',name:'紐伯里淺橡',series:'wuxian',pattern:'oak',vary:0.043,colors:['#b39772','#bea37c','#d4bb93','#e7d0aa','#edd7b1']},
 {code:'WX0702',name:'摩卡棕橡',series:'wuxian',pattern:'oak',vary:0.07,colors:['#6e4f33','#7a593c','#8c6b4b','#9b7a58','#9f7e5b']},
 {code:'WX0703',name:'亞麻棕橡',series:'wuxian',pattern:'oak',vary:0.059,colors:['#6e6559','#7f7669','#92897c','#a0988b','#a49c90']},
 {code:'WX0704',name:'橄欖棕橡',series:'wuxian',pattern:'oak',vary:0.07,colors:['#62553d','#695c44','#7c6e53','#8c7e61','#918366']},
 {code:'WX0705',name:'冷霧灰橡',series:'wuxian',pattern:'oak',vary:0.04,colors:['#8b8c86','#94958f','#a9aaa2','#b5b6ae','#b9bab2']},
 {code:'WX0706',name:'琥珀棕橡',series:'wuxian',pattern:'oak',vary:0.053,colors:['#745f45','#7b664c','#8c775b','#9d8868','#a4906f']},
 {code:'WX0707',name:'奶油白橡',series:'wuxian',pattern:'oak',vary:0.01,colors:['#c1b7aa','#c9bfb0','#d0c7b7','#d6ccc1','#d8cfc4']},
 {code:'WX0708',name:'黎木茶棕',series:'wuxian',pattern:'oak',vary:0.034,colors:['#a87d59','#ae835e','#bd926b','#c99f77','#cea67f']},
 {code:'DJ0801',name:'波斯白',series:'dajiang',pattern:'cloud',vary:0.013,colors:['#c8c7bc','#d1d0c5','#dcdbd1','#e5e4db','#e8e7de']},
 {code:'DJ0802',name:'巴特米',series:'dajiang',pattern:'streak',vary:0.01,colors:['#b1a491','#bfb29e','#c9bda8','#d1c5b2','#d5c9b6']},
 {code:'DJ0803',name:'巴特灰',series:'dajiang',pattern:'streak',vary:0.015,colors:['#aea798','#b9b2a3','#c5beb1','#cfc8ba','#d4cdbe']},
 {code:'DJ0804',name:'巴特深灰',series:'dajiang',pattern:'streak',vary:0.023,colors:['#71675c','#7d7367','#8d8378','#9c9287','#a49a8e']},
 {code:'DJ0805',name:'普皮斯米',series:'dajiang',pattern:'plain',vary:0.003,colors:['#e2d7c1','#e3d8c2','#e6dbc7','#e9dfca','#ede3cf']},
 {code:'DJ0806',name:'米白洞石',series:'dajiang',pattern:'travertine',vary:0.021,colors:['#ccb492','#d4bc9a','#e1cca8','#e9d6b2','#eddbb6']},
 {code:'DJ0807',name:'白洞石',series:'dajiang',pattern:'travertine',vary:0.022,colors:['#a9a698','#b0ad9e','#bdb9aa','#c7c4b4','#ccc8b9']},
 {code:'DJ0808',name:'魚肚白',series:'dajiang',pattern:'calacatta',vary:0.015,colors:['#d2d5d4','#dcdfde','#ffffff','#ffffff','#ffffff']},
 {code:'DJ0809',name:'時光銀石',series:'dajiang',pattern:'terrazzo',vary:0.012,colors:['#999a89','#a6a795','#bdbead','#d0d1c0','#dbdccb']},
 {code:'DJ0810',name:'時光黑石',series:'dajiang',pattern:'speckle',vary:0.02,colors:['#494843','#53514c','#6a6863','#989792','#b9b8b2']}
];
export const flooringByCode=code=>floorings.find(f=>f.code===code);
export const seriesOf=f=>flooringSeries.find(s=>s.id===f.series);
// The generated texture repeats every tileSize metres: `across` planks wide, `along` lengths long.
export function tileSize(f){const s=seriesOf(f);return s.layout==='herringbone'?[s.across*s.w*Math.SQRT2,s.along*s.l*Math.SQRT2]:[s.across*s.w,s.along*s.l];}

const FAR=1<<24;
// Fractal noise that does not wrap; sx/sy are feature sizes in metres.
function fbm(x,y,sx,sy,octaves,seed){let sum=0,amp=1,norm=0,f=1;for(let o=0;o<octaves;o++){sum+=amp*noise(x/sx*f+FAR/2,y/sy*f+FAR/2,FAR,FAR,seed+o*101);norm+=amp;amp*=.5;f*=2;}return sum/norm;}
const seedOf=code=>[...code].reduce((s,ch)=>Math.imul(s,31)+ch.charCodeAt(0)|0,11);
const hexRgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));

// Which plank a point (u across, v along, metres inside the tile) falls on: an id unique
// within the tile, the point in plank coordinates (s across 0..w, t along 0..l) and its
// distance to the plank's edge.
function plankAt(series,offsets,u,v){
 const {w,l,across,along}=series;
 if(series.layout==='herringbone'){
  // Plank frame: horizontal planks [0,l]x[0,w] and vertical ones [0,w]x[w,w+l] repeat by
  // (w,w) and (l,-l); rotated 45 degrees these become the tile's two axes.
  const p=(u+v)/Math.SQRT2,q=(u-v)/Math.SQRT2,a0=Math.floor((p+q)/(2*w)),b0=Math.floor((p-q)/(2*l));
  for(let da=-Math.ceil(l/(2*w)+1);da<=0;da++)for(let db=-1;db<=1;db++){const a=a0+da,b=b0+db,ox=a*w+b*l,oy=a*w-b*l,id=(((a%across)+across)%across)*along+(((b%along)+along)%along);
   if(p>=ox&&p<ox+l&&q>=oy&&q<oy+w){const s=q-oy,t=p-ox;return{id:id*2,s,t,edge:Math.min(s,w-s,t,l-t),w,l};}
   if(p>=ox&&p<ox+w&&q>=oy+w&&q<oy+w+l){const s=p-ox,t=q-oy-w;return{id:id*2+1,s,t,edge:Math.min(s,w-s,t,l-t),w,l};}}
  return{id:0,s:0,t:0,edge:0,w,l};
 }
 const i=Math.min(across-1,Math.floor(u/w)),s=u-i*w,span=along*l,run=((v-offsets[i])%span+span)%span,j=Math.floor(run/l),t=run-j*l;
 return{id:i*along+j,s,t,edge:Math.min(s,w-s,t,l-t),w,l};
}
// Row offsets: a half-length bond for tiles; for planks each row's joints sit at least a
// quarter of a length from its neighbour's.
function rowOffsets(series,seed){const o=[0];for(let i=1;i<series.across;i++)o.push(series.layout==='tile'?(i%2)*series.l/2:(o[i-1]+series.l*(.25+.5*hash(i,3,seed)))%series.l);return o;}

// Surface value of one plank or tile, before colour: higher is lighter.
function surface(f,pl,seed){
 const {s,t,w,l}=pl,k=seed+pl.id*7919;
 switch(f.pattern){
  case'cloud':{const n=fbm(s,t,.3,.2,3,k+9),r=1-Math.abs(2*n-1);return .6*fbm(s,t,.12,.12,4,k)+.25*fbm(s,t,.02,.02,2,k+5)-.25*r**12;}
  case'plain':return .6*fbm(s,t,.12,.12,3,k)+.4*fbm(s,t,.004,.004,2,k+5);
  case'streak':{const xx=s+.08*(fbm(s,t,.12,.25,3,k+9)-.5);return .5*fbm(xx,t,.01,.3,3,k)+.5*fbm(xx,t,.06,.6,2,k+3);}
  case'travertine':{const pit=hash(Math.floor(s/.004),Math.floor(t/.02),k+7)>.997?.4:0;return .45*fbm(s,t,.01,.6,3,k)+.55*fbm(s,t,.05,1.2,2,k+3)-pit;}
  case'calacatta':{const base=.8*fbm(s,t,.25,.25,3,k)+.2*fbm(s,t,.02,.02,2,k+3);let vein=0;
   for(const [size,depth]of[[.35,1],[.12,.5]]){const n=fbm(s+.08*fbm(s,t,.2,.2,2,k+17),t,size,size*1.4,4,k+23+size*100|0),r=1-Math.abs(2*n-1);vein=Math.max(vein,depth*r**150);}
   return base-1.5*vein;}
  case'terrazzo':case'speckle':{
   // Stone chips on a fine grey ground: large dark ones or small light ones.
   const big=f.pattern==='terrazzo',cell=big?.025:.006,sign=big?-1:1,ci=Math.floor(s/cell),cj=Math.floor(t/cell);let chip=0;
   for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++){const a=ci+di,b=cj+dj;if(hash(a,b,k+31)<(big?.45:.4))continue;
    const cx=(a+hash(a,b,k+37))*cell,cz=(b+hash(a,b,k+41))*cell,r=cell*(big?.2+.35*hash(a,b,k+43):.15+.3*hash(a,b,k+43));
    if(Math.hypot(s-cx,(t-cz)*(1+.6*hash(a,b,k+47)))<r)chip=Math.max(chip,.6+.4*hash(a,b,k+53));}
   return(big?.6*fbm(s,t,.04,.04,3,k)+.4*fbm(s,t,.004,.004,2,k+5):.25*fbm(s,t,.08,.08,2,k)+.75*fbm(s,t,.003,.003,2,k+5))+sign*chip;}
 }
 // Oak: fine grain and broad streaks along the plank, cathedral arches on some planks,
 // knots on rustic ones.
 const xx=s+.006*(fbm(s,t,.06,.5,3,k+11)-.5)*2;
 const fine=fbm(xx,t,.008,.25,3,k),band=fbm(xx,t,.05,.5,2,k+23),ridge=1-Math.abs(2*fbm(xx,t,.015,.5,2,k+31)-1);
 let v=.55*fine+.45*band-.15*ridge**8;
 if(hash(pl.id,5,seed)>.45){const c=w*(.3+.4*hash(pl.id,6,seed)),g=t-l*(.1+.6*hash(pl.id,7,seed))+60*(xx-c)**2,arc=1-Math.abs(2*((g/.022%1+1)%1)-1),fade=Math.max(0,1-Math.abs(xx-c)/(w*.45))*(g>0&&g<.35?1-g/.35:0);v-=.35*fade*arc**4;}
 if(f.pattern==='knotty')for(let n=0;n<2;n++){if(hash(pl.id,9+n,seed)<.55)continue;const ks=w*(.2+.6*hash(pl.id,11+n,seed)),kt=l*hash(pl.id,13+n,seed),r=.008+.01*hash(pl.id,15+n,seed),d=((s-ks)/r)**2+((t-kt)/(r*1.8))**2;v-=.9*Math.exp(-d)+.25*Math.exp(-d/6)*(1-Math.abs(2*((Math.sqrt(d)*.8)%1)-1))**4;}
 return v;
}

// RGBA pixels of one repeating tile at pxPerM pixels per metre; rows run along the planks.
// Tones are assigned by rank against the five measured percentiles, and the bevelled joints
// are darkened.
export function flooringPixels(f,pxPerM=400){
 const series=seriesOf(f),[tw,tl]=tileSize(f),width=Math.max(8,Math.round(tw*pxPerM)),height=Math.max(8,Math.round(tl*pxPerM)),n=width*height;
 const seed=seedOf(f.code),offsets=rowOffsets(series,seed),values=new Float32Array(n),ids=new Int32Array(n),edges=new Float32Array(n);
 for(let j=0;j<height;j++)for(let i=0;i<width;i++){const k=j*width+i,pl=plankAt(series,offsets,(i+.5)/width*tw,(j+.5)/height*tl);values[k]=surface(f,pl,seed);ids[k]=pl.id;edges[k]=pl.edge;}
 // Each plank's own tone takes its measured share (vary) of the swatch's whole tone spread,
 // estimated from the 5th-95th percentile range; the grain within planks fills the rest.
 let mean=0,sq=0;for(const v of values){mean+=v;sq+=v*v;}mean/=n;const sd=Math.sqrt(Math.max(1e-12,sq/n-mean*mean));
 const lum=h=>{const [r,g,b]=hexRgb(h);return .2126*r+.7152*g+.0722*b;},spread=Math.max(1e-3,(lum(f.colors[3])-lum(f.colors[1]))/lum(f.colors[2])/3.29),share=Math.min(1,f.vary/spread),grain=Math.sqrt(1-share*share);
 for(let k=0;k<n;k++){const id=ids[k],z=(hash(id,1,seed)+hash(id,2,seed)+hash(id,3,seed)-1.5)*2;values[k]=grain*(values[k]-mean)/sd+share*z;}
 const order=Array.from(values.keys()).sort((a,b)=>values[a]-values[b]),rank=new Float32Array(n);order.forEach((k,r)=>rank[k]=(r+.5)/n);
 // A joint is a bevel about 1.5 mm wide, darkened in proportion on the pixel either side of it.
 const stops=[.01,.05,.5,.95,.99],colors=f.colors.map(hexRgb),out=new Uint8ClampedArray(n*4),px=1/pxPerM,joint=1-(series.layout==='tile'?.2:.3)*Math.min(1,.0015/px);
 for(let k=0;k<n;k++){
  const r=Math.min(.99,Math.max(.01,rank[k]));let a=0;while(a<3&&r>stops[a+1])a++;
  const t=(r-stops[a])/(stops[a+1]-stops[a]),tone=edges[k]<px/2?joint:1;
  for(let c=0;c<3;c++)out[k*4+c]=(colors[a][c]+(colors[a+1][c]-colors[a][c])*t)*tone;out[k*4+3]=255;
 }
 return{pixels:out,width,height,size:[tw,tl]};
}
