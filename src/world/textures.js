import * as THREE from 'three';
import {TEX} from '../core/platform.js';

/* =========================================================
   程序化材质库 —— 全部由 Canvas 绘制，无任何外部贴图
   ========================================================= */
const SERIF='"KaiTi","STKaiti","Kaiti SC","SimSun","Songti SC","Noto Serif CJK SC",serif';
const HEI='"SimHei","Microsoft YaHei","Heiti SC",sans-serif';

/**
 * 低配档只降分辨率、不降绘制坐标：画布物理尺寸乘 s，上下文再 scale(s)，
 * 于是所有矢量绘制代码（含绝对坐标）原样可用。
 */
function cv(w,h=w){
  const s=TEX();
  const c=document.createElement('canvas');
  c.width=Math.max(2,Math.round(w*s));
  c.height=Math.max(2,Math.round(h*s));
  const g=c.getContext('2d');
  if(s!==1)g.scale(s,s);
  return[c,g];
}

function tex(canvas,{rep=[1,1],aniso=8,srgb=true,flipY=true}={}){
  const t=new THREE.CanvasTexture(canvas);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.repeat.set(rep[0],rep[1]);
  t.anisotropy=aniso;
  if(srgb)t.colorSpace=THREE.SRGBColorSpace;
  t.flipY=flipY;
  t.needsUpdate=true;
  return t;
}

function grain(g,w,h,a=.16,mono=true){
  // 像素级操作必须用画布真实尺寸（cv 已按画质档位缩过）
  const img=g.getImageData(0,0,g.canvas.width,g.canvas.height),d=img.data;
  for(let i=0;i<d.length;i+=4){
    const n=(Math.random()-.5)*255*a;
    d[i]=Math.max(0,Math.min(255,d[i]+n));
    d[i+1]=Math.max(0,Math.min(255,d[i+1]+(mono?n:(Math.random()-.5)*255*a)));
    d[i+2]=Math.max(0,Math.min(255,d[i+2]+n));
  }
  g.putImageData(img,0,0);
}
function fibers(g,w,h,n,len=42,col='rgba(255,255,255,.10)',lw=1.1){
  g.save();g.lineCap='round';g.strokeStyle=col;g.lineWidth=lw;
  for(let i=0;i<n;i++){
    const x=Math.random()*w,y=Math.random()*h,a=Math.random()*Math.PI;
    g.beginPath();g.moveTo(x,y);
    g.quadraticCurveTo(x+Math.cos(a)*len*.5+(Math.random()-.5)*9,y+Math.sin(a)*len*.5+(Math.random()-.5)*9,
                       x+Math.cos(a)*len,y+Math.sin(a)*len);
    g.stroke();
  }
  g.restore();
}
function cracks(g,x,y,w,h,n,col='rgba(20,10,6,.30)',maxLen=120){
  g.save();g.strokeStyle=col;g.lineCap='round';
  for(let i=0;i<n;i++){
    let px=x+Math.random()*w,py=y+Math.random()*h,ang=Math.random()*Math.PI*2;
    g.lineWidth=.5+Math.random()*1.6;g.beginPath();g.moveTo(px,py);
    const segs=4+Math.floor(Math.random()*7);
    for(let s=0;s<segs;s++){ang+=(Math.random()-.5)*.9;const l=8+Math.random()*(maxLen/segs);
      px+=Math.cos(ang)*l;py+=Math.sin(ang)*l;g.lineTo(px,py);}
    g.stroke();
  }
  g.restore();
}
function stains(g,w,h,n,cols=['rgba(60,40,18,.18)','rgba(30,20,12,.22)','rgba(90,60,20,.12)']){
  g.save();
  for(let i=0;i<n;i++){
    const x=Math.random()*w,y=Math.random()*h,r=14+Math.random()*120;
    const rg=g.createRadialGradient(x,y,0,x,y,r);
    rg.addColorStop(0,cols[i%cols.length]);rg.addColorStop(.6,cols[(i+1)%cols.length]);rg.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=rg;g.beginPath();
    // 不规则边缘
    for(let a=0;a<=Math.PI*2+.1;a+=.35){const rr=r*(.7+Math.random()*.5);
      const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;a===0?g.moveTo(px,py):g.lineTo(px,py);}
    g.fill();
  }
  g.restore();
}
/** 竖排中文 */
function vText(g,str,{x,y,size,family=SERIF,color='#1a1208',spacing=1.15,alpha=1,bold=false}){
  g.save();g.globalAlpha=alpha;g.fillStyle=color;
  g.font=(bold?'700 ':'400 ')+size+'px '+family;
  g.textAlign='center';g.textBaseline='middle';
  const step=size*spacing;
  [...str].forEach((ch,i)=>{ if(ch===' '){return;} g.fillText(ch,x,y+i*step); });
  g.restore();
  return y+[...str].length*step;
}
function hText(g,str,{x,y,size,family=SERIF,color='#1a1208',spacing=0,alpha=1,bold=false,align='center'}){
  g.save();g.globalAlpha=alpha;g.fillStyle=color;
  g.font=(bold?'700 ':'400 ')+size+'px '+family;
  g.textAlign=align;g.textBaseline='middle';
  if(!spacing)g.fillText(str,x,y);
  else{const adv=size+spacing;let cx=x-( [...str].length-1)*adv/2;
    if(align==='left')cx=x;
    [...str].forEach(ch=>{g.fillText(ch,cx,y);cx+=adv;});}
  g.restore();
}
/** 印章 */
function seal(g,x,y,size,text='囍',color='rgba(158,26,20,.86)'){
  g.save();g.translate(x,y);g.rotate((Math.random()-.5)*.16);
  g.fillStyle=color;g.globalAlpha=.86;
  g.fillRect(-size/2,-size/2,size,size);
  g.globalCompositeOperation='destination-out';
  for(let i=0;i<240;i++){const rx=(Math.random()-.5)*size,ry=(Math.random()-.5)*size;
    if(Math.random()<.35)g.fillRect(rx,ry,Math.random()*4,Math.random()*4);}
  g.globalCompositeOperation='source-over';
  g.strokeStyle='rgba(0,0,0,0)';g.strokeRect(-size/2,-size/2,size,size);
  hText(g,text,{x:0,y:0,size:size*.66,family:SERIF,color:'#e8cfa4',alpha:.95});
  g.restore();
}

/* =============== 具体材质 =============== */
const M={};

/* 青砖地 */
M.blueBrick=(()=>{const[w,h]=[640,640];const[c,g]=cv(w,h);
  g.fillStyle='#3a3b38';g.fillRect(0,0,w,h);
  const bw=160,bh=72;
  for(let row=0;row<h/bh+1;row++){
    const off=(row%2)*bw/2;
    for(let col=-1;col<w/bw+1;col++){
      const x=col*bw+off,y=row*bh;
      const v=Math.random();
      g.fillStyle=`rgb(${52+v*26|0},${56+v*24|0},${54+v*20|0})`;
      g.fillRect(x+2,y+2,bw-4,bh-4);
      g.fillStyle='rgba(0,0,0,.22)';g.fillRect(x+2,y+bh-8,bw-4,6);
      g.fillStyle='rgba(255,255,255,.05)';g.fillRect(x+2,y+2,bw-4,4);
      if(Math.random()<.35){for(let k=0;k<3;k++){const sx=x+Math.random()*bw,sy=y+Math.random()*bh,sr=6+Math.random()*30;
        const rg=g.createRadialGradient(sx,sy,0,sx,sy,sr);
        rg.addColorStop(0,'rgba(22,32,16,.30)');rg.addColorStop(1,'rgba(0,0,0,0)');
        g.fillStyle=rg;g.beginPath();g.arc(sx,sy,sr,0,7);g.fill();}}
      if(Math.random()<.22){g.strokeStyle='rgba(16,14,10,.5)';g.lineWidth=1.3;
        cracks(g,x+3,y+3,bw-6,bh-6,2);}
    }
  }
  // 青苔
  for(let i=0;i<3800;i++){const x=Math.random()*w,y=Math.random()*h;
    if(Math.sin(y*.039)>0.55&&Math.random()<.5)continue;
    g.fillStyle=`rgba(${40+Math.random()*30|0},${58+Math.random()*46|0},${30+Math.random()*24|0},${Math.random()*.30})`;
    g.fillRect(x,y,1+Math.random()*3,1+Math.random()*2);}
  grain(g,w,h,.10);
  return tex(c,{rep:[4,4]});})();

/* 石板 */
M.flagstone=(()=>{const[w,h]=[640,640];const[c,g]=cv(w,h);
  g.fillStyle='#464340';g.fillRect(0,0,w,h);
  const cols=[0,170,330,490],rows=[0,150,300,470];
  cols.forEach((x,i)=>rows.forEach((y,j)=>{
    const bw=(cols[i+1]||w)-x-8, bh=(rows[j+1]||h)-y-8;
    const v=Math.random();
    g.fillStyle=`rgb(${62+v*30|0},${60+v*26|0},${56+v*24|0})`;
    g.fillRect(x+4,y+4,bw,bh);
    g.strokeStyle='rgba(12,10,8,.55)';g.lineWidth=3;g.strokeRect(x+4,y+4,bw,bh);
    for(let k=0;k<8;k++){g.fillStyle=`rgba(255,255,255,${Math.random()*.05})`;
      g.beginPath();g.ellipse(x+Math.random()*bw,y+Math.random()*bh,10+Math.random()*40,6+Math.random()*20,Math.random()*3,0,7);g.fill();}
    if(Math.random()<.5)cracks(g,x+4,y+4,bw,bh,3,'rgba(14,12,10,.45)');
  }));
  grain(g,w,h,.12);return tex(c,{rep:[3,3]});})();

/* 夯土地面 */
M.earth=(()=>{const[w,h]=[512,512];const[c,g]=cv(w,h);
  g.fillStyle='#4a3a28';g.fillRect(0,0,w,h);
  for(let i=0;i<2600;i++){g.fillStyle=`rgba(${60+Math.random()*70|0},${45+Math.random()*50|0},${28+Math.random()*36|0},${Math.random()*.5})`;
    g.beginPath();g.arc(Math.random()*w,Math.random()*h,Math.random()*7,0,7);g.fill();}
  stains(g,w,h,16,['rgba(28,18,8,.3)','rgba(70,54,30,.24)']);
  fibers(g,w,h,90,26,'rgba(120,100,60,.14)');
  grain(g,w,h,.16);return tex(c,{rep:[3,3]});})();

/* 白灰墙（剥落） */
M.plaster=(()=>{const[w,h]=[640,640];const[c,g]=cv(w,h);
  g.fillStyle='#b9ad95';g.fillRect(0,0,w,h);
  for(let i=0;i<1400;i++){const x=Math.random()*w,y=Math.random()*h;
    g.fillStyle=`rgba(${150+Math.random()*60|0},${142+Math.random()*54|0},${120+Math.random()*48|0},${Math.random()*.45})`;
    g.beginPath();g.ellipse(x,y,2+Math.random()*16,2+Math.random()*10,Math.random()*3,0,7);g.fill();}
  // 露砖（少量、浅淡：是风化而非窟窿）
  for(let i=0;i<5;i++){
    const x=Math.random()*w,y=Math.random()*h,r=10+Math.random()*34;
    g.save();g.beginPath();
    for(let a=0;a<=7;a++){const rr=r*(.7+Math.random()*.5),px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;
      a?g.lineTo(px,py):g.moveTo(px,py);}
    g.closePath();g.clip();
    g.fillStyle='#8d8578';g.fillRect(x-r,y-r,r*2,r*2);
    for(let by=0;by<r*2;by+=22)for(let bx=0;bx<r*2;bx+=48){
      const v=Math.random();
      g.fillStyle=`rgba(${104+v*26|0},${98+v*22|0},${86+v*20|0},.85)`;
      g.fillRect(x-r+bx+((by/22)%2)*24,y-r+by,44,18);}
    g.restore();
    g.strokeStyle='rgba(196,186,164,.5)';g.lineWidth=2;
    g.beginPath();
    for(let a=0;a<=7;a++){const rr=r*(.7+Math.random()*.5),px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;
      a?g.lineTo(px,py):g.moveTo(px,py);}
    g.closePath();g.stroke();
  }
  // 水痕
  for(let i=0;i<8;i++){const x=Math.random()*w;const gr=g.createLinearGradient(x,0,x+26,h);
    gr.addColorStop(0,'rgba(110,94,66,0)');gr.addColorStop(.5,'rgba(112,96,68,.13)');gr.addColorStop(1,'rgba(110,94,66,0)');
    g.fillStyle=gr;g.fillRect(x,0,16+Math.random()*30,h);}
  stains(g,w,h,10,['rgba(126,106,72,.12)','rgba(96,82,58,.10)']);
  cracks(g,0,0,w,h,22,'rgba(96,84,64,.26)',170);
  grain(g,w,h,.13);return tex(c,{rep:[2,1]});})();

/* 朱漆（门、柱、棺） */
M.redLacquer=(dark=0)=>{const[w,h]=[512,512];const[c,g]=cv(w,h);
  const base=[`rgba(${112-dark},${18-dark},${14-dark},1)`,`rgba(${138-dark},${24-dark},${18-dark},1)`,`rgba(${92-dark},${12-dark},${10-dark},1)`];
  g.fillStyle=base[1];g.fillRect(0,0,w,h);
  for(let i=0;i<520;i++){const x=Math.random()*w,y=Math.random()*h,len=30+Math.random()*180;
    g.strokeStyle=base[Math.floor(Math.random()*3)];g.globalAlpha=.10+Math.random()*.22;g.lineWidth=1+Math.random()*7;
    g.beginPath();g.moveTo(x,y);g.lineTo(x+(Math.random()-.5)*12,y+len);g.stroke();}
  g.globalAlpha=1;
  // 金漆剥落
  for(let i=0;i<34;i++){const x=Math.random()*w,y=Math.random()*h;
    g.fillStyle='rgba(34,20,14,.75)';g.beginPath();
    for(let a=0;a<8;a++){const r=3+Math.random()*13,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;a?g.lineTo(px,py):g.moveTo(px,py);}g.fill();}
  for(let i=0;i<14;i++){g.fillStyle=`rgba(${170+Math.random()*50|0},${130+Math.random()*50|0},60,${Math.random()*.13})`;
    g.beginPath();g.arc(Math.random()*w,Math.random()*h,4+Math.random()*26,0,7);g.fill();}
  cracks(g,0,0,w,h,20,'rgba(24,8,4,.5)',110);
  grain(g,w,h,.10);return tex(c,{rep:[1,1]});};
const _redLac=M.redLacquer;
M.redLacquer=_redLac(0);
M.redLacquerDark=_redLac(38);

/* 黑漆（棺材、家具） */
M.blackLacquer=(()=>{const[w,h]=[512,512];const[c,g]=cv(w,h);
  g.fillStyle='#171312';g.fillRect(0,0,w,h);
  for(let i=0;i<420;i++){g.strokeStyle=`rgba(${30+Math.random()*40|0},${22+Math.random()*30|0},${20+Math.random()*26|0},${Math.random()*.5})`;
    g.lineWidth=1+Math.random()*8;const y=Math.random()*h;g.beginPath();g.moveTo(0,y);g.lineTo(w,y+(Math.random()-.5)*16);g.stroke();}
  // 断纹（漆器裂纹）
  g.strokeStyle='rgba(120,100,70,.28)';
  for(let i=0;i<60;i++){let x=Math.random()*w,y=Math.random()*h;g.lineWidth=.8;g.beginPath();g.moveTo(x,y);
    for(let s=0;s<5;s++){x+=(Math.random()-.5)*30;y+=Math.random()*22;g.lineTo(x,y);}g.stroke();}
  for(let i=0;i<20;i++){g.fillStyle=`rgba(190,150,60,${Math.random()*.10})`;
    g.beginPath();g.arc(Math.random()*w,Math.random()*h,5+Math.random()*30,0,7);g.fill();}
  grain(g,w,h,.09);return tex(c,{rep:[1,1]});})();

/* 原木 / 楠木柱 */
M.wood=(()=>{const[w,h]=[512,512];const[c,g]=cv(w,h);
  g.fillStyle='#5a4028';g.fillRect(0,0,w,h);
  for(let i=0;i<900;i++){const y=Math.random()*h;
    g.strokeStyle=`rgba(${70+Math.random()*60|0},${48+Math.random()*40|0},${26+Math.random()*28|0},${.15+Math.random()*.4})`;
    g.lineWidth=1+Math.random()*5;g.beginPath();g.moveTo(0,y);
    let cy=y;for(let x=0;x<=w;x+=32){cy+=(Math.random()-.5)*5;g.lineTo(x,cy);}g.stroke();}
  // 节疤
  for(let i=0;i<10;i++){const x=Math.random()*w,y=Math.random()*h,r=8+Math.random()*22;
    for(let k=6;k>0;k--){g.strokeStyle=`rgba(46,30,16,${.10+k*.04})`;g.lineWidth=2;
      g.beginPath();g.ellipse(x,y,r*k/6,r*k/8,.4,0,7);g.stroke();}}
  stains(g,w,h,10,['rgba(24,14,6,.3)']);
  grain(g,w,h,.12);return tex(c,{rep:[1,2]});})();

/* 宣纸 */
M.ricePaper=(tint=[236,226,200])=>{const[w,h]=[512,512];const[c,g]=cv(w,h);
  g.fillStyle=`rgb(${tint[0]},${tint[1]},${tint[2]})`;g.fillRect(0,0,w,h);
  fibers(g,w,h,700,54,'rgba(255,255,255,.22)',.9);
  fibers(g,w,h,420,34,'rgba(120,100,70,.10)',.8);
  stains(g,w,h,14,['rgba(170,140,90,.16)','rgba(120,90,50,.14)']);
  grain(g,w,h,.07);return tex(c,{rep:[1,1]});};
const _rp=M.ricePaper;
M.talismanBase=_rp([214,182,104]);
M.ricePaper=_rp();

/* 红绸 */
M.silkRed=(()=>{const[w,h]=[512,512];const[c,g]=cv(w,h);
  g.fillStyle='#8f1512';g.fillRect(0,0,w,h);
  for(let y=0;y<h;y+=3){g.fillStyle=`rgba(${150+Math.random()*70|0},26,20,${.10+Math.random()*.16})`;g.fillRect(0,y,w,2);}
  for(let x=0;x<w;x+=4){g.fillStyle=`rgba(60,6,6,${Math.random()*.13})`;g.fillRect(x,0,2,h);}
  for(let i=0;i<26;i++){const x=Math.random()*w,y=Math.random()*h;
    const gr=g.createLinearGradient(x,y,x+120,y+160);
    gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.5,'rgba(255,120,90,.14)');gr.addColorStop(1,'rgba(0,0,0,.18)');
    g.fillStyle=gr;g.beginPath();g.ellipse(x,y,80,40,Math.random()*3,0,7);g.fill();}
  // 金字纹样
  g.save();g.globalAlpha=.15;g.strokeStyle='#e8c56a';g.lineWidth=2;
  for(let i=0;i<6;i++){const x=40+i*80,y=60+((i%2)*200);g.beginPath();
    for(let a=0;a<7;a+=.2)g.lineTo(x+Math.cos(a*2)*26*Math.sin(a),y+Math.sin(a*2)*26*Math.sin(a));g.stroke();}
  g.restore();
  grain(g,w,h,.08);return tex(c,{rep:[2,2]});})();

/* 瓦 */
M.roofTile=(()=>{const[w,h]=[512,512];const[c,g]=cv(w,h);
  g.fillStyle='#2b2d31';g.fillRect(0,0,w,h);
  const tw=64;
  for(let col=0;col<w/tw;col++){
    const x=col*tw;
    g.fillStyle=`rgb(${44+Math.random()*16|0},${48+Math.random()*14|0},${54+Math.random()*14|0})`;
    g.beginPath();g.moveTo(x,0);g.lineTo(x+tw,0);g.lineTo(x+tw,h);g.lineTo(x,h);g.closePath();g.fill();
    const gr=g.createLinearGradient(x,0,x+tw,0);
    gr.addColorStop(0,'rgba(0,0,0,.5)');gr.addColorStop(.35,'rgba(255,255,255,.08)');gr.addColorStop(1,'rgba(0,0,0,.55)');
    g.fillStyle=gr;g.fillRect(x,0,tw,h);
    for(let y=8;y<h;y+=44){g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=3;
      g.beginPath();g.arc(x+tw/2,y,22,Math.PI*.08,Math.PI*.92);g.stroke();}
  }
  for(let i=0;i<2200;i++){const x=Math.random()*w,y=Math.random()*h;
    g.fillStyle=`rgba(${50+Math.random()*40|0},${70+Math.random()*50|0},${44+Math.random()*30|0},${Math.random()*.22})`;
    g.fillRect(x,y,2+Math.random()*4,2);}
  grain(g,w,h,.14);return tex(c,{rep:[4,2]});})();

/* 铜 */
M.bronze=(patina=.5)=>{const[w,h]=[512,512];const[c,g]=cv(w,h);
  const gr=g.createRadialGradient(w/2,h/2,10,w/2,h/2,w*.62);
  gr.addColorStop(0,'#c9a954');gr.addColorStop(.55,'#8d6a34');gr.addColorStop(1,'#3e2f18');
  g.fillStyle='#8a6a33';g.fillRect(0,0,w,h);
  g.fillStyle=gr;g.fillRect(0,0,w,h);
  for(let i=0;i<60;i++){g.strokeStyle=`rgba(255,230,170,${Math.random()*.10})`;g.lineWidth=Math.random()*10;
    g.beginPath();g.arc(w/2,h/2,20+Math.random()*240,Math.random()*7,Math.random()*7);g.stroke();}
  for(let i=0;i<700;i++){const x=Math.random()*w,y=Math.random()*h;
    g.fillStyle=`rgba(${40+Math.random()*40|0},${120+Math.random()*70|0},${100+Math.random()*50|0},${Math.random()*patina*.6})`;
    g.beginPath();g.ellipse(x,y,3+Math.random()*16,3+Math.random()*12,0,0,7);g.fill();}
  grain(g,w,h,.10);return tex(c,{rep:[1,1]});};
M.bronze=M.bronze(.55);

/* 灯笼皮 */
M.lantern=(glyph='囍',tint=[196,32,26])=>{const[w,h]=[512,512];const[c,g]=cv(w,h);
  g.fillStyle=`rgb(${tint[0]},${tint[1]},${tint[2]})`;g.fillRect(0,0,w,h);
  for(let i=0;i<200;i++){g.strokeStyle=`rgba(255,120,80,${Math.random()*.10})`;g.lineWidth=1+Math.random()*6;
    const y=Math.random()*h;g.beginPath();g.moveTo(0,y);g.lineTo(w,y+(Math.random()-.5)*10);g.stroke();}
  hText(g,glyph,{x:w/2,y:h/2,size:190,family:SERIF,color:'rgba(255,226,150,.92)',bold:true});
  const vg=g.createRadialGradient(w/2,h/2,60,w/2,h/2,w*.7);
  vg.addColorStop(0,'rgba(255,220,150,.30)');vg.addColorStop(1,'rgba(20,0,0,.55)');
  g.fillStyle=vg;g.fillRect(0,0,w,h);
  grain(g,w,h,.08);return tex(c,{rep:[1,1]});};

/* 牌位（黑漆金字，可写字） */
M.tablet=function(text='显考',{color='#e6cd8a',bg='#15100c',size=46,sealText='忌'}={}){
  const[w,h]=[256,512];const[c,g]=cv(w,h);
  g.fillStyle=bg;g.fillRect(0,0,w,h);
  for(let i=0;i<300;i++){g.strokeStyle=`rgba(${26+Math.random()*30|0},${20+Math.random()*20|0},${16+Math.random()*16|0},${Math.random()*.6})`;
    g.lineWidth=1+Math.random()*4;const x=Math.random()*w;g.beginPath();g.moveTo(x,0);g.lineTo(x+(Math.random()-.5)*10,h);g.stroke();}
  cracks(g,0,0,w,h,16,'rgba(140,110,60,.22)',90);
  g.strokeStyle='rgba(190,150,64,.55)';g.lineWidth=4;g.strokeRect(14,14,w-28,h-28);
  g.strokeStyle='rgba(190,150,64,.30)';g.lineWidth=2;g.strokeRect(24,24,w-48,h-48);
  const chars=[...text];
  const fit=Math.min(size,(h-90)/Math.max(1,chars.length)/1.16);
  vText(g,text,{x:w/2,y:52,size:fit,family:SERIF,color,spacing:1.16,bold:true});
  seal(g,w-48,h-52,40,sealText);
  grain(g,w,h,.08);
  return tex(c,{rep:[1,1]});
};

/* 符箓：黄纸朱砂 */
M.talisman=function(word='敕令'){
  const[w,h]=[256,512];const[c,g]=cv(w,h);
  g.fillStyle='#d8b45a';g.fillRect(0,0,w,h);
  fibers(g,w,h,300,40,'rgba(255,240,190,.3)');
  stains(g,w,h,7,['rgba(110,70,20,.3)']);
  g.strokeStyle='#a8281e';g.lineWidth=5;g.strokeRect(10,10,w-20,h-20);
  g.beginPath();g.moveTo(18,44);g.lineTo(w-18,44);g.moveTo(18,86);g.lineTo(w-18,86);g.stroke();
  hText(g,'天',{x:w/2-30,y:66,size:30,color:'#a8281e',family:SERIF});
  hText(g,'啟',{x:w/2+30,y:66,size:30,color:'#a8281e',family:SERIF});
  vText(g,word,{x:w/2,y:120,size:56,color:'#8f1a12',family:SERIF,bold:true});
  // 鬼足 / 云头纹
  g.strokeStyle='#8f1a12';g.lineWidth=6;g.lineCap='round';
  g.beginPath();
  g.moveTo(w*.3,h*.66);g.bezierCurveTo(w*.7,h*.70,w*.25,h*.80,w*.6,h*.84);
  g.lineTo(w*.42,h*.94);g.moveTo(w*.6,h*.84);g.lineTo(w*.72,h*.95);
  g.stroke();
  grain(g,w,h,.09);return tex(c,{rep:[1,1]});
};

/* 挽联 / 喜联 */
M.couplet=function(text,color='#f0d69a',bg='#8c1611'){
  const[w,h]=[220,760];const[c,g]=cv(w,h);
  g.fillStyle=bg;g.fillRect(0,0,w,h);
  for(let i=0;i<260;i++){g.strokeStyle=`rgba(${90+Math.random()*60|0},${12+Math.random()*20|0},${10+Math.random()*16|0},${Math.random()*.5})`;
    g.lineWidth=1+Math.random()*5;const y=Math.random()*h;g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
  g.strokeStyle='rgba(230,200,120,.5)';g.lineWidth=3;g.strokeRect(12,12,w-24,h-24);
  vText(g,text,{x:w/2,y:44,size:74,family:SERIF,color,bold:true,spacing:1.05});
  stains(g,w,h,6,['rgba(30,6,4,.3)']);
  grain(g,w,h,.09);return tex(c,{rep:[1,1]});
};

/* 纸人开脸（媚而诡） */
M.dollFace=function(style=0){
  const[w,h]=[256,340];const[c,g]=cv(w,h);
  g.clearRect(0,0,w,h);                       // 透明底：只留头与发，避免"白卡片"
  const cx=w/2;
  // 披发（剪影，垂至底边）
  g.fillStyle='#141110';
  g.beginPath();
  g.moveTo(cx-96,120);
  g.quadraticCurveTo(cx-104,26,cx,16);
  g.quadraticCurveTo(cx+104,26,cx+96,120);
  g.bezierCurveTo(cx+112,200,cx+96,272,cx+86,340);
  g.lineTo(cx-86,340);
  g.bezierCurveTo(cx-96,272,cx-112,200,cx-96,120);
  g.closePath();g.fill();
  g.save();g.globalAlpha=.5;g.strokeStyle='#2a2422';g.lineWidth=2;
  for(let i=0;i<22;i++){const x=cx-84+Math.random()*168;
    g.beginPath();g.moveTo(x,60+Math.random()*40);g.quadraticCurveTo(x+(Math.random()-.5)*22,220,x+(Math.random()-.5)*30,340);g.stroke();}
  g.restore();
  g.beginPath();g.ellipse(cx,60,78,48,0,0,7);g.fillStyle='#141110';g.fill();
  // 面（鹅蛋脸）
  g.fillStyle='#f2e6cf';g.beginPath();
  g.moveTo(cx,86);
  g.bezierCurveTo(cx+62,88,cx+70,148,cx+56,196);
  g.bezierCurveTo(cx+44,236,cx+20,256,cx,258);
  g.bezierCurveTo(cx-20,256,cx-44,236,cx-56,196);
  g.bezierCurveTo(cx-70,148,cx-62,88,cx,86);
  g.closePath();g.fill();
  g.save();g.globalAlpha=.16;g.fillStyle='#b08a5c';g.fillRect(cx-70,86,140,26);g.restore();
  fibers(g,w,h,120,26,'rgba(255,255,255,.22)');
  // 眼尾晕染（媚）
  [-1,1].forEach(s=>{g.save();g.globalAlpha=.22;g.fillStyle='#b8434a';
    g.beginPath();g.ellipse(cx+s*50,164,20,11,s*-.22,0,7);g.fill();g.restore();});
  // 眉（细长入鬓，眉尾上挑）
  g.strokeStyle='#241d1a';g.lineCap='round';
  [-1,1].forEach(s=>{g.lineWidth=4.6;g.beginPath();
    g.moveTo(cx+s*14,144);g.bezierCurveTo(cx+s*34,130,cx+s*52,130,cx+s*64,140);g.stroke();});
  // 眼（丹凤眼，细长上挑，半阖）
  [-1,1].forEach(s=>{
    g.strokeStyle='#1c1614';g.lineWidth=3.6;g.beginPath();
    g.moveTo(cx+s*18,166);
    g.bezierCurveTo(cx+s*30,155,cx+s*50,155,cx+s*62,163);   // 上睑，眼尾上扬
    g.bezierCurveTo(cx+s*48,175,cx+s*28,175,cx+s*18,166);   // 下睑
    g.stroke();
    g.fillStyle='#150f0d';g.beginPath();g.ellipse(cx+s*40,166,9,8,0,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.62)';g.beginPath();g.arc(cx+s*37,163,2.2,0,7);g.fill();
    // 眼尾一勾
    g.strokeStyle='#1c1614';g.lineWidth=2.6;g.beginPath();
    g.moveTo(cx+s*62,163);g.lineTo(cx+s*70,158);g.stroke();
    // 下眼睑阴影
    g.strokeStyle='rgba(70,36,32,.42)';g.lineWidth=1.6;g.beginPath();
    g.moveTo(cx+s*22,173);g.lineTo(cx+s*56,172);g.stroke();
  });
  // 鼻（仅一笔暗示）
  g.strokeStyle='rgba(120,80,60,.42)';g.lineWidth=2;
  g.beginPath();g.moveTo(cx-3,178);g.quadraticCurveTo(cx-7,204,cx,209);g.stroke();
  // 唇（点绛唇，嘴角上勾）
  g.fillStyle='#a8281e';g.beginPath();
  g.moveTo(cx-21,226);
  g.bezierCurveTo(cx-9,217,cx+9,217,cx+21,226);
  g.bezierCurveTo(cx+13,240,cx-13,240,cx-21,226);g.fill();
  g.strokeStyle='#7a130f';g.lineWidth=1.6;g.beginPath();
  g.moveTo(cx-26,224);g.quadraticCurveTo(cx-15,222,cx-21,226);
  g.moveTo(cx+26,224);g.quadraticCurveTo(cx+15,222,cx+21,226);g.stroke();
  g.save();g.globalAlpha=.35;g.fillStyle='#fff';
  g.beginPath();g.ellipse(cx-5,222,4,1.8,0,0,7);g.fill();g.restore();
  // 腮红
  g.save();g.globalAlpha=.2;g.fillStyle='#c86a62';
  [-1,1].forEach(s=>{g.beginPath();g.ellipse(cx+s*48,196,17,10,0,0,7);g.fill();});g.restore();
  // 额间花钿
  g.fillStyle='#c8201a';g.beginPath();g.arc(cx,124,6.5,0,7);g.fill();
  g.save();g.globalAlpha=.5;g.strokeStyle='#c8201a';g.lineWidth=1.6;
  g.beginPath();g.moveTo(cx-16,120);g.quadraticCurveTo(cx,112,cx+16,120);g.stroke();g.restore();
  if(style===1){ // 泪痕
    g.save();g.globalAlpha=.5;g.strokeStyle='#5a3a34';g.lineWidth=2.2;g.lineCap='round';
    g.beginPath();g.moveTo(cx-40,178);g.quadraticCurveTo(cx-46,214,cx-39,248);g.stroke();
    g.globalAlpha=.3;g.beginPath();g.moveTo(cx+41,180);g.quadraticCurveTo(cx+45,206,cx+40,230);g.stroke();
    g.restore();
  }
  if(style===2){ // 血泪
    g.save();g.globalAlpha=.85;g.fillStyle='#7d1108';
    g.beginPath();g.ellipse(cx-40,206,4.6,26,0,0,7);g.fill();
    g.globalAlpha=.4;g.beginPath();g.ellipse(cx+41,198,3,14,0,0,7);g.fill();
    g.restore();
  }
  grain(g,w,h,.08);
  return tex(c,{rep:[1,1]});
};

/* 铜镜镜面（含模糊倒影 + 妖异） */
M.mirrorFace=function(withGhost=true){
  const[w,h]=[512,512];const[c,g]=cv(w,h);
  const gr=g.createRadialGradient(w*.42,h*.38,20,w/2,h/2,w*.7);
  gr.addColorStop(0,'#9aa39c');gr.addColorStop(.45,'#5c6460');gr.addColorStop(1,'#222724');
  g.fillStyle=gr;g.fillRect(0,0,w,h);
  for(let i=0;i<90;i++){g.strokeStyle=`rgba(220,230,220,${Math.random()*.06})`;g.lineWidth=Math.random()*14;
    g.beginPath();g.arc(w/2,h/2,30+Math.random()*220,Math.random()*7,Math.random()*7);g.stroke();}
  if(withGhost){
    g.save();g.globalAlpha=.30;
    const cx=w/2, cy=h*.52;
    g.fillStyle='#d8cdb6';g.beginPath();g.ellipse(cx,cy,72,92,0,0,7);g.fill();
    g.fillStyle='#0d0b0a';g.beginPath();g.ellipse(cx,cy-84,80,54,0,0,7);g.fill();
    g.globalAlpha=.42;
    g.strokeStyle='#0e0b0a';g.lineWidth=5;
    [-1,1].forEach(s=>{g.beginPath();g.moveTo(cx+s*22,cy-4);g.quadraticCurveTo(cx+s*44,cy-16,cx+s*60,cy-2);g.stroke();});
    g.fillStyle='#0e0b0a';[-1,1].forEach(s=>{g.beginPath();g.ellipse(cx+s*36,cy-6,12,9,0,0,7);g.fill();});
    g.fillStyle='#7d1108';g.beginPath();g.ellipse(cx,cy+40,18,10,0,0,7);g.fill();
    g.restore();
    // 黑发散落
    g.strokeStyle='rgba(10,8,8,.5)';g.lineWidth=3;
    for(let i=0;i<40;i++){const x=cx-70+Math.random()*140;g.beginPath();g.moveTo(x,cy-120);
      g.quadraticCurveTo(x+(Math.random()-.5)*60,cy-40,x+(Math.random()-.5)*80,cy+120);g.stroke();}
  }
  for(let i=0;i<26;i++){g.fillStyle=`rgba(60,110,92,${Math.random()*.2})`;
    g.beginPath();g.ellipse(Math.random()*w,Math.random()*h,6+Math.random()*30,4+Math.random()*20,0,0,7);g.fill();}
  // 边缘纹饰
  g.strokeStyle='rgba(30,34,30,.85)';g.lineWidth=8;g.beginPath();g.arc(w/2,h/2,w*.44,0,7);g.stroke();
  g.fillStyle='rgba(24,28,24,.8)';
  for(let a=0;a<12;a++){const t=a/12*Math.PI*2;g.beginPath();
    g.arc(w/2+Math.cos(t)*w*.36,h/2+Math.sin(t)*w*.36,14,0,7);g.fill();}
  grain(g,w,h,.12);return tex(c,{rep:[1,1]});
};

/* 年画/遗像：女性画像（成年，媚而哀） */
M.portrait=function(seed=0){
  const[w,h]=[384,512];const[c,g]=cv(w,h);
  g.fillStyle='#c9b489';g.fillRect(0,0,w,h);
  fibers(g,w,h,300,40,'rgba(255,245,220,.25)');
  const cx=w/2;
  g.fillStyle='#1b1512';g.beginPath();g.ellipse(cx,150,96,86,0,0,7);g.fill();
  g.fillRect(cx-96,140,26,180);g.fillRect(cx+70,140,26,180);
  g.fillStyle='#e7d3b4';g.beginPath();g.ellipse(cx,186,74,94,0,0,7);g.fill();
  g.strokeStyle='#221b17';g.lineWidth=4;
  [-1,1].forEach(s=>{
    g.beginPath();g.moveTo(cx+s*20,182);g.quadraticCurveTo(cx+s*44,170,cx+s*62,184);g.stroke();
    g.beginPath();g.moveTo(cx+s*22,208);g.quadraticCurveTo(cx+s*42,196,cx+s*60,210);
    g.quadraticCurveTo(cx+s*40,218,cx+s*22,208);g.stroke();
    g.fillStyle='#150f0d';g.beginPath();g.ellipse(cx+s*41,207,8,7,0,0,7);g.fill();
  });
  g.fillStyle='#a8281e';g.beginPath();g.moveTo(cx-22,262);
  g.bezierCurveTo(cx-8,252,cx+8,252,cx+22,262);g.bezierCurveTo(cx+12,276,cx-12,276,cx-22,262);g.fill();
  g.fillStyle='#c8201a';g.beginPath();g.arc(cx,142,7,0,7);g.fill();
  // 衣
  g.fillStyle=seed%2?'#6c100c':'#26312e';g.beginPath();
  g.moveTo(cx-120,512);g.lineTo(cx-70,330);g.quadraticCurveTo(cx,300,cx+70,330);g.lineTo(cx+120,512);g.closePath();g.fill();
  g.strokeStyle='rgba(230,200,120,.5)';g.lineWidth=3;
  g.beginPath();g.moveTo(cx-70,332);g.quadraticCurveTo(cx,302,cx+70,332);g.stroke();
  g.globalAlpha=.25;g.fillStyle='#000';g.fillRect(0,0,w,h);g.globalAlpha=1;
  stains(g,w,h,12,['rgba(70,46,20,.35)','rgba(20,12,6,.3)']);
  cracks(g,0,0,w,h,18,'rgba(40,26,12,.4)',160);
  seal(g,w-52,h-56,40,'婉');
  grain(g,w,h,.14);return tex(c,{rep:[1,1]});
};

/* 族谱（竖排墨字） */
M.genealogy=function(lines){
  const[w,h]=[1024,640];const[c,g]=cv(w,h);
  g.fillStyle='#d9c9a2';g.fillRect(0,0,w,h);
  fibers(g,w,h,900,60,'rgba(255,255,255,.25)');
  stains(g,w,h,16,['rgba(120,80,36,.26)']);
  g.strokeStyle='#4a3418';g.lineWidth=6;
  for(let x=0;x<w;x+=64){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.globalAlpha=.35;g.stroke();g.globalAlpha=1;}
  g.lineWidth=5;g.strokeRect(16,16,w-32,h-32);
  [...lines].reverse().forEach((col,i)=>{
    vText(g,col,{x:w-58-i*64,y:46,size:40,family:SERIF,color:'#231708',spacing:1.1});
  });
  seal(g,w-70,h-58,46,'槐');
  grain(g,w,h,.10);return tex(c,{rep:[1,1]});
};

/* 通用：木匾 */
M.plaque=function(text,{bg='#1c1410',fg='#d9b65c',w=512,h=176}={}){
  const[c,g]=cv(w,h);
  g.fillStyle=bg;g.fillRect(0,0,w,h);
  for(let i=0;i<300;i++){g.strokeStyle=`rgba(${40+Math.random()*40|0},${28+Math.random()*24|0},${16+Math.random()*16|0},${Math.random()*.5})`;
    g.lineWidth=1+Math.random()*5;const y=Math.random()*h;g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
  g.strokeStyle=fg;g.lineWidth=5;g.globalAlpha=.6;g.strokeRect(10,10,w-20,h-20);g.globalAlpha=1;
  const n=[...text].length;
  [...text].forEach((ch,i)=>hText(g,ch,{x:w/2-(n-1)*h*.34+i*h*.68,y:h/2,size:h*.6,family:SERIF,color:fg,bold:true}));
  cracks(g,0,0,w,h,10,'rgba(200,170,90,.18)',80);
  grain(g,w,h,.1);return tex(c,{rep:[1,1]});
};

/* 冥币 / 纸钱 */
M.jossPaper=function(){
  const[w,h]=[256,256];const[c,g]=cv(w,h);
  g.fillStyle='#e5d7a8';g.fillRect(0,0,w,h);
  fibers(g,w,h,200,30,'rgba(255,255,255,.3)');
  g.fillStyle='rgba(170,140,60,.5)';g.fillRect(w*.2,h*.2,w*.6,h*.6);
  hText(g,'冥通銀行',{x:w/2,y:h*.3,size:26,family:SERIF,color:'#4a3418',bold:true});
  hText(g,'天地銀行',{x:w/2,y:h*.68,size:22,family:SERIF,color:'#4a3418'});
  seal(g,w/2,h*.5,44,'通货');
  grain(g,w,h,.1);return tex(c,{rep:[1,1]});
};

/* 白布幡 */
M.mourning=function(text='悼'){
  const[w,h]=[256,768];const[c,g]=cv(w,h);
  g.fillStyle='#ddd6c6';g.fillRect(0,0,w,h);
  fibers(g,w,h,400,50,'rgba(255,255,255,.3)');
  stains(g,w,h,10,['rgba(110,96,70,.3)']);
  vText(g,text,{x:w/2,y:60,size:96,family:SERIF,color:'#2b2118',spacing:1.05});
  g.fillStyle='rgba(140,22,17,.25)';g.fillRect(0,h-40,w,40);
  grain(g,w,h,.12);return tex(c,{rep:[1,1]});
};

export {tex, cv, M, SERIF, HEI, vText, hText, seal, grain, stains, fibers};
