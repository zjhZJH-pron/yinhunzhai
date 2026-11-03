/* =============================================================
   触控层
   Pointer Lock 在手机上不可用，所以视角、移动、交互全要另建一套：
     · 左半屏「浮动摇杆」—— 手指按哪儿，哪儿就是杆心
     · 右半屏拖拽转视角
     · 右半屏轻点 = 对点到的东西交互（屏幕空间拾取）
   多点触控必须并行：边走、边看、边按屏息是常态，
   所以按 pointerId 分轨处理，不用单一「当前手指」。
   ============================================================= */
import {profile} from './platform.js';

const STICK_R=54;          // 摇杆行程半径 px

export function attachTouch(app){
  const P=app.input, prof=profile();
  P.touch=true;

  /* ---------- 建 DOM ---------- */
  const layer=document.createElement('div');
  layer.id='touchLayer';
  layer.innerHTML=`
    <div class="stick" id="tStick"><i class="stick-base"></i><i class="stick-knob"></i></div>
    <div class="tbtns" id="tBtns">
      <button class="tb big" data-act="interact"><b>交互</b><span>E</span></button>
      <button class="tb" data-act="incense"><b>燃香</b><span>H</span></button>
      <button class="tb" data-act="torch"><b>火</b><span>F</span></button>
      <button class="tb hold" data-act="breath"><b>屏息</b><span>Ctrl</span></button>
      <button class="tb" data-act="bag"><b>囊中</b><span>Tab</span></button>
      <button class="tb" data-act="book"><b>簿</b><span>J</span></button>
      <button class="tb" data-act="ask"><b>问</b><span>G</span></button>
    </div>`;
  document.body.appendChild(layer);
  const stick=layer.querySelector('#tStick');
  const base=stick.querySelector('.stick-base');
  const knob=stick.querySelector('.stick-knob');

  const tracks=new Map();      // pointerId → {role, x0, y0, moved, t0}

  const inBtn=e=>e.target.closest('.tb');
  /**
   * 视口宽度：优先用本层自身的矩形（position:fixed;inset:0 即视口），
   * 再退到 innerWidth / screen，最后给个安全值。
   * 布局尚未就绪或被宿主环境报成 0 时，不能让整个分区判断失效。
   */
  const vw=()=>{
    const r=layer.getBoundingClientRect();
    return r.width || window.innerWidth || screen.width ||
           document.documentElement.clientWidth || 960;
  };
  const isStickZone=x=>x<vw()*0.46;

  /* ---------- 摇杆 ---------- */
  function stickShow(x,y){
    stick.style.left=x+'px'; stick.style.top=y+'px';
    stick.classList.add('on');
    knob.style.transform='translate(-50%,-50%)';
  }
  function stickMove(dx,dy){
    const l=Math.hypot(dx,dy);
    const k=l>STICK_R?STICK_R/l:1;
    knob.style.transform=`translate(-50%,-50%) translate(${dx*k}px,${dy*k}px)`;
    P.setAnalog(dx/STICK_R, -dy/STICK_R);     // 屏幕 y 向下 = 后退
  }
  function stickHide(){ stick.classList.remove('on'); P.clearAnalog(); }

  /* ---------- 事件 ---------- */
  layer.addEventListener('pointerdown',e=>{
    if(inBtn(e))return;                       // 按钮自己处理
    e.preventDefault();
    // 合成事件或部分浏览器下 setPointerCapture 会抛 NotFoundError，不能让它打断输入
    try{ layer.setPointerCapture?.(e.pointerId); }catch(err){}
    const role=isStickZone(e.clientX)?'stick':'look';
    tracks.set(e.pointerId,{role,x0:e.clientX,y0:e.clientY,lx:e.clientX,ly:e.clientY,
      moved:0,t0:performance.now()});
    if(role==='stick')stickShow(e.clientX,e.clientY);
  });

  layer.addEventListener('pointermove',e=>{
    const t=tracks.get(e.pointerId);
    if(!t)return;
    const dx=e.clientX-t.lx, dy=e.clientY-t.ly;
    t.lx=e.clientX; t.ly=e.clientY;
    t.moved+=Math.abs(dx)+Math.abs(dy);
    if(t.role==='stick'){
      stickMove(e.clientX-t.x0, e.clientY-t.y0);
    }else{
      // 触控转视角：位移直接给引擎，系数比鼠标大（手指行程短）
      P.addLook(dx*2.1*prof.lookGain, dy*2.1*prof.lookGain);
    }
  });

  const end=e=>{
    const t=tracks.get(e.pointerId);
    if(!t)return;
    tracks.delete(e.pointerId);
    if(t.role==='stick'){ stickHide(); }
    else{
      // 轻点（位移小、时间短）→ 对指尖处的东西交互
      const dur=performance.now()-t.t0;
      if(t.moved<14&&dur<420) tapAt(app,e.clientX,e.clientY);
    }
  };
  layer.addEventListener('pointerup',end);
  layer.addEventListener('pointercancel',end);
  layer.addEventListener('contextmenu',e=>e.preventDefault());

  /* ---------- 按钮 ---------- */
  const actions={
    interact:()=>app.requestInteract(),
    incense :()=>app.tryIncense(),
    torch   :()=>app.toggleTorch(),
    bag     :()=>app.hud.toggleJournal(),
    book    :()=>app.hud.toggleJournal(),
    ask     :()=>app.askHintMobile(),
    breath  :null,                             // 按住型，单独处理
  };
  layer.querySelectorAll('.tb').forEach(b=>{
    const act=b.dataset.act;
    if(act==='breath'){
      const on=e=>{e.preventDefault();e.stopPropagation();P.setKey('ControlLeft',true);b.classList.add('on');};
      const off=e=>{e.stopPropagation();P.setKey('ControlLeft',false);b.classList.remove('on');};
      b.addEventListener('pointerdown',on);
      b.addEventListener('pointerup',off);
      b.addEventListener('pointercancel',off);
      b.addEventListener('pointerleave',off);
    }else{
      b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();});
      b.addEventListener('click',e=>{e.stopPropagation();actions[act]&&actions[act]();});
    }
  });

  /* ---------- 方向变化时收起摇杆，避免残影 ---------- */
  addEventListener('resize',()=>{tracks.clear();stickHide();});
  addEventListener('orientationchange',()=>{tracks.clear();stickHide();});

  return {
    layer,
    /** 谜题面板打开时禁用触控层，防止误触转视角 */
    setEnabled(on){ layer.style.display=on?'':'none'; if(!on){tracks.clear();stickHide();} },
    destroy(){ layer.remove(); },
  };
}

/* ---------- 轻点拾取：把世界点位投影到屏幕，找最近的 ---------- */
function tapAt(app,sx,sy){
  const pick=app.pickAtScreen;
  if(pick){ const i=pick(sx,sy); if(i) app.actOn(i); }
}
