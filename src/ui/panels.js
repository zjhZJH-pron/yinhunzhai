import {ITEMS} from '../game/state.js';

const $=s=>document.querySelector(s);
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!==undefined)e.innerHTML=h;return e;};

/* 五行 · 五方 · 五色 · 五味 · 生数 —— 全篇谜题共用的文化表 */
export const WUXING={
  東:{dir:'東',el:'木',color:'青',hex:'#2f7d68',taste:'酸',sheng:3,gen:8},
  南:{dir:'南',el:'火',color:'赤',hex:'#b8231c',taste:'苦',sheng:2,gen:7},
  中:{dir:'中',el:'土',color:'黄',hex:'#c9a24a',taste:'甘',sheng:5,gen:10},
  西:{dir:'西',el:'金',color:'白',hex:'#e8e2d4',taste:'辛',sheng:4,gen:9},
  北:{dir:'北',el:'水',color:'黑',hex:'#22201f',taste:'咸',sheng:1,gen:6},
};
const WV=Object.values(WUXING);
const byColor=c=>WV.find(v=>v.color===c);
const byEl=e=>WV.find(v=>v.el===e);
const byTaste=t=>WV.find(v=>v.taste===t);
export const SHENG_ORDER=['木','火','土','金','水'];                 // 相生
export const KE_ON={木:'金',火:'水',土:'木',金:'火',水:'土'};         // 克我者
export const LIU_LI=[
  {step:'纳采',item:'woodgoose',hint:'初求也。执雁为礼，取其不再偶。'},
  {step:'问名',item:'longfeng',hint:'问女为谁氏，书姓字年月，合之于命馆。'},
  {step:'纳吉',item:'coins',hint:'得吉卜，告于神庙，婚乃定。'},
  {step:'纳征',item:'silkwool',hint:'玄纁束帛，成其聘，不复反也。'},
  {step:'请期',item:'almanac',hint:'请吉日于女氏之庙，惟先人所命。'},
  {step:'亲迎',item:'veil',hint:'婿执雁入，登车亲迎。盖头一落，生死同穴。'},
];
export const ZHAOMU=[
  {name:'德',slot:3,note:'始祖居中不迁'},
  {name:'維',slot:2,note:'昭第一'},
  {name:'懋',slot:4,note:'穆第一'},
  {name:'本',slot:1,note:'昭第二'},
  {name:'以',slot:5,note:'穆第二'},
  {name:'紹',slot:0,note:'昭第三'},
  {name:'厥',slot:6,note:'穆第三'},
];
export const GONGCHE={'上':'宫','尺':'商','工':'角','凡':'徵','六':'羽','乙':'少宫'};
export const TALI_TEMPLATE=[[.2,.06],[.5,.03],[.8,.06],[.62,.16],[.38,.16],[.5,.26],
  [.5,.34],[.28,.42],[.5,.5],[.72,.58],[.5,.66],[.34,.76],[.5,.86],[.66,.96]];

export class Panels{
  constructor(app){
    this.app=app;this.root=$('#panelRoot');this.inner=$('#panelInner');
    this.isOpen=false;this.current=null;
  }
  show({title,sub='',mount,wide=false,onClose}){
    if(this.isOpen)this.close(true);
    this.isOpen=true;
    this.app.input.exitLock();
    this.root.classList.remove('hidden');
    this.inner.style.maxWidth=wide?'1060px':'840px';
    this.inner.innerHTML='';
    this.inner.appendChild(el('div','p-title',title));
    if(sub)this.inner.appendChild(el('div','p-sub',sub));
    const body=el('div','p-body');this.inner.appendChild(body);
    const note=el('div','p-note');this.inner.appendChild(note);
    this._note=note;
    const close=el('button','p-close','合 [Esc]');
    close.onclick=()=>this.close();this.inner.appendChild(close);
    this.current={title,body,onClose};
    this.app.syncUi();
    mount&&mount(body);
  }
  close(silent){
    if(!this.isOpen)return;
    const cb=this.current&&this.current.onClose;
    this.isOpen=false;this.current=null;this._note=null;
    this.root.classList.add('hidden');
    this.inner.innerHTML='';
    if(!silent)this.app.input.requestLock();
    this.app.syncUi();
    cb&&cb();
  }
  note(msg,err){
    if(this._note){
      this._note.textContent=msg||'';
      this._note.classList.toggle('err',!!err);
    }
    if(err){
      this.inner.classList.remove('shake');void this.inner.offsetWidth;this.inner.classList.add('shake');
      this.app.state.addDread(6);this.app.audio.sting('fail');
    }
    return this;
  }
  win(id,data){
    this.app.audio.sting('success');
    this.note('—— 机关动了 ——');
    setTimeout(()=>{this.close();data&&data.onWin&&data.onWin(id);},720);
  }

  /* ============ P1 六礼上供（喜堂供桌）============ */
  liuLi(data){
    const app=this.app,S=app.state;
    const owned=LIU_LI.filter(l=>S.has(l.item));
    if(!owned.length){app.hud.toast('供桌前空空如也，六件聘礼一件也没有','bad');return;}
    const slots=Array(6).fill(null);
    this.show({title:'行 六 礼',wide:true,
      sub:'《仪礼·士昏礼》：昏礼下达，纳采用雁。<br>六礼不备，谓之「奔」；冥婚六礼不备，谓之<b>「无主之鬼」</b>。<br>按<b>礼之先后</b>，把聘礼依次放上供桌 —— 从「壹」起，一件一按。',
      mount:(body)=>{
        const win=(...a)=>this.win(...a),note=(...a)=>this.note(...a);
        const grid=el('div','bowls');body.appendChild(grid);
        const bag=el('div','bag');body.appendChild(bag);
        const foot=el('div','p-foot');body.appendChild(foot);
        [...grid.children];
        LIU_LI.forEach((l,i)=>{
          const b=el('div','bowl');
          b.oncontextmenu=(e)=>{e.preventDefault();
            for(let k=5;k>=0;k--)if(slots[k]){S.give(slots[k]);slots[k]=null;break;}
            draw();};
          grid.appendChild(b);
        });
        foot.appendChild(el('button','pbtn','合 礼')).onclick=()=>{
          if(slots.some(x=>!x)){note('六礼未齐。缺一样，她就永远是个「未嫁之鬼」。',true);return;}
          const wrong=slots.filter((x,i)=>x!==LIU_LI[i].item).length;
          if(wrong){note(`错了 ${wrong} 处。礼不可乱 —— 乱了要折寿。`,true);
            slots.forEach(x=>x&&S.give(x));slots.fill(null);draw();return;}
          slots.forEach(x=>S.take(x));
          win('liuli',data);
        };
        const clr=el('button','pbtn sm','撤 供');
        clr.onclick=()=>{slots.forEach(x=>x&&S.give(x));slots.fill(null);draw();};
        foot.appendChild(clr);
        const hint=el('div','ink-card');hint.style.marginTop='18px';
        hint.innerHTML=LIU_LI.map(l=>`<b>${l.step}</b> —— ${l.hint}`).join('<br>');
        body.appendChild(hint);
        function draw(){
          [...grid.children].forEach((b,i)=>{
            const id=slots[i],it=id?ITEMS[id]:null;
            b.innerHTML=`<span class="idx">${'壹贰叁肆伍陆'[i]}</span>`+
              (it?`<span style="font-size:32px">${it.g}</span><span style="font-size:12px">${it.n}</span>`
                 :`<span style="opacity:.4;font-size:12px">虚位<br>以待</span>`);
            b.classList.toggle('done',!!it);
          });
          bag.innerHTML='';
          const have=LIU_LI.filter(l=>S.has(l.item)&&!slots.includes(l.item));
          have.forEach(l=>{
            const it=ITEMS[l.item];
            const b=el('div','b',`<b style="font-size:19px">${it.g}</b> ${it.n}`);
            b.title=it.d;
            b.onclick=()=>{
              const k=slots.indexOf(null);
              if(k<0){note('六个位子都占了。右键可撤。');return;}
              slots[k]=l.item;S.take(l.item);
              app.audio.woodfish({gain:.14});draw();
            };
            bag.appendChild(b);
          });
          if(!have.length)bag.appendChild(el('div','','<span style="opacity:.45;font-size:13px">（囊中已无聘礼）</span>'));
        }
        draw();
      }});
  }

  /* ============ P2 五行方色灯阵（祠堂）============ */
  wuxing(data){
    const app=this.app;
    const dirs=['東','南','中','西','北'];
    const colors=['青','赤','黄','白','黑'];
    const st={},cells={};
    dirs.forEach(d=>st[d]={color:null});
    let phase=0,ignite=[];
    const win=(...a)=>this.win(...a),note=(...a)=>this.note(...a);
    this.show({title:'五 方 灯 阵',wide:true,
      sub:'祠堂五盏素灯，先依<b>五方正色</b>染之，再依<b>五行相生之序</b>点之。<br>『东青·木　南赤·火　中黄·土　西白·金　北黑·水』<br>相生：木生火，火生土，土生金，金生水。<b>阵起于所生，不止于所始。</b>',
      mount:(body)=>{
        const g=el('div','wuxing');body.appendChild(g);
        const pos={'南':[0,1],'東':[1,0],'中':[1,1],'西':[1,2],'北':[2,1]};
        dirs.forEach(d=>{
          const cell=el('div','wl');
          const[r,c]=pos[d];
          cell.style.gridColumn=c+1;cell.style.gridRow=r+1;
          cell.innerHTML=`<span class="dir">${d} · ${WUXING[d].el}</span>`;
          cell.appendChild(el('i','lan'));
          cell.dataset.dir=d;
          cells[d]=cell;
          cell.onclick=()=>{
            const lan=cell.querySelector('.lan');
            if(phase===0){
              const i=colors.indexOf(st[d].color);
              st[d].color=colors[(i+1)%5];
              const hex=byColor(st[d].color).hex;
              lan.style.background=hex;lan.style.color=hex;
              cell.classList.add('lit');
              app.audio.woodfish({gain:.16});
            }else{
              if(ignite.includes(d)||!st[d].color)return;
              ignite.push(d);
              app.audio.bell(440+ignite.length*88,{dur:1.3,gain:.13});
              cell.classList.add('lit');cell.style.boxShadow='0 0 26px 6px '+byColor(st[d].color).hex;
              check();
            }
          };
          g.appendChild(cell);
        });
        const foot=el('div','p-foot');body.appendChild(foot);
        const go=el('button','pbtn','染定 · 启阵');foot.appendChild(go);
        const rb=el('button','pbtn sm','重染');foot.appendChild(rb);
        go.onclick=()=>{
          const bad=dirs.filter(d=>st[d].color!==WUXING[d].color);
          if(bad.length){note(`方色不合者 ${bad.length} 盏。灯是给人点的，不是给鬼点的。`,true);return;}
          phase=1;ignite=[];
          note('色已合。现在按相生之序点灯 —— 第一盏该点哪一方？');
          go.textContent='点 灯 中 …';
        };
        rb.onclick=()=>{phase=0;ignite=[];
          dirs.forEach(d=>{st[d].color=null;const c=cells[d];c.classList.remove('lit');
            c.style.boxShadow='';c.querySelector('.lan').style.background='#4a3a2a';});
          go.textContent='染定 · 启阵';note('');};
        function check(){
          if(ignite.length<5)return;
          const want=SHENG_ORDER.map(e=>byEl(e).dir);
          if(ignite.join(',')===want.join(',')){win('wuxing',data);}
          else{
            ignite=[];phase=0;
            dirs.forEach(d=>{cells[d].classList.remove('lit');cells[d].style.boxShadow='';
              if(st[d].color)cells[d].classList.add('lit');});
            note('次序错了。灯灭的一瞬，有什么在梁上笑。',true);
            app.hud.whisper('你不会这个，是不是');
          }
        }
        body.appendChild(el('div','ink-card',
          '<b>祠堂碑记</b>：『五方正色，所以辨方位、分尊卑。』<br>'+
          '<b>族谱卷首</b>：『生数：水一、火二、木三、金四、土五。成数各加五。』<br>'+
          '<span style="opacity:.66">相生者，木火土金水 —— 与「生数」的大小次序并不是一回事。</span>'));
      }});
  }

  /* ============ P3 牌位昭穆（祠堂）============ */
  tablets(data){
    const app=this.app;
    const slots=Array(7).fill(null);
    let picked=null;
    const names=['昭三','昭二','昭一','始祖','穆一','穆二','穆三'];
    const win=(...a)=>this.win(...a),note=(...a)=>this.note(...a);
    this.show({title:'昭 穆 序',wide:true,
      sub:'七主失序，倒悬者三年。<br>《礼记》：『<b>左昭右穆</b>』—— 父昭则子穆，孙复为昭。<br>字辈诗：<b>德維懋本　以紹厥宗　長夜將旦　勿忘我生</b>',
      mount:(body)=>{
        const row=el('div','tblants');body.appendChild(row);
        const slotEls=[];
        for(let i=0;i<7;i++){
          const s=el('div','tb slot');
          s.onclick=()=>{
            if(!picked){note('先择一主。');return;}
            const k=slots.indexOf(picked);if(k>=0)slots[k]=null;
            slots[i]=picked;picked=null;app.audio.woodfish({gain:.13});draw();
          };
          s.oncontextmenu=(e)=>{e.preventDefault();slots[i]=null;draw();};
          row.appendChild(s);slotEls.push(s);
        }
        const tr=el('div','tblants');tr.style.marginTop='20px';body.appendChild(tr);
        const foot=el('div','p-foot');body.appendChild(foot);
        foot.appendChild(el('button','pbtn','奉主归位')).onclick=()=>{
          if(slots.some(x=>!x)){note('尚有空位。祖宗不能悬在半空。',true);return;}
          const wrong=slots.filter((n,i)=>n!==ZHAOMU.find(z=>z.slot===i).name).length;
          if(!wrong){
            app.audio.drum({gain:.4});
            app.audio.melody(['徵','羽','少宫'],{gap:.22,gain:.3});
            win('tablets',data);
          }else{
            note(`错位 ${wrong} 张 —— 夜里便会有 ${wrong} 位来寻你。`,true);
            app.hud.whisper('我的位子不是那儿');
          }
        };
        const cl=el('button','pbtn sm','打翻');cl.onclick=()=>{slots.fill(null);picked=null;draw();};
        foot.appendChild(cl);
        body.appendChild(el('div','ink-card',
          '<b>神龛侧刻</b>：『居中者不迁。其下以次：昭居<b>左</b>，穆居<b>右</b>，代不移序。<br>子昭则孙穆，曾孙复昭 —— 左右者，阴阳之路也。』<br>'+
          '<span style="opacity:.66">注：图面之「左」即屏幕之左，乃昭位；自始祖而言，孙列于左。</span>'));
        function draw(){
          slotEls.forEach((s,i)=>{
            s.innerHTML=slots[i]?`<b style="color:#e3cf9c">${slots[i]}</b>`:`<span style="opacity:.45">${names[i]}</span>`;
            s.style.background=slots[i]?'#241708':'';
            s.style.color=slots[i]?'#e3cf9c':'';
          });
          tr.innerHTML='';
          ZHAOMU.filter(z=>!slots.includes(z.name)).forEach(z=>{
            const t=el('div','tb',z.name);
            t.style.background=picked===z.name?'#8c1611':'#d6c49a';
            t.style.color=picked===z.name?'#f5e2b8':'#2b1d10';
            t.title=z.note;
            t.onclick=()=>{picked=z.name;draw();note('已择「'+z.name+'」—— 再点一个位次。');};
            tr.appendChild(t);
          });
        }
        draw();
      }});
  }

  /* ============ P4 井栏杆秤（天井）============ */
  steelyard(data){
    const app=this.app;
    const TARGET=13;
    const on=new Set();
    const win=(...a)=>this.win(...a),note=(...a)=>this.note(...a);
    this.show({title:'轱轳 · 杆秤',
      sub:'井辘轳锈死，绳断在第三股。须以<b>五石</b>为权，称出与石匣等重之数，坠开机关。<br>柜签：<b>「石匣一具，重十三两」</b>。五石以方色为名，其重依<b>生数</b>。',
      mount:(body)=>{
        const wrap=el('div','scale-wrap');body.appendChild(wrap);
        const beam=el('div');
        beam.style.cssText='position:absolute;left:20px;right:20px;top:78px;height:8px;transform-origin:50% 50%;transition:transform .6s cubic-bezier(.3,1.5,.4,1);background:linear-gradient(90deg,#7a5a2c,#a9853f)';
        const pivot=el('div','pivot');
        const left=el('div','hanger','<div class="box">13<br>两</div><div>石匣</div>');
        left.style.cssText+=';left:34px;top:30px';
        const right=el('div','hanger','<div class="box">0<br>两</div><div>五石</div>');
        right.style.cssText+=';right:34px;top:30px';
        wrap.append(beam,pivot,left,right);
        const chips=el('div','chips');body.appendChild(chips);
        const foot=el('div','p-foot');body.appendChild(foot);
        foot.appendChild(el('button','pbtn','坠 之')).onclick=()=>{
          const t=[...on].reduce((a,c)=>a+byColor(c).sheng,0);
          if(t===TARGET){app.audio.creak();app.audio.drum({gain:.3});win('steelyard',data);}
          else if(t<TARGET){note('轻了，坠不动。',true);beam.style.transform='rotate(22deg)';}
          else{note('重了。井里有东西正往上浮 —— 那不是匣子。',true);beam.style.transform='rotate(-22deg)';
            app.hud.whisper('下来陪我嘛');}
        };
        ['青','赤','黄','白','黑'].forEach(c=>{
          const v=byColor(c);
          const b=el('div','chip',`${c}石`);
          b.style.borderLeft='7px solid '+v.hex;
          b.onclick=()=>{on.has(c)?on.delete(c):on.add(c);b.classList.toggle('on');
            app.audio.guzheng(v.sheng*70+160,{gain:.2,dur:.7});sum();};
          chips.appendChild(b);
        });
        function sum(){
          const t=[...on].reduce((a,c)=>a+byColor(c).sheng,0);
          right.querySelector('.box').innerHTML=t+'<br>两';
          beam.style.transform=`rotate(${(TARGET-t)*1.7}deg)`;
          note(`右盘 ${t} 两 ／ 左盘 ${TARGET} 两`);
        }
        body.appendChild(el('div','ink-card',
          '<b>药柜总纲</b>：『生数：水一、火二、木三、金四、土五。成数各加五。』<br>'+
          '『方色：东青、南赤、中黄、西白、北黑。』<br>'+
          '<span style="opacity:.66">故青石重三两，赤石二两，黄石五两，白石四两，黑石一两。</span>'));
        sum();note('');
      }});
  }

  /* ============ P5 五运配药（西厢药柜）============ */
  herbs(data){
    const app=this.app;
    const CASES=[
      {id:'a',sx:'两胁胀满，怒则气上，目赤而痛',el:'木'},
      {id:'b',sx:'心烦不寐，口苦，喜笑不休',el:'火'},
      {id:'c',sx:'腹胀不化，四肢沉重，思虑不解',el:'土'},
      {id:'d',sx:'咳逆，悲忧不胜，皮毛枯槁',el:'金'},
      {id:'e',sx:'腰冷如冰，恐则气下，二便失禁',el:'水'},
    ];
    const TASTES=['酸','苦','甘','辛','咸'];
    const pick={};
    const win=(...a)=>this.win(...a),note=(...a)=>this.note(...a);
    this.show({title:'五 运 配 药',wide:true,
      sub:'柜上悬一帖：「魂不虚亦不实 —— <b>泻其所不胜</b>。」<br>五症各选一<b>味</b>。所谓「所不胜」，即<b>克我者</b>。<br>《难经》：「东方实，西方虚，泻南方，补北方。」',
      mount:(body)=>{
        CASES.forEach((c,i)=>{
          const line=el('div','ink-card herb-row');
          line.innerHTML=`<div style="flex:1"><b style="color:#7d1108">${'甲乙丙丁戊'[i]}诊</b>　${c.sx}　<span style="opacity:.55">（病在${c.el}）</span></div>`;
          const chips=el('div','chips');
          TASTES.forEach(t=>{
            const b=el('div','chip'+(pick[c.id]===t?' on':''),t);
            b.onclick=()=>{pick[c.id]=t;
              [...chips.children].forEach(x=>x.classList.toggle('on',x.textContent===t));
              app.audio.guzheng(200+i*46,{gain:.18,dur:.9});};
            chips.appendChild(b);
          });
          line.appendChild(chips);body.appendChild(line);
        });
        const foot=el('div','p-foot');body.appendChild(foot);
        foot.appendChild(el('button','pbtn','开 方')).onclick=()=>{
          if(Object.keys(pick).length<5){note('五症未齐。',true);return;}
          const wrong=CASES.filter(c=>byTaste(pick[c.id]).el!==KE_ON[c.el]).length;
          if(!wrong){
            app.state.give('cinnabar');app.state.give('brush');app.state.give('blanktal');
            app.hud.renderInv();
            note('得朱砂一封、狼毫一支、空符纸三张。');
            win('herbs',data);
          }else{
            note(`${wrong} 味反了。「所不胜」是克我者，不是我克者。`,true);
            app.hud.whisper('吃错了药，就永远醒不过来了');
          }
        };
        body.appendChild(el('div','ink-card',
          '<b>柜背小字</b>：『相克：<b>金克木，木克土，土克水，水克火，火克金</b>。』<br>'+
          '『五味属行：酸入木、苦入火、甘入土、辛入金、咸入水。』<br>'+
          '<span style="opacity:.66">示例：病在木，木之所不胜者金也，故泻金 —— 金味为辛。</span>'));
      }});
  }

  /* ============ P6 铜镜光路（暗窖）============ */
  mirrors(data){
    const app=this.app,N=7;
    const init={'2,3':'\\','2,1':'\\','5,1':'/'};
    const decoy={'4,5':'/'};
    const state={...init,...decoy};
    const locked=new Set(['4,5']);
    const blocks=new Set(['4,3','1,5','3,6','6,2']);
    const src={c:0,r:3},target={c:5,r:5};
    const win=(...a)=>this.win(...a);
    this.show({title:'引 魂 光 路',
      sub:'窖中无灯。以烛为源，转动三面<b>活镜</b>，把光引到镇魂匣上。<br>点镜面转向（／ ↔ ＼）。灰镜已铸死，不可转。',
      wide:true,
      mount:(body)=>{
        const g=el('div','mgrid mirror-grid');
        g.style.setProperty('--cols',N);body.appendChild(g);
        const cells={};
        for(let r=0;r<N;r++)for(let c=0;c<N;c++){
          const key=`${c},${r}`;
          const cell=el('div','mcell');
          cell.style.gridColumn=c+1;cell.style.gridRow=r+1;
          if(blocks.has(key)){
            cell.style.background='#0a0705';
            cell.innerHTML='<span style="color:#332417;display:grid;place-items:center;height:100%;font-size:12px">砖</span>';
          }else if(state[key]!==undefined){
            const m=el('div','mir',state[key]);
            if(locked.has(key)){m.style.opacity=.4;m.style.cursor='not-allowed';}
            else m.onclick=()=>{state[key]=state[key]==='/'?'\\':'/';m.textContent=state[key];run();
              app.audio.bell(1250,{dur:.5,gain:.07});};
            cell.appendChild(m);
          }else if(c===src.c&&r===src.r){
            cell.style.background='#3a2410';
            cell.innerHTML='<span style="color:#ffd479;display:grid;place-items:center;height:100%">烛</span>';
          }else if(c===target.c&&r===target.r){
            cell.style.background='#2a0d0a';
            cell.innerHTML='<span style="color:#e0655c;display:grid;place-items:center;height:100%">匣</span>';
          }
          g.appendChild(cell);cells[key]=cell;
        }
        body.appendChild(g);
        body.appendChild(el('div','p-note','『／』使东西折为南北；『＼』反之。'));
        function run(){
          Object.values(cells).forEach(c=>c.classList.remove('beam'));
          let c=src.c,r=src.r,dc=1,dr=0;
          const lit=new Set([`${c},${r}`]);
          for(let steps=0;steps<80;steps++){
            const key=`${c},${r}`;
            if(state[key]!==undefined){
              const m=state[key];
              const nd=m==='/'?[-dr,-dc]:[dr,dc];
              dc=nd[0];dr=nd[1];
            }
            c+=dc;r+=dr;
            if(c<0||r<0||c>=N||r>=N)return false;
            const k2=`${c},${r}`;
            if(blocks.has(k2))break;
            lit.add(k2);
            if(c===target.c&&r===target.r){
              lit.forEach(k=>cells[k]&&cells[k].classList.add('beam'));
              app.audio.bell(1760,{dur:2.4,gain:.2});
              win('mirrors',data);
              return true;
            }
          }
          lit.forEach(k=>cells[k]&&cells[k].classList.add('beam'));
          return false;
        }
        run();
      }});
  }

  /* ============ P7 工尺谱（戏楼）============ */
  gongche(data){
    const app=this.app;
    const SEQ=['徵','羽','角','宫','商','羽'];
    const NAMES=['宫','商','角','徵','羽','少宫'];
    let input=[],listens=3;
    const win=(...a)=>this.win(...a),note=(...a)=>this.note(...a);
    this.show({title:'工尺谱 · 寻魂',
      sub:'香绫的戏唱到一半就断了。板上有谱，末句被血糊住。<br>听，把六个音补全。每听一遍，她的目光便近一寸。',
      wide:true,
      mount:(body)=>{
        const track=el('div','track');body.appendChild(track);
        const notes=el('div','notes');body.appendChild(notes);
        const foot=el('div','p-foot');body.appendChild(foot);
        const play=el('button','pbtn','听 一 遍');foot.appendChild(play);
        const clr=el('button','pbtn sm','重 来');foot.appendChild(clr);
        NAMES.forEach(n=>{
          const b=el('div','note',n);
          b.onclick=()=>{
            if(input.length>=6)return;
            input.push(n);app.audio.playNote(n,{dur:1.2,gain:.4});draw();
            if(input.length===6){
              if(input.every((x,i)=>x===SEQ[i]))win('gongche',data);
              else{input=[];draw();
                note('板眼不合。她冷笑了一声：「外行。」',true);
                app.hud.whisper('你连我的戏都听不全');}
            }
          };
          notes.appendChild(b);
        });
        play.onclick=()=>{
          if(listens<=0){note('没有那么多遍给你听。',true);return;}
          listens--;draw();
          SEQ.forEach((n,i)=>setTimeout(()=>app.audio.playNote(n,{dur:1.4,gain:.42}),i*420));
        };
        clr.onclick=()=>{input=[];draw();note('');};
        function draw(){
          track.innerHTML='';
          for(let i=0;i<6;i++){
            const p=el('div','pip',input[i]||'');
            if(i===input.length)p.style.cssText='border:2px solid #8c1108';
            track.appendChild(p);
          }
          note('');
          foot.querySelector('.pbtn').textContent=`听 一 遍（余 ${listens}）`;
        }
        body.appendChild(el('div','ink-card',
          '<b>戏本夹页</b>：『工尺配五音：<b>上=宫，尺=商，工=角，凡=徵，六=羽，乙=少宫</b>。』<br>'+
          '<span style="opacity:.66">板上只余一句白：「凡起六落，中间三转 —— 照谱听音，莫以意度。」</span>'));
        draw();
      }});
  }

  /* ============ P8 符咒一笔（道具制作）============ */
  talisman(data){
    const app=this.app;
    const W=240,H=380;
    const win=(...a)=>this.win(...a),note=(...a)=>this.note(...a);
    this.show({title:'安 神 符',
      sub:'一笔到底，不可断，不可回。朱砂已研，笔已润。<br>烛尽则散 —— 你有<b>十四息</b>。',
      mount:(body)=>{
        const wrap=el('div','tal-wrap');
        const cv=el('canvas');cv.id='talCanvas';cv.width=W;cv.height=H;wrap.appendChild(cv);
        const ghost=el('canvas');ghost.width=W;ghost.height=H;
        ghost.className='tal-ghost';
        wrap.appendChild(ghost);body.appendChild(wrap);
        const gg=ghost.getContext('2d');
        gg.strokeStyle='#8c1611';gg.lineWidth=9;gg.lineCap='round';gg.lineJoin='round';gg.setLineDash([10,8]);
        gg.beginPath();TALI_TEMPLATE.forEach(([x,y],i)=>i?gg.lineTo(x*W,y*H):gg.moveTo(x*W,y*H));gg.stroke();
        const foot=el('div','p-foot');body.appendChild(foot);
        let show=true;
        const rev=el('button','pbtn sm','隐去样张');
        rev.onclick=()=>{show=!show;ghost.style.opacity=show?.26:0;rev.textContent=show?'隐去样张':'再看一眼';};
        const go=el('button','pbtn','成 符');
        foot.append(rev,go);body.appendChild(foot);
        const ctx=cv.getContext('2d');
        ctx.strokeStyle='#b23a2a';ctx.lineWidth=7;ctx.lineCap='round';ctx.lineJoin='round';
        let pts=[],drawing=false,left=14,dead=false;
        const timer=setInterval(()=>{
          if(dead||!cv.parentNode){clearInterval(timer);return;}
          left-=.1;
          ctx.clearRect(0,0,W,H);
          ctx.fillStyle='rgba(125,17,8,.85)';
          ctx.fillRect(3,H-8-(H-16)*Math.max(0,left)/14,5,(H-16)*Math.max(0,left)/14);
          ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
          if(left<=0){dead=true;clearInterval(timer);
            note('烛尽了。符成了废纸。',true);app.state.addDread(9);
            setTimeout(()=>this.isOpen&&this.close(),900);}
        },100);
        const getP=e=>{const r=cv.getBoundingClientRect();
          const sx=e.touches?e.touches[0].clientX:e.clientX, sy=e.touches?e.touches[0].clientY:e.clientY;
          return[(sx-r.left)/r.width*W,(sy-r.top)/r.height*H];};
        const dn=e=>{e.preventDefault();if(dead)return;drawing=true;pts=[getP(e)];};
        const mv=e=>{if(!drawing||dead)return;pts.push(getP(e));
          if(pts.length>3){const a=pts[pts.length-2],b=pts[pts.length-1];
            if(Math.hypot(a[0]-b[0],a[1]-b[1])<2.4)pts.pop();}};
        const up=()=>{drawing=false;};
        cv.addEventListener('mousedown',dn);cv.addEventListener('mousemove',mv);
        window.addEventListener('mouseup',up);
        cv.addEventListener('touchstart',dn,{passive:false});
        cv.addEventListener('touchmove',mv,{passive:false});cv.addEventListener('touchend',up);
        go.onclick=()=>{
          if(dead)return;
          dead=true;clearInterval(timer);
          const s=grade();
          if(s>=60){note(`符成。得 ${Math.round(s)} 分。`);setTimeout(()=>win('talisman',data),420);}
          else{note(`不成符（${Math.round(s)} 分）。朱砂白费了。`,true);app.state.addDread(7);}
        };
        function resample(p,n){
          const out=[p[0]],segs=[];let total=0;
          for(let i=1;i<p.length;i++){const d=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);segs.push(d);total+=d;}
          if(total<=0)return out;
          const step=total/(n-1);let acc=0,si=0;
          for(let k=1;k<n;k++){
            const tgt=k*step;
            while(si<segs.length-1&&acc+segs[si]<tgt){acc+=segs[si];si++;}
            const t=(tgt-acc)/(segs[si]||1);
            const a=p[si],b=p[si+1]||p[si];
            out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
          }
          return out;
        }
        function grade(){
          if(pts.length<14)return 0;
          const mine=resample(pts,TALI_TEMPLATE.length);
          if(mine.length<TALI_TEMPLATE.length)return 0;
          const tmpl=TALI_TEMPLATE.map(([x,y])=>[x*W,y*H]);
          let err=0;
          for(let i=0;i<tmpl.length;i++)err+=Math.hypot(mine[i][0]-tmpl[i][0],mine[i][1]-tmpl[i][1]);
          const mean=err/tmpl.length;
          return Math.max(0,Math.min(100,100-mean*1.55));
        }
        body.appendChild(el('div','ink-card',
          '<b>符诀残页</b>：『凡画安神符，先运魁罡于指上。<br>起于<b>西北天门</b>，历<b>三台</b>而上，落<b>鬼足</b>于下，一气呵成。<br>笔断则气断，气断则鬼入。』'));
      }});
  }

  /* ============ P9 盖头灯谜（绣楼）============ */
  riddle(data){
    const app=this.app;
    const Q=[
      {q:'一口咬掉牛尾巴',opts:['告','吉','浩','靠'],a:'告'},
      {q:'千里相逢',opts:['马','重','量','野'],a:'重'},
      {q:'人在口中，出不去，也死不了',opts:['囚','因','团','回'],a:'囚'},
    ];
    let idx=0,right=0;
    const win=(...a)=>this.win(...a),note=(...a)=>this.note(...a);
    this.show({title:'盖 头 下 的 谜',
      sub:'老例：新郎须在盖头前猜三道灯谜，方可揭帖。<br>猜错者 —— 由<b>她</b>揭你。',
      mount:(body)=>{
        const q=el('div','riddle-q');body.appendChild(q);
        const opts=el('div','opts');body.appendChild(opts);
        const st=el('div','p-note');body.appendChild(st);
        function draw(){
          if(idx>=Q.length){
            if(right>=3){win('riddle',data);return;}
            app.state.addDread(15);app.postfx.scream(.8);
            app.hud.whisper('猜错了 你就留下来替她');
            note(`只中 ${right} 道。盖头纹丝不动。`,true);
            idx=0;right=0;setTimeout(draw,900);return;
          }
          q.innerHTML=`<span style="font-size:13px;letter-spacing:.3em">其 ${'一二三'[idx]} 谜</span><br>${Q[idx].q}`;
          opts.innerHTML='';
          Q[idx].opts.forEach(o=>{
            const b=el('div','opt',o);
            b.onclick=()=>{
              if(o===Q[idx].a){right++;app.audio.bell(1046,{dur:1.1,gain:.15});idx++;draw();}
              else{app.state.addDread(7);app.audio.sting('fail');
                st.textContent='不对。她轻轻地笑了一声。';}
            };
            opts.appendChild(b);
          });
          st.textContent=`已中 ${right} / 3`;
        }
        draw();
        body.appendChild(el('div','ink-card',
          '<b>喜娘的话</b>：「公子，字谜这东西，<b>把字拆开来看</b>。<br>牛尾巴没了，是被什么咬掉的？<br>千里两处碰在一处，成了哪个字？人若钻进一个口里，又是个什么字？」'));
      }});
  }

  /* ============ P10 九宫门闩（洛书幻方）============ */
  jiugong(data){
    const app=this.app;
    const grid=Array(9).fill(null);
    let pick=null;
    const win=(...a)=>this.win(...a),note=(...a)=>this.note(...a);
    this.show({title:'九重门闩 · 九宫算',wide:true,
      sub:'宅门九闩，每闩一坑，坑旁刻一数。<br>《尚书大传》：<b>「戴九履一，左三右七，二四为肩，六八为足，五居中央。」</b><br>把一至九填入九宫，须<b>横、竖、斜皆得十五</b>，门才认你是「有理」出去的。',
      mount:(body)=>{
        const g=el('div','grid jiu-grid');body.appendChild(g);
        const tray=el('div','chips');body.appendChild(tray);
        const cells=[];
        for(let i=0;i<9;i++){
          const c=el('div','cell');
          c.onclick=()=>{
            if(pick===null){grid[i]=null;draw();return;}
            const k=grid.indexOf(pick);if(k>=0)grid[k]=null;
            grid[i]=pick;pick=null;app.audio.woodfish({gain:.12});draw();
            if(grid.every(x=>x))check();
          };
          g.appendChild(c);cells.push(c);
        }
        for(let n=1;n<=9;n++){
          const b=el('div','chip',String(n));
          b.onclick=()=>{pick=n;draw();};
          tray.appendChild(b);
        }
        body.appendChild(tray);
        const foot=el('div','p-foot');body.appendChild(foot);
        const cl=el('button','pbtn sm','清空');cl.onclick=()=>{grid.fill(null);pick=null;draw();};
        foot.appendChild(cl);
        const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        function check(){
          const bad=lines.filter(l=>!(grid[l[0]]&&grid[l[1]]&&grid[l[2]]&&
            grid[l[0]]+grid[l[1]]+grid[l[2]]===15)).length;
          if(!bad){app.audio.drum({gain:.5});win('jiugong',data);}
          else{note(`有 ${bad} 条线不合十五。门闩纹丝不动。`,true);app.state.addDread(9);}
        }
        function draw(){
          cells.forEach((c,i)=>{c.textContent=grid[i]||'';});
          [...tray.children].forEach(b=>b.classList.toggle('on',pick!==null&&String(pick)===b.textContent));
          const ok=lines.filter(l=>grid[l[0]]&&grid[l[1]]&&grid[l[2]]&&
            grid[l[0]]+grid[l[1]]+grid[l[2]]===15).length;
          note(`已成之线：${ok} / 8`);
        }
        draw();
      }});
  }
}
