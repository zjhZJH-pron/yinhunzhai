import * as THREE from 'three';

const VERT=`
varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;

const FRAG=`
precision highp float;
varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform float uTime,uDread,uFlash,uHurt,uBreath,uCold,uVig;
uniform vec2 uRes;

float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+34.56);return fract(p.x*p.y);}

vec3 grade(vec3 c,float dread){
  float l=dot(c,vec3(.299,.587,.114));
  vec3 mono=vec3(l);
  c=mix(mono,c,1.0-dread*0.34-0.18);            // 随恐惧褪色
  c=max(vec3(0.0),c-0.014);
  // 冷青阴影 + 残红高光
  float shadow=1.0-smoothstep(0.05,0.55,l);
  float hi=smoothstep(0.55,1.0,l);
  c+=vec3(-0.02,0.028,0.032)*shadow*(0.6+dread*0.9);
  c=mix(c,c*vec3(1.16,0.62,0.55),hi*0.34);
  // 伽马压缩黑位
  c=pow(max(c,vec3(0.0)),vec3(1.06));
  return c;
}

void main(){
  vec2 uv=vUv;
  vec2 cc=uv-0.5;
  float r2=dot(cc,cc);
  // 桶形畸变：恐惧越高越"呼吸"
  float wob=1.0+sin(uTime*1.7)*0.004*uBreath;
  float dist=1.0+ r2*(0.035+uDread*0.11)*wob;
  uv=cc*dist+0.5;

  float ca=(0.0012+uDread*0.0055+uHurt*0.012)*(0.35+r2*3.0);
  vec3 col;
  col.r=texture2D(tDiffuse,(uv+vec2(ca,-ca*0.4))).r;
  col.g=texture2D(tDiffuse,uv).g;
  col.b=texture2D(tDiffuse,(uv-vec2(ca,ca*0.4))).b;

  col=grade(col,uDread);

  // 冷雾层（地气）
  col=mix(col,col*vec3(0.86,1.0,1.02)+vec3(0.0,0.012,0.016)*smoothstep(0.65,0.0,uv.y),uCold*0.5);

  // 扫描/撕扯（闪现时）
  if(uFlash>0.001){
    float band=step(0.5,hash(vec2(floor(uv.y*90.0),floor(uTime*22.0))));
    col+=vec3(0.10,0.14,0.13)*band*uFlash;
    col*=1.0-uFlash*0.28*hash(vec2(uTime,uv.y*40.0));
    float she=smoothstep(0.4,1.0,hash(vec2(floor(uTime*14.0),3.0)))*uFlash;
    col=mix(col,vec3(0.9,0.95,0.98),she*0.5*(1.0-smoothstep(0.0,0.35,abs(uv.y-0.55))));
  }

  // 血雾
  col=mix(col,col*vec3(1.25,0.28,0.24),uHurt*0.55);

  // 颗粒
  float g=hash(uv*uRes*0.5+vec2(uTime*60.0,-uTime*37.0));
  col+=(g-0.5)*(0.035+uDread*0.055);

  // 暗角
  float vig=smoothstep(0.86,0.16,r2*2.1);
  col*=mix(1.0,vig,0.82*uVig);

  // 边缘吞黑（低理智）
  col*=1.0-uDread*0.35*smoothstep(0.18,0.62,r2*2.0);

  gl_FragColor=vec4(col,1.0);
}`;

export class PostFX{
  constructor(renderer,scale=1){
    this.renderer=renderer;
    this.scale=scale;                 // 低配时把离屏缓冲缩小，省大量填充率
    this.rt=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,
      type:THREE.HalfFloatType,depthBuffer:true,stencilBuffer:false});
    this.scene=new THREE.Scene();
    this.cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.mat=new THREE.ShaderMaterial({
      vertexShader:VERT,fragmentShader:FRAG,depthTest:false,depthWrite:false,
      uniforms:{tDiffuse:{value:this.rt.texture},uTime:{value:0},uDread:{value:0},
        uFlash:{value:0},uHurt:{value:0},uBreath:{value:0},uCold:{value:0},uVig:{value:1},
        uRes:{value:new THREE.Vector2(1,1)}}
    });
    const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.mat);
    quad.frustumCulled=false;this.scene.add(quad);
    this.dread=0;this.flash=0;this.hurt=0;this.cold=0;
  }
  setSize(w,h,dpr){
    const s=Math.max(.4,this.scale);
    const pw=Math.max(2,Math.floor(w*dpr*s)), ph=Math.max(2,Math.floor(h*dpr*s));
    this.rt.setSize(pw,ph);
    this.mat.uniforms.uRes.value.set(pw,ph);
  }
  render(scene,camera,t){
    const u=this.mat.uniforms;
    u.uTime.value=t;
    u.uDread.value=this.dread;
    u.uFlash.value=this.flash;
    u.uHurt.value=this.hurt;
    u.uCold.value=this.cold;
    this.renderer.setRenderTarget(this.rt);
    this.renderer.render(scene,camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene,this.cam);
    this.flash*=0.90; this.hurt*=0.955;
  }
  scream(amount=1){this.flash=Math.min(1,this.flash+amount);}
}
