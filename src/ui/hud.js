import {ITEMS} from '../game/state.js';
import {typeWrite} from '../core/util.js';

const $=s=>document.querySelector(s);
const MAXSLOT=9;

export class HUD{
  constructor(app){
    this.app=app;
    this.el=$('#hud');
    this.prompt=$('#prompt');this.promptText=$('#promptText');this.promptKey=$('#promptKey');
    this.crosshair=$('#crosshair');
    this.lamp=$('#soulLamp');this.lampFill=$('#lampFill');this.lampNum=$('#lampNum');
    this.invBar=$('#invBar');
    this.toasts=$('#toastStack');
    this.whisperEl=$('#whisper');
    this.audio=app.audio;
    this.journal=$('#journal');this.journalOpen=false;
    this.dialogEl=$('#dialog');this.dialogOpen=false;
    this.breathWrap=$('#breathWrap');this.breathFill=$('#breathFill');
    this.objTitle=$('#objTitle');this.objText=$('#objText');
    this.vig=$('#bloodVig');
    this.cur=null;this.whisperT=0;this.fpsEl=null;
    this.safePulse=null;
    this.lastHot=null;
  }
  /* ---- 交互提示 ---- */
  setPrompt(text,hot){
    if(text){this.prompt.classList.add('on');this.promptText.textContent=text;
      this.crosshair.classList.toggle('hot',!!hot);}
    else{this.prompt.classList.remove('on');this.crosshair.classList.remove('hot');}
  }
  setFps(v){
    if(!this.fpsEl){this.fpsEl=document.createElement('div');
      this.fpsEl.style.cssText='position:absolute;right:26px;bottom:22px;font-size:11px;color:#4d4335;letter-spacing:.2em';
      this.el.appendChild(this.fpsEl);}
    this.fpsEl.textContent=Math.round(v)+' fps';
  }
  /* ---- 魂灯 ---- */
  tick(dt){
    const S=this.app.state;
    const d=S.dread;
    this.lampFill.style.right=(100-Math.min(100,d))+'%';
    this.lampNum.textContent=Math.round(d)+' / 100 · 阴气';
    this.lamp.classList.toggle('danger',d>66);
    this.vig.classList.toggle('on',d>78);
    // 耳边低语
    if(d>44&&!this.dialogOpen){
      this.whisperT-=dt;
      if(this.whisperT<=0){
        this.whisperT=8+Math.random()*14;
        this.whisper(this.pickWhisper());
      }
    }
    if(this.safePulse){
      this.safePulse.t-=dt;
      if(this.safePulse.t<=0){this.safePulse.el.remove();this.safePulse=null;}
      else this.safePulse.el.style.opacity=String(Math.min(.85,this.safePulse.t/1.2));
    }
    if(this.app.postfx)this.vig.style.opacity='';
  }
  pickWhisper(){
    const S=this.app.state,ch=S.chapter;
    const pool=ch<2?['回头看我不行吗','我把盖头给你留好了','你走不掉的 公子','香燃尽了 你过来']
      :['你欠我的 记在礼单上了','六礼还差一礼 差的是你','井水凉 我替你暖过','戏还没散 你不许走','她是我 我是她'];
    return pool[Math.floor(Math.random()*pool.length)];
  }
  whisper(text){
    if(this.app.audio.ready)this.audio.whisper((Math.random()*1.4-.7),.8);
    this.whisperEl.textContent=text;
    this.whisperEl.classList.add('on');
    clearTimeout(this._wt);
    this._wt=setTimeout(()=>this.whisperEl.classList.remove('on'),2600);
  }
  setBreath(v){
    if(v===null){this.breathWrap.classList.add('hidden');return;}
    this.breathWrap.classList.remove('hidden');
    this.breathFill.style.width=(v*100).toFixed(1)+'%';
  }
  pulseSafe(pos,r){
    const el=document.createElement('div');
    el.style.cssText=`position:fixed;left:50%;top:50%;width:${r*10}px;height:${r*10}px;
      transform:translate(-50%,-50%);border-radius:50%;pointer-events:none;z-index:9;
      border:1px solid rgba(143,212,208,.5);box-shadow:0 0 40px rgba(143,212,208,.25) inset`;
    document.body.appendChild(el);
    this.safePulse={el,t:2.4};
  }
  /* ---- 飘字 ---- */
  toast(text,kind=''){
    const d=document.createElement('div');
    d.className='toast'+(kind?' '+kind:'');
    d.textContent=text;
    this.toasts.appendChild(d);
    setTimeout(()=>d.remove(),3200);
    while(this.toasts.children.length>4)this.toasts.firstChild.remove();
  }
  /* ---- 囊中物 ---- */
  renderInv(){
    const S=this.app.state;
    this.invBar.innerHTML='';
    const list=S.inv.slice(0,MAXSLOT);
    list.forEach((id,i)=>{
      const it=ITEMS[id]||{n:id,g:'物'};
      const d=document.createElement('div');
      d.className='slot'+(S.sel===id?' sel':'');
      d.innerHTML=`<span class="g">${it.g}</span><span class="n">${i+1}·${it.n}</span>`;
      d.title=it.n+'：'+it.d;
      d.onclick=()=>{this.app.syncUi();S.sel=S.sel===id?null:id;this.renderInv();
        if(S.sel)this.toast(it.n+' —— '+it.d,'');};
      this.invBar.appendChild(d);
    });
    for(let i=list.length;i<Math.min(MAXSLOT,Math.max(4,list.length));i++){
      const d=document.createElement('div');d.className='slot';d.style.opacity=.35;
      this.invBar.appendChild(d);
    }
  }
  selectInv(i){
    const S=this.app.state;
    const list=S.inv.slice(0,MAXSLOT);
    if(i<0){S.sel=null;}
    else{
      if(i>=list.length)return;
      const id=list[i];
      S.sel=S.sel===id?null:id;
      if(S.sel)this.toast(S.sel?((ITEMS[id]||{}).n||id)+'：'+(ITEMS[id]||{}).d:'已放下','');
    }
    this.renderInv();
  }
  /* ---- 引魂簿 ---- */
  updateJournal(){
    const S=this.app.state;
    $('#jrGoals').innerHTML=S.goals.map(g=>
      `<li style="${g.done?'opacity:.45;text-decoration:line-through':''}">${esc(g.text)}</li>`).join('')||'<li style="opacity:.5">尚无所求</li>';
    $('#jrNotes').innerHTML=S.notes.map(n=>`<li><b style="color:#7d1108">[${n.tag}]</b> ${esc(n.text)}</li>`).join('')||'<li style="opacity:.5">尚未记下什么</li>';
    $('#jrItems').innerHTML=S.inv.map(id=>{const it=ITEMS[id];return `<li><b>${it?it.g:'·'}</b> ${esc(it?it.n:id)} —— <span style="opacity:.7">${esc(it?it.d:'')}</span></li>`;}).join('')||'<li style="opacity:.5">空空如也</li>';
  }
  toggleJournal(){
    this.journalOpen=!this.journalOpen;
    this.updateJournal();
    this.journal.classList.toggle('hidden',!this.journalOpen);
    if(this.journalOpen)this.app.input.exitLock();
    else this.app.input.requestLock();
    this.app.syncUi();
  }
  /* ---- 目标 ---- */
  setObjective(chapter,text){
    this.objTitle.textContent=chapter;
    this.objText.textContent=text;
  }
  /* ---- 对话 ---- */
  say({who='',glyph='？',text='',choices=null,onDone=null,speed=null}){
    this.dialogOpen=true;this.app.syncUi();
    this.dialogEl.classList.remove('hidden');
    $('#dlgName').textContent=who;
    $('#dlgPortraitGlyph').textContent=glyph;
    const box=$('#dlgText'),cc=$('#dlgChoices');
    cc.innerHTML='';
    if(this.app.audio.ready)this.audio.guzheng(330,{dur:1.2,gain:.22});
    const fast=speed||(this.app.diffNightmare?26:34);
    this.cur=typeWrite(box,text,{speed:fast,onDone:()=>{
      this._done=()=>{this.dialogOpen=false;this.app.syncUi();onDone&&onDone();};
      if(choices&&choices.length)this.showChoices(choices);
      else this.autoClose();
    }});
  }
  showChoices(list){
    const cc=$('#dlgChoices');cc.innerHTML='';
    list.forEach((c,i)=>{
      const b=document.createElement('button');
      b.className='choice'+(c.risk?' risk':'');
      b.textContent=(i+1)+' · '+c.label;
      b.onclick=()=>{cc.innerHTML='';this.dialogOpen=false;this.app.syncUi();
        this.app.input.requestLock();c.go&&c.go();};
      cc.appendChild(b);
    });
    const hint=document.createElement('div');
    hint.style.cssText='font-size:11px;color:#6d5a3c;letter-spacing:.2em;margin-top:6px';
    hint.textContent='点选，或以 1…'+list.length+' 键应答';
    cc.appendChild(hint);
    this._choiceKeys=list;
  }
  autoClose(){
    const cc=$('#dlgChoices');
    cc.innerHTML='<div style="font-size:11px;color:#6d5a3c;letter-spacing:.2em">[E] 或 点击 继续</div>';
    this.dialogEl.onclick=()=>{this.dialogEl.onclick=null;this._done&&this._done();};
  }
  skipDialog(){
    if(this.cur){this.cur.skip();return;}
    if(this._done&&!this._choiceKeys){this._done();return;}
    if(this._choiceKeys)this._done&&this._done();
  }
  pickChoice(i){
    const c=this._choiceKeys&&this._choiceKeys[i];
    if(!c)return;
    this._choiceKeys=null;
    this.dialogOpen=false;
    this.dialogEl.classList.add('hidden');
    this._done=null;
    this.app.syncUi();
    this.app.input.requestLock();
    c.go&&c.go();
  }
  /** 查看卡片：描述 + 可选动作按钮 */
  examine(title,html,action){
    if(this.cur){this.cur.kill();this.cur=null;}
    this._choiceKeys=null;
    this.dialogOpen=true;
    this.app.syncUi();
    this.dialogEl.classList.remove('hidden');
    this.dialogEl.onclick=null;
    $('#dlgName').textContent=title;
    $('#dlgPortraitGlyph').textContent='？';
    $('#dlgText').innerHTML=html||'……';
    const cc=$('#dlgChoices');cc.innerHTML='';
    this._done=()=>{this.dialogOpen=false;this._done=null;this.dialogEl.classList.add('hidden');
      this.app.syncUi();this.app.input.requestLock();};
    if(action){
      const b=el('button','choice',action.label);
      b.onclick=()=>{const run=action.run;this._done&&this._done();run&&run();};
      cc.appendChild(b);
    }
    const back=el('button','choice','退 开　[E / Esc]');
    back.onclick=()=>this._done&&this._done();
    cc.appendChild(back);
    if(this.app.audio.ready)this.audio.noiseHit({dur:.22,freq:1150,gain:.05,q:2});
  }
}
function el(t,c,h){const e=document.createElement(t);if(c)e.className=c;if(h!==undefined)e.innerHTML=h;return e;}
function esc(s){return String(s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));}
