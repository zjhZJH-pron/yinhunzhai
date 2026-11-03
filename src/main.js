import * as THREE from 'three';
import {Input} from './core/input.js';
import {AudioEngine} from './core/audio.js';
import {PostFX} from './core/postfx.js';
import {profile,tier} from './core/platform.js';
import {attachTouch} from './core/touch.js';
import {Parts} from './world/parts.js';
import {buildManor,ROOMS} from './world/manor.js';
import {GameState,SAVE_KEY} from './game/state.js';
import {HUD} from './ui/hud.js';
import {Panels} from './ui/panels.js';
import {registerInteractives,updateInteract,doInteract,actOn,pickAtScreen} from './game/interact.js';
import {createNPCs} from './game/npc.js';
import {STORY,curtain,startGame,askHint} from './game/story.js';

const STEP=.62, EYE=1.66, RAD=.34;

export class App{
  constructor(){
    this.prof=profile();
    this.low=this.prof.low;
    document.documentElement.classList.add(this.low?'touch-mode':'pointer-mode');

    this.canvas=document.getElementById('scene');
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:false,
      powerPreference:this.low?'low-power':'high-performance',stencil:false});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.prof.dpr));
    this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.shadowMap.enabled=this.prof.shadow;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=this.low?1.62:1.45;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;

    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color(0x07090b);
    this.camera=new THREE.PerspectiveCamera(this.low?70:74,innerWidth/innerHeight,.06,90);
    this.camera.rotation.order='YXZ';
    this.scene.add(this.camera);

    this.parts=new Parts();
    this.parts.quality=this.prof;
    this.audio=new AudioEngine();
    this.postfx=new PostFX(this.renderer,this.prof.postScale);
    this.input=new Input(this.canvas);
    this.touchPickRadius=this.prof.tapRadius;
    this.pickAtScreen=(sx,sy)=>pickAtScreen(this,sx,sy);
    this.hud=new HUD(this);
    this.panels=new Panels(this);

    this.colliders=[];
    this.interactives=[];
    this.hideSpots=[];
    this.targets=[];
    this.state=null;
    this.player={pos:new THREE.Vector3(0,0,14.9),vel:new THREE.Vector3(),feet:0,vy:0,
      yaw:Math.PI,pitch:-.02,breath:1,hidden:false,holding:false,nearGhost:0};
    this.running=false;this.paused=false;this.uiOpen=false;this.dead=false;
    this.t=0;this.dt=0;this.fps=60;this.shakeT=0;this.noiseLevel=0;
    this.diffNightmare=false;this.torch=null;this.torchOn=false;
    this.safeUntil=0;this.safeAt=null;this.bobX=0;this.bobY=0;this.bobT=0;this._stepT=0;

    addEventListener('resize',()=>this.resize());
    this.resize();
  }
  resize(){
    // iOS Safari 的 100vh 含地址栏，会多出一截；用实际 client 尺寸更稳。
    // 某些宿主环境（自动化/后台标签）会把这些度量报成 0，必须兜底，
    // 否则 setSize(0,0) 会让帧缓冲退化、投影矩阵出现 NaN。
    const w=Math.max(2,this.canvas.clientWidth||innerWidth||screen.width||1280);
    const h=Math.max(2,this.canvas.clientHeight||innerHeight||screen.height||720);
    const dpr=Math.min(devicePixelRatio||1,this.prof.dpr);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w,h,false);
    this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
    this.postfx.setSize(w,h,dpr);
  }
  syncUi(){
    this.uiOpen=this.paused||this.dead||this.panels.isOpen||this.hud.journalOpen||this.hud.dialogOpen;
    if(this.touchCtl)this.touchCtl.setEnabled(!this.uiOpen);
  }
  /** 触控/键盘统一入口 */
  requestInteract(){ doInteract(this); }
  actOn(i){ actOn(this,i); }
  askHintMobile(){ askHint(this); }
  boot(diff='hard'){
    this.diffNightmare=diff==='nightmare';
    this.state=new GameState(diff);
    this.manor=buildManor(this);
    registerInteractives(this);
    this.npc=createNPCs(this);
    startGame(this,false);
    this.hud.renderInv();this.hud.updateJournal();
    this.bindUI();
    if(this.low)this.touchCtl=attachTouch(this);
    this.clock=new THREE.Clock();
    if(!this.running){this.running=true;this.loop();}
  }
  load(){
    const raw=localStorage.getItem(SAVE_KEY);if(!raw)return false;
    try{
      this.state=GameState.deserialize(raw);
      this.manor=buildManor(this);
      registerInteractives(this);
      this.npc=createNPCs(this);
      startGame(this,true);
      const cp=this.state.checkpoint;
      if(cp&&cp.pos){this.player.pos.set(cp.pos[0],0,cp.pos[2]);
        this.player.feet=cp.pos[1]||0;this.player.yaw=cp.yaw??Math.PI;}
      this.hud.renderInv();this.hud.updateJournal();
      this.bindUI();
      if(this.low)this.touchCtl=attachTouch(this);
      this.clock=new THREE.Clock();
      if(!this.running){this.running=true;this.loop();}
      return true;
    }catch(e){console.warn('[load] ',e);return false;}
  }
  save(){
    if(!this.state)return;
    const p=this.player;
    this.state.checkpoint={pos:[p.pos.x,p.feet,p.pos.z],yaw:p.yaw,room:this.room().name};
    try{localStorage.setItem(SAVE_KEY,this.state.serialize());this.hud.toast('已刻印 · 存档于本地','good');}
    catch(e){this.hud.toast('存不下来：'+e.message,'bad');}
  }
  room(){
    const p=this.player.pos;
    for(const r of Object.values(ROOMS)){
      if(r.hidden)continue;
      if(p.x>r.x0&&p.x<r.x1&&p.z>r.z0&&p.z<r.z1)return r;
    }
    return {id:'yard',name:'夹道'};
  }
  bindUI(){
    const I=this.input;
    I.on('keydown',code=>{
      if(this.dead){if(code==='Enter')document.getElementById('btnResume').click();return;}
      if(this.panels.isOpen&&code!=='Escape')return;
      if(this.hud.journalOpen){if(code==='KeyJ'||code==='Tab'||code==='Escape')this.hud.toggleJournal();return;}
      if(this.hud.dialogOpen){
        if(/^Digit[1-9]$/.test(code)){this.hud.pickChoice(parseInt(code.slice(-1),10)-1);return;}
        if(code==='Enter'||code==='Space'||code==='KeyE'||code==='Escape')this.hud.skipDialog();
        return;
      }
      switch(code){
        case 'KeyJ': case 'Tab': this.hud.toggleJournal();break;
        case 'Escape': this.togglePause(true);break;
        case 'KeyE': doInteract(this);break;
        case 'KeyH': this.tryIncense();break;
        case 'KeyG': askHint(this);break;
        case 'KeyF': this.toggleTorch();break;
        case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Digit5':
          this.hud.selectInv(parseInt(code.slice(-1),10)-1);break;
        case 'KeyQ': this.hud.selectInv(-1);break;
      }
    });
    I.on('rclick',()=>this.hud.selectInv(-1));
    I.on('lockchange',locked=>{if(!locked&&!this.uiOpen)this.togglePause(true);});
  }
  togglePause(on){
    if(this.dead)return;
    this.paused=on===undefined?!this.paused:on;
    document.getElementById('pause').classList.toggle('hidden',!this.paused);
    this.syncUi();
    if(this.paused)this.input.exitLock();else this.input.requestLock();
  }
  toggleTorch(){
    if(!this.state.has('huozhe')){this.hud.toast('身上没有火折子','bad');return;}
    if(!this.torch){
      this.torch=new THREE.PointLight(0xffa44a,6,9,1.7);
      this.torch.position.set(.24,-.2,-.3);
      this.camera.add(this.torch);
    }
    this.torchOn=!this.torchOn;
    this.torch.intensity=this.torchOn?6:0;
    this.hud.toast(this.torchOn?'火折子亮了 —— 光也照得见她':'火光熄了','');
    this.audio.noiseHit({dur:.3,freq:2300,gain:.15,q:1.4});
  }
  tryIncense(){
    const S=this.state;
    const near=this.interactives.filter(i=>i.kind==='censer'&&this.distOf(i)<3.6);
    if(!near.length){this.hud.toast('此处没有香炉','bad');return;}
    if(!S.has('xiang')){this.hud.toast('无香可燃','bad');return;}
    S.take('xiang');
    near[0].use&&near[0].use();
    S.addDread(-45);
    this.audio.guzheng(196,{dur:2.2,gain:.3});this.audio.bell(2093,{dur:2.8,gain:.12});
    this.hud.toast('香燃上了。这一方地，她今夜进不来','good');
    this.safeAt=this.targetWorld(near[0]).clone();
    this.safeUntil=this.t+90;
    this.hud.pulseSafe(this.safeAt,7);
  }
  targetWorld(i){
    if(i.vec)return i.vec.clone();
    const v=new THREE.Vector3();(i.mesh||i.group).getWorldPosition(v);return v;
  }
  distOf(i){return this.camera.position.distanceTo(this.targetWorld(i));}

  /* ---------------- 移动 · 碰撞 · 视角 ---------------- */
  move(dt){
    const P=this.player,I=this.input,S=this.state;
    const {dx,dy}=I.readLook();
    const sens=I.sensitivity*(this.diffNightmare?1.15:1);
    P.yaw-=dx*sens;P.pitch-=dy*sens;
    P.pitch=Math.max(-1.3,Math.min(1.3,P.pitch));

    let mf=0,ms=0;
    if(I.down('KeyW','ArrowUp'))mf+=1;
    if(I.down('KeyS','ArrowDown'))mf-=1;
    if(I.down('KeyA','ArrowLeft'))ms-=1;
    if(I.down('KeyD','ArrowRight'))ms+=1;
    // 虚拟摇杆是模拟量，优先级高于键盘（两者不会同时产生）
    if(I.analog.active){ mf=I.analog.y; ms=I.analog.x; }
    const run=I.down('ShiftLeft','ShiftRight')&&!I.analog.active;
    const breathKey=I.down('ControlLeft','ControlRight');
    const spd=P.hidden?1.15:run?4.4:2.4;
    const len=Math.hypot(ms,mf);
    const sinY=Math.sin(P.yaw),cosY=Math.cos(P.yaw);
    let vx=0,vz=0;
    if(len>0){
      const f=mf/len,r=ms/len;
      // 摇杆推得不满时按比例降速，键盘仍是满速
      const scale=I.analog.active?Math.min(1,len):1;
      vx=(-sinY*f+cosY*r)*spd*scale;
      vz=(-cosY*f-sinY*r)*spd*scale;
    }
    const k=1-Math.exp(-dt*13);
    P.vel.x+=(vx-P.vel.x)*k;P.vel.z+=(vz-P.vel.z)*k;

    // 屏息
    if(P.hidden&&breathKey&&!P.holding)P.holding=true;
    if(!breathKey)P.holding=false;
    if(P.holding){
      P.breath-=dt*(P.nearGhost>.55?.30:P.hidden?.13:.05);
      if(P.breath<=0){P.breath=0;P.holding=false;
        this.hud.toast('憋不住了……','bad');S.addDread(5);
        this.audio.noiseHit({dur:.5,freq:880,gain:.2,q:1.2});}
    }else P.breath=Math.min(1,P.breath+dt*(P.hidden?.12:.55));
    this.hud.setBreath(P.holding?P.breath:null);

    const stepping=len>0;
    this.noiseLevel=THREE.MathUtils.lerp(this.noiseLevel,stepping?(run?1:P.hidden?.12:.5):0,dt*4);

    this.tryMove(P.vel.x*dt,0);
    this.tryMove(0,P.vel.z*dt);
    const sup=this.supportAt(P.pos.x,P.pos.z);
    P.vy-=17*dt;P.feet+=P.vy*dt;
    if(P.feet<=sup){if(P.vy<-3)this.stepSound('stone',.45);P.feet=sup;P.vy=0;}

    // 藏身
    const hid=this.nearHide();
    if(hid!==P.hidden){
      P.hidden=hid;
      this.hud.toast(hid?'你缩进阴影里。按住 [Ctrl] 屏息':'你从藏身处走了出来','');
      if(hid)this.audio.noiseHit({dur:.3,freq:620,gain:.12,q:1.5});
    }

    // 镜头
    const moving=stepping&&Math.hypot(P.vel.x,P.vel.z)>.5;
    if(moving){
      this.bobT+=dt*(run?11.2:7.4);
      const amp=(run?.04:.021)*(S.dreadN*.5+.75);
      this.bobY=Math.sin(this.bobT)*amp;
      this.bobX=Math.cos(this.bobT*.5)*amp*.75;
      if(this.t-this._stepT>(run?.35:.6)){this._stepT=this.t;this.stepSound(this.floorMat());}
    }else{
      this.bobY+=(0-this.bobY)*Math.min(1,dt*6);
      this.bobX+=(0-this.bobX)*Math.min(1,dt*6);
    }
    const shake=this.shakeT>0?this.shakeT:0;
    this.camera.position.set(P.pos.x+this.bobX*.5,P.feet+EYE+this.bobY,P.pos.z);
    this.camera.rotation.set(
      P.pitch+(shake?(Math.random()-.5)*shake*.8:0),
      P.yaw+(shake?(Math.random()-.5)*shake:0),
      this.bobX*.05+(shake?(Math.random()-.5)*shake*.5:0));
    if(shake)this.shakeT=Math.max(0,this.shakeT-dt*2.2);
  }
  tryMove(dx,dz){
    const P=this.player;
    if(dx)P.pos.x+=dx;
    if(dz)P.pos.z+=dz;
    for(let iter=0;iter<3;iter++){
      let moved=false;
      for(const c of this.colliders){
        if(c.solid===false)continue;
        if(c.y1<=P.feet+STEP||c.y0>=P.feet+EYE)continue;
        if(P.pos.x>c.minX-RAD&&P.pos.x<c.maxX+RAD&&P.pos.z>c.minZ-RAD&&P.pos.z<c.maxZ+RAD){
          const nx=THREE.MathUtils.clamp(P.pos.x,c.minX,c.maxX);
          const nz=THREE.MathUtils.clamp(P.pos.z,c.minZ,c.maxZ);
          const ddx=P.pos.x-nx,ddz=P.pos.z-nz,d2=ddx*ddx+ddz*ddz;
          if(d2>RAD*RAD)continue;
          if(d2>1e-8){
            const d=Math.sqrt(d2),push=RAD-d;
            P.pos.x+=ddx/d*push;P.pos.z+=ddz/d*push;
          }else{
            const toL=P.pos.x-c.minX,toR=c.maxX-P.pos.x,toB=P.pos.z-c.minZ,toF=c.maxZ-P.pos.z;
            const m=Math.min(toL,toR,toB,toF);
            if(m===toL)P.pos.x=c.minX-RAD;else if(m===toR)P.pos.x=c.maxX+RAD;
            else if(m===toB)P.pos.z=c.minZ-RAD;else P.pos.z=c.maxZ+RAD;
          }
          moved=true;
        }
      }
      if(!moved)break;
    }
  }
  supportAt(x,z){
    let s=0;const f=this.player.feet;
    for(const c of this.colliders){
      if(c.noSupport||c.solid===false)continue;
      if(x<c.minX||x>c.maxX||z<c.minZ||z>c.maxZ)continue;
      if(c.y1<=.002)continue;
      if(c.y1<=f+STEP+.002&&c.y1>s)s=c.y1;
    }
    return s;
  }
  floorMat(){
    const id=this.room().id;
    return {west:'earth',court:'stone',east:'wood',opera:'wood',shrine:'stone',hall:'stone'}[id]||'stone';
  }
  stepSound(mat,vol=1){
    if(this.player.hidden)mat='straw';
    this.audio.step(mat);
    if(this.npc)this.npc.onStep(this.noiseLevel*vol);
  }
  nearHide(){
    const p=this.player.pos;
    for(const h of this.hideSpots){
      if(!h.visible())continue;
      if(Math.hypot(p.x-h.x,p.z-h.z)<h.r)return true;
    }
    return false;
  }

  /* ---------------- 主循环 ---------------- */
  loop(){
    requestAnimationFrame(()=>this.loop());
    const dt=Math.min(.05,this.clock.getDelta());
    this.t+=dt;this.dt=dt;
    this.fps=this.fps*.93+(1/Math.max(dt,.0008))*.07;
    this.syncUi();

    if(!this.uiOpen)this.move(dt);
    if(!this.paused){
      this.parts.tick(this.t,dt);
      if(!this.uiOpen&&this.npc)this.npc.update(dt,this.t);
      updateInteract(this,dt);
      this.hud.tick(dt);
      this.hud.setFps(this.fps);
    }
    const S=this.state;
    this.postfx.dread=THREE.MathUtils.lerp(this.postfx.dread,
      Math.min(1,S.dreadN*.95+(this.npc?this.npc.closeProx*.35:0)),dt*1.6);
    this.postfx.cold=(this.safeUntil-this.t>0)?.55:0;
    this.audio.setDread(Math.min(1,S.dreadN*.85+(this.npc?this.npc.closeProx*.4:0)));

    if(this.torch&&this.torchOn)this.torch.intensity=6+Math.sin(this.t*13)*0.8+Math.random()*0.5;
    if(this.manor&&this.manor.anchors.ash){
      const a=this.manor.anchors.ash,sd=a.spd,p=a.pts.geometry.attributes.position;
      for(let i=0;i<sd.length;i++){
        let y=p.getY(i)-sd[i].vy*dt*3;
        if(y<0)y=7;
        p.setY(i,y);
        p.setX(i,p.getX(i)+Math.sin(this.t*.5+sd[i].ph)*dt*.12);
      }
      p.needsUpdate=true;
    }
    this.postfx.render(this.scene,this.camera,this.t);
  }
}

export const app=new App();
window.__app=app;

/* ---------------- 引导 UI ---------------- */
const $=s=>document.querySelector(s);
const on=(s,ev,fn)=>{const e=$(s);if(e)e.addEventListener(ev,fn);return e;};
const title=$('#title'),ends=$('#endscreen');
let diff='hard';
document.querySelectorAll('#diffPick .dbtn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#diffPick .dbtn').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');diff=b.dataset.diff;
}));
if(localStorage.getItem(SAVE_KEY))$('#btnContinue')?.classList.remove('hidden');

async function enter(load){
  await Promise.race([app.audio.init().catch(()=>{}),new Promise(r=>setTimeout(r,1500))]);
  if(app.audio.ready)app.audio.sting('dread');
  const ok=load?app.load():(()=>{app.boot(diff);return true;})();
  if(!ok){app.boot(diff);}
  title&&title.classList.add('hidden');
  $('#hud')?.classList.remove('hidden');
  const chip=$('#hintChip');
  if(chip){chip.classList.remove('hidden');setTimeout(()=>chip.classList.add('hidden'),11000);}
  app.input.requestLock();
  curtain(app,load?STORY.reenter:STORY.open);
}
app.enter=enter;
on('#btnStart','click',()=>enter(false));
on('#btnContinue','click',()=>enter(true));
on('#btnResumePlay','click',()=>app.togglePause(false));
on('#btnSave','click',()=>app.save());
on('#btnTitleBack','click',()=>location.reload());
on('#btnQuit','click',()=>location.reload());
on('#btnResume','click',()=>{
  app.dead=false;ends&&ends.classList.add('hidden');
  const hudEl=$('#hud');hudEl&&hudEl.classList.remove('hidden');
  const cp=app.state.checkpoint,p=app.player;
  p.pos.set(cp.pos[0],0,cp.pos[2]);p.feet=cp.pos[1]||0;p.vy=0;
  p.yaw=cp.yaw;p.pitch=-.02;p.vel.set(0,0,0);
  app.state.addDread(-42);
  app.npc&&app.npc.respawn();
  app.togglePause(false);app.input.requestLock();
  curtain(app,STORY.wakeup);
});
on('#jrClose','click',()=>app.hud&&app.hud.toggleJournal());
on('#panelRoot','click',e=>{if(e.target.id==='panelRoot')app.panels.close();});
const seenErr=new Set();
window.addEventListener('error',e=>{
  const f=(e.filename||'').split('/').pop();
  const mine=/^(main|hud|panels|story|interact|npc|state|manor|parts|textures|audio|postfx|input|util|platform|touch)\.js$/.test(f);
  if(!mine)return;                                  // 不劫持注入脚本的噪声
  const key=f+':'+e.message;
  if(seenErr.has(key))return;
  seenErr.add(key);
  console.error('[game]',f,e.message,e.lineno);
  if(window.__app&&window.__app.hud)window.__app.hud.toast('出错 '+f+':'+e.message,'bad');
});

/* 离线支持：仅在 http(s) 下注册（file:// 没有 SW 可言） */
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
  addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{/* 隐私模式/受限环境下静默失败即可 */});
  });
}
