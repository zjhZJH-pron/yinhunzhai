/* =========================================================
   程序化音频：零素材。古筝( Karplus-Strong )、二胡、铜铃、
   唢呐、磬、更鼓、风、耳语、心跳、跳吓 —— 全部实时合成。
   ========================================================= */
const A4=440, NOTE={宫:261.63,商:293.66,角:329.63,徵:392.00,羽:440.00,
                    清角:349.23,变宫:493.88,少宫:523.25};

export class AudioEngine{
  constructor(){this.ctx=null;this.ready=false;this.muted=false;this._nodes=[];}

  async init(){
    if(this.ready)return;
    const C=window.AudioContext||window.webkitAudioContext;
    this.ctx=new C({latencyHint:'interactive'});
    const ctx=this.ctx;
    this.master=ctx.createGain(); this.master.gain.value=0.9;
    this.comp=ctx.createDynamicsCompressor();
    this.comp.threshold.value=-16; this.comp.ratio.value=5; this.comp.attack.value=.004; this.comp.release.value=.25;
    this.reverb=this._makeReverb(3.1,2.6);
    this.revSend=ctx.createGain(); this.revSend.gain.value=.32;
    this.revSend.connect(this.reverb).connect(this.comp);
    this.dry=ctx.createGain(); this.dry.gain.value=1;
    this.dry.connect(this.comp);
    this.comp.connect(this.master).connect(ctx.destination);
    this.noiseBuf=this._noise(3);
    this.ready=true;
    if(ctx.state==='suspended')await ctx.resume();
    this._startAmbience();
  }
  _now(){return this.ctx.currentTime;}
  _noise(sec){
    const ctx=this.ctx,len=Math.floor(ctx.sampleRate*sec),b=ctx.createBuffer(2,len,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=b.getChannelData(c);let last=0;
      for(let i=0;i<len;i++){const w=Math.random()*2-1;last=(last+.02*w)/1.02;d[i]=last*3.2;} }
    return b;
  }
  _makeReverb(sec,decay){
    const ctx=this.ctx,len=Math.floor(ctx.sampleRate*sec),b=ctx.createBuffer(2,len,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=b.getChannelData(c);
      for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay);}
    const cv=ctx.createConvolver();cv.buffer=b;
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3400;
    cv.connect(lp);lp.connect(this?this.comp||ctx.destination:ctx.destination);
    return cv;
  }
  _out(node,{rev=.35,pan=0,gain=1,attack=.01,hold=0,release=.2,peak=0}={}){
    const ctx=this.ctx,t=this._now();
    const g=ctx.createGain();
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(gain,t+attack);
    if(hold)g.gain.setValueAtTime(gain,t+attack+hold);
    g.gain.exponentialRampToValueAtTime(.0001,t+attack+hold+release);
    let n=node;
    if(peak){const bp=ctx.createBiquadFilter();bp.type='peaking';bp.frequency.value=peak;bp.gain.value=9;node.connect(bp);n=bp;}
    const p=ctx.createStereoPanner();p.pan.value=pan;
    n.connect(g);g.connect(p);p.connect(this.dry);
    if(rev){const rs=ctx.createGain();rs.gain.value=rev;p.connect(rs);rs.connect(this.revSend);}
    return g;
  }

  /* ---------- 古筝：Karplus-Strong ---------- */
  guzheng(freq,{dur=1.6,pan=0,rev=.4,gain=.5,pluckPos=.12}={}){
    if(!this.ready)return;
    const ctx=this.ctx,S=ctx.sampleRate,N=Math.floor(S*dur);
    const buf=ctx.createBuffer(1,N,S),d=buf.getChannelData(0);
    const M=Math.max(2,Math.round(S/freq)),bp=Math.max(1,Math.round(M*pluckPos));
    const ring=new Float32Array(M);
    for(let i=0;i<M;i++)ring[i]=Math.random()*2-1;
    let idx=0,last=0;
    for(let i=0;i<N;i++){
      const cur=ring[idx];
      const nxt=ring[(idx+bp)%M];
      const v=(.5*(cur+nxt))*0.9955;          // 阻尼拨片
      ring[idx]=v;last=last*.6+v*.4;d[i]=last;
      idx=(idx+1)%M;
    }
    const src=ctx.createBufferSource();src.buffer=buf;
    const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=freq*2.1;f.Q.value=.8;
    src.connect(f);this._out(f,{pan,rev,gain,attack:.002,hold:0,release:dur*.2,peak:freq*3});
    src.start();
  }
  /* ---------- 五声音阶旋律 ---------- */
  melody(notes,{gap=.42,gain=.4,gliss=false}={}){
    notes.forEach((n,i)=>{
      const f=typeof n==='number'?n:(NOTE[n]||261.63);
      setTimeout(()=>this.guzheng(f,{gain,rev:.45}),i*gap*1000);
      if(gliss)setTimeout(()=>this.guzheng(f*1.006,{gain:gain*.6}),i*gap*1000+60);
    });
  }
  /* ---------- 二胡（长弓） ---------- */
  erhu(freq,{dur=2.4,pan=-.2,rev=.5,gain=.22,vib=6.5}={}){
    if(!this.ready)return;
    const ctx=this.ctx,t=this._now();
    const o=ctx.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(freq,t);
    const o2=ctx.createOscillator();o2.type='triangle';o2.frequency.setValueAtTime(freq*2.003,t);
    const lfo=ctx.createOscillator();lfo.frequency.value=vib;
    const lg=ctx.createGain();lg.gain.value=freq*.011;lfo.connect(lg);lg.connect(o.frequency);
    const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=1900;f.Q.value=3.5;
    const g2=ctx.createGain();g2.gain.value=.25;
    o.connect(f);o2.connect(g2);g2.connect(f);
    this._out(f,{pan,rev,gain,attack:.35,hold:dur*.45,release:dur*.35,peak:820});
    o.start();o2.start();lfo.start();o.stop(t+dur);o2.stop(t+dur);lfo.stop(t+dur);
  }
  /* ---------- 铜铃 / 磬 / 木鱼 ---------- */
  bell(freq=1568,{dur=2.2,gain=.18,pan=0}={}){
    if(!this.ready)return;
    const ctx=this.ctx,t=this._now();
    [1,2.41,3.83,5.12,6.9].forEach((m,i)=>{
      const o=ctx.createOscillator();o.type='sine';o.frequency.value=freq*m;
      const g=ctx.createGain();const a=g.gain;
      a.setValueAtTime(0,t);a.linearRampToValueAtTime(gain/(i+1.4),t+.004);
      a.exponentialRampToValueAtTime(.0001,t+dur/(1+i*.55));
      o.connect(g).connect(this.dry);
      const rs=ctx.createGain();rs.gain.value=.5;g.connect(rs);rs.connect(this.revSend);
      o.start(t);o.stop(t+dur);
    });
  }
  woodfish({gain=.3,pan=.1}={}){
    if(!this.ready)return;
    const ctx=this.ctx,t=this._now();
    const o=ctx.createOscillator();o.type='sine';
    o.frequency.setValueAtTime(430,t);o.frequency.exponentialRampToValueAtTime(180,t+.09);
    const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=900;f.Q.value=6;
    o.connect(f);this._out(f,{gain,pan,rev:.3,attack:.002,release:.16});
    o.start();o.stop(t+.3);
  }
  /* ---------- 更鼓 ---------- */
  drum({gain=.7,pan=0,dur=1.2}={}){
    if(!this.ready)return;
    const ctx=this.ctx,t=this._now();
    const o=ctx.createOscillator();o.type='sine';
    o.frequency.setValueAtTime(92,t);o.frequency.exponentialRampToValueAtTime(38,t+.28);
    const g=ctx.createGain();g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g).connect(this.dry);
    const rs=ctx.createGain();rs.gain.value=.4;g.connect(rs);rs.connect(this.revSend);
    const n=ctx.createBufferSource();n.buffer=this.noiseBuf;
    const nf=ctx.createBiquadFilter();nf.type='highpass';nf.frequency.value=1400;
    const ng=ctx.createGain();ng.gain.setValueAtTime(gain*.25,t);ng.gain.exponentialRampToValueAtTime(.0001,t+.1);
    n.connect(nf).connect(ng).connect(this.dry);n.start();n.stop(t+.2);
    o.start();o.stop(t+dur);
  }
  /* ---------- 噪声类：风/脚步/开门/碎纸/火把 ---------- */
  noiseHit({dur=.22,freq=900,q=1,type='bandpass',gain=.2,pan=0,rev=.2,sweep=0}={}){
    if(!this.ready)return;
    const ctx=this.ctx,t=this._now();
    const n=ctx.createBufferSource();n.buffer=this.noiseBuf;n.loop=true;
    n.playbackRate.value=.8+Math.random()*.5;
    const f=ctx.createBiquadFilter();f.type=type;f.frequency.setValueAtTime(freq,t);f.Q.value=q;
    if(sweep)f.frequency.exponentialRampToValueAtTime(Math.max(60,freq*sweep),t+dur);
    n.connect(f);this._out(f,{gain,pan,rev,attack:Math.min(.02,dur*.2),release:dur,peak:freq*1.6});
    n.start();n.stop(t+dur+.05);
  }
  step(hard='wood'){
    const p={wood:{freq:520,gain:.12,dur:.13},stone:{freq:1150,gain:.16,dur:.15},
             earth:{freq:300,gain:.1,dur:.16},straw:{freq:2300,gain:.07,dur:.1}}[hard]||{freq:520,gain:.12,dur:.13};
    this.noiseHit({...p,q:1.2,pan:(Math.random()-.5)*.3});
  }
  creak(){
    if(!this.ready)return;
    const ctx=this.ctx,t=this._now();
    const o=ctx.createOscillator();o.type='sawtooth';
    o.frequency.setValueAtTime(120,t);
    o.frequency.linearRampToValueAtTime(210,t+.5);o.frequency.linearRampToValueAtTime(96,t+1.1);
    const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=680;f.Q.value=11;
    const g=ctx.createGain();g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(.14,t+.1);g.gain.linearRampToValueAtTime(.0001,t+1.2);
    o.connect(f).connect(g);g.connect(this.dry);
    const rs=ctx.createGain();rs.gain.value=.4;g.connect(rs);rs.connect(this.revSend);
    o.start();o.stop(t+1.3);
  }
  /* ---------- 心跳 ---------- */
  setHeartRate(bpm){this._bpm=bpm||0;}
  _thump(){
    this.noiseHit({dur:.16,freq:58,q:.9,type:'lowpass',gain:.55,rev:.1});
    setTimeout(()=>this.noiseHit({dur:.13,freq:44,q:.9,type:'lowpass',gain:.34,rev:.1}),165);
  }
  /* ---------- 耳语（在"她"的位置） ---------- */
  whisper(pan=0,intensity=1){
    if(!this.ready)return;
    const ctx=this.ctx,t=this._now();
    const n=ctx.createBufferSource();n.buffer=this.noiseBuf;n.loop=true;
    const f1=ctx.createBiquadFilter();f1.type='bandpass';f1.frequency.value=1700+Math.random()*900;f1.Q.value=5;
    const f2=ctx.createBiquadFilter();f2.type='bandpass';f2.frequency.value=3100;f2.Q.value=7;
    const am=ctx.createOscillator();am.frequency.value=5+Math.random()*7;
    const amg=ctx.createGain();amg.gain.value=.45;am.connect(amg);
    const g=ctx.createGain();g.gain.value=.001;
    amg.connect(g.gain);
    n.connect(f1).connect(f2).connect(g);
    const p=ctx.createStereoPanner();p.pan.value=pan;g.connect(p);
    p.connect(this.dry);
    const rs=ctx.createGain();rs.gain.value=.6;g.connect(rs);rs.connect(this.revSend);
    const dur=1.1+Math.random()*1.4;
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.16*intensity,t+.25);
    g.gain.linearRampToValueAtTime(.0001,t+dur);
    n.start();am.start();n.stop(t+dur);am.stop(t+dur);
  }
  /* ---------- 跳吓 ---------- */
  jump(){
    if(!this.ready)return;
    const ctx=this.ctx,t=this._now();
    this.noiseHit({dur:.9,freq:2600,q:.4,type:'highpass',gain:.75,rev:.7,sweep:.12});
    [98,104,147,233].forEach(f=>{
      const o=ctx.createOscillator();o.type='square';o.frequency.setValueAtTime(f*3,t);
      o.frequency.exponentialRampToValueAtTime(f*.6,t+.75);
      const g=ctx.createGain();g.gain.setValueAtTime(.16,t);g.gain.exponentialRampToValueAtTime(.0001,t+.9);
      const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2200;
      o.connect(lp).connect(g).connect(this.dry);o.start();o.stop(t+1);
    });
    this.bell(2093,{dur:3.4,gain:.3});
  }
  sting(kind='dread'){
    if(kind==='dread'){[55,58.3,82.4].forEach(f=>this.erhu(f,{dur:3.4,gain:.1,vib:1.2,pan:Math.random()-.5}));}
    else if(kind==='reveal'){this.bell(1046,{dur:3,gain:.24});this.erhu(392,{dur:2.6,gain:.15,vib:4});}
    else if(kind==='success'){this.melody(['宫','角','徵','少宫'],{gap:.16,gain:.34});}
    else if(kind==='fail'){this.guzheng(110,{dur:1.4,gain:.5});this.noiseHit({dur:.5,freq:220,type:'lowpass',gain:.3});}
  }
  /* ---------- 环境底 ---------- */
  _startAmbience(){
    const ctx=this.ctx;
    // 风
    const n=ctx.createBufferSource();n.buffer=this.noiseBuf;n.loop=true;
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=420;
    const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=260;bp.Q.value=.7;
    const g=ctx.createGain();g.gain.value=.05;
    const lfo=ctx.createOscillator();lfo.frequency.value=.07;
    const lg=ctx.createGain();lg.gain.value=.035;lfo.connect(lg).connect(g.gain);
    n.connect(lp).connect(bp).connect(g);
    g.connect(this.dry);const rs=ctx.createGain();rs.gain.value=.5;g.connect(rs);rs.connect(this.revSend);
    n.start();lfo.start();this.windGain=g;
    // 低频阴鸣
    const d1=ctx.createOscillator();d1.type='sine';d1.frequency.value=41.2;
    const d2=ctx.createOscillator();d2.type='sine';d2.frequency.value=41.2*1.007;
    const d3=ctx.createOscillator();d3.type='sawtooth';d3.frequency.value=20.6;
    const dlp=ctx.createBiquadFilter();dlp.type='lowpass';dlp.frequency.value=140;
    const dg=ctx.createGain();dg.gain.value=.05;
    d1.connect(dlp);d2.connect(dlp);d3.connect(dlp);dlp.connect(dg).connect(this.dry);
    d1.start();d2.start();d3.start();this.droneGain=dg;
    this._bpm=0;
    this._hb=null;this._scheduleHeart();
    this._scheduleRandom();
  }
  _scheduleHeart(){
    clearTimeout(this._hb);
    const go=()=>{ if(this._bpm>0)this._thump();
      this._hb=setTimeout(go,Math.max(280,60000/this._bpm||0)); };
    this._hb=setTimeout(go,400);
  }
  _scheduleRandom(){
    const loop=()=>{
      if(this.ready&&!this.muted){
        const r=Math.random();
        if(r<.22)this.creak();
        else if(r<.4)this.noiseHit({dur:.9,freq:1800,q:2,gain:.05,pan:Math.random()*1.6-.8,rev:.8}); // 纸响
        else if(r<.55)this.bell(1318+Math.random()*400,{dur:3,gain:.06,pan:Math.random()*1.4-.7});
        else if(r<.68)this.whisper(Math.random()*1.6-.8,.5);
        else if(r<.78)this.drum({gain:.2});
        else if(r<.86)this.guzheng(196+Math.random()*120,{dur:2.4,gain:.1,pan:Math.random()-.5});
      }
      setTimeout(loop,5200+Math.random()*11000);
    };
    setTimeout(loop,7000);
  }
  /** 恐惧强度 0~1：压低风声、抬升阴鸣、加速心跳 */
  setDread(v){
    if(!this.ready)return;
    const t=this._now();
    this.droneGain.gain.linearRampToValueAtTime(.04+v*.16,t+.6);
    this.windGain.gain.linearRampToValueAtTime(.05-v*.035,t+.6);
    this.setHeartRate(v<.15?0:48+v*68);
  }
  playNote(nameOrFreq,opt){this.guzheng(typeof nameOrFreq==='number'?nameOrFreq:(NOTE[nameOrFreq]||262),opt);}
  noteFreq(n){return NOTE[n]||261.63;}
  setMuted(m){this.muted=m;if(this.master)this.master.gain.value=m?0:.9;}
}
export const PENTA=['宫','商','角','徵','羽'];
