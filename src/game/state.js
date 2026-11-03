/* =========================================================
   全局状态：flags / 囊中物 / 引魂簿 / 阴气 / 存档
   ========================================================= */
export const ITEMS={
  huozhe:{n:'火折子', g:'燭', d:'吹一口气就红的那一截。够点三炷香，不够点一盏人生。'},
  xiang:{n:'三炷香', g:'香', d:'香脚还带着别人的手温。在香炉前燃香，可定心神。'},
  woodgoose:{n:'木雁', g:'雁', d:'纳采用雁。死雁不可用，故以木代之——它飞不过阴阳两界。', li:'纳采'},
  longfeng:{n:'龙凤帖', g:'帖', d:'问名所用。上书两个生辰，一个属活人，一个属死人。', li:'问名'},
  coins:{n:'卜吉钱', g:'幣', d:'纳吉。三枚铜钱在龟甲里摇过，正面的次数不够。', li:'纳吉'},
  silkwool:{n:'束帛', g:'帛', d:'纳征。六尺玄纁，染的是缸里的水，也是别的什么。', li:'纳征'},
  almanac:{n:'择日历', g:'曆', d:'请期。朱笔圈了一夜，圈在「宜嫁娶」，也圈在「宜收魂」。', li:'请期'},
  veil:{n:'红盖头', g:'帕', d:'亲迎。盖上去便不能再掀开——规矩如此。', li:'亲迎'},
  silver_key:{n:'银钥匙', g:'钥', d:'井底捞上来的。齿上还缠着一缕头发。', k:'east'},
  gold_key:{n:'金钥匙', g:'钥', d:'祠堂五行灯阵开出。触之冰凉，凉得不像金属。', k:'west'},
  bronze_key:{n:'铜钥匙', g:'钥', d:'戏楼后台的锁钥。阮香绫贴身收了许多年。', k:'back'},
  genealogy:{n:'槐氏族谱', g:'譜', d:'卷一·昭穆。字辈：德維懋本 昭穆以承 長夜將旦 勿忘我生。'},
  hairpin:{n:'白玉簪', g:'簪', d:'女眷妆奁里的东西。簪头刻一个「绫」字。'},
  mirror_shard:{n:'破铜镜', g:'鏡', d:'照不出你的脸，只照得出她。'},
  talisman:{n:'安神符', g:'符', d:'朱砂画的一「敕」字。捏碎时她须退三步。'},
  blanktal:{n:'空符纸', g:'紙', d:'黄裱纸三张，尚待一笔。画成便是安神符。'},
  cinnabar:{n:'朱砂', g:'砂', d:'画符要用的。研得极细，红得极正。'},
  brush:{n:'狼毫笔', g:'筆', d:'笔锋尚润，像刚有人写过。'},
  nail:{n:'镇魂钉', g:'釘', d:'七枚，封在匣中。钉的不是棺，是名字。'},
  bonebox:{n:'骨殖匣', g:'匣', d:'小小一副骨架，摆成胎儿的姿势。'},
  weight:{n:'铜秤砣', g:'權', d:'杆秤缺了它便无用。上铸「二两」。'},
  rope:{n:'麻绳', g:'綬', d:'从井辘轳上解下来的，还湿着。'},
  score:{n:'工尺谱', g:'譜', d:'《牡丹亭·寻魂》一折。板眼齐全，唯独缺了末句。'},
  mask:{n:'戏面', g:'面', d:'旦角脸谱。内侧写着「香绫 年廿三」。'},
  red_thread:{n:'红头绳', g:'綬', d:'月老牵的那根。另一头系在井里。'},
  sutra:{n:'往生咒', g:'咒', d:'残卷。念到「度」字便没了下文。'},
  jade_ring:{n:'玉戒指', g:'環', d:'活人的聘礼。她等的是这个，又不是这个。'},
  list:{n:'喜娘账簿', g:'帳', d:'柳三娘的往来簿。记着十七桩阴亲的价。'},
  knifer:{n:'压襟刀', g:'刀', d:'割绳断发用。刃上有刻痕：「还」。'},
};
export const GHOSTLADY={
  wan:{name:'苏婉娘',glyph:'嬿',age:'年廿二',note:'殁于民国十七年八月十六，冥婚新娘'},
  liu:{name:'柳三娘',glyph:'媒',age:'年四十',note:'鬼媒人。操此业二十八年'},
  ling:{name:'阮香绫',glyph:'绫',age:'年廿三',note:'青衣旦。殁于戏台，仍未完戏'},
};

const DEFAULT_FLAGS={};
export class GameState{
  constructor(diff='hard'){
    this.diff=diff;
    this.flags={...DEFAULT_FLAGS};
    this.inv=[];
    this.sel=null;
    this.notes=[];      // {t,text,tag}
    this.goals=[];      // {t,text,done}
    this.dread=0;       // 阴气 0~100
    this.chapter=0;
    this.checkpoint={pos:[0,1.7,16.2],yaw:Math.PI,room:'hall'};
    this.time=0;
    this.deaths=0;
    this.puzzles={};    // 已完成谜题
    this.tokens=0;      // 门闩令
    this.liPlaced=[];   // 已上供桌的聘礼
    this.boltsOpen=0;
    this.trust={wan:0,liu:0,ling:0};
    this.seenCutscenes={};
  }
  set(k,v=true){this.flags[k]=v;return this;}
  get(k){return !!this.flags[k];}
  has(item){return this.inv.includes(item);}
  give(item,n=1){
    for(let i=0;i<n;i++)if(!this.inv.includes(item))this.inv.push(item);
    return item;
  }
  take(item){const i=this.inv.indexOf(item);if(i>=0)this.inv.splice(i,1);
    if(this.sel===item)this.sel=this.inv[0]||null;return i>=0;}
  note(text,tag='线'){if(this.notes.some(n=>n.text===text))return;this.notes.push({t:Math.floor(this.time),text,tag});}
  goal(text,done=false){
    const g=this.goals.find(x=>x.text===text);
    if(g){g.done=done;return g;}
    this.goals.push({t:Math.floor(this.time),text,done});return this.goals[this.goals.length-1];
  }
  completeGoal(text){const g=this.goal(text);g.done=true;}
  addDread(v){
    const mul=this.diff==='nightmare'?1.45:this.diff==='hard'?1:0.7;
    this.dread=Math.max(0,Math.min(100,this.dread+v*mul));
    return this.dread;
  }
  get dreadN(){return this.dread/100;}
  done(id){return !!this.puzzles[id];}
  solve(id,score=1){this.puzzles[id]={score,at:Math.floor(this.time)};
    this.tokens=Math.min(9,Object.values(this.puzzles).length);return this.tokens;}
  serialize(){
    return JSON.stringify({v:2,diff:this.diff,flags:this.flags,inv:this.inv,notes:this.notes,
      goals:this.goals,dread:this.dread,chapter:this.chapter,checkpoint:this.checkpoint,
      time:this.time,deaths:this.deaths,puzzles:this.puzzles,liPlaced:this.liPlaced,
      boltsOpen:this.boltsOpen,trust:this.trust,seen:this.seenCutscenes});
  }
  static deserialize(s){
    const o=JSON.parse(s);const g=new GameState(o.diff);
    Object.assign(g,{flags:o.flags,inv:o.inv,notes:o.notes,goals:o.goals,dread:o.dread,
      chapter:o.chapter,checkpoint:o.checkpoint,time:o.time,deaths:o.deaths,puzzles:o.puzzles||{},
      liPlaced:o.liPlaced||[],boltsOpen:o.boltsOpen||0,trust:o.trust||g.trust,seenCutscenes:o.seen||{}});
    return g;
  }
}
export const SAVE_KEY='yinhunzhai.save.v2';
