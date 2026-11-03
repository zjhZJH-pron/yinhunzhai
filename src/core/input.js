export class Input{
  constructor(canvas){
    this.canvas=canvas;
    this.keys=new Set();
    this.mouse={dx:0,dy:0,left:false,right:false,wheel:0};
    this.locked=false;
    this.touch=false;                    // 触控模式（由 touch.js 置真）
    this.analog={x:0,y:0,active:false};  // 虚拟摇杆：x 右正、y 前进正
    this.sensitivity=0.0022;
    this.yaw=0;this.pitch=0;
    this._consumers=[];
    this._bind();
  }
  _bind(){
    window.addEventListener('keydown',e=>{
      if(e.repeat)return;
      const k=e.code;
      this.keys.add(k);
      if(k==='Tab'||k==='Space')e.preventDefault();
      this._fire('keydown',k,e);
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    window.addEventListener('blur',()=>{this.keys.clear();this.mouse.dx=this.mouse.dy=0;});
    this.canvas.addEventListener('mousedown',e=>{
      if(!this.locked){this.requestLock();return;}
      if(e.button===0){this.mouse.left=true;this._fire('click',e);}
      if(e.button===2){this.mouse.right=true;this._fire('rclick',e);}
    });
    window.addEventListener('mouseup',e=>{if(e.button===0)this.mouse.left=false;if(e.button===2)this.mouse.right=false;});
    this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
    window.addEventListener('mousemove',e=>{
      if(!this.locked)return;
      this.mouse.dx+=e.movementX||0;this.mouse.dy+=e.movementY||0;
    });
    window.addEventListener('wheel',e=>{if(this.locked)this.mouse.wheel+=Math.sign(e.deltaY);},{passive:true});
    document.addEventListener('pointerlockchange',()=>{
      this.locked=document.pointerLockElement===this.canvas;
      document.body.classList.toggle('cursor-on',!this.locked);
      this._fire('lockchange',this.locked);
    });
  }
  requestLock(){
    if(!this.canLock())return;
    if(document.pointerLockElement!==this.canvas){
      const p=this.canvas.requestPointerLock();
      if(p&&p.catch)p.catch(()=>{});          // 某些浏览器返回 Promise 且会 reject
    }
  }
  exitLock(){ if(document.pointerLockElement===this.canvas) document.exitPointerLock(); }
  down(...codes){return codes.some(c=>this.keys.has(c));}
  on(ev,fn){this._consumers.push({ev,fn});return()=>this._consumers=this._consumers.filter(c=>c.fn!==fn);}
  _fire(ev,a,b){for(const c of this._consumers)if(c.ev===ev)c.fn(a,b);}
  /** 消费累积的鼠标增量 */
  readLook(){const d={dx:this.mouse.dx,dy:this.mouse.dy};this.mouse.dx=0;this.mouse.dy=0;return d;}
  readWheel(){const w=this.mouse.wheel;this.mouse.wheel=0;return w;}
  /** 一次性按键 */
  pressed(code){ if(this.keys.has(code)){ if(!this._seen)this._seen=new Set();
      if(this._seen.has(code))return false; this._seen.add(code); return true;} 
    if(this._seen)this._seen.delete(code); return false; }

  /* ---------- 触控侧接口 ---------- */
  /** 触控拖拽转视角：与鼠标共用 readLook 的累积通道 */
  addLook(dx,dy){ this.mouse.dx+=dx; this.mouse.dy+=dy; }
  /** HUD 按钮按住 = 键盘按住 */
  setKey(code,on){ if(on)this.keys.add(code); else this.keys.delete(code); }
  /** 摇杆写入 */
  setAnalog(x,y){
    const l=Math.hypot(x,y);
    if(l>1){x/=l;y/=l;}
    this.analog.x=x; this.analog.y=y; this.analog.active=(l>0.08);
  }
  clearAnalog(){ this.analog.x=0; this.analog.y=0; this.analog.active=false; }
  /** 触控模式下指针锁定不可用，requestLock 直接忽略而不是抛错 */
  canLock(){ return !this.touch && !!this.canvas.requestPointerLock; }
}
