import * as THREE from 'three';
import {M} from './textures.js';
import {box, plane, TILE, MAT} from './parts.js';

/* =========================================================
   槐宅 · 三进一院
      x: 东(+)/西(-)    z: 南(+)/北(-)
   ========================================================= */
export const ROOMS={
  hall : {id:'hall', name:'喜堂',        x0:-10, x1:10, z0:10, z1:19, sky:false, h:3.9, floor:'brick'},
  court: {id:'court',name:'天井',        x0:-10, x1:10, z0:-8, z1:10, sky:true,  h:4.6, floor:'stone'},
  shrine:{id:'shrine',name:'祠堂',       x0:-10, x1:1,  z0:-18,z1:-8, sky:false, h:3.9, floor:'brick'},
  opera: {id:'opera',name:'戏楼',        x0:1,   x1:10, z0:-18,z1:-8, sky:false, h:4.4, floor:'wood'},
  east : {id:'east', name:'东厢·绣楼',   x0:10,  x1:18, z0:-6, z1:4,  sky:false, h:3.6, floor:'wood'},
  west : {id:'west', name:'西厢·殡房',   x0:-18, x1:-10,z0:-6, z1:4,  sky:false, h:3.6, floor:'earth'},
};
export const ARENA=19.2;

/** 门洞定义：axis 'z' = 沿 x 延伸的横墙(位于 z=const)；'x' = 纵墙(位于 x=const) */
export const DOORS={
  d_hall_court:{axis:'z',at:10, a:-7,  b:7,  o0:-1.5,o1:1.5, h:2.6, label:'喜堂北扉'},
  d_court_shrine:{axis:'z',at:-8,a:-10, b:1,  o0:-5.5,o1:-3.1,h:2.6, label:'祠堂大门'},
  d_court_opera:{axis:'z',at:-8, a:1,   b:10, o0:3.1, o1:5.5, h:2.8, label:'戏楼门'},
  d_court_east:{axis:'x',at:10,  a:-6,  b:4,  o0:-1.4,o1:1.0, h:2.4, label:'绣楼门', lock:'silver'},
  d_court_west:{axis:'x',at:-10, a:-6,  b:4,  o0:-1.4,o1:1.0, h:2.4, label:'殡房门', lock:'gold'},
  d_gate:{axis:'z',at:19, a:-7, b:7, o0:-2.05,o1:2.05, h:3.0, label:'宅门'},
};

export function buildManor(app){
  const P=app.parts, scene=app.scene, col=app.colliders;
  const root=new THREE.Group();root.name='manor';scene.add(root);
  const anchors={};                       // 命名锚点，供交互物件定位

  /* ---------- 地面 ---------- */
  {
    const g=new THREE.Mesh(new THREE.PlaneGeometry(ARENA*2,ARENA*2),
      new THREE.MeshStandardMaterial({map:M.earth,roughness:1,color:0x6a6050}));
    g.rotation.x=-Math.PI/2;g.position.y=-.02;g.receiveShadow=true;root.add(g);
  }

  /* ---------- 房间地板 / 天花 ---------- */
  const floorMat={brick:MAT.brick,stone:MAT.stone,wood:MAT.wood,earth:MAT.earth};
  for(const r of Object.values(ROOMS)){
    if(r.hidden)continue;
    const w=r.x1-r.x0,d=r.z1-r.z0;
    const fm=floorMat[r.floor].clone();
    fm.map=M[r.floor==='brick'?'blueBrick':r.floor==='stone'?'flagstone':r.floor==='wood'?'wood':'earth'].clone();
    fm.map.needsUpdate=true;
    fm.map.repeat.set(Math.max(1,w/TILE),Math.max(1,d/TILE));
    const f=new THREE.Mesh(new THREE.PlaneGeometry(w,d),fm);
    f.rotation.x=-Math.PI/2;f.position.set((r.x0+r.x1)/2,.002,(r.z0+r.z1)/2);
    f.receiveShadow=true;root.add(f);
    if(!r.sky){
      const c=new THREE.Mesh(new THREE.PlaneGeometry(w,d),
        new THREE.MeshStandardMaterial({color:0x1a1410,roughness:1,side:THREE.DoubleSide}));
      c.rotation.x=Math.PI/2;c.position.set((r.x0+r.x1)/2,r.h,(r.z0+r.z1)/2);root.add(c);
      // 顶棚梁
      const n=Math.max(2,Math.round(d/1.2));
      for(let i=0;i<n;i++){
        const b=new THREE.Mesh(box(w-.2,.2,.18,false),MAT.redLacDark);
        b.position.set((r.x0+r.x1)/2,r.h-.16,r.z0+ (i+.5)*d/n);root.add(b);
      }
      const ridge=new THREE.Mesh(box(.24,.3,d-.2,false),MAT.redLacDark);
      ridge.position.set((r.x0+r.x1)/2,r.h-.2,(r.z0+r.z1)/2);root.add(ridge);
    }
  }

  /* ---------- 墙体 + 碰撞 ---------- */
  const TH=.3;
  function addBox(x0,z0,x1,z1,y0,y1){
    col.push({minX:Math.min(x0,x1),maxX:Math.max(x0,x1),minZ:Math.min(z0,z1),maxZ:Math.max(z0,z1),y0,y1,id:col.length});
  }
  /** 开口：{o0,o1,head(门高),sill(窗台,默认0)}；head 以上至墙顶砌横梁 */
  const splitSegs=(a,b,h,openings)=>{
    const segs=[];let cur=a;
    for(const o of [...openings].sort((p,q)=>p.o0-q.o0)){
      const head=o.head??o.h??0, sill=o.sill??0;
      if(o.o0-cur>.01)segs.push([cur,o.o0,0,h]);
      if(sill>.01)segs.push([o.o0,o.o1,0,sill]);
      if(head<h-.01)segs.push([o.o0,o.o1,Math.max(head,sill),h]);
      cur=o.o1;
    }
    if(b-cur>.01)segs.push([cur,b,0,h]);
    return segs;
  };
  /** 横墙（位于 z=const，沿 x 从 a 到 b） */
  function wallZ(z,a,b,h,{openings=[],mat='plaster',cap=true,thick=TH}={}){
    splitSegs(a,b,h,openings).forEach(([s,e,y0,y1])=>{
      if(y1-y0<=.02||e-s<=.02)return;
      const w=e-s,hh=y1-y0;
      const m=new THREE.Mesh(box(w,hh,thick),P.mat[mat]);
      m.position.set((s+e)/2,y0+hh/2,z);m.castShadow=m.receiveShadow=true;root.add(m);
      addBox(s-thick/2,z-thick/2,e+thick/2,z+thick/2,y0,y1);
    });
    if(cap){
      const c=new THREE.Mesh(box(b-a+.4,.24,thick+.2),MAT.tile);
      c.position.set((a+b)/2,h+.12,z);root.add(c);
    }
    return {a,b,z,h};
  }
  /** 纵墙（位于 x=const，沿 z 从 a 到 b） */
  function wallX(x,a,b,h,{openings=[],mat='plaster',cap=true,thick=TH}={}){
    splitSegs(a,b,h,openings).forEach(([s,e,y0,y1])=>{
      if(y1-y0<=.02||e-s<=.02)return;
      const d=e-s,hh=y1-y0;
      const m=new THREE.Mesh(box(thick,hh,d),P.mat[mat]);
      m.position.set(x,y0+hh/2,(s+e)/2);m.castShadow=m.receiveShadow=true;root.add(m);
      addBox(x-thick/2,s-thick/2,x+thick/2,e+thick/2,y0,y1);
    });
    if(cap){
      const c=new THREE.Mesh(box(thick+.2,.24,(b-a)+.4),MAT.tile);
      c.position.set(x,h+.12,(a+b)/2);root.add(c);
    }
    return {a,b,x,h};
  }

  const H=ROOMS.hall.h, HC=ROOMS.court.h;
  const R=ROOMS;
  // 喜堂（与天井共用 z=10 隔墙，故只建三壁）
  wallZ(R.hall.z1, R.hall.x0, R.hall.x1, 4.3, {openings:[{o0:-2.05,o1:2.05,head:3.0}],cap:false});
  wallX(R.hall.x0, R.hall.z0, R.hall.z1, H, {});
  wallX(R.hall.x1, R.hall.z0, R.hall.z1, H, {});
  // 天井
  wallZ(R.court.z1, R.court.x0, R.court.x1, H, {openings:[{o0:-1.5,o1:1.5,head:2.6}],cap:true});
  wallX(R.court.x0, R.court.z0, R.court.z1, HC, {openings:[{o0:-1.4,o1:1.0,head:2.4}]});
  wallX(R.court.x1, R.court.z0, R.court.z1, HC, {openings:[{o0:-1.4,o1:1.0,head:2.4}]});
  // 北楼：祠堂 + 戏楼
  wallZ(R.shrine.z0, R.shrine.x0, R.shrine.x1, H, {openings:[]});
  wallZ(R.opera.z0, R.opera.x0, R.opera.x1, R.opera.h, {openings:[]});
  wallX(R.shrine.x0, R.shrine.z0, R.shrine.z1, H, {});
  wallX(R.opera.x1, R.opera.z0, R.opera.z1, R.opera.h, {});
  wallX(1, R.shrine.z0, R.shrine.z1, H, {mat:'plaster'});      // 祠堂/戏楼隔墙
  // 南面开门
  const shrineWall=wallZ(R.court.z0, R.shrine.x0, R.shrine.x1, H,
    {openings:[{o0:-5.5,o1:-3.1,h:2.6,top:H}]});
  const operaWall=wallZ(R.court.z0, R.opera.x0, R.opera.x1, R.opera.h,
    {openings:[{o0:3.1,o1:5.5,h:2.8,top:R.opera.h}]});
  // 东西厢
  wallX(R.east.x1, R.east.z0, R.east.z1, R.east.h, {});
  wallZ(R.east.z0, R.east.x0, R.east.x1, R.east.h, {});
  wallZ(R.east.z1, R.east.x0, R.east.x1, R.east.h, {});
  wallX(R.west.x0, R.west.z0, R.west.z1, R.west.h, {});
  wallZ(R.west.z0, R.west.x0, R.west.x1, R.west.h, {});
  wallZ(R.west.z1, R.west.x0, R.west.x1, R.west.h, {});
  // 外围院墙（把整个宅子围死）
  wallZ(-ARENA, -ARENA, ARENA, 4.4, {cap:true});
  wallZ(ARENA, -ARENA, ARENA, 4.4, {cap:true});
  wallX(-ARENA, -ARENA, ARENA, 4.4, {cap:true});
  wallX(ARENA, -ARENA, ARENA, 4.4, {cap:true});

  /* ---------- 屋顶 ---------- */
  function hipRoof(r,{ridge=1.25,up=.42,eave=null}={}){
    const w=r.x1-r.x0+.9,d=r.z1-r.z0+.9;
    const roof=P.roof(w,d,{ridge,upturn:up});
    roof.position.set((r.x0+r.x1)/2,(eave??r.h),(r.z0+r.z1)/2);
    root.add(roof);
    return roof;
  }
  hipRoof(R.hall,{ridge:1.35,up:.5});
  hipRoof(R.shrine,{ridge:1.4,up:.45});
  hipRoof(R.opera,{ridge:1.15,up:.55,eave:R.opera.h});
  hipRoof(R.east,{ridge:1.0,up:.35,eave:R.east.h});
  hipRoof(R.west,{ridge:1.0,up:.35,eave:R.west.h});

  /* ---------- 游廊（天井回廊）---------- */
  {
    const y=2.9;
    for(const [x0,z0,x1,z1] of [[-9.4,-7.4,9.4,-7.4],[-9.4,8.8,9.4,8.8]]){
      const b=P.beam(x1-x0,'x',{h:.3,w:.24,y});b.position.set(0,y,-.0);b.position.set((x0+x1)/2,y,(z0+z1)/2);root.add(b);
      const roof=P.roof(x1-x0,1.9,{ridge:.34,upturn:.1});
      roof.position.set((x0+x1)/2,y+.3,(z0+z1)/2);root.add(roof);
    }
    for(const [x,z0,z1] of [[-9.4,-7.4,8.8],[9.4,-7.4,8.8]]){
      const b=new THREE.Mesh(box(.24,.3,z1-z0),MAT.redLacDark);b.position.set(x,y,(z0+z1)/2);root.add(b);
      const roof=P.roof(1.9,z1-z0,{ridge:.34,upturn:.1,dir:'x'});
      roof.position.set(x,y+.3,(z0+z1)/2);root.add(roof);
    }
    const pts=[];
    for(let x=-9.4;x<=9.4;x+=3.1)pts.push([x,-7.4],[x,8.8]);
    for(let z=-7.4;z<=8.8;z+=3.2)pts.push([-9.4,z],[9.4,z]);
    pts.forEach(([x,z])=>{
      const p=P.pillar(.13,2.9);p.position.set(x,0,z);root.add(p);
      const dg=P.dougong(.72);dg.position.set(x,2.86,z);root.add(dg);
      addBox(x-.24,z-.24,x+.24,z+.24,0,2.9);
    });
  }

  /* ---------- 大门（九重门闩）---------- */
  {
    const g=new THREE.Group();g.position.set(0,0,19);
    // 门槛
    const th=new THREE.Mesh(box(4.6,.3,1.1),MAT.stone);th.position.y=.15;g.add(th);
    addBox(-2.3,.4,2.3,1.5,.0,.32);
    anchors.gateStep=new THREE.Vector3(0,.3,18.2);
    // 门楼
    const roof=P.roof(6.2,2.6,{ridge:1.0,upturn:.4});roof.position.y=4.3;g.add(roof);
    for(const s of[-1,1]){
      const p=P.pillar(.24,4.3);p.position.set(s*2.9,0,.9);g.add(p);
      const p2=P.pillar(.24,4.3);p2.position.set(s*2.9,0,-.9);g.add(p2);
    }
    const pl=P.plaque('槐荫堂',{w:2.4,h:.8});pl.position.set(0,3.4,.05);g.add(pl);
    // 门墩
    for(const s of[-1,1]){
      const d=new THREE.Mesh(box(.7,.62,.9),MAT.stone);d.position.set(s*2.6,.31,.75);g.add(d);
      const beast=new THREE.Mesh(new THREE.SphereGeometry(.22,10,8),MAT.stone);
      beast.scale.set(1,.85,1.2);beast.position.set(s*2.6,.75,.75);g.add(beast);
      addBox(s*2.6-.4,.3,s*2.6+.4,1.2,0,.9);
    }
    // 双扇
    const leaves=[];
    for(const s of[-1,1]){
      const leaf=P.doorLeaf(2.0,3.0,{red:true});
      leaf.position.set(s*1.02,0,-.05);g.add(leaf);
      leaves.push({mesh:leaf,side:s});
    }
    // 九闩
    const bolts=[];
    for(let i=0;i<9;i++){
      const b=P.bolt(3.6,{open:false});
      b.position.set(0,3.0-i*.31,.28);
      b.traverse(o=>{if(o.isMesh)o.renderOrder=2;});
      g.add(b);bolts.push(b);
    }
    // 门环
    anchors.gate=g;
    root.add(g);
    anchors.gateLeaves=leaves;anchors.gateBolts=bolts;
    // 门后不可通行：由外围墙已挡；此处加实体门扇碰撞
    addBox(-2.05,-.2,2.05,.2,0,3.0);
  }

  /* ---------- 影壁 ---------- */
  {
    const sw=P.spiritWall({w:3.4,h:2.9});
    sw.position.set(0,0,12.6);sw.rotation.y=Math.PI;root.add(sw);
    addBox(-1.9,12.4,1.9,12.9,0,3.0);
    anchors.screen_wall=new THREE.Vector3(0,1.4,12.4);
  }

  /* ---------- 老槐树 ---------- */
  {
    const t=new THREE.Group();
    const trunkProf=[];
    for(let i=0;i<=10;i++){const p=i/10;trunkProf.push(new THREE.Vector2(.42*(1-p*.72)+.06,p*3.4));}
    const trunk=new THREE.Mesh(new THREE.LatheGeometry(trunkProf,12),MAT.wood);
    trunk.castShadow=true;t.add(trunk);
    // 扭曲
    const tw=trunk.geometry.attributes.position;
    for(let i=0;i<tw.count;i++){const y=tw.getY(i);const a=y*.35;
      tw.setX(i,tw.getX(i)*Math.cos(a*.2)-.12*Math.sin(y),tw.getY(i),tw.getZ(i)+.1*Math.sin(a));}
    trunk.geometry.computeVertexNormals();
    const barkM=new THREE.MeshStandardMaterial({map:M.wood,roughness:1,color:0x3e2f20,bumpMap:M.wood,bumpScale:.03});
    trunk.material=barkM;
    // 主枝
    for(let i=0;i<7;i++){
      const a=i/7*Math.PI*2+Math.random()*.5,len=1.6+Math.random()*1.9;
      const b=new THREE.Mesh(new THREE.CylinderGeometry(.06,.17,len,7),barkM);
      b.position.set(Math.cos(a)*len*.3,2.6+i*.09,Math.sin(a)*len*.3);
      b.rotation.z=Math.cos(a)*1.05;b.rotation.x=-Math.sin(a)*1.05;
      b.castShadow=true;t.add(b);
    }
    // 叶团
    const leafTex=(()=>{const s=256,c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d');
      g.clearRect(0,0,s,s);
      for(let i=0;i<520;i++){const x=Math.random()*s,y=Math.random()*s,r=3+Math.random()*9;
        g.fillStyle=`rgba(${28+Math.random()*44|0},${46+Math.random()*46|0},${26+Math.random()*26|0},${.55+Math.random()*.4})`;
        g.beginPath();g.ellipse(x,y,r,r*.6,Math.random()*3,0,7);g.fill();}
      const t2=new THREE.CanvasTexture(c);t2.colorSpace=THREE.SRGBColorSpace;return t2;})();
    const lm=new THREE.MeshStandardMaterial({map:leafTex,transparent:true,alphaTest:.22,
      side:THREE.DoubleSide,roughness:1,color:0x8fa070});
    for(let i=0;i<46;i++){
      const p=new THREE.Mesh(new THREE.PlaneGeometry(1.5+Math.random()*1.6,1.3+Math.random()*1.4),lm);
      const a=Math.random()*7,r=Math.random()*2.6;
      p.position.set(Math.cos(a)*r,3.5+Math.random()*2.2,Math.sin(a)*r);
      p.rotation.set(Math.random()*.9-.45,Math.random()*7,Math.random()*.7-.35);
      p.castShadow=false;t.add(p);
    }
    // 垂绳（上吊痕迹 —— 环境叙事）
    const noose=new THREE.Mesh(new THREE.TorusGeometry(.16,.014,6,16),
      new THREE.MeshStandardMaterial({color:0xd8cdb0,roughness:1}));
    noose.position.set(1.1,3.2,0);noose.rotation.x=Math.PI/2.4;t.add(noose);
    const rope=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,1.0,5),noose.material);
    rope.position.set(1.1,3.75,0);t.add(rope);
    t.position.set(5.6,0,4.6);root.add(t);
    addBox(5.2,4.2,6.0,5.0,0,3.4);
    anchors.tree=new THREE.Vector3(5.6,0,4.6);
    anchors.treeNoose=new THREE.Vector3(6.7,3.2,4.6);
  }

  /* ---------- 戏台 ---------- */
  {
    const st=P.stage({w:5.2,d:3.6,h:1.0});
    st.position.set(5.5,0,-13.2);st.rotation.y=Math.PI;root.add(st);
    addBox(2.6,-15.3,8.4,-11.1,.0,1.0);
    anchors.stage=new THREE.Vector3(5.5,1.0,-11.4);
    anchors.stageBack=new THREE.Vector3(5.5,1.0,-14.6);
    anchors.stageLeft=new THREE.Vector3(7.9,1.0,-14.2);
    // 台阶
    const s=P.steps(3,2.0,{rise:.32,tread:.34});s.position.set(5.5,0,-10.6);s.rotation.y=Math.PI;root.add(s);
    // 观众席条凳
    [3.4,6.4].forEach((x,i)=>{
      const bench=new THREE.Group();
      const seat=new THREE.Mesh(box(2.4,.12,.28),MAT.wood);seat.position.y=.42;seat.castShadow=true;bench.add(seat);
      for(const s of[-1,1]){
        const lg=new THREE.Mesh(box(.12,.42,.24,false),MAT.woodDark);lg.position.set(s*1.0,.21,0);bench.add(lg);
      }
      bench.position.set(x,0,-9.9);root.add(bench);
      addBox(x-1.2,-10.15,x+1.2,-9.65,0,.5);
      anchors['bench'+i]=bench;
    });
  }

  /* ---------- 祠堂：牌位墙 + 供台 ---------- */
  {
    // 神龛壁板
    const niche=new THREE.Mesh(box(9.4,3.2,.24),MAT.blackLac);
    niche.position.set(-4.5,1.9,-17.7);root.add(niche);
    addBox(-9.2,-17.9,0.2,-17.5,0,3.4);
    // 牌位架（四层）
    for(let r=0;r<4;r++){
      const plank=new THREE.Mesh(box(9.0,.07,.34),MAT.woodDark);
      plank.position.set(-4.5,.86+r*.78,-17.4);plank.castShadow=true;root.add(plank);
    }
    // 装饰牌位：共用一份贴图，clone 省内存
    const deco=P.tablet('某某之位',{hh:.46});
    anchors.tabletShelf=[];
    for(let r=1;r<3;r++)for(let c=0;c<7;c++){
      const t=deco.clone();
      t.position.set(-8.1+c*1.2,.93+r*.78,-17.3);
      root.add(t);
    }
    // 第一层：昭穆谜题的七块主牌位（可交互）
    for(let c=0;c<7;c++){
      const t=P.tablet('？',{hh:.5});
      t.position.set(-8.1+c*1.2,.93,-17.3);
      root.add(t);
      anchors.tabletShelf.push({mesh:t,row:0,col:c,slot:c});
    }
    // 供台
    const at=P.altarTable(3.4,1.0,1.0,{red:true,drawers:2});
    at.position.set(-4.5,0,-16.1);root.add(at);
    addBox(-6.2,-16.6,-2.8,-15.6,0,1.0);
    anchors.shrineAltar=new THREE.Vector3(-4.5,1.0,-16.1);
    // 五行灯架
    anchors.wuxingPoles=[];
    const spots=[[-8.4,-11.2,'东',0],[-5.0,-15.2,'西',0],[-1.6,-11.2,'南',0],[-8.4,-15.2,'北',0],[-5.0,-13.2,'中',0]];
    spots.forEach(([x,z,dir],i)=>{
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,2.5,8),MAT.redLacDark);
      pole.position.set(x,1.25,z);root.add(pole);
      const l=P.lantern({glyph:'○',color:[70,70,70],lit:false,r:.26,hh:.36});
      l.position.set(x,2.62,z);root.add(l);
      anchors.wuxingPoles.push({pole,lantern:l,dir,x,z});
      addBox(x-.18,z-.18,x+.18,z+.18,0,2.6);
    });
    // 香炉（安全点 #2）
    const ib=P.incenseBurner({r:.34,incense:3});
    ib.position.set(-4.5,1.02,-15.85);root.add(ib);
    anchors.censer_shrine={pos:new THREE.Vector3(-4.5,1.1,-15.85),mesh:ib};
    // 挂轴
    for(const s of[-1,1]){
      const sc=P.scroll('槐荫堂',{painting:M.portrait(s>0?1:0),w:.85,h:2.1});
      sc.position.set(-4.5+s*2.4,1.0,-17.75);root.add(sc);
      anchors['scroll_shrine_'+(s>0?'r':'l')]=sc;
    }
    // 匾
    const pl=P.plaque('德 報 本 根',{w:2.6,h:.8});pl.position.set(-4.5,3.3,-17.6);root.add(pl);
  }

  /* ---------- 喜堂陈设 ---------- */
  {
    const at=P.altarTable(3.6,1.1,1.05,{red:true,drawers:2});
    at.position.set(0,0,17.2);at.rotation.y=Math.PI;root.add(at);
    addBox(-1.9,16.6,1.9,17.8,0,1.05);
    anchors.hallAltar=new THREE.Vector3(0,1.06,17.2);
    anchors.hallAltarBack=new THREE.Vector3(0,1.06,17.5);
    // 香炉（安全点 #1）
    const ib=P.incenseBurner({r:.32,incense:2});
    ib.position.set(0,1.08,17.0);root.add(ib);
    anchors.censer_hall={pos:new THREE.Vector3(0,1.2,17.0),mesh:ib};
    // 纸人 ×2 立两侧
    const dolls=[];
    for(const s of[-1,1]){
      const d=P.paperDoll(1.65,{color:0xe4dcc8,face:s>0?1:0,dress:s>0?0xd8cbb0:0xcfc6b0});
      d.position.set(s*4.4,0,16.6);d.rotation.y=-s*.4;root.add(d);dolls.push(d);
      addBox(s*4.4-.3,-.3,s*4.4+.3,.3,0,1.6);
    }
    anchors.hallDolls=dolls;
    // 红烛台
    for(const s of[-1,1]){
      const st2=new THREE.Mesh(new THREE.CylinderGeometry(.12,.18,.9,10),MAT.bronze);
      st2.position.set(s*1.6,.45,17.35);root.add(st2);
      const cd=P.candle(.42,{r:.05});cd.position.set(s*1.6,.9,17.35);root.add(cd);
      anchors['candle_hall_'+(s>0?'r':'l')]=cd;
      addBox(s*1.6-.2,17.2,s*1.6+.2,17.5,0,.9);
    }
    // 高堂座椅
    for(const s of[-1,1]){
      const c=P.chair({red:true});c.position.set(s*2.6,0,15.6);c.rotation.y=Math.PI;root.add(c);
      addBox(s*2.6-.3,15.3,s*2.6+.3,15.9,0,1.2);
    }
    // 大鼓 + 锣
    const drumBody=new THREE.Mesh(new THREE.CylinderGeometry(.5,.42,.8,18),MAT.redLacDark);
    drumBody.position.set(-5.4,.4,12.6);drumBody.rotation.x=Math.PI/2;drumBody.rotation.z=Math.PI/2;
    root.add(drumBody);
    for(const s of[-1,1]){const hoop=new THREE.Mesh(new THREE.TorusGeometry(.48,.04,6,18),MAT.bronze);
      hoop.position.set(-5.4+s*.4,.4,12.6);hoop.rotation.y=Math.PI/2;root.add(hoop);}
    addBox(-6.0,12.1,-4.8,13.1,0,.9);
    anchors.drum=new THREE.Vector3(-5.4,.8,12.6);
    const gongStand=new THREE.Group();
    const frame=new THREE.Mesh(box(.1,1.6,.1),MAT.redLacDark);frame.position.set(-.6,.8,0);
    const frame2=frame.clone();frame2.position.x=.6;
    const top=new THREE.Mesh(box(1.4,.1,.1),MAT.redLacDark);top.position.y=1.6;
    const gong=new THREE.Mesh(new THREE.TorusGeometry(.4,.09,8,24),MAT.bronze);
    gong.position.y=1.2;gong.material=new THREE.MeshStandardMaterial({map:M.bronze,roughness:.32,metalness:.85});
    gongStand.add(frame,frame2,top,gong);
    gongStand.position.set(5.2,0,12.6);root.add(gongStand);
    anchors.gong=new THREE.Vector3(5.2,1.2,12.6);
    addBox(4.5,12.3,5.9,12.9,0,1.6);
    gong.userData.gong=gong;anchors.gongMesh=gong;
    // 红绸幔
    for(let i=0;i<4;i++){
      const rb=P.silkRibbon(6,{color:i%2?0xc8201a:0xd8b23a,curve:.5,w:.16});
      rb.position.set(0,3.3,11.6+i*2.1);root.add(rb);
    }
    const pl=P.plaque('于 歸',{w:1.8,h:.7});pl.position.set(0,3.2,18.7);pl.rotation.y=Math.PI;root.add(pl);
    // 喜堂对联
    const cp=P.couplets('桃之夭夭 灼灼其華','之子于歸 宜其室家');
    cp.left.position.set(-2.35,.6,18.72);cp.left.rotation.y=Math.PI;root.add(cp.left);
    cp.right.position.set(2.35,.6,18.72);cp.right.rotation.y=Math.PI;root.add(cp.right);
    anchors.couplet_left=cp.left;anchors.couplet_right=cp.right;
    // 灯笼串 / 红绸带
    anchors.hallLanterns=[];
    for(let i=0;i<4;i++){
      const l=P.lantern({glyph:i%2?'囍':'婚',lit:true,r:.28,hh:.4});
      l.position.set(-4.5+i*3,2.9,14.6);root.add(l);anchors.hallLanterns.push(l);
    }
    // 长凳
    for(const s of[-1,1]){
      const bn=new THREE.Group();
      const seat=new THREE.Mesh(box(3.2,.12,.3),MAT.wood);seat.position.y=.44;bn.add(seat);
      for(const s2 of[-1,1]){const lg=new THREE.Mesh(box(.12,.44,.26,false),MAT.woodDark);lg.position.set(s2*1.35,.22,0);bn.add(lg);}
      bn.position.set(s*3.4,0,14.2);root.add(bn);addBox(s*3.4-1.6,14.05,s*3.4+1.6,14.35,0,.5);
    }
  }

  /* ---------- 天井 ---------- */
  {
    // 水井
    const well=P.well({depth:4.4,r:.82});
    well.position.set(-5.4,0,1.2);root.add(well);
    addBox(-6.4,.2,-4.4,2.2,0,.7);
    anchors.well={pos:new THREE.Vector3(-5.4,.7,1.2),mesh:well};
    // 水缸
    const jar=P.waterJar({r:.52,h:.86});jar.position.set(7.4,0,-1.6);root.add(jar);
    addBox(6.85,-2.15,7.95,-1.05,0,.9);
    anchors.jar=new THREE.Vector3(7.4,.86,-1.6);
    // 石磨 / 杂物
    const mill=new THREE.Mesh(new THREE.CylinderGeometry(.55,.6,.28,20),MAT.stone);
    mill.position.set(-7.6,.14,-3.6);root.add(mill);addBox(-8.2,-4.2,-7.0,-3.0,0,.3);
    const millTop=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.2,20),MAT.stone);
    millTop.position.set(-7.6,.38,-3.6);millTop.rotation.y=.4;root.add(millTop);
    anchors.mill=new THREE.Vector3(-7.6,.5,-3.6);
    // 香炉（天井安全点）
    const bigCenser=P.incenseBurner({r:.5,legs:3,incense:5});
    const plinth=new THREE.Mesh(box(1.2,.7,1.2),MAT.stone);plinth.position.set(0,.35,-4.4);root.add(plinth);
    bigCenser.position.set(0,.7,-4.4);root.add(bigCenser);
    addBox(-.62,-5.02,.62,-3.78,0,.7);
    anchors.censer_court={pos:new THREE.Vector3(0,.9,-4.4),mesh:bigCenser};
    // 纸人阵（廊下立一圈，恐怖重点）
    anchors.yardDolls=[];
    const dollPos=[[-8.6,-6.2],[-8.6,-2.4],[-8.6,2.4],[-8.6,6.6],[8.6,-6.2],[8.6,6.6],[-3.4,8.4],[3.4,8.4]];
    dollPos.forEach(([x,z],i)=>{
      const d=P.paperDoll(1.5+Math.random()*.22,{color:i%3===0?0xd8cbb0:0xe6ddca,face:i%4===1?1:0,
        dress:i%5===0?0xd8b23a:null});
      d.position.set(x,0,z);d.rotation.y=Math.atan2(-x,-z)+Math.PI;root.add(d);
      anchors.yardDolls.push(d);addBox(x-.28,z-.28,x+.28,z+.28,0,1.5);
    });
    // 晾衣绳 + 红嫁衣（环境叙事）
    const line=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,7,4),MAT.woodDark);
    line.rotation.z=Math.PI/2;line.position.set(-2,2.2,6.8);root.add(line);
    for(const s of[-1,1]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.06,.07,2.3,7),MAT.woodDark);
      post.position.set(-2+s*3.5,1.15,6.8);root.add(post);}
    const dress=new THREE.Mesh(plane(.9,1.3,false),new THREE.MeshStandardMaterial({map:M.silkRed,color:0xa8281e,
      side:THREE.DoubleSide,roughness:.7}));
    dress.position.set(-2.6,1.5,6.82);dress.rotation.y=.2;root.add(dress);
    anchors.hangingDress=dress;
    // 纸钱灰堆
    const jp=P.jossPile(40,.6);jp.position.set(2.2,.02,7.6);root.add(jp);
    anchors.joss=new THREE.Vector3(2.2,.1,7.6);
    // 通往喜堂的门（北扉）—— 敞开，门扇贴墙
    const dh=P.doorLeaf(1.45,2.55,{red:true});
    dh.position.set(-2.35,0,10.24);root.add(dh);
    const dh2=P.doorLeaf(1.45,2.55,{red:true});
    dh2.position.set(2.35,0,10.24);root.add(dh2);
    anchors.door_hall=[dh,dh2];
    // 天井灯笼（游廊 + 井台）
    anchors.courtLanterns=[];
    [[-9.4,-4.2],[-9.4,2.4],[9.4,-4.2],[9.4,2.4],[0,-7.4],[-5.4,2.9]].forEach(([x,z],i)=>{
      const l=P.lantern({glyph:i===5?'井':(i%2?'囍':'婚'),lit:true,r:.27,hh:.38});
      l.position.set(x,2.62,z);root.add(l);anchors.courtLanterns.push(l);
    });
  }

  /* ---------- 东厢·绣楼 ---------- */
  {
    const R2=ROOMS.east;
    // 门扇
    const dl=P.doorLeaf(1.2,2.4,{red:true});dl.position.set(9.9,0,-.2);dl.rotation.y=Math.PI/2;root.add(dl);
    anchors.door_east=dl;
    // 拔步床
    const bed=new THREE.Group();
    const frame=new THREE.Mesh(box(2.2,.42,1.7),MAT.redLacDark);frame.position.y=.21;bed.add(frame);
    const mat2=new THREE.Mesh(box(2.0,.2,1.55,false),new THREE.MeshStandardMaterial({map:M.silkRed,color:0xb2302a,roughness:.85}));
    mat2.position.y=.52;bed.add(mat2);
    const pillow=new THREE.Mesh(box(.6,.16,.34,false),new THREE.MeshStandardMaterial({color:0xe6dcc0,roughness:1}));
    pillow.position.set(-.7,.66,0);bed.add(pillow);
    for(const s of[-1,1])for(const z of[-1,1]){
      const p=new THREE.Mesh(box(.12,2.0,.12,false),MAT.redLac);p.position.set(s*1.05,1.0,z*.78);bed.add(p);
    }
    const canopy=new THREE.Mesh(box(2.3,.14,1.8,false),MAT.redLac);canopy.position.y=2.05;bed.add(canopy);
    const valance=new THREE.Mesh(plane(2.2,.5,false),new THREE.MeshStandardMaterial({map:M.silkRed,color:0xc8201a,side:THREE.DoubleSide,roughness:.6}));
    valance.position.set(0,1.85,.9);bed.add(valance);
    bed.position.set(14.6,0,1.2);bed.rotation.y=0;root.add(bed);
    addBox(13.4,.3,15.8,2.1,0,2.1);
    anchors.bed=new THREE.Vector3(14.6,.7,1.2);
    // 妆台 + 铜镜
    const vanity=new THREE.Group();
    const vt=P.altarTable(1.4,.6,.82,{red:true,drawers:1});vt.scale.set(1,1,1);vanity.add(vt);
    const mir=P.bronzeMirror({r:.38,stand:false,ghost:true});
    mir.rotation.x=-Math.PI/2.2;mir.position.set(0,1.15,-.2);vanity.add(mir);
    const mirFrame=new THREE.Mesh(box(1.0,1.3,.08),MAT.blackLac);mirFrame.position.set(0,1.1,-.28);vanity.add(mirFrame);
    vanity.position.set(15.9,0,-2.6);vanity.rotation.y=Math.PI/2;root.add(vanity);
    addBox(15.2,-3.2,16.6,-2.0,0,1.8);
    anchors.mirror={pos:new THREE.Vector3(15.6,1.1,-2.6),mesh:mir,frame:vanity};
    // 衣橱（藏身处）
    const wd=P.wardrobe({w:1.3,h:2.2,d:.7,open:false});wd.position.set(12.4,0,-4.4);wd.rotation.y=Math.PI/2;root.add(wd);
    addBox(11.9,-5.1,12.9,-3.7,0,2.2);
    anchors.hideEast={pos:new THREE.Vector3(12.05,.9,-4.4),mesh:wd,dir:new THREE.Vector3(1,0,0)};
    // 嫁妆箱
    const ch=P.chest({w:1.1,h:.55,d:.66,lidOpen:false});ch.position.set(11.9,0,2.6);root.add(ch);
    addBox(11.3,2.0,12.5,3.2,0,.6);
    anchors.chestEast=ch;
    // 绣鞋 / 盖头架
    const stand=new THREE.Mesh(new THREE.CylinderGeometry(.04,.06,1.3,8),MAT.woodDark);
    stand.position.set(16.6,.65,.9);root.add(stand);
    const veil=new THREE.Mesh(plane(.6,.5,false),new THREE.MeshStandardMaterial({map:M.silkRed,color:0xc8201a,
      side:THREE.DoubleSide,roughness:.55}));
    veil.position.set(16.6,1.3,.9);root.add(veil);
    anchors.veilStand=new THREE.Vector3(16.6,1.2,.9);
    // 窗
    const win=P.window(1.5,1.4,{type:'bu',y:1.8});win.position.set(17.98,0,.0);win.rotation.y=-Math.PI/2;root.add(win);
    const win2=P.window(1.4,1.3,{type:'crack',y:1.8});win2.position.set(14.0,0,3.98);root.add(win2);
    // 桌 + 棋
    const tb=new THREE.Mesh(box(1.1,.08,1.1),MAT.wood);tb.position.set(13.0,.72,-1.0);root.add(tb);
    for(const s of[-1,1])for(const z of[-1,1]){const lg=new THREE.Mesh(box(.08,.72,.08,false),MAT.woodDark);
      lg.position.set(13.0+s*.45,.36,-1.0+z*.45);root.add(lg);}
    addBox(12.4,-1.6,13.6,-.4,0,.8);
    anchors.eastTable=new THREE.Vector3(13.0,.8,-1.0);
    for(let i=0;i<8;i++){const st=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.02,10),
      i%2?MAT.blackLac:MAT.bone||MAT.wood);
      st.position.set(12.8+ (i%4)*.12,.77,-1.2+Math.floor(i/4)*.16);root.add(st);}
    // 灯笼
    for(let i=0;i<2;i++){const l=P.lantern({glyph:'繡',lit:true,r:.24,hh:.34});
      l.position.set(11.6+i*5,2.5,3.6);root.add(l);}
  }

  /* ---------- 西厢·殡房 ---------- */
  {
    const dl=P.doorLeaf(1.2,2.4,{red:false});dl.position.set(-9.9,0,-.2);dl.rotation.y=-Math.PI/2;root.add(dl);
    anchors.door_west=dl;
    // 棺材 ×2
    const cf=P.coffin(2.3,.78,{open:false});cf.position.set(-15.2,.32,1.0);cf.rotation.y=Math.PI/2;root.add(cf);
    addBox(-16.3,.1,-14.1,1.9,0,.8);
    anchors.coffinClosed=cf;
    const cf2=P.coffin(2.3,.78,{open:true});cf2.position.set(-15.2,.32,-2.6);cf2.rotation.y=Math.PI/2;root.add(cf2);
    addBox(-16.3,-3.5,-14.1,-1.7,0,.8);
    anchors.coffinOpen=cf2;anchors.coffinOpenPos=new THREE.Vector3(-15.2,.6,-2.6);
    const bn=P.bones(14);bn.position.set(-15.2,.55,-2.6);bn.rotation.y=1.2;root.add(bn);
    // 灵位 + 挽联
    const sc=P.scroll('痛 失 良 人',{painting:M.mourning('悼亡'),w:.7,h:2.2});
    sc.position.set(-13.6,1.0,-5.7);root.add(sc);
    const cp=P.couplets('一別永成千古恨','再逢須待五更魂');
    cp.left.position.set(-15.6,.8,-5.78);root.add(cp.left);
    cp.right.position.set(-12.6,.8,-5.78);root.add(cp.right);
    // 药柜
    const hc=P.herbCabinet({w:2.4,h:2.0,rows:5,cols:10});
    hc.position.set(-11.6,1.0,3.2);hc.rotation.y=Math.PI/2;root.add(hc);
    addBox(-12.0,2.5,-11.2,3.9,.85,3.0);
    anchors.herbCabinet=hc;
    // 灶台 + 药罐
    const sv=P.stove({w:1.7,d:.9,h:.92});sv.position.set(-16.8,0,-4.2);sv.rotation.y=.2;root.add(sv);
    addBox(-17.8,-4.8,-15.8,-3.6,0,.95);
    anchors.stove=new THREE.Vector3(-16.8,1.0,-4.2);
    const pot=new THREE.Mesh(new THREE.SphereGeometry(.2,14,10,0,Math.PI*2,0,Math.PI*.7),MAT.blackLac);
    pot.position.set(-17.1,1.06,-4.1);root.add(pot);
    // 长明灯
    const lamp=P.oilLamp({r:.14});lamp.position.set(-13.4,.92,-5.4);root.add(lamp);
    anchors.oilLampWest=lamp;
    // 藏身处：屏风
    const scr=P.screen({panels:4,w:.82,h:1.95});scr.position.set(-12.4,0,-1.4);root.add(scr);
    addBox(-13.2,-1.8,-11.6,-1.0,0,1.95);
    anchors.hideWest={pos:new THREE.Vector3(-12.4,.9,-1.15),mesh:scr,dir:new THREE.Vector3(0,0,-1)};
    // 纸衣挂
    for(let i=0;i<4;i++){
      const p=new THREE.Mesh(plane(.5,.8,false),new THREE.MeshStandardMaterial({map:M.ricePaper,
        color:i%2?0xd8cbb0:0xe0d8c2,side:THREE.DoubleSide,roughness:1}));
      p.position.set(-17.2,.9,-1.2+i*.6);p.rotation.y=Math.PI/2;root.add(p);
    }
    const win=P.window(1.3,1.2,{type:'crack',y:1.9,lit:false});win.position.set(-17.98,0,.6);win.rotation.y=Math.PI/2;root.add(win);
    // 画符短几
    const ji=new THREE.Group();
    const top=new THREE.Mesh(box(1.0,.07,.6),MAT.redLacDark);top.position.y=.66;ji.add(top);
    for(const s of[-1,1]){const lg2=new THREE.Mesh(box(.08,.66,.5,false),MAT.woodDark);lg2.position.set(s*.42,.33,0);ji.add(lg2);}
    const ink=new THREE.Mesh(new THREE.CylinderGeometry(.09,.07,.07,12),MAT.blackLac);ink.position.set(-.28,.73,.06);ji.add(ink);
    const brushRack=new THREE.Mesh(box(.4,.04,.06,false),MAT.bronze);brushRack.position.set(.2,.72,0);ji.add(brushRack);
    for(let i2=0;i2<3;i2++){const br=new THREE.Mesh(new THREE.CylinderGeometry(.01,.014,.3,6),MAT.woodDark);
      br.position.set(.1+i2*.1,.78,-.06);br.rotation.z=1.45;ji.add(br);}
    const tal0=P.talisman("敕令",{w:.18,h:.36});tal0.position.set(-.1,.9,-.24);tal0.rotation.x=-.1;ji.add(tal0);
    ji.position.set(-13.4,0,2.0);root.add(ji);
    addBox(-13.95,1.6,-12.85,2.4,0,.7);
    anchors.talismanDesk=new THREE.Vector3(-13.4,.8,2.0);
  }

  /* ---------- 戏楼内陈设 ---------- */
  {
    const dl=P.doorLeaf(1.15,2.7,{red:true});
    dl.position.set(6.5,0,-7.76);root.add(dl);
    anchors.door_opera=dl;
    // 祠堂门扇（同样贴墙敞开）
    const dls=P.doorLeaf(1.15,2.5,{red:true});
    dls.position.set(-6.6,0,-7.76);root.add(dls);
    const dls2=P.doorLeaf(1.15,2.5,{red:true});
    dls2.position.set(-2.1,0,-7.76);root.add(dls2);
    // 服装箱
    for(let i=0;i<3;i++){
      const ch=P.chest({w:.9,h:.5,d:.6,lidOpen:i===1});
      ch.position.set(2.4+i*.95,0,-16.4);root.add(ch);
      addBox(2.0+i*.95,-16.75,2.7+i*.95,-16.05,0,.5);
      anchors['operaChest'+i]=ch;
    }
    // 面具墙
    anchors.masks=[];
    for(let i=0;i<6;i++){
      const y=1.7+(i%2)*.35;
      const back=new THREE.Mesh(box(.44,.54,.05,false),MAT.blackLac);
      back.position.set(2.4+i*1.3,y,-17.78);root.add(back);
      const mask=new THREE.Mesh(new THREE.SphereGeometry(.17,14,10,0,Math.PI*2,0,Math.PI*.55),
        new THREE.MeshStandardMaterial({color:[0xd8d2c4,0x8c1611,0x1b1512,0xc9a24a,0x3a5a4a,0xe6dcc0][i],roughness:.5}));
      mask.rotation.x=Math.PI*.52;
      mask.position.set(2.4+i*1.3,y,-17.72);
      root.add(mask);
      anchors.masks.push({mesh:mask,y});
    }
    // 胡琴
    const qin=new THREE.Group();
    const bodyQ=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.1,14),MAT.blackLac);
    bodyQ.rotation.x=Math.PI/2;bodyQ.position.y=.05;qin.add(bodyQ);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(.022,.028,.9,8),MAT.wood);
    neck.position.set(0,.5,0);neck.rotation.x=.14;qin.add(neck);
    qin.position.set(8.6,.85,-9.6);root.add(qin);
    anchors.jinghu=qin;
    // 桌凳
    const tb=new THREE.Mesh(box(1.3,.09,1.3),MAT.wood);tb.position.set(8.0,.74,-9.4);root.add(tb);
    for(const s of[-1,1])for(const z of[-1,1]){const lg=new THREE.Mesh(box(.09,.74,.09,false),MAT.woodDark);
      lg.position.set(8.0+s*.55,.37,-9.4+z*.55);root.add(lg);}
    addBox(7.3,-10.1,8.7,-8.7,0,.8);
    anchors.operaTable=new THREE.Vector3(8.0,.8,-9.4);
    // 后台门
    const backDoor=new THREE.Mesh(box(1.0,2.1,.1),MAT.redLac);
    backDoor.position.set(8.2,1.05,-10.0);root.add(backDoor);
    anchors.backDoor=backDoor;
    // 灯笼
    for(let i=0;i<3;i++){const l=P.lantern({glyph:'戲',lit:true,r:.26,hh:.36});
      l.position.set(2.6+i*2.7,3.2,-9.2);root.add(l);anchors['operaLantern'+i]=l;}
  }


  /* ---------- 环境光 / 雾 / 月 ---------- */
  const prof=app.prof||{low:false,shadow:true,fog:.036,roomFill:7.5};
  const hemi=new THREE.HemisphereLight(0x4a627c,0x251d16,prof.low?2.9:2.3);scene.add(hemi);
  /* 室内补光：天花板挡住了月光，每间屋各漏一团冷光（窗棂月）。
     低配档下天井也要一盏——那里没有别的灯了。 */
  for(const r of Object.values(ROOMS)){
    if(r.id==='court'&&!prof.low)continue;
    const fill=new THREE.PointLight(0x8ba7c4,prof.roomFill,
      (r.x1-r.x0)+(r.z1-r.z0)+6,1.35);
    fill.position.set((r.x0+r.x1)/2,(r.h||4.6)*.82,(r.z0+r.z1)/2);
    scene.add(fill);
    anchors.fills=anchors.fills||[];anchors.fills.push(fill);
  }
  const moon=new THREE.DirectionalLight(0xb4cee6,prof.low?3.2:2.7);
  moon.position.set(-14,22,10);moon.target.position.set(0,0,0);
  moon.castShadow=prof.shadow;
  if(prof.shadow){
    moon.shadow.mapSize.set(1024,1024);
    moon.shadow.camera.left=-26;moon.shadow.camera.right=26;
    moon.shadow.camera.top=26;moon.shadow.camera.bottom=-26;
    moon.shadow.camera.near=1;moon.shadow.camera.far=70;
    moon.shadow.bias=-.0016;moon.shadow.normalBias=.03;
  }
  scene.add(moon,moon.target);
  anchors.moon=moon;anchors.hemi=hemi;
  scene.fog=new THREE.FogExp2(0x0b0d10,prof.fog);
  const amb=new THREE.AmbientLight(0x3a4550,1.0);scene.add(amb);

  /* ---------- 蝙蝠（低配档关掉：远距小面片对手机不值这个开销）---------- */
  if(!prof.low){
    const n=22,geo=new THREE.BufferGeometry();
    const arr=new Float32Array(n*3);
    for(let i=0;i<n;i++){arr[i*3]=(Math.random()-.5)*26;arr[i*3+1]=8+Math.random()*7;arr[i*3+2]=(Math.random()-.5)*26;}
    geo.setAttribute('position',new THREE.BufferAttribute(arr,3));
    const m=new THREE.PointsMaterial({size:.16,color:0x0c0c10,transparent:true,opacity:.9,depthWrite:false});
    const pts=new THREE.Points(geo,m);pts.name='bats';scene.add(pts);
    anchors.bats={pts,seed:Array.from({length:n},()=>Math.random()*9)};
  }

  /* ---------- 空中飘浮的灰烬 ---------- */
  {
    const soft=(()=>{const s=64,c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d');
      const rg=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
      rg.addColorStop(0,'rgba(255,255,255,1)');rg.addColorStop(.45,'rgba(230,220,196,.6)');
      rg.addColorStop(1,'rgba(200,190,160,0)');g.fillStyle=rg;g.fillRect(0,0,s,s);
      const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
    const n=prof.low?120:380,geo=new THREE.BufferGeometry(),arr=new Float32Array(n*3),spd=[];
    for(let i=0;i<n;i++){
      arr[i*3]=(Math.random()-.5)*34;arr[i*3+1]=Math.random()*7;arr[i*3+2]=(Math.random()-.5)*34;
      spd.push({vy:.06+Math.random()*.16,ph:Math.random()*7});
    }
    geo.setAttribute('position',new THREE.BufferAttribute(arr,3));
    const m=new THREE.PointsMaterial({size:.055,map:soft,transparent:true,opacity:.42,
      depthWrite:false,sizeAttenuation:true,alphaTest:.02,color:0xd8cdb6});
    const ash=new THREE.Points(geo,m);ash.name='ash';scene.add(ash);
    anchors.ash={pts:ash,spd};
  }

  return {root,anchors,addBox,col,moon,hemi};
}

/* 供 main 使用的寻路点（房间中心 + 门洞） */
export const NAV={
  hall:[0,14.5],gate:[0,17.6],hallDoor:[0,10.6],
  court:[0,1],courtN:[-4.3,-7.2],courtNE:[5.5,-7.2],courtE:[9.2,-.2],courtW:[-9.2,-.2],
  well:[-5.4,2.6],tree:[5.6,5.6],censer:[0,-3.4],
  shrine:[-4.5,-12],shrineDoor:[-4.3,-8.8],
  opera:[5.5,-11],operaDoor:[4.3,-8.8],stageFront:[5.5,-10.2],back:[8.2,-11.6],
  east:[14,-1],eastDoor:[10.6,-.2],
  west:[-14.5,0],westDoor:[-10.6,-.2],
};
