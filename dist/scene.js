import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {HEIGHT,outline,rooms,walls,doors,palettes,inside,wallRects,overlaps,columns,structuralBlocks} from './model.js';
import {doorRects,leafWidth,fixedDoorLimit,pointClear,findRoute,roomAt,blocksCamera,cabinetLeaves,cabinetRects} from './spatial.js';
export class SpaceScene{
 constructor(host,onSelect,onDrag,onDragEnd,onOperate){this.host=host;this.onSelect=onSelect;this.onDrag=onDrag;this.onDragEnd=onDragEnd;this.onOperate=onOperate;this.collisionWalls=wallRects();this.mode='orbit';this.palette='oak';this.items=[];this.groups=new Map;this.actions=new Map;this.openStates={};this.keys=new Set;this.night=false;this.lightsOn=true;this.eye=1.6;this.cutaway=true;this.selected=null;this.viewStates={};this.avoidFurniture=true;doors.forEach(d=>d.maxAngle=fixedDoorLimit(d));this.route=[];
 this.renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;host.append(this.renderer.domElement);
 this.scene=new T.Scene();this.scene.background=new T.Color('#dce4e2');this.scene.fog=new T.Fog('#dce4e2',35,75);
 this.camera=new T.PerspectiveCamera(43,1,.025,100);this.camera.position.set(13,15,18);this.topCamera=new T.OrthographicCamera(-6,6,6,-6,.1,60);this.topCamera.position.set(4,25,4);this.topCamera.up.set(0,0,-1);this.topCamera.lookAt(4,0,4);
 this.controls=new OrbitControls(this.camera,host);this.controls.target.set(4,0,3.9);this.controls.enableDamping=true;this.controls.minDistance=2;this.controls.maxDistance=28;this.controls.maxPolarAngle=Math.PI*.485;
 this.hemi=new T.HemisphereLight(0xf1f5ff,0x8c7965,2.2);this.scene.add(this.hemi);this.sun=new T.DirectionalLight(0xffeed8,3.1);this.sun.position.set(-3,10,-5);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.5,far:40});this.sun.shadow.bias=-.0004;this.sun.shadow.normalBias=.025;this.scene.add(this.sun);
 this.building=new T.Group;this.furniture=new T.Group;this.scene.add(this.building,this.furniture);this.ray=new T.Raycaster;this.pointer=new T.Vector2;this.plane=new T.Plane(new T.Vector3(0,1,0),0);this.walkYaw=Math.PI;this.walkPitch=0;this.clock=new T.Clock;
 this.makeMaterials();this.buildHouse();this.bind();this.resize();new ResizeObserver(()=>this.resize()).observe(host);this.renderer.setAnimationLoop(()=>this.frame());}
 texture(kind){const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');let seed=45;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};ctx.fillStyle=kind==='wood'?'#c9b59a':'#e3e0d9';ctx.fillRect(0,0,512,512);for(let i=0;i<(kind==='wood'?1500:22000);i++){const v=Math.floor(80+rand()*100);ctx.strokeStyle=`rgba(${v},${v*.87},${v*.7},${kind==='wood'?.12:.1})`;ctx.fillStyle=ctx.strokeStyle;if(kind==='wood'){let x=rand()*512,y=rand()*512;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+rand()*7,y+40,x-8,y+100,x+2,y+150);ctx.stroke()}else ctx.fillRect(rand()*512,rand()*512,1,2)}const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.anisotropy=this.renderer.capabilities.getMaxAnisotropy();return tx;}
 makeMaterials(){const p=palettes[this.palette];if(!this.woodTexture){this.woodTexture=this.texture('wood');this.fabricTexture=this.texture('fabric');}this.m={};const mat=(color,roughness=.8,extra={})=>new T.MeshStandardMaterial({color,roughness,...extra});this.m.wall=mat(p.wall);this.m.wood=mat(p.wood,.6,{map:this.woodTexture});this.m.floor=mat(p.floor,.55,{map:this.woodTexture});this.m.fabric=mat(p.fabric,.98,{map:this.fabricTexture});this.m.accent=mat(p.accent,.9,{map:this.fabricTexture});this.m.white=mat('#f4f1e9',.7);this.m.tile=mat('#cecfc7',.35);this.m.stone=mat('#e4e0d7',.35);this.m.dark=mat('#27383a',.6);this.m.metal=mat('#929b98',.3,{metalness:.8});this.m.glass=mat('#b9d5da',.1,{transparent:true,opacity:.24,metalness:.1,depthWrite:false});this.m.leaf=mat('#496649',.9);}
 box(parent,w,h,d,x,y,z,mat,round=0){let geo=round?new RoundedBoxGeometry(w,h,d,3,Math.min(round,w/3,h/3,d/3)):new T.BoxGeometry(w,h,d);let mesh=new T.Mesh(geo,typeof mat==='string'?this.m[mat]:mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 cyl(parent,r1,r2,h,x,y,z,mat){let m=new T.Mesh(new T.CylinderGeometry(r1,r2,h,24),this.m[mat]);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 clearGroup(g){g.traverse(o=>{if(o.geometry)o.geometry.dispose()});g.clear();}
 buildHouse(){this.clearGroup(this.building);this.wallMeshes=[];this.staticActions=[];this.actions.clear();let shape=new T.Shape(outline.map(([x,z])=>new T.Vector2(x,-z)));let floor=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:false}),this.m.floor);floor.rotation.x=-Math.PI/2;floor.position.y=-.16;floor.receiveShadow=true;this.building.add(floor);
 // Individual narrow boards make scale and plank direction legible at human eye height.
 for(let x=-.45;x<8.85;x+=.19)for(let z=0;z<8.5;z+=1.12){let zz=z+((Math.round((x+.45)/.19)%2)*.56);if(inside(x+.09,zz+.54)&&inside(x,zz)&&inside(x+.185,zz+1.08))this.box(this.building,.186,.009,1.08,x+.093,.002,zz+.54,'floor');}
 for(const [x,z,w,d]of[[2.24,6,1.55,2.4],[7.7,3.55,2.13,1.55],[7.45,5.83,1.62,2.7]]){this.box(this.building,w,.018,d,x,.018,z,'tile');for(let xx=x-w/2;xx<x+w/2;xx+=.4)this.box(this.building,.004,.002,d,xx,.029,z,'white');for(let zz=z-d/2;zz<z+d/2;zz+=.4)this.box(this.building,w,.002,.004,x,.029,zz,'white');}
 for(const w of walls){let dx=w.b[0]-w.a[0],dz=w.b[1]-w.a[1],len=Math.hypot(dx,dz);const group=new T.Group;group.position.set(w.a[0],0,w.a[1]);group.rotation.y=-Math.atan2(dz,dx);this.building.add(group);const segment=(a,b,y,h)=>{if(b-a<.005||h<=0)return;let mesh=this.box(group,b-a,h,.12,(a+b)/2,y+h/2,0,'wall');this.wallMeshes.push({mesh,h,y});if(y===0)this.box(group,b-a,.075,.135,(a+b)/2,.038,0,'white');};if(w.opening){let[s,ow,sill,oh]=w.opening;segment(0,s,0,HEIGHT);segment(s+ow,len,0,HEIGHT);segment(s,s+ow,0,sill);segment(s,s+ow,sill+oh,HEIGHT-sill-oh);if(sill>0&&w.openingType==='railing'){for(let y of[.45,.8,1.1])this.box(group,ow,.035,.04,s+ow/2,y,0,'metal');for(let x=s;x<=s+ow+.01;x+=ow/6)this.box(group,.025,1,.04,x,.6,0,'metal');}else if(sill>0){let frame=new T.Group;group.add(frame);this.box(frame,ow,oh,.035,s+ow/2,sill+oh/2,0,'glass');for(let yy of[sill,sill+oh])this.box(frame,ow,.045,.07,s+ow/2,yy,0,'dark');for(let xx of[s,s+ow/2,s+ow])this.box(frame,.035,oh,.07,xx,sill+oh/2,0,'dark');}}
 else segment(0,len,0,HEIGHT);}
 // Assumed structural columns and beam are deliberately documented in the source panel.
 for(const {x,z,w,d}of[...columns,...structuralBlocks]){let m=this.box(this.building,w,HEIGHT,d,x,HEIGHT/2,z,'wall');this.wallMeshes.push({mesh:m,h:HEIGHT,y:0});}
 this.beam=this.box(this.building,8.2,.3,.25,4.15,HEIGHT-.15,2.76,'wall');this.ceiling=new T.Mesh(new T.ShapeGeometry(shape),this.m.wall);this.ceiling.rotation.x=-Math.PI/2;this.ceiling.position.y=HEIGHT;this.ceiling.material=new T.MeshStandardMaterial({color:palettes[this.palette].wall,side:T.DoubleSide});this.building.add(this.ceiling);
 for(const door of doors){const g=new T.Group;g.position.set(door.x,0,door.z);g.rotation.y=door.angle;this.building.add(g);const pivot=new T.Group;g.add(pivot);pivot.position.set(.08,0,-door.swing*.055);const width=leafWidth(door);this.box(pivot,width,door.height,.045,width/2,door.height/2,0,'wood',.009);for(const side of[-1,1])this.box(pivot,.105,.025,.07,width-.12,1.02,side*.055,'metal',.01);pivot.userData.action=door.id;this.actions.set(door.id,{type:'door',pivot,base:0,def:door,amount:this.openStates[door.id]||0});for(const x of[0,door.width])this.box(g,.055,2.15,.16,x,1.075,0,'white');this.box(g,door.width+.1,.06,.16,door.width/2,2.13,0,'white');}
 this.curtains=[];for(const [i,x,w]of walls.filter(w=>['window-living','window-A','window-master'].includes(w.id)).map((wall,i)=>[i,wall.a[0]+wall.opening[0]+wall.opening[1]/2,wall.opening[1]+.12])){const id='curtain-'+i,g=new T.Group;g.position.set(x,0,.15);g.userData.action=id;this.building.add(g);this.box(g,w+.2,.05,.07,0,2.58,0,'dark');const panels=[];for(const sign of[-1,1]){let pg=new T.Group;g.add(pg);for(let j=0;j<16;j++){let fold=this.box(pg,w/32+.012,2.38,.045,j*w/32,1.36,Math.sin(j*Math.PI/2)*.04,'fabric',.015);fold.castShadow=false;}panels.push({g:pg,sign});}this.actions.set(id,{type:'curtain',panels,width:w,amount:this.openStates[id]||0,group:g});this.curtains.push(g);}
 this.roomLights=[];for(const r of rooms){let ceilingLamp=this.cyl(this.building,.12,.12,.045,r.x,2.7,r.z,'white');let light=new T.PointLight(0xffddb2,8,5.5,2);light.position.set(r.x,2.5,r.z);this.building.add(light);this.roomLights.push(light);ceilingLamp.userData.ceilingFixture=true;}
 this.setCutaway(this.cutaway);this.updateLight();}
 buildFurniture(items){this.stopTour();this.items=items;this.clearGroup(this.furniture);this.groups.clear();for(const [id,a]of this.actions)if(a.item)this.actions.delete(id);for(const f of items){let g=new T.Group;g.position.set(f.x,0,f.z);g.rotation.y=f.rot*Math.PI/180;g.userData.furniture=f.id;this.furniture.add(g);this.groups.set(f.id,g);this.makeFurniture(g,f);}this.highlight(this.selected);this.ensureSafeCamera();}
 makeFurniture(g,f){let{w,d,h,type}=f;const box=(ww,hh,dd,x,y,z,m='wood',r=0)=>this.box(g,ww,hh,dd,x,y,z,m,r);const legs=(height,offset=.07)=>{for(let x of[-w/2+offset,w/2-offset])for(let z of[-d/2+offset,d/2-offset])box(.045,height,.045,x,height/2,z,'wood',.008);};
 if(type==='rug'){box(w,.01,d,0,.012,0,'accent',.005);return}
 if(type==='bed'){const scale=h/.65;const raw=box;const bedbox=(ww,hh,dd,x,y,z,m,r)=>raw(ww,hh*scale,dd,x,y*scale,z,m,r);bedbox(w,.25,d,0,.17,0,'wood',.045);bedbox(w-.02,.22,d-.04,0,.41,0,'white',.08);bedbox(w+.025,.65,.075,0,.325,-d/2,'fabric',.025);bedbox(w-.08,.055,d*.67,0,.547,d*.11,'fabric',.025);bedbox(w-.07,.02,d*.21,0,.58,d*.29,'accent',.01);for(let x of w>1.3?[-w*.24,w*.24]:[0])bedbox(w>1.3?w*.42:w*.8,.11,.4,x,.59,-d*.32,'white',.075);return;}
 if(type==='sofa'){g.scale.y=h/.84;h=.84;legs(.12,.12);box(w,.23,d,0,.22,0,'fabric',.07);box(w,h-.22,.16,0,(h+.22)/2,-d/2+.08,'fabric',.055);for(let x of[-w/2+.09,w/2-.09])box(.18,h*.68,d,x,h*.34+.1,0,'fabric',.055);for(let i=0;i<3;i++){let x=-w/2+.23+(w-.46)/6+i*(w-.46)/3;box((w-.49)/3,.18,d-.22,x,.425,.06,'fabric',.07);box((w-.5)/3,.3,.17,x,.64,-d/2+.2,'fabric',.06);}let pillow=box(.3,.3,.11,w*.31,.59,-.12,'accent',.065);pillow.rotation.z=-.18;return;}
 if(['table','desk'].includes(type)){legs(h-.04);let top=box(w,.045,d,0,h-.022,0,'wood',type==='table'?.08:.01);if(type==='desk'){const drawer=new T.Group;drawer.position.set(0,h-.12,d/2-.16);g.add(drawer);this.box(drawer,w*.65,.13,.3,0,0,0,'wood');this.box(drawer,.16,.018,.02,0,0,.16,'metal');this.actions.set(f.id,{type:'drawer',pivot:drawer,base:drawer.position.z,travel:.3,item:f,amount:f.open||0});}return;}
 if(type==='chair'){legs(h*.52);box(w,.065,d,0,h*.52,0,'fabric',.03);box(w,h*.43,.055,0,h*.75,-d/2+.02,'wood',.035);return;}
 if(['wardrobe','drawer','console','kitchen','fridge'].includes(type)){const bodyMat=type==='fridge'?'white':'wood';box(w,h,.025,0,h/2,-d/2,bodyMat);for(let x of[-w/2+.012,w/2-.012])box(.024,h,d,x,h/2,0,bodyMat);for(let y of[.04,h-.015])box(w,.028,d,0,y,0,bodyMat);for(let y=.45;y<h-.1;y+=.45)box(w-.05,.02,d-.04,0,y,0,'white');const pivots=[];const leaves=type==='drawer'?[{hinge:-w/2,sign:1,width:w-.015}]:cabinetLeaves(f);for(const leaf of leaves){const p=new T.Group;p.position.set(leaf.hinge,h/2,d/2);p.userData.swing=-leaf.sign;g.add(p);this.box(p,leaf.width-.008,h-.065,.025,leaf.sign*leaf.width/2,0,0,bodyMat,.006);this.box(p,.018,.12,.028,leaf.sign*(leaf.width-.055),0,.03,'metal',.006);pivots.push(p);}this.actions.set(f.id,{type:type==='drawer'?'cabdrawer':'cabinet',pivots,item:f,travel:d*.75,base:d/2,amount:f.open||0});if(type==='console'){box(w*.78,.72,.04,0,h+.48,-d*.3,'dark',.025);box(w*.74,.66,.01,0,h+.48,-d*.3+.027,'accent');box(.05,.12,.1,0,h+.08,-d*.3,'dark');}
 if(type==='kitchen'){box(w+.03,.04,d+.03,0,h,0,'stone',.008);box(.57,.015,.41,w*.23,h+.028,0,'metal',.05);box(.47,.018,.32,w*.23,h+.037,0,'dark',.05);let faucet=this.cyl(g,.016,.016,.25,w*.23,h+.13,-d*.29,'metal');box(.02,.025,.15,w*.23,h+.25,-d*.18,'metal',.01);box(.56,.018,.45,-w*.30,h+.035,0,'dark',.03);for(let x of[-w*.30-.15,-w*.30+.15])this.cyl(g,.09,.09,.015,x,h+.055,0,'metal');}
 return;}
 if(type==='washer'){box(w,h,d,0,h/2,0,'white',.035);let door=new T.Group;door.position.set(-w*.33,h*.48,d/2+.02);g.add(door);let disc=this.cyl(door,w*.32,w*.32,.05,w*.33,0,0,'dark');disc.rotation.x=Math.PI/2;let glass=this.cyl(door,w*.25,w*.25,.055,w*.33,0,.03,'glass');glass.rotation.x=Math.PI/2;box(w*.75,.08,.015,0,h*.86,d/2+.01,'metal',.008);this.actions.set(f.id,{type:'washer',pivot:door,item:f,amount:f.open||0});return;}
 if(type==='shower'){
 const cut=f.id==='showerB'?Math.min(.3,w*.25):0;
 const points=cut?[[-w/2,-d/2+cut],[-w/2+cut,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]]:[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];
 const shape=new T.Shape(points.map(([x,z])=>new T.Vector2(x,-z)));const tray=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false}),this.m.white);tray.rotation.x=-Math.PI/2;tray.position.y=.03;tray.receiveShadow=true;g.add(tray);
 const pane=(ax,az,bx,bz)=>{const width=Math.hypot(bx-ax,bz-az),pg=new T.Group;pg.position.set((ax+bx)/2,0,(az+bz)/2);pg.rotation.y=-Math.atan2(bz-az,bx-ax);g.add(pg);this.box(pg,width,h-.1,.012,0,(h+.1)/2,0,'glass');for(const y of[.1,h])this.box(pg,width,.025,.025,0,y,0,'metal');for(const x of[-width/2,width/2])this.box(pg,.02,h-.1,.02,x,(h+.1)/2,0,'metal');return pg;};
 pane(-w/2+cut,-d/2,w/2,-d/2);if(cut){pane(-w/2,-d/2+cut,-w/2+cut,-d/2);pane(-w/2,-d/2+cut,-w/2,d/2);}else{box(.025,.15,.035,w*.15,1.0,-d/2-.035,'metal');}
 box(.09,.015,.09,0,.094,d*.2,'metal');this.cyl(g,.018,.018,h*.67,0,h*.58,d/2-.05,'metal');box(.025,.025,.24,0,h*.91,d/2-.16,'metal');this.cyl(g,.105,.105,.025,0,h*.90,d/2-.27,'metal');box(.2,.035,.055,0,h*.5,d/2-.07,'metal',.015);return;
 }
 if(type==='sink'){box(w,h*.8,d,0,h*.4,0,'wood');box(w+.03,.1,d+.03,0,h-.05,0,'white',.045);box(w*.65,.015,d*.55,0,h+.003,0,'metal',.055);this.cyl(g,.015,.015,.15,0,h+.075,-d*.3,'metal');box(.025,.025,.1,0,h+.15,-d*.2,'metal');return;}
 if(type==='toilet'){box(w*.85,h*.5,d*.7,0,h*.25,.07,'white',.1);box(w,.08,d*.7,0,h*.51,.08,'white',.09);box(w,h*.5,d*.25,0,h*.75,-d*.34,'white',.04);return;}
 if(type==='plant'){this.cyl(g,w*.37,w*.29,h*.32,0,h*.16,0,'stone');for(let i=0;i<12;i++){let a=i*2.4,yy=h*.36+i*h*.04;this.cyl(g,.008,.008,yy,0,yy/2,0,'wood');let leaf=new T.Mesh(new T.SphereGeometry(1,10,8),this.m.leaf);leaf.scale.set(w*.24,.03,w*.12);leaf.position.set(Math.sin(a)*w*.28,yy,Math.cos(a)*w*.28);leaf.rotation.set(.3,a,.4);g.add(leaf);}}
 }
 setPalette(name){this.palette=name;this.makeMaterials();this.buildHouse();this.buildFurniture(this.items);}
 setCutaway(v){this.cutaway=v;const cut=v&&this.mode!=='walk';for(const {mesh,h,y}of this.wallMeshes){let nh=Math.max(0,Math.min(y+h,.85)-y);mesh.visible=!cut||nh>0;mesh.scale.y=cut?nh/h:1;mesh.position.y=y+(cut?nh:h)/2;}this.ceiling.visible=this.mode==='walk';this.beam.visible=!cut;for(const c of this.curtains)c.visible=this.mode!=='top';}
 updateLight(){this.hemi.intensity=this.night?.32:2.2;this.sun.intensity=this.night?.08:3.1;this.scene.background.set(this.night?'#77818a':'#dce4e2');for(let l of this.roomLights)l.intensity=this.lightsOn?(this.night?15:6):0;}
 resize(){let w=this.host.clientWidth,h=this.host.clientHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();let span=6;this.topCamera.left=-span*w/h;this.topCamera.right=span*w/h;this.topCamera.top=span;this.topCamera.bottom=-span;this.topCamera.updateProjectionMatrix();}
 get activeCamera(){return this.mode==='top'?this.topCamera:this.camera;}
 setMode(mode){
 if(mode===this.mode)return;
 this.cancelGesture?.();this.stopTour();this.keys.clear();
 if(this.mode==='orbit'){this.controls.enableDamping=false;this.controls.update();this.controls.enableDamping=true;}
 if(this.mode!=='top')this.viewStates[this.mode]={position:this.camera.position.clone(),quaternion:this.camera.quaternion.clone(),target:this.controls.target.clone(),fov:this.camera.fov,yaw:this.walkYaw,pitch:this.walkPitch};
 this.mode=mode;this.controls.enabled=mode==='orbit';
 const state=this.viewStates[mode];
 if(mode!=='top'&&state){this.camera.position.copy(state.position);this.camera.quaternion.copy(state.quaternion);this.camera.fov=state.fov;this.controls.target.copy(state.target);this.walkYaw=state.yaw;this.walkPitch=state.pitch;}
 else if(mode==='walk'){this.camera.position.set(.65,this.eye,7.65);this.walkYaw=0;this.walkPitch=0;this.camera.fov=70;}
 this.camera.updateProjectionMatrix();this.setCutaway(this.cutaway);this.updateGrid?.();this.ensureSafeCamera();
 }
 jump(x,z){this.camera.position.set(x,this.eye,z);this.ensureSafeCamera();this.walkYaw=0;this.walkPitch=0;}
 focus(f){if(this.mode==='walk'){this.startTour({x:f.x,z:f.z});return;}if(this.mode==='top'){this.topCamera.position.set(f.x,25,f.z);this.topCamera.lookAt(f.x,0,f.z);return}this.controls.target.set(f.x,f.h/2,f.z);this.camera.position.set(f.x+3,3.5,f.z+3);}
 pick(e){const r=this.host.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);if(document.pointerLockElement===this.renderer.domElement)this.pointer.set(0,0);this.ray.setFromCamera(this.pointer,this.activeCamera);const hits=this.ray.intersectObjects([this.furniture,this.building],true);for(const hit of hits){if(!hit.object.visible)continue;let p=hit.object;while(p){if(p.userData.furniture)return{kind:'furniture',id:p.userData.furniture};if(p.userData.action)return{kind:'action',id:p.userData.action};p=p.parent;}if(hit.object.material===this.m.wall&&this.mode==='walk')return null;}return null;}
 ground(e){const r=this.host.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.activeCamera);return this.ray.ray.intersectPlane(this.plane,new T.Vector3);}
 highlight(id){this.selected=id;if(this.selection){this.scene.remove(this.selection);this.selection.geometry.dispose();this.selection.material.dispose();this.selection=null}const f=this.items.find(i=>i.id===id);if(f){this.selection=new T.BoxHelper(this.groups.get(id),0xc67748);this.scene.add(this.selection);}}
 bind(){
 const canvas=this.renderer.domElement;
 this.cancelGesture=()=>{if(this.drag?.moved)this.onDragEnd();this.drag=null;this.lookDrag=null;this.panDrag=null;this.down=null;};
 canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0&&e.button!==1)return;this.cancelGesture();if(this.mode==='walk')this.stopTour();
  this.down={x:e.clientX,y:e.clientY,id:e.pointerId,moved:false};canvas.setPointerCapture(e.pointerId);
  const hit=this.pick(e);
  if(this.mode==='top'&&hit?.kind==='furniture'&&e.button===0){const f=this.items.find(f=>f.id===hit.id),g=this.ground(e);this.drag={id:f.id,dx:f.x-g.x,dz:f.z-g.z,moved:false};}
  else if(this.mode==='top')this.panDrag={x:e.clientX,y:e.clientY};
  else if(this.mode==='walk')this.lookDrag={x:e.clientX,y:e.clientY};
 });
 canvas.addEventListener('pointermove',e=>{
  if(!this.down||e.pointerId!==this.down.id)return;
  if(e.pointerType!=='touch'&&!(e.buttons&3)){this.cancelGesture();return;}
  if(Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>5)this.down.moved=true;
  if(this.drag&&this.down.moved){if(!this.drag.moved)this.onSelect(this.drag.id);let p=this.ground(e);if(p){this.drag.moved=true;this.onDrag(this.drag.id,p.x+this.drag.dx,p.z+this.drag.dz);}}
  else if(this.panDrag){const dx=e.clientX-this.panDrag.x,dy=e.clientY-this.panDrag.y,c=this.topCamera;const scale=(c.top-c.bottom)/c.zoom/this.host.clientHeight;c.position.x-=dx*scale;c.position.z-=dy*scale;this.panDrag={x:e.clientX,y:e.clientY};}
  else if(this.lookDrag){this.walkYaw+=(e.clientX-this.lookDrag.x)*.003;this.walkPitch=T.MathUtils.clamp(this.walkPitch+(e.clientY-this.lookDrag.y)*.003,-1.2,1.2);this.lookDrag={x:e.clientX,y:e.clientY};}
 });
 const release=e=>{if(!this.down||e.pointerId!==this.down.id)return;const click=!this.down.moved;if(this.drag?.moved)this.onDragEnd();this.drag=null;if(click){const hit=this.pick(e);if(hit){this.onSelect(hit.id);if(this.actions.has(hit.id))this.onOperate(hit.id);}}this.cancelGesture();if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
 canvas.addEventListener('pointerup',release);
 canvas.addEventListener('pointercancel',this.cancelGesture);
 canvas.addEventListener('lostpointercapture',this.cancelGesture);
 window.addEventListener('pointerup',()=>this.cancelGesture());
 window.addEventListener('blur',()=>{this.cancelGesture();this.keys.clear();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){this.cancelGesture();this.keys.clear();}});
 canvas.addEventListener('wheel',e=>{if(this.mode==='top'){e.preventDefault();this.topCamera.zoom=T.MathUtils.clamp(this.topCamera.zoom*(e.deltaY>0?.92:1.08),.55,4);this.topCamera.updateProjectionMatrix();}else if(this.mode==='walk'){e.preventDefault();this.camera.fov=T.MathUtils.clamp(this.camera.fov+e.deltaY*.025,45,95);this.camera.updateProjectionMatrix();this.onFov?.(this.camera.fov);}},{passive:false});
 window.addEventListener('keydown',e=>{if(e.code==='Escape'&&!document.querySelector('dialog[open]')){this.keys.clear();this.onSelect(null);e.target?.blur?.();return;}if(this.items.some(f=>f.id===this.selected)&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&!['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();this.keys.clear();this.onNudge?.(this.selected,e.code,e.shiftKey);return;}if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||document.querySelector('dialog[open]'))return;if(this.mode==='walk'&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();this.keys.add(e.code);}if(e.code==='KeyE'&&!e.repeat&&this.selected)this.onOperate(this.selected);});
 window.addEventListener('keyup',e=>this.keys.delete(e.code));
 }
 updateGrid(){if(!this.snapGrid){this.snapGrid=new T.GridHelper(12,240,0x688679,0x91aaa0);this.snapGrid.position.set(4,.042,4);this.snapGrid.material.transparent=true;this.snapGrid.material.opacity=.32;this.snapGrid.material.depthWrite=false;this.scene.add(this.snapGrid);}this.snapGrid.visible=this.mode==='top'&&this.snapEnabled!==false;}
 moveItem(f){let g=this.groups.get(f.id);g.position.set(f.x,0,f.z);g.rotation.y=f.rot*Math.PI/180;this.selection?.update();}
 walkObstacles(includeDoors=true){
 const obstacles=[...this.collisionWalls,...this.items.filter(f=>blocksCamera(f,this.eye))];
 for(const a of this.actions.values()){
  if(a.type==='door'){obstacles.push(...doorRects(a.def,includeDoors?a.amount:1));continue;}
  if(!a.item||a.amount<=.01||!blocksCamera(a.item,this.eye))continue;
  const f=a.item,ang=f.rot*Math.PI/180,local=(x,z)=>({x:f.x+x*Math.cos(ang)+z*Math.sin(ang),z:f.z-x*Math.sin(ang)+z*Math.cos(ang)});
  if(['drawer','cabdrawer'].includes(a.type)){const p=local(0,f.d/2+a.amount*a.travel/2);obstacles.push({...p,w:f.w*.8,d:a.amount*a.travel,rot:f.rot});}
    if(a.type==='cabinet')obstacles.push(...cabinetRects(f,a.amount));
    if(a.type==='washer'){const p=local(0,f.d/2+.15);obstacles.push({...p,w:f.w,d:.35,rot:f.rot});}
 }
 return obstacles;
 }
 canWalk(x,z){return pointClear(x,z,this.walkObstacles());}
 ensureSafeCamera(){
  if(this.mode!=='walk')return;
  const p=this.camera.position,obstacles=this.walkObstacles();if(pointClear(p.x,p.z,obstacles))return;
  const room=roomAt(p.x,p.z);for(let r=.05;r<3;r+=.05)for(let i=0;i<48;i++){const x=p.x+Math.cos(i*Math.PI/24)*r,z=p.z+Math.sin(i*Math.PI/24)*r;if(roomAt(x,z)===room&&pointClear(x,z,obstacles)){p.x=x;p.z=z;this.stopTour();return;}}
  this.onNavigationNotice?.('這個房間目前沒有安全站位，請先調整家具配置。');this.setMode('orbit');
 }
 stopTour(){this.route=[];this.routeWait=0;this.onRouteChange?.(false);}
 startTour(goal){
  this.ensureSafeCamera();const p=this.camera.position,obstacles=this.walkObstacles(false),clear=(x,z)=>pointClear(x,z,obstacles),path=findRoute({x:p.x,z:p.z},goal,clear);
  if(!path){this.onNavigationNotice?.('目前配置沒有可通行路線，請先移開擋路家具。');return false;}
  this.route=path;this.routeWait=0;this.keys.clear();
  for(const d of doors)if(path.some(point=>Math.hypot(point.x-d.x,point.z-d.z)<1.2)||path.some((point,i)=>{const from=i?path[i-1]:p,dx=point.x-from.x,dz=point.z-from.z,t=Math.max(0,Math.min(1,((d.x-from.x)*dx+(d.z-from.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(d.x-from.x-t*dx,d.z-from.z-t*dz)<1.3;}))this.openStates[d.id]=1;
  this.onDoorOpen?.();this.onRouteChange?.(true);return true;
 }
 followTour(dt){
  if(!this.route?.length)return false;if(this.keys.size){this.stopTour();return false;}
  const p=this.camera.position,target=this.route[0],dx=target.x-p.x,dz=target.z-p.z,len=Math.hypot(dx,dz);if(len<1e-5){this.route.shift();if(!this.route.length)this.stopTour();return true;}
  const step=Math.min(len,dt*1.2),x=p.x+dx/len*step,z=p.z+dz/len*step;
  if(this.canWalk(x,z)){p.x=x;p.z=z;this.routeWait=0;const yaw=Math.atan2(-dx,-dz),delta=Math.atan2(Math.sin(yaw-this.walkYaw),Math.cos(yaw-this.walkYaw));this.walkYaw+=delta*Math.min(1,dt*5);}else{this.routeWait+=dt;if(this.routeWait>2){this.stopTour();this.onNavigationNotice?.('路線被開啟的門片或家具擋住，請調整後再前往。');}}
  return true;
 }
 frame(){let dt=Math.min(this.clock.getDelta(),.04);if(this.mode==='orbit')this.controls.update();if(this.mode==='walk'){this.ensureSafeCamera();this.followTour(dt);const forward=(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)-(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0),side=(this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0),norm=Math.max(1,Math.hypot(forward,side)),speed=dt*1.5/norm;this.walkYaw+=((this.keys.has('ArrowLeft')?1:0)-(this.keys.has('ArrowRight')?1:0))*dt*1.3;let dx=(-Math.sin(this.walkYaw)*forward+Math.cos(this.walkYaw)*side)*speed,dz=(-Math.cos(this.walkYaw)*forward-Math.sin(this.walkYaw)*side)*speed;let p=this.camera.position;if(this.canWalk(p.x+dx,p.z))p.x+=dx;if(this.canWalk(p.x,p.z+dz))p.z+=dz;p.y=this.eye;this.camera.rotation.order='YXZ';this.camera.rotation.set(this.walkPitch,this.walkYaw,0);}
 for(const [id,a]of this.actions){let target=a.item?a.item.open||0:this.openStates[id]||0;a.amount=T.MathUtils.damp(a.amount,target,7,dt);if(a.type==='door')a.pivot.rotation.y=a.def.swing*a.amount*(a.def.maxAngle??89)*Math.PI/180;if(a.type==='washer')a.pivot.rotation.y=-a.amount*Math.PI*.5;if(a.type==='cabinet')a.pivots.forEach(p=>p.rotation.y=(p.userData.swing??-1)*a.amount*Math.PI*.5);if(a.type==='cabdrawer')a.pivots.forEach(p=>p.position.z=a.base+a.amount*a.travel);if(a.type==='drawer')a.pivot.position.z=a.base+a.amount*a.travel;if(a.type==='curtain')for(const p of a.panels){let factor=1-.8*a.amount;p.g.scale.x=factor;p.g.position.x=p.sign<0?-a.width/2:a.width/2-a.width/2*factor;}}
 this.selection?.update();this.renderer.render(this.scene,this.activeCamera);this.onFrame?.();}
 dispose(){this.renderer.setAnimationLoop(null);this.renderer.dispose();}
}
