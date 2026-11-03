/* =============================================================
   平台判定与画质档位
   手机 GPU 扛不住「二十个点光源 + 阴影图 + 512² 贴图」这一套，
   所以必须有一档明确降配，而不是让它在手机上卡成幻灯片。
   ============================================================= */

export function isCoarse(){
  try{
    if(matchMedia('(pointer:coarse)').matches) return true;
  }catch(e){}
  return 'ontouchstart' in window && !matchMedia('(pointer:fine)').matches;
}

export function isMobile(){
  return isCoarse() || /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent||'');
}

/** 调试/验证用：?mobile=1 强制走移动端路径（低配 + 触控），?desktop=1 反向强制 */
export function forced(){
  const q=new URLSearchParams(location.search||'');
  if(q.has('mobile'))return 'mobile';
  if(q.has('desktop'))return 'desktop';
  return null;
}

export function tier(){
  const f=forced();
  if(f==='mobile')return 'low';
  if(f==='desktop')return 'high';
  return isMobile()?'low':'high';
}

export const lowSpec=()=>tier()==='low';

/** 贴图分辨率系数：低配减半，显存直接省掉四分之三 */
export const TEX=()=>tier()==='low'?0.5:1;

/** 各档位参数：main.js 与 manor.js 都从这里取 */
export function profile(){
  const low=tier()==='low';
  return {
    low,
    dpr:        low?1.2:1.5,
    shadow:     !low,
    // 低配：灯笼/蜡烛一律不建动态点光（只自发光+光斑），房间靠一盏稳定的
    // 「窗漏月光」撑亮度。若让它们抢预算，建造顺序会让前几间吃光、后面全黑。
    propLights: low?0:99,
    roomFill:   low?12:7.5,
    lanternGlow: true,
    ashCount:   low?120:380,
    bats:       !low,
    postScale:  low?0.62:1,    // 后处理离屏缓冲缩放
    fog:        low?0.030:0.036,
    lookGain:   low?1.35:1,    // 触控拖拽转视角比鼠标慢，需补偿
    tapRadius:  46,            // 点按拾取的屏幕半径（px）
  };
}
