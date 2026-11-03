export const clamp=(v,a,b)=>v<a?a:v>b?b:v;
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smoothstep=(t)=>t*t*(3-2*t);
export const rand=(a=1,b)=>b===undefined?Math.random()*a:a+Math.random()*(b-a);
export const randInt=(a,b)=>Math.floor(rand(a,b+1));
export const pick=(arr)=>arr[Math.floor(Math.random()*arr.length)];
export const shuffle=(arr)=>{const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export const dist2=(ax,az,bx,bz)=>{const dx=ax-bx,dz=az-bz;return Math.hypot(dx,dz);};
export const now=()=>performance.now()/1000;

export const uid=(p='id')=>p+'_'+Math.random().toString(36).slice(2,9);

/** 稳定伪随机（同一 seed 同一序列），用于每次进入场景物件一致 */
export function makeRng(seed=1){let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}

/** AABB 与圆 的最小位移修正 */
export function pushOutCircle(cx,cz,r,box){
  const nx=clamp(cx,box.minX,box.maxX), nz=clamp(cz,box.minZ,box.maxZ);
  let dx=cx-nx, dz=cz-nz; const d2=dx*dx+dz*dz;
  if(d2>r*r) return null;                 // 圆心在盒外且不相交
  if(d2>1e-9){
    const d=Math.sqrt(d2), k=(r-d)/d;
    return {x:dx*k, z:dz*k};
  }
  // 圆心在盒内：沿最近面推出
  const toL=cx-box.minX, toR=box.maxX-cx, toB=cz-box.minZ, toF=box.maxZ-cz;
  const m=Math.min(toL,toR,toB,toF);
  if(m===toL) return {x:-(toL+r),z:0};
  if(m===toR) return {x:toR+r,z:0};
  if(m===toB) return {x:0,z:-(toB+r)};
  return {x:0,z:toF+r};
}

export function fmt(n,pad=2){return String(n).padStart(pad,'0');}

export function debounce(fn,ms=200){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};}

/** 逐字打字机（返回可取消句柄） */
export function typeWrite(el,text,{speed=34,onDone=null,onTick=null}={}){
  let i=0,alive=true;el.textContent='';
  const step=()=>{
    if(!alive)return;
    el.textContent=text.slice(0,++i);
    if(onTick)onTick(i);
    if(i<text.length){const ch=text[i];const p=(ch==='，'||ch==='。'||ch==='…'||ch==='；')?speed*5.5:speed;setTimeout(step,p);}
    else if(onDone)onDone();
  };
  setTimeout(step,10);
  return {skip(){if(!alive)return;alive=false;el.textContent=text;onDone&&onDone();},
          kill(){alive=false;}};
}
