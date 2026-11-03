import * as THREE from 'three';
import {M} from './textures.js';

/* =========================================================
   通用工具：自适应 UV 的几何体（全场景统一 texel 密度）
   ========================================================= */
export const TILE=2.2; // 每 TILE 米贴一张图

/** 依面板尺寸重写 BoxGeometry 的 uv，使贴图密度一致 */
export function boxUV(geo,w,h,d){
  const uv=geo.attributes.uv, pos=geo.attributes.position;
  // BoxGeometry 每组面的世界尺寸
  const faces=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let f=0;f<6;f++){
    const[fw,fh]=faces[f];
    for(let i=0;i<4;i++){
      const idx=f*4+i;
      const u=uv.getX(idx),v=uv.getY(idx);
      uv.setXY(idx,u*fw/TILE,v*fh/TILE);
    }
  }
  uv.needsUpdate=true;
  return geo;
}
export function box(w,h,d,tile=true){
  const g=new THREE.BoxGeometry(w,h,d);
  if(tile)boxUV(g,w,h,d);
  return g;
}
export function plane(w,h,tile=true){
  const g=new THREE.PlaneGeometry(w,h);
  if(tile){const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/TILE,uv.getY(i)*h/TILE);}
  return g;
}

/* =========================================================
   共享材质
   ========================================================= */
const S=(map,o={})=>new THREE.MeshStandardMaterial({map,bumpMap:map,bumpScale:o.bump??.012,
  roughness:o.rough??.82,metalness:o.metal??0,color:o.color??0xffffff,
  transparent:o.transparent||false,opacity:o.opacity??1,side:o.side||THREE.FrontSide,
  emissive:o.emissive??0x000000,emissiveIntensity:o.ei??1,
  flatShading:o.flat||false,...(o.extra||{})});

export const MAT={};
function initMAT(){
  if(MAT.brick)return;
  MAT.brick=S(M.blueBrick,{rough:.95,bump:.03});
  MAT.stone=S(M.flagstone,{rough:.9,bump:.026});
  MAT.earth=S(M.earth,{rough:1,bump:.03});
  MAT.plaster=S(M.plaster,{rough:.93,bump:.018});
  MAT.redLac=S(M.redLacquer,{rough:.42,bump:.01});
  MAT.redLacDark=S(M.redLacquerDark,{rough:.5,bump:.012});
  MAT.blackLac=S(M.blackLacquer,{rough:.3,bump:.008});
  MAT.wood=S(M.wood,{rough:.78,bump:.016});
  MAT.woodDark=new THREE.MeshStandardMaterial({map:M.wood,bumpMap:M.wood,bumpScale:.016,roughness:.8,color:0x7a6248});
  MAT.paper=S(M.ricePaper,{rough:1,bump:.006});
  MAT.silk=S(M.silkRed,{rough:.55,bump:.01,side:THREE.DoubleSide});
  MAT.tile=S(M.roofTile,{rough:.72,bump:.03});
  MAT.bronze=new THREE.MeshStandardMaterial({map:M.bronze,roughness:.4,metalness:.85,bumpMap:M.bronze,bumpScale:.01});
  MAT.bronzeOld=new THREE.MeshStandardMaterial({map:M.bronze,roughness:.72,metalness:.5,color:0xa89a72});
  MAT.gold=new THREE.MeshStandardMaterial({color:0xc9a24a,roughness:.3,metalness:.9});
  MAT.jade=new THREE.MeshStandardMaterial({color:0x9ec9b8,roughness:.28,metalness:.12});
  MAT.joss=new THREE.MeshStandardMaterial({map:M.jossPaper,roughness:1,side:THREE.DoubleSide});
}

/* 火焰 / 光斑 sprite 贴图 */
let GLOW_TEX=null;
export function glowTex(){
  if(GLOW_TEX)return GLOW_TEX;
  const s=128,c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d');
  const rg=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  rg.addColorStop(0,'rgba(255,240,200,1)');rg.addColorStop(.18,'rgba(255,190,90,.85)');
  rg.addColorStop(.45,'rgba(220,110,40,.35)');rg.addColorStop(1,'rgba(120,40,10,0)');
  g.fillStyle=rg;g.fillRect(0,0,s,s);
  GLOW_TEX=new THREE.CanvasTexture(c);GLOW_TEX.colorSpace=THREE.SRGBColorSpace;return GLOW_TEX;
}
let FLAME_TEX=null;
export function flameTex(){
  if(FLAME_TEX)return FLAME_TEX;
  const w=64,h=128,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
  g.clearRect(0,0,w,h);
  for(let i=0;i<26;i++){
    const t=i/26,y=h-6-t*h*.86,r=(1-t)*13+3;
    g.fillStyle=`rgba(${255},${230-t*140|0},${120-t*110|0},${.5-t*.4})`;
    g.beginPath();g.ellipse(w/2+(Math.sin(t*7)*2.5),y,r*(1-t*.3),r*1.5,0,0,7);g.fill();
  }
  g.fillStyle='rgba(255,255,235,.85)';g.beginPath();g.ellipse(w/2,h-24,4.5,9,0,0,7);g.fill();
  g.fillStyle='rgba(120,170,255,.45)';g.beginPath();g.ellipse(w/2,h-10,5,7,0,0,7);g.fill();
  FLAME_TEX=new THREE.CanvasTexture(c);FLAME_TEX.colorSpace=THREE.SRGBColorSpace;return FLAME_TEX;
}

/* =========================================================
   构件工厂
   ========================================================= */
export class Parts{
  constructor(){initMAT();this.mat={...MAT};this.animated=[];
    // 画质档位：低配时点光源有预算上限，其余物件只靠自发光撑场面
    this.quality={propLights:99,lanternGlow:true};this._lights=0;}
  /** 申请一个动态点光源；预算用尽则返回 null，调用方须能没有它照样工作 */
  askLight(){
    if(this._lights>=this.quality.propLights)return null;
    this._lights++;return true;
  }
  /* ---- 木柱 + 柱础 ---- */
  pillar(r=.22,h=3.4,{red=true}={}){
    const g=new THREE.Group();
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(r*.86,r,h,14,1),red?this.mat.redLac:this.mat.wood);
    shaft.position.y=h/2;shaft.castShadow=true;g.add(shaft);
    const base=new THREE.Mesh(new THREE.CylinderGeometry(r*1.55,r*1.75,.34,12),this.mat.stone);
    base.position.y=.17;g.add(base);
    const collar=new THREE.Mesh(new THREE.CylinderGeometry(r*1.2,r*1.15,.2,12),this.mat.gold);
    collar.position.y=h-.12;g.add(collar);
    return g;
  }
  /* ---- 横梁 ---- */
  beam(len,dir='x',{h=.34,w=.26,y=3.3,red=true}={}){
    const geo=box(dir==='x'?len:w, h, dir==='x'?w:len);
    const m=new THREE.Mesh(geo,red?this.mat.redLacDark:this.mat.wood);
    m.position.set(0,y,0);m.castShadow=true;return m;
  }
  /* ---- 斗拱 ---- */
  dougong(scale=1){
    const g=new THREE.Group();const mm=this.mat.redLacDark;
    const layers=[[.5,.16,.5],[.78,.13,.34],[.5,.13,.78],[.98,.11,.32]];
    let y=0;
    layers.forEach((d,i)=>{
      const m=new THREE.Mesh(box(d[0],d[1],d[2]),mm);
      m.position.y=y+d[1]/2;m.rotation.y=(i%2)*Math.PI/2;g.add(m);y+=d[1];
    });
    // 翘出的拱
    for(const s of[-1,1]){
      const arm=new THREE.Mesh(box(.12,.1,.72),mm);
      arm.position.set(s*.42,y-.14,0);arm.rotation.x=s*.16;g.add(arm);
    }
    g.scale.setScalar(scale);return g;
  }
  /* ---- 墙体（可留门洞窗洞）---- */
  wall(w,h,{thick=.28,mat='plaster',openings=[],top=false}={}){
    const g=new THREE.Group();
    const m=typeof mat==='string'?this.mat[mat]:mat;
    // 依开口切分为若干段
    const segs=[];let cursor=0;
    const sorted=[...openings].sort((a,b)=>a.x-b.x);
    for(const o of sorted){
      if(o.x-cursor>0.001)segs.push({x:cursor,w:o.x-cursor,from:0,to:h});
      if(o.bottom>0)segs.push({x:o.x,w:o.w,from:0,to:o.bottom});
      if(o.top<h)segs.push({x:o.x,w:o.w,from:o.top??Math.min(h,o.bottom+2.2),to:h});
      cursor=o.x+o.w;
    }
    if(cursor<w-0.001)segs.push({x:cursor,w:w-cursor,from:0,to:h});
    segs.forEach(s=>{
      const hh=s.to-s.from;if(hh<=0.001)return;
      const mesh=new THREE.Mesh(box(s.w,hh,thick),m);
      mesh.position.set(-w/2+s.x+s.w/2, s.from+hh/2, 0);
      mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);
    });
    if(top){
      const cap=new THREE.Mesh(box(w+.3,.22,thick+.16),this.mat.tile);
      cap.position.y=h+.1;g.add(cap);
    }
    return g;
  }
  /* ---- 屋顶（举折 + 翘角）---- */
  roof(w,d,{ridge=1.45,upturn=.5,thick=.16,dir='z'}={}){
    const g=new THREE.Group();
    const NX=26,NZ=14;
    const geo=new THREE.BufferGeometry();
    const pos=[],uvs=[],idx=[];
    const prof=t=>ridge*Math.pow(1-t,1.55)+upturn*Math.pow(t,7)*3.2;
    const camberOf=xn=>-0.10*Math.pow(xn*2,2)*(d*.1);
    // 上下两层壳
    const build=(sign)=>{
      const start=pos.length/3;
      for(let iz=0;iz<=NZ;iz++){
        const z=(iz/NZ-.5)*d,tz=Math.abs(z)/(d/2);
        for(let ix=0;ix<=NX;ix++){
          const xn=ix/NX-.5,x=xn*w;
          const y=prof(tz)+camberOf(xn)-sign*thick;
          pos.push(x,y,z);uvs.push(x/TILE,(z+d/2)/TILE);
        }
      }
      for(let iz=0;iz<NZ;iz++)for(let ix=0;ix<NX;ix++){
        const a=start+iz*(NX+1)+ix,b=a+1,c=a+NX+1,e=c+1;
        if(sign>0)idx.push(a,c,b, b,c,e);
        else idx.push(a,b,c, b,e,c);
      }
    };
    build(1);build(-1);
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    geo.setIndex(idx);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,this.mat.tile);
    mesh.castShadow=false;mesh.receiveShadow=true;g.add(mesh);
    // 正脊
    const spine=new THREE.Mesh(box(w*1.02,.3,.36),this.mat.blackLac);
    spine.position.y=ridge+.14;g.add(spine);
    const spineTop=new THREE.Mesh(box(w*1.04,.12,.5),this.mat.gold);
    spineTop.position.y=ridge+.34;g.add(spineTop);
    // 吻兽
    for(const s of[-1,1]){
      const horn=new THREE.Mesh(new THREE.ConeGeometry(.16,.6,6),this.mat.blackLac);
      horn.position.set(s*w/2*1.0,ridge+.42,0);horn.rotation.z=-s*.5;g.add(horn);
    }
    // 檐口瓦当
    for(let i=0;i<=Math.floor(w/.34);i++){
      const x=-w/2+i*(w/Math.floor(w/.34));
      for(const s of[-1,1]){
        const z=s*(d/2+.05);
        const e=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.06,8),this.mat.stone);
        e.rotation.x=Math.PI/2;e.position.set(x,prof(1)-.06,z);g.add(e);
      }
    }
    // 檐角起翘（飞檐木）
    for(const sx of[-1,1])for(const sz of[-1,1]){
      const tip=new THREE.Mesh(box(.16,.1,.9),this.mat.redLacDark);
      tip.position.set(sx*(w/2-.2),prof(1)+.16,sz*(d/2-.1));
      tip.rotation.y=sx*sz*.6;tip.rotation.x=-sz*.42;g.add(tip);
      const bead=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),this.mat.gold);
      bead.position.set(sx*(w/2-.05),prof(1)+.3,sz*(d/2+.15));g.add(bead);
    }
    if(dir==='x')g.rotation.y=Math.PI/2;
    return g;
  }
  /* ---- 雕花窗（步步锦 / 冰裂）---- */
  window(w=1.5,h=1.6,{type='bu',lit=false,y=1.55,thick=.1}={}){
    const g=new THREE.Group();
    const frameMat=this.mat.woodDark;
    // 框
    [[w,.1,.5,0],[w,.1,-.5,0]].forEach(([fw,fh,px,py])=>{});
    const mk=(bw,bh,bd,x,y)=>{const m=new THREE.Mesh(box(bw,bh,bd, false),frameMat);m.position.set(x,y,0);g.add(m);};
    mk(w,.1,thick,0,h/2);mk(w,.1,thick,0,-h/2);mk(.1,h,thick,-w/2,0);mk(.1,h,thick,w/2,0);
    // 芯
    const bars=new THREE.Group();
    const bt=this.mat.woodDark;
    if(type==='bu'){
      for(let i=1;i<4;i++){const m=new THREE.Mesh(box(.04,h,.06,false),bt);m.position.x=-w/2+i*w/4;bars.add(m);}
      for(let i=1;i<3;i++){const m=new THREE.Mesh(box(w,.04,.06,false),bt);m.position.y=-h/2+i*h/3;bars.add(m);}
      for(let i=0;i<4;i++)for(let j=0;j<2;j++){
        if((i+j)%2)continue;
        const m=new THREE.Mesh(box(w/4-.06,.04,.06,false),bt);
        m.position.set(-w*3/8+i*w/4, j?h/4:-h/4, 0);bars.add(m);
      }
    }else if(type==='crack'){
      const rng=()=>Math.random();
      for(let i=0;i<9;i++){
        const x1=(rng()-.5)*w*.94,y1=(rng()-.5)*h*.94,x2=(rng()-.5)*w*.94,y2=(rng()-.5)*h*.94;
        const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);
        const m=new THREE.Mesh(box(.035,len,.05,false),bt);
        m.position.set((x1+x2)/2,(y1+y2)/2,0);m.rotation.z=-Math.atan2(dy,dx)+Math.PI/2;bars.add(m);
      }
    }else{
      for(let i=1;i<7;i++){const m=new THREE.Mesh(box(.03,h,.05,false),bt);m.position.x=-w/2+i*w/7;bars.add(m);}
    }
    g.add(bars);
    // 绢纱
    const silkMat=new THREE.MeshStandardMaterial({color:0xd8cdb0,transparent:true,opacity:lit?.55:.34,
      roughness:1,side:THREE.DoubleSide,emissive:lit?0x6b5a34:0x000000,emissiveIntensity:.5});
    const silk=new THREE.Mesh(plane(w-.06,h-.06,false),silkMat);
    silk.position.z=-.02;g.add(silk);
    g.position.y=y;
    g.userData.silk=silkMat;
    return g;
  }
  /* ---- 红灯笼 ---- */
  lantern({color=[196,32,26],glyph='囍',lit=true,r=.3,hh=.42,tassel=true,seal=true}={}){
    const g=new THREE.Group();
    const tex=M.lantern(glyph,color);
    const mat=new THREE.MeshStandardMaterial({map:tex,roughness:.85,
      emissive:new THREE.Color(`rgb(${color[0]},${color[1]},${color[2]})`),emissiveIntensity:lit?.85:0.05,
      emissiveMap:tex,transparent:false});
    const body=new THREE.Mesh(new THREE.SphereGeometry(r,20,14),mat);
    body.scale.y=hh/r*0.95;g.add(body);
    // 骨架
    for(let i=0;i<8;i++){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(r*.99,.012,4,20),this.mat.gold);
      ring.rotation.x=Math.PI/2;ring.position.y=(i/7-.5)*hh*1.5;
      ring.scale.setScalar(Math.sqrt(Math.max(.02,1-Math.pow((i/7-.5)*2,2))));
      g.add(ring);
    }
    const capT=new THREE.Mesh(new THREE.CylinderGeometry(r*.42,r*.5,.07,12),this.mat.gold);
    capT.position.y=hh*.95;g.add(capT);
    const capB=new THREE.Mesh(new THREE.CylinderGeometry(r*.5,r*.42,.07,12),this.mat.gold);
    capB.position.y=-hh*.95;g.add(capB);
    const hook=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.3,4),this.mat.blackLac);
    hook.position.y=hh+.18;g.add(hook);
    if(tassel){
      const t=new THREE.Mesh(new THREE.CylinderGeometry(.035,.055,.2,8),new THREE.MeshStandardMaterial({color:0xd8b23a,roughness:.7}));
      t.position.y=-hh-.16;g.add(t);
      for(let i=0;i<7;i++){
        const s=new THREE.Mesh(box(.012,.3,.012,false),new THREE.MeshStandardMaterial({color:0xc8201a,roughness:.9}));
        const a=i/7*Math.PI*2;s.position.set(Math.cos(a)*.03,-hh-.4,Math.sin(a)*.03);g.add(s);
      }
    }
    let light=null;
    if(lit){
      if(this.askLight()){
        light=new THREE.PointLight(new THREE.Color(`rgb(255,${150+color[1]|0},${80})`),8,11,1.5);
        light.position.y=0;g.add(light);
      }
      if(this.quality.lanternGlow){
        const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(),color:0xffb45a,
          blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:.5}));
        gl.scale.setScalar(r*6);g.add(gl);
        g.userData.glow=gl;
      }
    }
    g.userData.light=light;g.userData.mat=mat;g.userData.baseInt=lit?8:0;
    return g;
  }
  /* ---- 蜡烛 ---- */
  candle(h=.3,{r=.035,wax=0xd8c0a0,molten=true}={}){
    const g=new THREE.Group();
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.12,h,10),
      new THREE.MeshStandardMaterial({color:wax,roughness:.62,transparent:true,opacity:.96}));
    m.position.y=h/2;g.add(m);
    const drip=new THREE.Mesh(new THREE.SphereGeometry(r*1.35,8,6,0,Math.PI*2,0,Math.PI*.6),m.material);
    drip.position.set(r*.7,h*.72,0);drip.scale.y=1.8;g.add(drip);
    const wick=new THREE.Mesh(box(.008,.05,.008,false),new THREE.MeshBasicMaterial({color:0x201410}));
    wick.position.y=h+.02;g.add(wick);
    const flame=new THREE.Sprite(new THREE.SpriteMaterial({map:flameTex(),color:0xffffff,
      blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:.95}));
    flame.scale.set(.11,.2,1);flame.position.y=h+.12;g.add(flame);
    const light=this.askLight()?new THREE.PointLight(0xffa04a,4.6,6.5,1.7):null;
    if(light){light.position.y=h+.12;g.add(light);}
    this.animated.push({type:"flame",flame,light,seed:Math.random()*9,base:4.6});
    g.userData.flame=flame;g.userData.light=light;
    return g;
  }
  /* ---- 香炉 + 烟 ---- */
  incenseBurner({r=.32,legs=3,incense=3}={}){
    const g=new THREE.Group();
    const prof=[];
    for(let i=0;i<=12;i++){const t=i/12;prof.push(new THREE.Vector2(Math.sin(t*Math.PI*.82+.16)*r*1.05+.02, t*r*1.25));}
    const bowl=new THREE.Mesh(new THREE.LatheGeometry(prof,22),this.mat.bronzeOld);
    g.add(bowl);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(r*1.02,.03,6,20),this.mat.bronze);
    rim.rotation.x=Math.PI/2;rim.position.y=r*1.26;g.add(rim);
    for(let i=0;i<legs;i++){
      const a=i/legs*Math.PI*2;
      const leg=new THREE.Mesh(new THREE.CylinderGeometry(.04,.06,.22,7),this.mat.bronze);
      leg.position.set(Math.cos(a)*r*.7,.03,Math.sin(a)*r*.7);g.add(leg);
      const foot=new THREE.Mesh(new THREE.SphereGeometry(.06,8,6),this.mat.bronze);
      foot.position.set(Math.cos(a)*r*.78,-.06,Math.sin(a)*r*.78);g.add(foot);
    }
    for(const s of[-1,1]){
      const ear=new THREE.Mesh(new THREE.TorusGeometry(.1,.028,5,12,Math.PI),this.mat.bronze);
      ear.position.set(s*r*1.05,r*.9,0);ear.rotation.z=s*Math.PI/2;g.add(ear);
    }
    const ash=new THREE.Mesh(new THREE.CylinderGeometry(r*.92,r*.92,.05,16),
      new THREE.MeshStandardMaterial({color:0x9a9186,roughness:1}));
    ash.position.y=r*1.1;g.add(ash);
    for(let i=0;i<incense;i++){
      const st=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,.34,5),
        new THREE.MeshStandardMaterial({color:0x6a4a2c,roughness:.9}));
      const a=Math.random()*7,rr=Math.random()*r*.55;
      st.position.set(Math.cos(a)*rr,r*1.1+.17,Math.sin(a)*rr);
      st.rotation.x=(Math.random()-.5)*.2;st.rotation.z=(Math.random()-.5)*.2;g.add(st);
      const ember=new THREE.Mesh(new THREE.SphereGeometry(.011,6,5),
        new THREE.MeshBasicMaterial({color:0xff6a20}));
      ember.position.set(st.position.x,st.position.y+.175,st.position.z);g.add(ember);
      this.animated.push({type:'ember',mesh:ember,seed:Math.random()*9});
      const smoke=this.smokeColumn(1.2);smoke.position.set(st.position.x,r*1.1+.36,st.position.z);g.add(smoke);
    }
    return g;
  }
  smokeColumn(h=1){
    const n=26,geo=new THREE.BufferGeometry(),p=new Float32Array(n*3),sd=[];
    for(let i=0;i<n;i++){p[i*3]=0;p[i*3+1]=Math.random()*h;p[i*3+2]=0;sd.push({off:Math.random()*7,sp:.2+Math.random()*.4,y0:Math.random()*h});}
    geo.setAttribute('position',new THREE.BufferAttribute(p,3));
    const mat=new THREE.PointsMaterial({size:.1,map:glowTex(),color:0xb9b1a2,transparent:true,
      opacity:.14,depthWrite:false,sizeAttenuation:true,blending:THREE.NormalBlending});
    const pts=new THREE.Points(geo,mat);pts.userData.sd=sd;pts.userData.h=h;
    this.animated.push({type:'smoke',pts,mat});
    return pts;
  }
  /* ---- 牌位 ---- */
  tablet(text,{hh=.42,sealText='忌',color='#e6cd8a'}={}){
    const g=new THREE.Group();
    const w=hh*.5;
    const face=M.tablet(text,{sealText,color});
    const fm=new THREE.MeshStandardMaterial({map:face,roughness:.5,bumpMap:face,bumpScale:.006});
    const bm=new THREE.Mesh(box(w,hh,.05),this.mat.blackLac);
    bm.position.y=hh/2;g.add(bm);
    const f=new THREE.Mesh(new THREE.PlaneGeometry(w*.92,hh*.92),fm);
    f.position.set(0,hh/2,.028);g.add(f);
    fb(f,w,hh*0.92);
    const foot=new THREE.Mesh(box(w*1.3,.08,.16),this.mat.woodDark);
    foot.position.y=.02;g.add(foot);
    g.userData.front=f;g.userData.faceMat=fm;
    return g;
  }
  /* ---- 供桌 / 条案 ---- */
  altarTable(w=2.4,d=.8,h=.95,{red=true,drawers=2}={}){
    const g=new THREE.Group();
    const top=new THREE.Mesh(box(w+.16,.09,d+.12),red?this.mat.redLac:this.mat.wood);
    top.position.y=h;top.castShadow=top.receiveShadow=true;g.add(top);
    const apron=new THREE.Mesh(box(w,.18,d-.1,false),red?this.mat.redLacDark:this.mat.woodDark);
    apron.position.y=h-.14;g.add(apron);
    const legM=red?this.mat.redLacDark:this.mat.woodDark;
    for(const sx of[-1,1])for(const sz of[-1,1]){
      const l=new THREE.Mesh(box(.11,h-.2,.11,false),legM);
      l.position.set(sx*(w/2-.12),(h-.2)/2,sz*(d/2-.12));l.castShadow=true;g.add(l);
      const foot=new THREE.Mesh(box(.17,.07,.17,false),legM);
      foot.position.set(l.position.x,.035,l.position.z);g.add(foot);
    }
    const shelf=new THREE.Mesh(box(w-.2,.05,d-.2,false),legM);
    shelf.position.y=.3;g.add(shelf);
    for(let i=0;i<drawers;i++){
      const dw=w/drawers*.8,x=-w/2+w*(i+.5)/drawers;
      const dr=new THREE.Mesh(box(dw,h*.42,.05,false),this.mat.blackLac);
      dr.position.set(x,h*.42/2+.28,d/2+.03);g.add(dr);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.045,.012,5,12),this.mat.bronze);
      ring.position.set(x,h*.42/2+.28,d/2+.06);g.add(ring);
      g.userData['drawer'+i]=dr;
    }
    // 桌围（绣缎）
    const skirt=new THREE.Mesh(plane(w+.16,.5,false),new THREE.MeshStandardMaterial({map:M.silkRed.clone(),roughness:.6,side:THREE.DoubleSide}));
    skirt.material.map.repeat.set(1,.4);
    skirt.position.set(0,h-.3,d/2+.09);g.add(skirt);
    return g;
  }
  /* ---- 太师椅 ---- */
  chair({red=true}={}){
    const g=new THREE.Group();const m=red?this.mat.redLacDark:this.mat.wood;
    const seat=new THREE.Mesh(box(.46,.06,.44),m);seat.position.y=.46;g.add(seat);
    const back=new THREE.Mesh(box(.46,.62,.05,false),m);back.position.set(0,.82,-.2);g.add(back);
    const crest=new THREE.Mesh(box(.52,.09,.09,false),m);crest.position.set(0,1.14,-.2);g.add(crest);
    for(const sx of[-1,1]){
      const arm=new THREE.Mesh(box(.05,.05,.4,false),m);arm.position.set(sx*.24,.66,-.02);g.add(arm);
      const sup=new THREE.Mesh(box(.05,.24,.05,false),m);sup.position.set(sx*.24,.55,.15);g.add(sup);
    }
    for(const sx of[-1,1])for(const sz of[-1,1]){
      const l=new THREE.Mesh(box(.06,.46,.06,false),m);l.position.set(sx*.2,.23,sz*.2);g.add(l);
    }
    const carved=new THREE.Mesh(plane(.36,.4,false),this.mat.blackLac);
    carved.position.set(0,.84,-.17);g.add(carved);
    return g;
  }
  /* ---- 棺材（中式头大尾小）---- */
  coffin(l=2.2,w=.72,{open=false,red=true}={}){
    const g=new THREE.Group();
    const shape=new THREE.Shape();
    const hw=w/2,hl=l/2;
    shape.moveTo(-hw*.78,-hl);
    shape.quadraticCurveTo(-hw,-hl*.35,-hw*.98,hl*.1);
    shape.quadraticCurveTo(-hw*.7,hl*.94,0,hl);
    shape.quadraticCurveTo(hw*.7,hl*.94,hw*.98,hl*.1);
    shape.quadraticCurveTo(hw,-hl*.35,hw*.78,-hl);
    shape.lineTo(-hw*.78,-hl);
    const baseH=.42;
    const extrude=new THREE.ExtrudeGeometry(shape,{depth:baseH,bevelEnabled:true,bevelSize:.03,bevelThickness:.03,bevelSegments:2,steps:1});
    extrude.rotateX(-Math.PI/2);extrude.rotateY(Math.PI/2);
    const body=new THREE.Mesh(extrude,red?this.mat.redLacDark:this.mat.blackLac);
    body.castShadow=body.receiveShadow=true;g.add(body);
    if(!open){
      const lid=new THREE.ExtrudeGeometry(shape,{depth:.14,bevelEnabled:true,bevelSize:.05,bevelThickness:.04,bevelSegments:2});
      lid.rotateX(-Math.PI/2);lid.rotateY(Math.PI/2);
      const lm=new THREE.Mesh(lid,red?this.mat.redLac:this.mat.blackLac);
      lm.position.y=baseH-.04;lm.castShadow=true;g.add(lm);
      g.userData.lid=lm;
      for(let i=0;i<5;i++){const t=i/4-.5;
        const nail=new THREE.Mesh(new THREE.SphereGeometry(.028,6,5),this.mat.bronze);
        nail.position.set(0,baseH+.1,t*l*.7);g.add(nail);}
    }else{
      const lining=new THREE.Mesh(box(w*.8,.06,l*.86,false),this.mat.silk);
      lining.position.y=.2;g.add(lining);
      g.userData.lid=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.14,bevelEnabled:true,bevelSize:.05,bevelThickness:.04}),red?this.mat.redLac:this.mat.blackLac);
      g.userData.lid.geometry.rotateX(-Math.PI/2);g.userData.lid.geometry.rotateY(Math.PI/2);
      g.userData.lid.position.set(w*.9,baseH*.6,0);g.userData.lid.rotation.z=-.9;g.add(g.userData.lid);
    }
    // 棺环
    for(const sz of[-1,1]){
      const r=new THREE.Mesh(new THREE.TorusGeometry(.07,.018,6,14),this.mat.bronze);
      r.position.set(0,baseH*.55,sz*hl*.95);r.rotation.y=Math.PI/2;g.add(r);
    }
    return g;
  }
  /* ---- 纸扎人 ---- */
  paperDoll(h=1.6,{color=0xd8d2c4,face=0,dress=null,arms='down'}={}){
    const g=new THREE.Group();
    const paper=new THREE.MeshStandardMaterial({map:M.ricePaper,color,roughness:.95,side:THREE.DoubleSide});
    const cloth=dress?new THREE.MeshStandardMaterial({map:M.silkRed,color:dress,roughness:.7,side:THREE.DoubleSide}):paper;
    const body=new THREE.Mesh(new THREE.CylinderGeometry(h*.11,h*.2,h*.62,8,1,true),cloth);
    body.position.y=h*.36;g.add(body);
    const skirt=new THREE.Mesh(new THREE.CylinderGeometry(h*.2,h*.27,h*.2,10,1,true),cloth);
    skirt.position.y=h*.09;g.add(skirt);
    const head=new THREE.Mesh(new THREE.SphereGeometry(h*.115,14,12),paper);
    head.position.y=h*.79;head.scale.set(.88,1.1,.86);g.add(head);
    const faceTex=M.dollFace(face);
    const fm=new THREE.MeshBasicMaterial({map:faceTex,transparent:true,alphaTest:.42});
    const fr=new THREE.Mesh(new THREE.PlaneGeometry(h*.155,h*.206),fm);
    fr.position.set(0,h*.80,h*.098);g.add(fr);
    const hair=new THREE.Mesh(new THREE.SphereGeometry(h*.125,12,10,0,Math.PI*2,0,Math.PI*.62),
      new THREE.MeshStandardMaterial({color:0x120f0e,roughness:.9}));
    hair.position.y=h*.8;hair.scale.set(.95,1.05,.95);g.add(hair);
    const tail=new THREE.Mesh(box(h*.02,h*.34,h*.12,false),hair.material);
    tail.position.set(0,h*.62,-h*.11);g.add(tail);
    for(const s of[-1,1]){
      const arm=new THREE.Mesh(new THREE.CylinderGeometry(h*.035,h*.03,h*.34,6,1,true),cloth);
      arm.position.set(s*h*.14,h*.6,0);
      arm.rotation.z=s*(arms==='up'?-.9:.28);g.add(arm);
      const hand=new THREE.Mesh(new THREE.SphereGeometry(h*.035,8,6),paper);
      hand.position.set(s*h*(arms==='up'?.26:.2),h*(arms==='up'?.74:.45),0);g.add(hand);
    }
    const stand=new THREE.Mesh(box(h*.16,.03,h*.16,false),this.mat.woodDark);
    stand.position.y=.015;g.add(stand);
    g.userData.face=fm;g.userData.cloth=cloth;
    return g;
  }
  /* ---- 铜镜 ---- */
  bronzeMirror({r=.42,stand=true,ghost=true}={}){
    const g=new THREE.Group();
    const tex=M.mirrorFace(ghost);
    const fm=new THREE.MeshStandardMaterial({map:tex,roughness:.28,metalness:.65,envMapIntensity:.4});
    const face=new THREE.Mesh(new THREE.CircleGeometry(r,40),fm);
    face.rotation.x=-Math.PI/2;g.add(face);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(r*1.03,.035,8,40),this.mat.bronze);
    rim.rotation.x=Math.PI/2;g.add(rim);
    const back=new THREE.Mesh(new THREE.CylinderGeometry(r*1.0,r*1.0,.05,32),this.mat.bronzeOld);
    back.position.y=-.03;g.add(back);
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;
      const knob=new THREE.Mesh(new THREE.SphereGeometry(.03,7,6),this.mat.bronze);
      knob.position.set(Math.cos(a)*r*.82,.02,Math.sin(a)*r*.82);g.add(knob);}
    if(stand){
      const st=new THREE.Mesh(box(r*1.5,.9,r*1.2),this.mat.woodDark);
      st.position.y=-.5;g.add(st);
    }
    g.userData.faceMat=fm;g.userData.faceMesh=face;
    return g;
  }
  /* ---- 屏风 ---- */
  screen({panels=4,w=.8,h=1.9,mat='plaster'}={}){
    const g=new THREE.Group();
    const m=typeof mat==='string'?(mat==='plaster'?this.mat.paper:this.mat[mat]):mat;
    for(let i=0;i<panels;i++){
      const p=new THREE.Group();
      const body=new THREE.Mesh(box(w,h,.05,false),m);
      body.position.y=h/2;p.add(body);
      const fr=new THREE.Mesh(box(w+.06,.08,.08,false),this.mat.redLacDark);fr.position.y=h;p.add(fr);
      const fb2=fr.clone();fb2.position.y=.06;p.add(fb2);
      for(const s of[-1,1]){
        const post=new THREE.Mesh(box(.06,h+.2,.06,false),this.mat.redLacDark);
        post.position.set(s*w/2,(h+.2)/2-.06,0);p.add(post);
        const foot=new THREE.Mesh(box(.16,.05,.3,false),this.mat.redLacDark);
        foot.position.set(s*w/2,.02,0);p.add(foot);
      }
      const a=(i-(panels-1)/2)*(Math.PI/2-.35)/(panels-1)*2;
      p.rotation.y=a%Math.PI;p.position.x=Math.sin(a)*w*.55;
      p.userData.foldable=i>0;
      g.add(p);
    }
    return g;
  }
  /* ---- 水井 ---- */
  well({depth=5,r=.78}={}){
    const g=new THREE.Group();
    const ring=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.05,.66,20,1,true),this.mat.stone);
    ring.position.y=.33;g.add(ring);
    const lip=new THREE.Mesh(new THREE.TorusGeometry(r*1.02,.08,8,24),this.mat.stone);
    lip.rotation.x=Math.PI/2;lip.position.y=.66;g.add(lip);
    const inner=new THREE.Mesh(new THREE.CylinderGeometry(r*.94,r*.94,depth,20,1,true),
      new THREE.MeshStandardMaterial({color:0x05070a,roughness:1,side:THREE.BackSide}));
    inner.position.y=-depth/2+.6;g.add(inner);
    const surf=new THREE.Mesh(new THREE.CircleGeometry(r*.94,24),
      new THREE.MeshStandardMaterial({color:0x0a1416,roughness:.18,metalness:.4}));
    surf.rotation.x=-Math.PI/2;surf.position.y=-depth*.62;g.add(surf);
    g.userData.surface=surf;
    // 井架
    for(const s of[-1,1]){
      const post=new THREE.Mesh(box(.12,1.7,.12,false),this.mat.woodDark);
      post.position.set(s*(r+.25),.85+.66,0);g.add(post);
    }
    const beam=new THREE.Mesh(box((r+.25)*2+.2,.14,.14,false),this.mat.woodDark);
    beam.position.y=2.4;g.add(beam);
    const roller=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,(r+.2)*1.1,12),this.mat.wood);
    roller.rotation.z=Math.PI/2;roller.position.y=2.24;g.add(roller);
    const crank=new THREE.Mesh(box(.06,.4,.06,false),this.mat.woodDark);
    crank.position.set(r+.3,2.24,0);g.add(crank);
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.09,.025,5,12),this.mat.bronze);
    handle.position.set(r+.3,2.04,0);handle.rotation.x=Math.PI/2;g.add(handle);
    g.userData.roller=roller;g.userData.crank=crank;g.userData.handle=handle;
    // 绳 + 桶
    const rope=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,1.6,5),
      new THREE.MeshStandardMaterial({color:0x8a7048,roughness:1}));
    rope.position.set(0,1.4,0);g.add(rope);
    const bucket=this.bucket();bucket.position.set(0,.6,0);g.add(bucket);
    g.userData.rope=rope;g.userData.bucket=bucket;
    return g;
  }
  bucket(r=.2){
    const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.CylinderGeometry(r,r*.82,.3,14,1,true),this.mat.wood);
    body.position.y=.15;g.add(body);
    const bottom=new THREE.Mesh(new THREE.CircleGeometry(r*.82,14),this.mat.wood);
    bottom.rotation.x=-Math.PI/2;bottom.position.y=.005;g.add(bottom);
    for(let i=0;i<2;i++){const t=new THREE.Mesh(new THREE.TorusGeometry(r*1.02,.016,5,16,Math.PI),this.mat.bronze);
      t.rotation.y=Math.PI/2;t.rotation.x=i?Math.PI:0;t.position.y=.31;g.add(t);}
    return g;
  }
  /* ---- 戏台 ---- */
  stage({w=6,d=4,h=1.0}={}){
    const g=new THREE.Group();
    const deck=new THREE.Mesh(box(w,.16,d),this.mat.wood);
    deck.position.y=h-.08;deck.receiveShadow=true;g.add(deck);
    const skirt=new THREE.Mesh(box(w-.1,h-.2,.1,false),this.mat.redLacDark);
    skirt.position.set(0,(h-.2)/2,d/2-.05);g.add(skirt);
    for(const sx of[-1,1])for(const sz of[-1,1]){
      const p=this.pillar(.15,h*2.6,{red:true});
      p.position.set(sx*(w/2-.3),h,sz*(d/2-.3));g.add(p);
    }
    for(const sz of[-1,1]){
      const b=this.beam(w,.0,'x');b.position.set(0,h+2.7,sz*(d/2-.3));g.add(b);
    }
    for(let i=0;i<4;i++){
      const dg=this.dougong(.8);dg.position.set(-w/2+.6+i*(w-1.2)/3,h+2.55,d/2-.3);g.add(dg);
    }
    const roof=this.roof(w+.9,d+1.1,{ridge:1.15,upturn:.5});
    roof.position.y=h+2.85;g.add(roof);
    // 后台隔断 + 上下场门
    const back=new THREE.Mesh(box(w-.4,2.4,.12),this.mat.plaster);
    back.position.set(0,h+1.2,-d/2+.2);g.add(back);
    for(const s of[-1,1]){
      const door=new THREE.Mesh(box(.7,1.9,.06,false),this.mat.redLac);
      door.position.set(s*(w/2-.9),h+.95,-d/2+.28);g.add(door);
      const curt=new THREE.Mesh(plane(.9,1.9,false),new THREE.MeshStandardMaterial({map:M.silkRed,color:0xa8281e,side:THREE.DoubleSide,roughness:.6}));
      curt.position.set(s*(w/2-.9),h+1.0,-d/2+.34);g.add(curt);
    }
    const plaqueTex=M.plaque('粉墨',{fg:'#d9b65c'});
    const pl=new THREE.Mesh(box(1.7,.6,.1,false),new THREE.MeshStandardMaterial({map:plaqueTex,roughness:.5}));
    pl.position.set(0,h+2.35,d/2-.1);pl.rotation.y=Math.PI;g.add(pl);
    return g;
  }
  /* ---- 门扇（带门钉与铺首）---- */
  doorLeaf(w=1.05,h=2.5,{red=true,rings=true}={}){
    const g=new THREE.Group();
    const m=new THREE.Mesh(box(w,h,.1),red?this.mat.redLac:this.mat.wood);
    m.position.y=h/2;m.castShadow=true;g.add(m);
    for(let r=0;r<4;r++)for(let c=0;c<3;c++){
      if(!rings&&r>1)continue;
      const n=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),this.mat.bronze);
      n.position.set(-w/2+(c+.5)*w/3,h*(.78-r*.19),.06);g.add(n);
    }
    if(rings){
      const base=new THREE.Mesh(new THREE.CircleGeometry(.11,14),this.mat.bronze);
      base.position.set(0,h*.46,.06);g.add(base);
      const knocker=new THREE.Mesh(new THREE.TorusGeometry(.075,.017,6,16),this.mat.bronze);
      knocker.position.set(0,h*.42,.09);g.add(knocker);
      g.userData.knocker=knocker;
    }
    return g;
  }
  /* ---- 门闩（横栓）---- */
  bolt(len=1.6,{open=false}={}){
    const g=new THREE.Group();
    const bar=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,len,10),this.mat.woodDark);
    bar.rotation.z=Math.PI/2;g.add(bar);
    bar.position.x=open?len*.55:0;
    g.userData.bar=bar;
    for(const s of[-1,1]){
      const br=new THREE.Mesh(box(.12,.16,.14,false),this.mat.blackLac);
      br.position.set(s*(len/2+.1),0,0);g.add(br);
    }
    const cap=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),this.mat.bronze);
    cap.position.set(-len/2,0,0);g.add(cap);
    g.userData.open=open;
    return g;
  }
  /* ---- 立柜（可藏身）---- */
  wardrobe({w=1.1,h=2.0,d=.6,open=false}={}){
    const g=new THREE.Group();
    const m=this.mat.blackLac;
    const back=new THREE.Mesh(box(w,h,.05,false),m);back.position.set(0,h/2,-d/2);g.add(back);
    for(const s of[-1,1]){const p=new THREE.Mesh(box(.06,h,d,false),m);p.position.set(s*(w/2-.03),h/2,0);g.add(p);}
    const top=new THREE.Mesh(box(w+.1,.07,d+.1),m);top.position.y=h;g.add(top);
    const bot=new THREE.Mesh(box(w,.1,d),m);bot.position.y=.05;g.add(bot);
    const shelf=new THREE.Mesh(box(w-.1,.04,d-.05,false),m);shelf.position.y=h*.66;g.add(shelf);
    const doors=new THREE.Group();
    for(const s of[-1,1]){
      const dleaf=new THREE.Mesh(box(w/2-.02,h-.1,.05,false),this.mat.redLacDark);
      dleaf.position.set(s*w/4,h/2,d/2);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.05,.012,5,12),this.mat.bronze);
      ring.position.set(s*.06,h*.5,d/2+.04);dleaf.add(ring);ring.position.sub(dleaf.position);
      dleaf.userData.side=s;doors.add(dleaf);
    }
    g.add(doors);g.userData.doors=doors;g.userData.open=open;
    if(open)doors.children.forEach((d,i)=>{d.rotation.y=(i?-1:1)*1.6;});
    const crown=new THREE.Mesh(box(w+.16,.16,d+.06,false),this.mat.gold);
    crown.position.y=h+.1;g.add(crown);
    return g;
  }
  /* ---- 嫁妆箱 / 樟木箱 ---- */
  chest({w=1.1,h=.55,d=.66,lidOpen=false}={}){
    const g=new THREE.Group();
    const body=new THREE.Mesh(box(w,h,d),this.mat.wood);
    body.position.y=h/2;body.castShadow=true;g.add(body);
    const lid=new THREE.Group();
    const lidTop=new THREE.Mesh(box(w,.12,d,false),this.mat.wood);
    lidTop.position.y=.06;lid.add(lidTop);
    const band=new THREE.Mesh(box(w*1.02,.05,d*1.02,false),this.mat.bronze);
    band.position.y=-.01;lid.add(band);
    lid.position.set(0,h,d/2);lid.rotation.x=lidOpen?-1.7:0;
    g.add(lid);g.userData.lid=lid;
    const lock=new THREE.Mesh(box(.12,.14,.05,false),this.mat.bronze);
    lock.position.set(0,h-.08,d/2+.02);g.add(lock);
    for(const s of[-1,1]){
      const bt=new THREE.Mesh(box(w*1.03,.06,d*1.03,false),this.mat.bronze);
      bt.position.y=h*(.3+s*.35);g.add(bt);
    }
    const lining=new THREE.Mesh(box(w-.1,.04,d-.1,false),this.mat.silk);
    lining.position.y=h-.06;g.add(lining);
    return g;
  }
  /* ---- 书架 / 多宝阁 ---- */
  shelf({w=1.6,h=2.2,d=.36,cells=[3,4]}={}){
    const g=new THREE.Group();
    const m=this.mat.woodDark;
    for(const s of[-1,1]){const p=new THREE.Mesh(box(.06,h,d,false),m);p.position.set(s*(w/2-.03),h/2,0);g.add(p);}
    for(let i=0;i<=cells[1];i++){
      const y=i*(h/(cells[1]));
      const sh=new THREE.Mesh(box(w,.05,d,false),m);sh.position.set(0,y+.02,0);g.add(sh);
    }
    for(let ix=0;ix<cells[0]-1;ix++){
      const dleaf=new THREE.Mesh(box(.04,h,d-.04,false),m);
      dleaf.position.set(-w/2+(ix+1)*w/cells[0],h/2,0);g.add(dleaf);
    }
    const back=new THREE.Mesh(box(w,h,.04,false),this.mat.blackLac);
    back.position.set(0,h/2,-d/2);g.add(back);
    return g;
  }
  /* ---- 药柜 ---- */
  herbCabinet({w=1.6,h=1.9,rows=6,cols=8}={}){
    const g=new THREE.Group();
    const body=new THREE.Mesh(box(w,h,.4),this.mat.blackLac);
    body.position.y=h/2;g.add(body);
    const drawers=[];
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const dw=w/cols*.92,dh=h/rows*.8;
      const d=new THREE.Mesh(box(dw,dh,.05,false),this.mat.wood);
      d.position.set(-w/2+w*(c+.5)/cols,h*(r+.5)/rows,.22);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.03,.008,5,10),this.mat.bronze);
      ring.position.set(0,0,.03);d.add(ring);
      g.add(d);drawers.push({mesh:d,row:r,col:c});
    }
    g.userData.drawers=drawers;
    return g;
  }
  /* ---- 卷轴画 ---- */
  scroll(text='槐荫堂',{w=.9,h=2.1,painting=null}={}){
    const g=new THREE.Group();
    const tex=painting||M.mourning(text);
    const paper=new THREE.Mesh(plane(w,h,false),
      new THREE.MeshStandardMaterial({map:tex,roughness:.95,side:THREE.DoubleSide}));
    paper.position.y=h/2;g.add(paper);
    for(const s of[-1,1]){
      const rod=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,w+.14,10),this.mat.blackLac);
      rod.rotation.z=Math.PI/2;rod.position.y=h/2+s*h/2;g.add(rod);
      for(const e of[-1,1]){const cap=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),this.mat.bronze);
        cap.position.set(e*(w/2+.07),h/2+s*h/2,0);g.add(cap);}
    }
    return g;
  }
  /* ---- 画像 / 遗像框 ---- */
  portraitFrame(tex,{w=.8,h=1.1}={}){
    const g=new THREE.Group();
    const fr=new THREE.Mesh(box(w+.12,h+.12,.06),this.mat.blackLac);g.add(fr);
    const inner=new THREE.Mesh(plane(w,h,false),
      new THREE.MeshStandardMaterial({map:tex,roughness:.85}));
    inner.position.z=.04;g.add(inner);
    const glass=new THREE.Mesh(plane(w,h,false),
      new THREE.MeshPhysicalMaterial({color:0x223038,roughness:.08,metalness:0,transparent:true,opacity:.16}));
    glass.position.z=.05;g.add(glass);
    g.userData.inner=inner;
    return g;
  }
  /* ---- 匾额 ---- */
  plaque(text='槐蔭堂',{w=2.2,h=.8}={}){
    const g=new THREE.Group();
    const tex=M.plaque(text,{w:512,h:Math.round(512*h/w)});
    const m=new THREE.Mesh(box(w,h,.16,false),new THREE.MeshStandardMaterial({map:tex,roughness:.45,metalness:.2}));
    g.add(m);
    for(const s of[-1,1]){const c=new THREE.Mesh(box(.12,h+.16,.2,false),this.mat.gold);c.position.x=s*(w/2+.06);g.add(c);}
    return g;
  }
  /* ---- 春联 ---- */
  couplets(text1,text2,{h=2.4,w=.42}={}){
    const g=new THREE.Group();
    const mk=(t,flip)=>{
      const tex=M.couplet(t);
      const m=new THREE.Mesh(plane(w,h,false),new THREE.MeshStandardMaterial({map:tex,roughness:.8,side:THREE.DoubleSide}));
      if(flip)m.rotation.y=Math.PI;return m;
    };
    return {left:mk(text1),right:mk(text2)};
  }
  /* ---- 符纸 ---- */
  talisman(word='敕令',{w=.2,h=.42}={}){
    const tex=M.talisman(word);
    const m=new THREE.Mesh(plane(w,h,false),new THREE.MeshStandardMaterial({map:tex,roughness:1,side:THREE.DoubleSide,
      emissive:0x2a1408,emissiveIntensity:.3}));
    m.userData.tex=tex;
    return m;
  }
  /* ---- 纸钱堆 ---- */
  jossPile(n=26,r=.4){
    const g=new THREE.Group();
    for(let i=0;i<n;i++){
      const p=new THREE.Mesh(plane(.14,.18,false),MAT.joss.clone());
      p.position.set((Math.random()-.5)*r*2,Math.random()*.1,(Math.random()-.5)*r*2);
      p.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);
      g.add(p);
    }
    return g;
  }
  /* ---- 香烛台 / 长明灯 ---- */
  oilLamp({r=.14}={}){
    const g=new THREE.Group();
    const prof=[];
    for(let i=0;i<=8;i++){const t=i/8;prof.push(new THREE.Vector2(.02+Math.sin(t*1.5)*r, t*r*.9));}
    const bowl=new THREE.Mesh(new THREE.LatheGeometry(prof,16),this.mat.bronze);
    g.add(bowl);
    const wick=new THREE.Mesh(box(.02,.05,.02,false),new THREE.MeshBasicMaterial({color:0x241a10}));
    wick.position.y=r*.9;g.add(wick);
    const fl=new THREE.Sprite(new THREE.SpriteMaterial({map:flameTex(),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
    fl.scale.set(.07,.13,1);fl.position.y=r*1.05;g.add(fl);
    const l=this.askLight()?new THREE.PointLight(0xff9a44,3.2,5.5,1.7):null;
    if(l){l.position.y=r*1.1;g.add(l);}
    this.animated.push({type:'flame',flame:fl,light:l,seed:Math.random()*9,base:3.2});
    return g;
  }
  /* ---- 台阶 ---- */
  steps(n=4,w=3,{rise=.16,tread=.3,mat='stone'}={}){
    const g=new THREE.Group();
    for(let i=0;i<n;i++){
      const s=new THREE.Mesh(box(w,rise,tread),this.mat[mat]);
      s.position.set(0,rise*(i+.5),-tread*(i+.5));s.receiveShadow=true;g.add(s);
    }
    return g;
  }
  /* ---- 影壁 ---- */
  spiritWall({w=3.2,h=2.6}={}){
    const g=new THREE.Group();
    const base=new THREE.Mesh(box(w+.3,.4,.9),this.mat.stone);base.position.y=.2;g.add(base);
    const body=this.wall(w,h-.7,{thick:.4,mat:'plaster'});body.position.y=.4+(h-.7)/2;g.add(body);
    const frame=new THREE.Mesh(box(w+.2,h-.5,.1),this.mat.blackLac);
    frame.position.set(0,h*.55,.2);g.add(frame);
    const inner=new THREE.Mesh(plane(w-.4,h-1,false),this.mat.plaster);
    inner.position.set(0,h*.55,.26);g.add(inner);
    const roof=this.roof(w+.7,1.1,{ridge:.5,upturn:.22,thick:.1});
    roof.position.y=h-.25;g.add(roof);
    // 砖雕"福"
    const tex=M.tablet('福',{bg:'#8a8378',color:'#efe6d0',size:150});
    const fu=new THREE.Mesh(plane(.8,.9,false),new THREE.MeshStandardMaterial({map:tex,roughness:.95}));
    fu.position.set(0,h*.55,.29);fu.scale.set(.8,.8,1);g.add(fu);
    return g;
  }
  /* ---- 月洞门 ---- */
  moonGate({r=1.35,wallH=3.2,thick=.3}={}){
    const g=new THREE.Group();
    const shape=new THREE.Shape();
    shape.moveTo(-r*1.6,0);shape.lineTo(r*1.6,0);shape.lineTo(r*1.6,wallH);shape.lineTo(-r*1.6,wallH);shape.closePath();
    const hole=new THREE.Path();hole.absarc(0,r,r*.98,0,Math.PI*2,true);
    shape.holes.push(hole);
    const geo=new THREE.ExtrudeGeometry(shape,{depth:thick,bevelEnabled:false});
    const m=new THREE.Mesh(geo,this.mat.plaster);m.position.set(0,0,-thick/2);g.add(m);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(r*.99,.07,8,40),this.mat.bronze);
    ring.position.y=r;g.add(ring);
    return g;
  }
  /* ---- 灶台 / 水缸 ---- */
  waterJar({r=.5,h=.8}={}){
    const g=new THREE.Group();
    const prof=[];
    for(let i=0;i<=10;i++){const t=i/10;
      prof.push(new THREE.Vector2(r*(.72+Math.sin(t*Math.PI)*.34), t*h));}
    const body=new THREE.Mesh(new THREE.LatheGeometry(prof,22),
      new THREE.MeshStandardMaterial({color:0x3c4a44,roughness:.35,metalness:.05,map:M.flagstone}));
    body.castShadow=true;g.add(body);
    const water=new THREE.Mesh(new THREE.CircleGeometry(r*.92,24),
      new THREE.MeshStandardMaterial({color:0x0d1a1c,roughness:.1,metalness:.6}));
    water.rotation.x=-Math.PI/2;water.position.y=h-.07;g.add(water);
    g.userData.water=water;
    return g;
  }
  stove({w=1.6,d=.9,h=.9}={}){
    const g=new THREE.Group();
    const body=new THREE.Mesh(box(w,h,d),this.mat.stone);body.position.y=h/2;g.add(body);
    const top=new THREE.Mesh(box(w+.1,.08,d+.1),this.mat.stone);top.position.y=h;g.add(top);
    for(const s of[-1,1]){
      const r=new THREE.Mesh(new THREE.TorusGeometry(.24,.03,6,20),this.mat.bronze);
      r.rotation.x=Math.PI/2;r.position.set(s*.36,h+.06,0);g.add(r);
    }
    const wok=new THREE.Mesh(new THREE.SphereGeometry(.3,16,12,0,Math.PI*2,Math.PI*.42,Math.PI*.5),this.mat.blackLac);
    wok.position.set(-.36,h+.03,0);g.add(wok);
    const flue=new THREE.Mesh(box(.3,1.1,.3),this.mat.stone);flue.position.set(w/2-.2,h+.55,-d/2+.2);g.add(flue);
    return g;
  }
  /* ---- 更漏 / 日晷 ---- */
  clepsydra({h=1.1}={}){
    const g=new THREE.Group();
    const stand=new THREE.Mesh(box(.7,.06,.5),this.mat.woodDark);stand.position.y=.03;g.add(stand);
    for(const s of[-1,1]){const p=new THREE.Mesh(box(.06,h,.06,false),this.mat.woodDark);p.position.set(s*.3,h/2,0);g.add(p);}
    const up=new THREE.Mesh(new THREE.CylinderGeometry(.2,.18,.34,18),this.mat.bronze);
    up.position.y=h*.86;g.add(up);
    const dn=new THREE.Mesh(new THREE.CylinderGeometry(.24,.22,.4,18),this.mat.bronze);
    dn.position.y=h*.3;g.add(dn);
    const stream=new THREE.Mesh(new THREE.CylinderGeometry(.012,.008,.34,6),
      new THREE.MeshBasicMaterial({color:0x7fc6c0,transparent:true,opacity:.55}));
    stream.position.y=h*.58;g.add(stream);
    for(const s of[-1,1]){const t=new THREE.Mesh(new THREE.TorusGeometry(.21,.02,5,16),this.mat.bronze);
      t.rotation.x=Math.PI/2;t.position.set(0,h*.86+.17,s*.0);g.add(t);}
    return g;
  }
  /* ---- 鸟笼 / 杂物点缀 ---- */
  cage({r=.28,h=.6}={}){
    const g=new THREE.Group();
    for(let i=0;i<14;i++){const a=i/14*Math.PI*2;
      const b=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,h,5),this.mat.woodDark);
      b.position.set(Math.cos(a)*r,h/2,Math.sin(a)*r);g.add(b);}
    for(const s of[0,1])for(let k=0;k<3;k++){
      const t=new THREE.Mesh(new THREE.TorusGeometry(r,.01,5,18),this.mat.woodDark);
      t.rotation.x=Math.PI/2;t.position.y=h*(.15+k*.35)+s*.02;g.add(t);}
    const dome=new THREE.Mesh(new THREE.SphereGeometry(r,14,8,0,Math.PI*2,0,Math.PI*.5),this.mat.woodDark);
    dome.position.y=h;g.add(dome);
    const hook=new THREE.Mesh(new THREE.TorusGeometry(.05,.01,5,10),this.mat.bronze);
    hook.position.y=h+r+.05;g.add(hook);
    return g;
  }
  /* ---- 碗 / 杯 / 壶 ---- */
  bowlMesh(r=.09,{mat='bronze',food=null}={}){
    const prof=[];
    for(let i=0;i<=7;i++){const t=i/7;prof.push(new THREE.Vector2(.012+Math.sin(t*1.35)*r,t*r*.75));}
    const g=new THREE.Group();
    g.add(new THREE.Mesh(new THREE.LatheGeometry(prof,16),this.mat[mat]||this.mat.paper));
    if(food){
      const f=new THREE.Mesh(new THREE.CircleGeometry(r*.82,14),
        new THREE.MeshStandardMaterial({color:food,roughness:.8}));
      f.rotation.x=-Math.PI/2;f.position.y=r*.6;g.add(f);
    }
    return g;
  }
  teapot(){
    const g=new THREE.Group();
    const prof=[];
    for(let i=0;i<=9;i++){const t=i/9;prof.push(new THREE.Vector2(Math.sin(t*2.1+.2)*.11+.01,t*.15));}
    const body=new THREE.Mesh(new THREE.LatheGeometry(prof,18),this.mat.bronzeOld);g.add(body);
    const spout=new THREE.Mesh(new THREE.CylinderGeometry(.014,.03,.16,8),this.mat.bronzeOld);
    spout.position.set(.13,.09,0);spout.rotation.z=-1.0;g.add(spout);
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.07,.013,6,14,Math.PI*1.2),this.mat.bronzeOld);
    handle.position.set(-.12,.1,0);handle.rotation.z=.5;g.add(handle);
    const lid=new THREE.Mesh(new THREE.SphereGeometry(.045,10,8,0,Math.PI*2,0,Math.PI*.6),this.mat.bronze);
    lid.position.y=.16;g.add(lid);
    return g;
  }
  /* ---- 书 / 族谱 ---- */
  book({w=.3,h=.05,d=.22,red=false}={}){
    const g=new THREE.Group();
    const body=new THREE.Mesh(box(w,h,d,false),red?this.mat.redLac:this.mat.paper);
    body.position.y=h/2;g.add(body);
    for(let i=0;i<5;i++){
      const pg=new THREE.Mesh(box(w-.01,.008,d-.01,false),this.mat.paper);
      pg.position.y=h*(i+.5)/5;g.add(pg);
    }
    const spine=new THREE.Mesh(box(.02,h+.01,d,false),this.mat.blackLac);
    spine.position.set(-w/2,h/2,0);g.add(spine);
    const label=new THREE.Mesh(plane(w*.5,h*.9,false),
      new THREE.MeshStandardMaterial({color:0xd8c9a6,roughness:1}));
    label.position.set(w*.15,h+.006,d*.1);label.rotation.x=-Math.PI/2;g.add(label);
    return g;
  }
  /* ---- 纸鹤 / 蝴蝶（点缀）---- */
  paperButterfly(s=.12,color=0xd8b45a){
    const g=new THREE.Group();
    const m=new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide});
    for(const sx of[-1,1]){
      const w1=new THREE.Mesh(new THREE.CircleGeometry(s,7,0,Math.PI*.9),m);
      w1.position.x=sx*s*.6;w1.scale.set(1,.8,1);g.add(w1);
      const w2=new THREE.Mesh(new THREE.CircleGeometry(s*.7,7,0,Math.PI*.9),m);
      w2.position.set(sx*s*.5,-s*.5,0);g.add(w2);
    }
    return g;
  }
  /* ---- 骸骨 ---- */
  bones(n=12,rng=Math.random){
    const g=new THREE.Group();
    const m=new THREE.MeshStandardMaterial({color:0xd9d2bc,roughness:.85});
    for(let i=0;i<n;i++){
      const len=.12+rng()*.28;
      const b=new THREE.Mesh(new THREE.CylinderGeometry(.016,.02,len,7),m);
      b.position.set((rng()-.5)*.9,len/2,(rng()-.5)*.9);
      b.rotation.set(rng()*1.4,rng()*3,rng()*.6);g.add(b);
      for(const s of[-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(.026,7,5),m);
        e.position.set(0,len/2*s,0);b.add(e);}
    }
    const skull=new THREE.Mesh(new THREE.SphereGeometry(.11,12,10),m);
    skull.scale.set(.88,1.05,.95);skull.position.set(0,.1,.2);g.add(skull);
    for(const s of[-1,1]){
      const eye=new THREE.Mesh(new THREE.CircleGeometry(.028,10),new THREE.MeshBasicMaterial({color:0x0a0908}));
      eye.position.set(s*.045,.12,.3);g.add(eye);
    }
    const jaw=new THREE.Mesh(box(.1,.04,.08,false),m);jaw.position.set(0,.02,.28);g.add(jaw);
    return g;
  }
  /* ---- 灯笼串 / 红绸带 ---- */
  silkRibbon(len=4,{color=0xc8201a,curve=.4,w=.3}={}){
    const pts=[];
    for(let i=0;i<=16;i++){const t=i/16;
      pts.push(new THREE.Vector3(t*len-len/2,-Math.sin(t*Math.PI)*curve,Math.sin(t*7)*.06));}
    const curveObj=new THREE.CatmullRomCurve3(pts);
    const geo=new THREE.TubeGeometry(curveObj,32,w*.5,4,true);
    const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness:.6,side:THREE.DoubleSide,map:M.silkRed}));
    return m;
  }
  /* ---- 女鬼：红衣长发（成年，媚而诡）---- */
  ghostLady({veil=true,faceStyle=1,scale=1.0,armOut=0}={}){
    const g=new THREE.Group();
    const H=1.72*scale;
    const skin=new THREE.MeshStandardMaterial({color:0xe8dcc8,roughness:.55,metalness:0});
    const robe=new THREE.MeshStandardMaterial({map:M.silkRed,color:0x8f1512,roughness:.62,
      side:THREE.DoubleSide,transparent:true,opacity:.97});
    const robe2=new THREE.MeshStandardMaterial({map:M.silkRed,color:0xb8231c,roughness:.55,side:THREE.DoubleSide});
    // 裙（曳地）
    const skirtProf=[];
    for(let i=0;i<=14;i++){const t=i/14;
      skirtProf.push(new THREE.Vector2(H*(.09+ .085*Math.pow(1-t,1.4)+.03*Math.sin(t*9)), t*H*.78));}
    const skirt=new THREE.Mesh(new THREE.LatheGeometry(skirtProf,26),robe);
    skirt.position.y=0;g.add(skirt);
    // 上身
    const torsoProf=[];
    for(let i=0;i<=10;i++){const t=i/10;
      torsoProf.push(new THREE.Vector2(H*(.075-.012*Math.sin(t*Math.PI*1.3)), H*.78+t*H*.2));}
    const torso=new THREE.Mesh(new THREE.LatheGeometry(torsoProf,20),robe2);
    g.add(torso);
    // 肩 / 锁骨
    const shoulders=new THREE.Mesh(new THREE.SphereGeometry(H*.085,14,10),robe2);
    shoulders.scale.set(1.6,.6,1);shoulders.position.y=H*.98;g.add(shoulders);
    // 手臂（广袖垂落，袖口露半掌）
    for(const s of[-1,1]){
      const upper=new THREE.Mesh(new THREE.CylinderGeometry(H*.05,H*.058,H*.24,9,1,true),robe2);
      upper.position.set(s*H*.115,H*.86,H*.01);
      upper.rotation.z=s*(.16+armOut*.3);g.add(upper);
      const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(H*.062,H*.105,H*.40,10,1,true),robe);
      sleeve.position.set(s*H*(.145+armOut*.06),H*.63,H*.035);
      sleeve.rotation.z=s*(.10+armOut*.22);sleeve.rotation.x=-.10;g.add(sleeve);
      const cuff=new THREE.Mesh(new THREE.TorusGeometry(H*.098,.012,6,16),this.mat.gold);
      cuff.rotation.x=Math.PI/2;cuff.position.set(sleeve.position.x,H*.445,H*.05);g.add(cuff);
      const hand=new THREE.Mesh(new THREE.SphereGeometry(H*.026,10,8),skin);
      hand.scale.set(.78,1.6,.55);
      hand.position.set(s*H*(.155+armOut*.10),H*(.40-armOut*.14),H*.075);
      hand.rotation.z=s*.12;g.add(hand);
      for(let i=0;i<4;i++){const nail=new THREE.Mesh(new THREE.ConeGeometry(.005,.034,5),
        new THREE.MeshStandardMaterial({color:0x9a1a12,roughness:.28}));
        nail.position.set(hand.position.x+(i-1.5)*.010,hand.position.y-.042,hand.position.z+.004);
        nail.rotation.x=Math.PI;g.add(nail);}
    }
    // 颈 + 头
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(H*.026,H*.03,H*.07,10),skin);
    neck.position.y=H*1.02;g.add(neck);
    const head=new THREE.Mesh(new THREE.SphereGeometry(H*.098,20,16),skin);
    head.scale.set(.86,1.08,.8);head.position.y=H*1.12;g.add(head);
    // 脸（媚）
    const faceTex=M.dollFace(faceStyle);
    const face=new THREE.Mesh(new THREE.PlaneGeometry(H*.175,H*.232),
      new THREE.MeshStandardMaterial({map:faceTex,transparent:true,alphaTest:.42,
        roughness:.62,emissive:0x2a1d16,emissiveIntensity:.6,depthWrite:true}));
    face.position.set(0,H*1.118,H*.096);g.add(face);
    // 发（向后收，不遮脸）
    const hairMat=new THREE.MeshStandardMaterial({color:0x0d0b0a,roughness:.62});
    const cap=new THREE.Mesh(new THREE.SphereGeometry(H*.104,18,14,0,Math.PI*2,0,Math.PI*.62),hairMat);
    cap.position.set(0,H*1.135,-H*.030);cap.scale.set(1.04,1.12,.86);g.add(cap);
    const bun=new THREE.Mesh(new THREE.SphereGeometry(H*.05,12,10),hairMat);
    bun.position.set(0,H*1.21,-H*.03);g.add(bun);
    const pin=new THREE.Mesh(new THREE.CylinderGeometry(.004,.004,H*.16,6),this.mat.jade||new THREE.MeshStandardMaterial({color:0x9ec9b8,roughness:.3,metalness:.15}));
    pin.rotation.z=1.2;pin.position.set(H*.04,H*1.22,-H*.02);g.add(pin);
    // 长发垂落
    const hairGeo=[];
    for(let i=0;i<34;i++){
      const a=(i/34)*Math.PI*2, r0=H*(.09+Math.random()*.03);
      const pts=[];
      const len=H*(.34+Math.random()*.5);
      for(let k=0;k<=6;k++){const t=k/6;
        pts.push(new THREE.Vector3(Math.cos(a)*r0*(1+t*.5), H*1.13-t*len, -Math.abs(Math.sin(a))*r0-t*H*.08*(Math.random())));}
      const c=new THREE.CatmullRomCurve3(pts);
      const m=new THREE.Mesh(new THREE.TubeGeometry(c,10,.008+Math.random()*.008,4,false),hairMat);
      g.add(m);hairGeo.push(m);
    }
    // 盖头 / 面纱
    if(veil){
      const v=new THREE.Mesh(new THREE.SphereGeometry(H*.13,18,14,0,Math.PI*2,0,Math.PI*.72),
        new THREE.MeshStandardMaterial({map:M.silkRed,color:0xc8201a,roughness:.5,transparent:true,opacity:.9,side:THREE.DoubleSide}));
      v.position.y=H*1.14;v.scale.set(1,.95,1.05);g.add(v);
      const flap=new THREE.Mesh(plane(H*.2,H*.26,false),v.material);
      flap.position.set(0,H*1.0,H*.09);g.add(flap);
      g.userData.veil=v;
      for(let i=0;i<5;i++){const t=new THREE.Mesh(box(.01,.14,.01,false),this.mat.gold);
        t.position.set((i-2)*.03,H*.9,H*.12);g.add(t);}
    }
    // 云肩 + 流苏
    const yunjian=new THREE.Mesh(new THREE.TorusGeometry(H*.085,.02,6,20),this.mat.gold);
    yunjian.rotation.x=Math.PI/2;yunjian.position.y=H*.99;g.add(yunjian);
    // 飘带（自肩后垂落，曳而不飞 —— 表现"不接地"）
    for(const s of[-1,1]){
      const pts=[];
      for(let i=0;i<=9;i++){const t=i/9;
        pts.push(new THREE.Vector3(
          s*(H*.10+t*H*.10+Math.sin(t*3.2)*H*.05),
          H*(1.02-t*.86),
          -H*.06-t*H*.30+Math.sin(t*2.4)*H*.05));}
      const c=new THREE.CatmullRomCurve3(pts);
      const r=new THREE.Mesh(new THREE.TubeGeometry(c,18,.014,4,false),
        new THREE.MeshStandardMaterial({color:0xb08a3a,roughness:.78,side:THREE.DoubleSide,
          transparent:true,opacity:.85,emissive:0x2a1f0a,emissiveIntensity:.35}));
      g.add(r);
    }
    g.userData.face=face;g.userData.faceTex=faceTex;g.userData.hair=hairGeo;g.userData.H=H;
    g.userData.hover=0;
    return g;
  }
  /* ---- 更新动画 ---- */
  tick(t,dt){
    for(const a of this.animated){
      if(a.type==='flame'){
        const f=Math.sin(t*11+a.seed)*.5+Math.sin(t*23+a.seed*2)*.3+Math.random()*.2;
        a.flame.scale.set(.1+f*.018,.2+f*.036,1);
        a.flame.material.opacity=.8+f*.18;
        if(a.light)a.light.intensity=a.base*(.82+f*.24);   // 低配档可能没有灯
        a.flame.position.x=Math.sin(t*4+a.seed)*.006;
      }else if(a.type==='smoke'){
        const p=a.pts.geometry.attributes.position,sd=a.pts.userData.sd,h=a.pts.userData.h;
        for(let i=0;i<sd.length;i++){
          const s=sd[i];const y=((t*s.sp+s.y0)%h);
          p.setXYZ(i,Math.sin((y+t)*1.6+s.off)*.05*(y/h+.2),y,Math.cos((y*.9+t)*1.3+s.off)*.05*(y/h+.2));
        }
        p.needsUpdate=true;a.mat.opacity=.16;
      }else if(a.type==='ember'){
        a.mesh.material.color.setHSL(.06,.95,.45+Math.sin(t*9+a.seed)*.18);
      }
    }
  }
}
/* 辅助：给 plane 型 mesh 补 UV（保留接口） */
function fb(mesh,w,h){
  const uv=mesh.geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i),uv.getY(i));
  uv.needsUpdate=true;
}
