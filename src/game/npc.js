import * as THREE from 'three';
import {M} from '../world/textures.js';
import {soulLost,trigger} from './story.js';

/* =====================================================================
   三女 NPC + 追捕
   · 苏婉娘 —— 冥婚新娘，成年。媚在声、态、近；威胁来自"她真的想娶你"
   · 柳三娘 —— 鬼媒人，四十上下。风月是她的行业话术
   · 阮香绫 —— 青衣旦，廿三。勾人是演出的一部分
   ===================================================================== */
export function createNPCs(app){
  const P=app.parts,S=app.state;
  const npcs={};
  const api={closeProx:0,mood:{wan:.3,liu:0,ling:0},huntOn:false,cool:0,
    setMood(k,v){this.mood[k]=v;if(k==='wan'&&v>=.95)this.huntOn=true;},
    summon,respawn,onStep,update};

  /* ---- 立起来 ---- */
  function makeLady(opts){
    const g=P.ghostLady(opts);
    g.visible=false;
    app.scene.add(g);
    // 幽光
    const light=new THREE.PointLight(0x7fd8cf,0,9,1.7);
    light.position.y=1.1;g.add(light);
    // 地上一圈薄雾
    const pool=new THREE.Mesh(new THREE.CircleGeometry(1.1,22),
      new THREE.MeshBasicMaterial({color:0x9ecfd6,transparent:true,opacity:0,depthWrite:false}));
    pool.rotation.x=-Math.PI/2;pool.position.y=.02;g.add(pool);
    return {g,light,pool,y:0,t:Math.random()*9,vx:0,vz:0,state:'off',speed:1.5,
      lastSeen:0,pos:new THREE.Vector3()};
  }
  npcs.wan=makeLady({veil:false,faceStyle:1,armOut:.12});
  npcs.liu=makeLady({veil:false,faceStyle:0,scale:.97,armOut:.3});
  npcs.ling=makeLady({veil:false,faceStyle:2,scale:.95,armOut:.5});
  // 婉娘的脸：平静 → 含泪 → 血泪，随阴气替换贴图
  npcs.wan.faces=[M.dollFace(1),M.dollFace(2),M.dollFace(2)];

  /* ---- 出场位 ---- */
  const SPOT={
    hall:new THREE.Vector3(0,0,16.2),
    high:new THREE.Vector3(0,0,15.6),
    court:new THREE.Vector3(0,0,-2.0),
    well:new THREE.Vector3(-5.4,0,2.4),
    tree:new THREE.Vector3(5.6,0,5.2),
    shrine:new THREE.Vector3(-4.5,0,-15.0),
    opera:new THREE.Vector3(5.5,1.0,-12.4),
    east:new THREE.Vector3(14.6,0,1.4),
    west:new THREE.Vector3(-15.2,0,.4),
    gate:new THREE.Vector3(0,0,17.9),
  };
  const PATROL=['court','well','tree','shrine','hall','court','west','court','east','court'];

  function summon(where,dur=9){
    const n=npcs.wan;
    const p=SPOT[where]||SPOT.court;
    const pl=app.player.pos;
    // 不贴脸出现：至少留 5m
    const dx=p.x-pl.x,dz=p.z-pl.z,d=Math.hypot(dx,dz);
    const k=d<5?(5/(d||1)):1;
    n.g.position.set(pl.x+dx*k,0,pl.z+dz*k);
    n.state='appear';n.life=dur;
    n.g.visible=true;
    app.audio.whisper(0,1);
  }

  /* ---- 一步一响：她听得到你 ---- */
  let stepNoise=0;
  function onStep(v){stepNoise=Math.max(stepNoise,v);}

  /* ---- 纸人在你背后转头 ---- */
  const dolls=[];
  (app.manor.anchors.yardDolls||[]).forEach(d=>dolls.push(d));
  (app.manor.anchors.hallDolls||[]).forEach(d=>dolls.push(d));

  /* ---- 阮香绫：常驻台上，无威胁，只做戏 ---- */
  npcs.ling.g.position.copy(SPOT.opera);
  npcs.ling.g.visible=false;
  npcs.ling.state='stage';

  /* ---- 柳三娘：香炉边现身，卖关子 ---- */
  npcs.liu.state='off';

  let huntIdx=0,huntTimer=0,appearT=0;
  function respawn(){
    npcs.wan.state='off';npcs.wan.g.visible=false;
    api.cool=8;api.closeProx=0;
    appearT=0;
  }

  function nearestSpot(){
    const p=app.player.pos;
    let best=PATROL[0],bd=1e9;
    for(const k of PATROL){const v=SPOT[k];const d=Math.hypot(v.x-p.x,v.z-p.z);
      if(d<bd){bd=d;best=k;}}
    return best;
  }

  function update(dt,t){
    const p=app.player.pos,dread=S.dreadN;
    /* ============ 阮香绫 ============ */
    {
      const n=npcs.ling;
      const near=Math.hypot(p.x-SPOT.opera.x,p.z-SPOT.opera.z)<9&&app.room().id==='opera';
      if(near&&!n.g.visible){n.g.visible=true;
        if(!S.get('lingMet')){S.set('lingMet');trigger(app,'stageEnter');}}
      if(n.g.visible){
        n.g.position.y=1.0+Math.sin(t*.9)*.02;
        n.g.rotation.y=Math.atan2(p.x-n.g.position.x,p.z-n.g.position.z);
        // 身段：慢转 + 水袖
        n.t+=dt;
        n.g.rotation.z=Math.sin(n.t*.7)*.045;
        n.light.intensity=1.5+Math.sin(n.t*1.6)*.35;
        if(!n.singT||t-n.singT>7.5+Math.random()*6){
          n.singT=t;
          const seq=['徵','羽','角','宫','商','羽','少宫'];
          seq.forEach((n2,i)=>setTimeout(()=>app.audio.erhu(app.audio.noteFreq(n2)*(i%2?1:1.002),
            {dur:.9,gain:.1,vib:5.5,pan:.2}),i*430));
        }
      }
    }
    /* ============ 柳三娘 ============ */
    {
      const n=npcs.liu;
      const want=S.chapter>=1&&dread>.18&&n.state==='off';
      if(want&&Math.random()<dt*.09){
        n.state='hover';n.life=8;n.g.visible=true;
        const c=app.manor.anchors['censer_'+(app.room().id==='hall'?'hall':'court')];
        n.g.position.set(c.pos.x+1.6,0,c.pos.z+.6);
        app.audio.whisper(.5,.7);
      }
      if(n.state==='hover'){
        n.life-=dt;
        n.t+=dt;
        n.g.position.y=Math.sin(n.t*1.1)*.02;
        n.g.lookAt(p.x,n.g.position.y,p.z);
        n.light.intensity=1.2+Math.sin(n.t*2.3)*.3;
        if(n.life<=0){n.state='off';n.g.visible=false;}
      }
    }
    /* ============ 苏婉娘 ============ */
    {
      const n=npcs.wan;
      const safe=app.safeUntil-t>0;
      const dist=Math.hypot(p.x-n.g.position.x,p.z-n.g.position.z);
      api.cool=Math.max(0,api.cool-dt);

      // 阶段推进
      const stage=S.chapter>=3?'hunt':(S.chapter>=2?'stalk':'watch');
      const huntEnabled=(stage==='hunt')||api.huntOn||(S.diff==='nightmare'&&S.chapter>=2);

      if(n.state==='off'){
        appearT+=dt;
        const gap=huntEnabled?(6+Math.random()*8):(16+Math.random()*22);
        if(appearT>gap&&!safe&&S.dread>12){
          appearT=0;
          n.state=huntEnabled?'hunt':'appear';
          n.life=huntEnabled?42:(5+S.dreadN*6);
          n.g.visible=true;
          // 出现在远处
          const k=nearestSpot();
          const sp=SPOT[k];
          const ang=Math.random()*Math.PI*2,rr=9+Math.random()*6;
          n.g.position.set(
            THREE.MathUtils.clamp(p.x+Math.cos(ang)*rr,-18,18),0,
            THREE.MathUtils.clamp(p.z+Math.sin(ang)*rr,-18,18));
          if(!huntEnabled&&Math.random()<.5)n.g.position.copy(sp);
          app.audio.whisper((n.g.position.x-p.x)/12,.8);
          if(S.dreadN>.5)app.hud.whisper();
        }
      }else if(n.state==='appear'){
        n.life-=dt;n.t+=dt;
        n.g.position.y=Math.sin(n.t*1.4)*.03-.02;
        n.g.rotation.y=Math.atan2(p.x-n.g.position.x,p.z-n.g.position.z);
        n.light.intensity=1.8+Math.sin(n.t*3)*.45;
        n.pool.material.opacity=.1+Math.sin(n.t*2)*.04;
        if(n.life<=0){n.state='off';n.g.visible=false;n.pool.material.opacity=0;}
      }else if(n.state==='hunt'){
        n.life-=dt;n.t+=dt;
        n.g.visible=true;
        // 直接穿墙走向你
        const dx=p.x-n.g.position.x,dz=p.z-n.g.position.z,d=Math.hypot(dx,dz)||1;
        const speed=(.85+dread*1.5)*n.speed*(app.player.hidden?.35:1);
        n.vx+=(dx/d*speed-n.vx)*Math.min(1,dt*2.2);
        n.vz+=(dz/d*speed-n.vz)*Math.min(1,dt*2.2);
        n.g.position.x+=n.vx*dt;n.g.position.z+=n.vz*dt;
        n.g.position.y=Math.abs(Math.sin(n.t*2.4))*.05;
        n.g.rotation.y=Math.atan2(n.vx,n.vz);
        n.light.intensity=2.6+dread*3.4+Math.sin(n.t*4)*.5;
        n.pool.material.opacity=.14;
        // 香炉护体
        if(safe&&n.g.position.distanceTo(app.safeAt)<7.2){
          n.state='off';n.g.visible=false;n.pool.material.opacity=0;
          app.audio.bell(880,{dur:2,gain:.2});
          app.hud.toast('她在香灰外站住，笑了','');
          api.cool=12;
        }
        // 抓
        const close=n.g.position.distanceTo(new THREE.Vector3(p.x,0,p.z));
        const exposed=close<1.5||(!app.player.holding&&app.player.hidden&&close<3.1&&stepNoise>.4);
        if(exposed&&api.cool<=0){grab(n);}
        if(n.life<=0){
          n.state='off';n.g.visible=false;n.pool.material.opacity=0;api.cool=5;
          app.hud.toast('她退回暗处，红绸拖过门槛','');
        }
      }

      // proximity 效果
      const dn=Math.hypot(p.x-n.g.position.x,p.z-n.g.position.z);
      api.closeProx=n.g.visible?Math.max(0,1-dn/9):Math.max(0,api.closeProx-dt*.8);
      P.ghostProx=api.closeProx;
      app.player.nearGhost=api.closeProx;
      if(n.g.visible&&dn<14&&!app.uiOpen){
        const rate=n.state==='hunt'?(1.1+api.closeProx*6.2):(.22+api.closeProx*1.3);
        S.addDread(dt*rate);
        if(!n.wT||t-n.wT>3.4+Math.random()*4){
          n.wT=t;
          app.audio.whisper(THREE.MathUtils.clamp((n.g.position.x-p.x)/6,-1,1),.5+api.closeProx);
        }
      }
      // 脸随阴气由「含泪」转为「血泪」
      const face=n.g.userData.face;
      if(face&&n.faces){
        const k=Math.min(2,Math.floor(dread*2.6));
        if(n.faceK!==k&&n.faces[k]){n.faceK=k;face.material.map=n.faces[k];face.material.needsUpdate=true;}
      }
    }

    /* ============ 纸人背后转头 ============ */
    {
      const camDir=new THREE.Vector3();app.camera.getWorldDirection(camDir);
      dolls.forEach((d,i)=>{
        if(d.userData.turnGuard)return;
        const to=new THREE.Vector3().subVectors(d.position,app.camera.position);
        to.y=0;
        const dot=to.clone().normalize().dot(camDir.clone().normalize());
        const dist=to.length();
        if(dot<-.25&&dist<13){
          const want=Math.atan2(app.camera.position.x-d.position.x,app.camera.position.z-d.position.z);
          d.userData.ts=(d.userData.ts||0)+dt*(dot<-.6?.9:.2);
          if(d.userData.ts>2.6){
            d.userData.ts=0;d.rotation.y=THREE.MathUtils.lerp(d.rotation.y,want+Math.PI,.9);
            if(Math.random()<.55)app.audio.noiseHit({dur:.5,freq:2100,gain:.05,q:3,pan:(d.position.x-p.x)/10});
          }
        }
      });
      stepNoise=Math.max(0,stepNoise-dt*.7);
    }

    /* ============ 理智崩溃 ============ */
    if(S.dread>=100&&!app.dead){soulLost(app);}
  }

  function grab(n){
    const S=app.state;
    api.cool=14;
    app.postfx.scream(1);app.postfx.hurt=1;
    app.audio.jump();
    app.shakeT=1.6;
    S.addDread(26);
    n.state='off';n.g.visible=false;n.pool.material.opacity=0;
    // 推开而非即死
    const p=app.player;
    const dirx=(p.pos.x-n.g.position.x)||.001,dirz=(p.pos.z-n.g.position.z)||.001;
    const L=Math.hypot(dirx,dirz);
    p.pos.x+=dirx/L*2.6;p.pos.z+=dirz/L*2.6;p.feet=0;p.vy=1.4;
    const lines=[
      '她按住你的腕子，力道不像死人，手法却像 —— 掐着脉数你的年纪。\n「跑什么。」\n「我这一身红，一半是为了好看。」',
      '指甲嵌进肩头。她贴得极近，近到你听得见一具不跳的心脏在响。\n「公子身上好烫。」\n「我就借一借。借完还你。」',
      '她被推开似的笑了，退得比你退得还快。\n「别怕。第三回之后，我便不再这么抱你了。」\n「第三回之后，你就走了。」',
    ];
    app.hud.say({who:'苏婉娘',glyph:'嬿',text:lines[Math.floor(Math.random()*lines.length)],speed:24});
  }

  return api;
}
