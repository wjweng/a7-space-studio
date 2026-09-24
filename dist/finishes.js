// Board finishes modelled on a supplier's 122 x 244 cm panel catalogue. Only measured
// colours (the 10th, 50th and 90th percentile tones of each board) and a pattern type
// live here; every texture is generated, so no supplier image is stored or shipped.
export const BOARD={w:1.22,h:2.44};
export const finishFamilies=[['wood','原木色系'],['light','淺白色系'],['gray','灰黑色系']];
export const finishes=[
 {code:'P86',name:'經典淺橡',family:'wood',pattern:'straight',colors:['#dbcdba','#e0d2c1','#e3d7c7']},
 {code:'A07',name:'楓木水波',family:'wood',pattern:'straight',colors:['#e1caa9','#e4cdae','#e6d1b3']},
 {code:'B18',name:'浮雕白橡',family:'wood',pattern:'straight',colors:['#e1c6b0','#e4cab4','#e6ceb9']},
 {code:'P68',name:'雲杉拼木',family:'wood',pattern:'soft',colors:['#cdc2b1','#d3c9ba','#d8cfc1']},
 {code:'B20',name:'浮雕楓木',family:'wood',pattern:'straight',colors:['#dfc1a1','#e2c5a6','#e4c8aa']},
 {code:'P92',name:'北歐榆木',family:'wood',pattern:'straight',colors:['#d0c1b0','#d3c5b4','#d6c8b7']},
 {code:'P87',name:'極簡橡木',family:'wood',pattern:'straight',colors:['#d3b691','#dbbf9b','#e0c7a4']},
 {code:'P71',name:'榛果櫻桃木',family:'wood',pattern:'straight',colors:['#caa982','#d2b490','#d8bd9d']},
 {code:'P61',name:'北美原橡',family:'wood',pattern:'straight',colors:['#cca674','#d6b382','#debe8e']},
 {code:'B39',name:'浮雕海棠木',family:'wood',pattern:'straight',colors:['#b5a79a','#c1b4a8','#cabeb3']},
 {code:'B42',name:'古典原檜',family:'wood',pattern:'straight',colors:['#bba182','#cab192','#d4bda0']},
 {code:'B46',name:'現代黃橡',family:'wood',pattern:'straight',colors:['#baa186','#c7af95','#d0bba3']},
 {code:'P80',name:'北歐樺木',family:'wood',pattern:'soft',colors:['#b8a591','#c1af9d','#c9b9a8']},
 {code:'B31',name:'浮雕梧桐木',family:'wood',pattern:'straight',colors:['#af9a8a','#bfab9b','#cbb9a9']},
 {code:'P88',name:'山嵐橡木',family:'wood',pattern:'straight',colors:['#bc9269','#c79f75','#d1aa80']},
 {code:'P78',name:'棕櫚橡木',family:'wood',pattern:'flame',colors:['#a98c6d','#bca082','#cab194']},
 {code:'B38',name:'浮雕檜木',family:'wood',pattern:'straight',colors:['#ae8963','#ba9670','#c4a17b']},
 {code:'P79',name:'美國栓木',family:'wood',pattern:'straight',colors:['#b08659','#bd9468','#c8a075']},
 {code:'B47',name:'現代秋香',family:'wood',pattern:'straight',colors:['#9a8979','#a89787','#b2a292']},
 {code:'B35',name:'工業胡桃',family:'wood',pattern:'flame',colors:['#ac7e59','#bd926d','#cca684']},
 {code:'P64',name:'美洲胡桃',family:'wood',pattern:'flame',colors:['#7d614b','#8e715a','#9d8067']},
 {code:'A11',name:'黃金柚木',family:'wood',pattern:'straight',colors:['#98551c','#a76329','#b36e33']},
 {code:'P75',name:'摩卡橡木',family:'wood',pattern:'straight',colors:['#4b3c32','#57483d','#645549']},
 {code:'P66',name:'天然胡桃木',family:'wood',pattern:'straight',colors:['#3d2d20','#4d3b2c','#5c4938']},
 {code:'A12',name:'天使白',family:'light',pattern:'solid',colors:['#efeeef','#eeefef','#eeefef']},
 {code:'B27',name:'浮雕珍珠白',family:'light',pattern:'solid',colors:['#ebedec','#eceeee','#eeefef']},
 {code:'P74',name:'雪花白橡',family:'light',pattern:'solid',colors:['#e0e1e2','#e2e2e2','#e3e4e5']},
 {code:'P90',name:'水染白橡',family:'light',pattern:'solid',colors:['#dfddd9','#e0dfda','#e2e0dc']},
 {code:'P85',name:'極簡白橡',family:'light',pattern:'straight',colors:['#dddad4','#e0ded8','#e2e0db']},
 {code:'P69',name:'雪榆白梣',family:'light',pattern:'soft',colors:['#dbdad6','#dededb','#e1e1de']},
 {code:'P67',name:'象牙白胡桃',family:'light',pattern:'soft',colors:['#dcd7d1','#e0dcd6','#e3e0db']},
 {code:'P60',name:'雪白榆木',family:'light',pattern:'soft',colors:['#dcd7d0','#dedbd6','#e0deda']},
 {code:'B37',name:'浮雕白臘木',family:'light',pattern:'flame',colors:['#d7d3ce','#dbd9d5','#dfdedb']},
 {code:'B55',name:'冰島拼木',family:'light',pattern:'soft',colors:['#d6d2cc','#dbd9d4','#dfdfdb']},
 {code:'B481',name:'日系清水模',family:'light',pattern:'concrete',colors:['#d3d3d1','#d8d8d6','#dcdcda']},
 {code:'B33',name:'浮雕白梧桐',family:'light',pattern:'flame',colors:['#d8d1c6','#dcd7cc','#dfdbd1']},
 {code:'P73',name:'亞麻布紋',family:'light',pattern:'linen',colors:['#d4d2ca','#d7d5cd','#d9d7cf']},
 {code:'P70',name:'禾風白橡',family:'light',pattern:'soft',colors:['#d8cec1','#dbd2c6','#dfd7cb']},
 {code:'P77',name:'白柚木',family:'light',pattern:'straight',colors:['#cacac8','#cfcfcd','#d3d3d1']},
 {code:'P81',name:'天鵝絨灰',family:'light',pattern:'solid',colors:['#cecdc4','#cfcec5','#d0cfc6']},
 {code:'B45',name:'現代白橡',family:'light',pattern:'straight',colors:['#c1c0bc','#cacac6','#d1d1ce']},
 {code:'P82',name:'香檳織夢',family:'light',pattern:'solid',colors:['#cbc0b1','#cac1b2','#cac2b2']},
 {code:'P89',name:'水染灰橡',family:'light',pattern:'soft',colors:['#bdbdbd','#c0c1c1','#c3c4c5']},
 {code:'P91',name:'曉灰榆木',family:'light',pattern:'soft',colors:['#bcbab9','#c0bebd','#c2c2c1']},
 {code:'B49',name:'灰泥清水模',family:'gray',pattern:'concrete',colors:['#a9a49c','#b8b3ab','#c5c0b8']},
 {code:'B56',name:'灰岩橡木',family:'gray',pattern:'soft',colors:['#a5a19d','#aba7a4','#b0aeaa']},
 {code:'P72',name:'冰灰布紋',family:'gray',pattern:'linen',colors:['#95938f','#989793','#9c9a96']},
 {code:'P65',name:'灰岩尤加利',family:'gray',pattern:'straight',colors:['#918983','#9c958f','#a59f9a']},
 {code:'P83',name:'隕鐵灰',family:'gray',pattern:'solid',colors:['#7b7e7e','#7d7f7f','#7e8081']},
 {code:'B36',name:'浮雕臘木',family:'gray',pattern:'flame',colors:['#746b63','#847d74','#948f87']},
 {code:'P63',name:'相思秋香',family:'gray',pattern:'straight',colors:['#504842','#5b534c','#655d57']},
 {code:'P84',name:'炭黑之境',family:'gray',pattern:'solid',colors:['#38373a','#38383a','#39393b']},
 {code:'P76',name:'煙燻橡木',family:'gray',pattern:'straight',colors:['#221e1b','#2d2825','#383330']},
 {code:'P62',name:'石墨黑木',family:'gray',pattern:'straight',colors:['#1a1a1a','#202020','#252525']}
];
export const finishByCode=code=>finishes.find(f=>f.code===code);
// Furniture types whose wooden parts can take a board finish. A sofa's only wood is its
// legs, hidden under the seat, so it takes a fabric colour instead (see fabricTypes).
export const finishableTypes=['bed','desk','chair','table','wardrobe','drawer','console','kitchen','sink'];

// Pattern parameters in metres. line: grain spacing; stretch: how much longer than wide a
// grain fleck runs; band: width of the broad colour streaks and bandMix their share;
// warp: sideways sway of the grain, over strips warpWidth wide and warpLen long, so
// neighbouring strips curve differently; lines/pores: strength of thin dark grain lines
// and of short pore dashes; leaves: tone step between the 12-18 cm veneer leaves.
const patterns={
  straight:{line:.004,stretch:40,band:.05,bandMix:.45,warp:.004,warpWidth:.05,warpLen:.5,lines:.35,pores:.25,leaves:.12},
  soft:{line:.008,stretch:60,band:.08,bandMix:.75,warp:.006,warpWidth:.08,warpLen:.6,lines:.15,pores:0,leaves:.05},
  flame:{line:.005,stretch:25,band:.06,bandMix:.5,warp:.022,warpWidth:.07,warpLen:.28,lines:.45,pores:.15,leaves:.2},
  linen:{},concrete:{},solid:{}
};
export const hash=(x,y,seed)=>{let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(seed,2246822519);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
const smooth=t=>t*t*(3-2*t);
// Value noise on a lattice that wraps every px by py cells, so the texture tiles.
export function noise(u,v,px,py,seed){
  const x0=Math.floor(u),y0=Math.floor(v),fx=smooth(u-x0),fy=smooth(v-y0),wrap=(n,p)=>((n%p)+p)%p;
  const a=hash(wrap(x0,px),wrap(y0,py),seed),b=hash(wrap(x0+1,px),wrap(y0,py),seed),c=hash(wrap(x0,px),wrap(y0+1,py),seed),d=hash(wrap(x0+1,px),wrap(y0+1,py),seed);
  return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy;
}
// Fractal noise over the board; sx/sy are feature sizes in metres, rounded to whole cells.
function fbm(x,y,sx,sy,octaves,seed){
  let px=Math.max(1,Math.round(BOARD.w/sx)),py=Math.max(1,Math.round(BOARD.h/sy)),sum=0,amp=1,norm=0;
  for(let o=0;o<octaves;o++){sum+=amp*noise(x/BOARD.w*px,y/BOARD.h*py,px,py,seed+o*101);norm+=amp;amp*=.5;px*=2;py*=2;}
  return sum/norm;
}
const seedOf=code=>[...code].reduce((s,ch)=>Math.imul(s,31)+ch.charCodeAt(0)|0,7);
const hexRgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function field(finish,x,y,seed){
  const p=patterns[finish.pattern]||patterns.straight;
  if(finish.pattern==='solid')return fbm(x,y,.12,.12,3,seed);
  if(finish.pattern==='linen')return .5*fbm(x,y,.004,.04,2,seed)+.5*fbm(x,y,.04,.004,2,seed+7);
  if(finish.pattern==='concrete'){const pit=hash(Math.floor(x/.003),Math.floor(y/.003),seed+3)>.975?-.3:0;return .3*fbm(x,y,.08,.08,3,seed)+.7*fbm(x,y,.008,.008,3,seed+5)+pit;}
  const xx=x+p.warp*(fbm(x,y,p.warpWidth,p.warpLen,3,seed+11)-.5)*2;
  const fine=fbm(xx,y,p.line,p.line*p.stretch,3,seed),band=fbm(xx,y,p.band,p.band*p.stretch*.5,2,seed+23);
  const ridge=1-Math.abs(2*fbm(xx,y,p.line*3,p.line*3*p.stretch,2,seed+31)-1),lines=ridge**8;
  const pore=p.pores&&hash(Math.floor(xx/.0015),Math.floor(y/.02),seed+41)>.97?p.pores:0;
  // Veneer leaves: eight strips across the board, each a random width and tone.
  const edges=[0];for(let k=1;k<8;k++)edges.push((k+(hash(k,0,seed+53)-.5)*.6)/8*BOARD.w);
  let leaf=0;while(leaf<7&&x>=edges[leaf+1])leaf++;
  const tone=p.leaves*(hash(leaf,1,seed+59)-.5);
  return (1-p.bandMix)*fine+p.bandMix*band-p.lines*lines-pore+tone;
}
// RGBA pixels covering one whole board. Tones are assigned by rank, so the generated board
// has the same dark / mid / light distribution as the one it was measured from.
export function finishPixels(finish,width,height){
  const seed=seedOf(finish.code),n=width*height,values=new Float32Array(n),bins=new Uint32Array(1024);
  for(let j=0;j<height;j++)for(let i=0;i<width;i++){const v=field(finish,(i+.5)/width*BOARD.w,(j+.5)/height*BOARD.h,seed);values[j*width+i]=v;}
  let lo=Infinity,hi=-Infinity;for(const v of values){if(v<lo)lo=v;if(v>hi)hi=v;}
  const span=hi-lo||1;for(const v of values)bins[Math.min(1023,Math.floor((v-lo)/span*1024))]++;
  const cdf=new Float32Array(1024);let acc=0;for(let b=0;b<1024;b++){acc+=bins[b];cdf[b]=(acc-bins[b]/2)/n;}
  const [dark,mid,light]=finish.colors.map(hexRgb),out=new Uint8ClampedArray(n*4);
  for(let k=0;k<n;k++){
    const r=cdf[Math.min(1023,Math.floor((values[k]-lo)/span*1024))];
    const [a,b,t]=r<.5?[dark,mid,(r-.1)/.4]:[mid,light,(r-.5)/.4];
    for(let c=0;c<3;c++)out[k*4+c]=a[c]+(b[c]-a[c])*t;out[k*4+3]=255;
  }
  return out;
}
