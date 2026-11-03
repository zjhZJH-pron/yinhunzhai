import {ITEMS} from './state.js';

/* =====================================================================
   引魂宅 · 红妆劫
   章节：0 入门 · 1 集礼 · 2 三厢 · 3 拔钉 · 4 婚成
   ===================================================================== */
export const STORY={
  open:[
    ['民国十七年 · 秋 · 八月十六'],['子时三刻'],
    ['你在槐宅门外醒来。身上是别人的长衫，袖口有朱砂。'],
    ['宅里正办一桩冥婚。','新娘尚未过门——'],
    ['<em>因为聘礼还缺一个活人。</em>'],
  ],
  reenter:[['你又推开了这道门。'],['这一次，她没有再等你。']],
  wakeup:[['你在香炉前醒来，指尖尚有灰。'],['香只多燃了半截。她仍在等你把礼行完。']],

  /* ---- 三女 ---- */
  wan_first:{who:'苏婉娘',glyph:'嬿',text:'「公子醒啦。」红盖头下先传出笑，再传出话，'
    +'『声音低而软，像有人贴着你耳朵吹凉了一碗合卺酒。』\n「我等了三年。三年里我给自己描了十九遍眉，没一遍像你回头看我的那一眼。」'},
  liu_1:{who:'柳三娘',glyph:'媒',text:'「哎哟——<em>活人</em>。」\n她倚在门框上，手里的红绳结转着圈，眼风先扫你的袖口，再扫你的腕子，最后停在你的脖子上，像量尺寸。\n'
    +'这一单我不估价。你肯听话，我便一路给你留灯。'},
  liu_bribe:{who:'柳三娘',glyph:'媒',text:'「想知道？」她把手背到身后，指缝里夹着一张纸钱。\n'
    +'拿东西换呀。或者——你怕一点也行，我怕寂寞，你越怕，我越近。'},
  ling_1:{who:'阮香绫',glyph:'绫',text:'台上那个人还吊着半口气。她转了个身，水袖扫过台沿，落下一层灰。\n'
    +'「神前的戏不能断。断在这儿，我就得一直美着，一直美到有人把我这一折听完。」\n「你听。你听着我就不疼了。」'},
  ling_done:{who:'阮香绫',glyph:'绫',text:'末句合上。她把脸上那张金箔揭下来，露出底下极干净的一张脸。\n'
    +'「多谢公子捧场。」\n「后台妆台上有一把钥。我带它许多年，一直没等到人跟我换。」'},
};

/* 柳三娘卖关子：以阴气为价，换一条真提示 */
export const HINTS=[
  {cost:12,give:'六礼顺序：纳采(雁)→问名(帖)→纳吉(幣)→纳征(帛)→请期(历)→亲迎(帕)。',
    when:s=>!s.done('liuli')},
  {cost:14,give:'方色：东青、南赤、中黄、西白、北黑。点灯次序按相生：木火土金水，即青赤黄白黑。',
    when:s=>!s.done('wuxing')},
  {cost:12,give:'昭穆：始祖居中，昭在左、穆在右，按字辈「德維懋本以紹厥」轮流排。',
    when:s=>!s.done('tablets')},
  {cost:10,give:'生数：水一火二木三金四土五。青石三两、赤石二两、黄石五两、白石四两、黑石一两；凑够十三两。',
    when:s=>!s.done('steelyard')},
  {cost:13,give:'「泻其所不胜」＝泻克我者。病在木→金→用辛；火→水→咸；土→木→酸；金→火→苦；水→土→甘。',
    when:s=>!s.done('herbs')},
  {cost:15,give:'镇魂匣只吃一道直光。三面活镜：先转西墙那两面，再转中间那面；铸死的灰镜不要碰。',
    when:s=>!s.done('mirrors')},
  {cost:11,give:'工尺：上＝宫 尺＝商 工＝角 凡＝徵 六＝羽。跟着琴音按六个字，别自己编。',
    when:s=>!s.done('gongche')},
  {cost:9,give:'字谜要把字拆开：牛去尾、口里有人、千里相合。',
    when:s=>!s.done('riddle')},
  {cost:16,give:'九宫：戴九履一，左三右七，二四为肩，六八为足，五居中央 —— 纵横斜皆十五。',
    when:s=>!s.done('jiugong')},
];

const BOLTS_PER_SOLVE=1;

/* ===================================================================== */
export function startGame(app,loaded){
  const S=app.state;
  if(!loaded){
    S.chapter=0;
    app.hud.setObjective('楔子 · 门 外','在喜堂里寻到火与香，弄明白今夜娶的是谁。');
    S.goal('在天亮前离开槐宅');
    S.goal('查清六礼缺的是什么');
  }
  app.hud.updateJournal();
  advance(app,0);
}

function advance(app,n){
  const S=app.state;
  if(n<=S.chapter)return;
  S.chapter=n;
  const map={
    1:['第一折 · 集 礼','六礼缺一。走遍四厢，把聘礼一件件找回来。'],
    2:['第二折 · 三 厢','灯阵、绣楼、殡房 —— 三把锁，三样东西。'],
    3:['第三折 · 拔 钉','匣中名册十七个名字。最后一个栏位是空的。'],
    4:['第四折 · 婚 成','五更将至。门闩已松，只差一个「理」。'],
  };
  if(map[n]){app.hud.setObjective(...map[n]);curtain(app,[[map[n][0]],[map[n][1]]]);}
}

export function curtain(app,lines,cb){
  const el=document.getElementById('curtain'),t=document.getElementById('curtainText');
  el.classList.remove('hidden');t.innerHTML='';
  let i=0;
  const step=()=>{
    if(i>=lines.length){setTimeout(()=>{el.classList.add('hidden');cb&&cb();},1100);return;}
    const[l,extra]=lines[i];
    t.innerHTML=l;
    t.style.animation='none';void t.offsetWidth;t.style.animation='';
    app.audio.ready&&app.audio.guzheng(147+i*22,{dur:2.4,gain:.24});
    i++;
    setTimeout(step,extra?1600:2100);
  };
  step();
}

/* =====================================================================
   破题结算
   ===================================================================== */
export function applySolve(app,id){
  const S=app.state;
  S.boltsOpen=Math.min(9,S.boltsOpen+BOLTS_PER_SOLVE);
  app.audio.sting('reveal');
  app.hud.toast(`门闩松了一道（${S.boltsOpen}/9）`,'good');
  S.addDread(-8);
  const R={
    liuli(){S.addDread(6);
      note(app,'六礼既行，虚位已实。祠堂龛板后有响动。','机');
      app.hud.say({who:'苏婉娘',glyph:'嬿',
        text:'「五礼了。」她在供桌那头坐下来，嫁衣铺了一地，像一摊没干的红漆。\n「还差亲迎。亲迎要有你——」\n「公子，你听见龛板响了吗？我把祖宗的门敲开了。」'});
      advance(app,2);},
    wuxing(){
      if(!S.has('gold_key')){app.give&&app.give('gold_key');
        app.hud.toast('中宫灯下坠出一枚金钥','good');
        note(app,'灯阵开，殡房门落金钥一枚。','物');}
      advance(app,2);},
    tablets(){
      if(!S.has('genealogy'))app.give&&app.give('genealogy');
      if(!S.has('hairpin'))app.give&&app.give('hairpin');
      note(app,'龛板滑开，露出一格暗屉（镇魂匣）。西龛得白玉簪一支。','机');
      app.hud.toast('神龛暗格开了','good');
      advance(app,3);},
    steelyard(){
      note(app,'井坠机关松开。可以下井取物了。','机');},
    herbs(){
      note(app,'柜底暗屉得朱砂、狼毫、空符纸。可画安神符。','物');
      if(!S.has('xiang'))app.give&&app.give('xiang');},
    gongche(){
      triggerScripted(app,'ling_done');
      if(!S.has('bronze_key'))app.give&&app.give('bronze_key');
      note(app,'末句合上。阮香绫给了一把铜钥 —— 后台门能开了。','物');},
    riddle(){
      note(app,'三谜皆中。盖头架后露出一只玉戒指。','物');
      if(!S.has('jade_ring'))app.give&&app.give('jade_ring');
      S.addDread(9);
      app.hud.whisper('揭了盖头 你就得娶我');},
    mirrors(){
      note(app,'光落匣上，北斗钉自松。匣中是名册，不是魂魄。','判');
      advance(app,3);},
    talisman(){
      if(!S.has('talisman')){S.take('blanktal');S.take('cinnabar');app.give&&app.give('talisman');}
      note(app,'安神符一枚。捏碎时她须退三步。','物');},
    jiugong(){
      S.set('gateOpen');advance(app,4);
      finale(app);},
  };
  (R[id]||(()=>{}))();
  app.hud.renderInv();app.hud.updateJournal();
}
function note(app,t,tag){app.state.note(t,tag);app.hud.updateJournal();}

/* =====================================================================
   脚本事件
   ===================================================================== */
export function trigger(app,name){return triggerScripted(app,name);}

function triggerScripted(app,name){
  const S=app.state;
  if(S.seenCutscenes[name])return;
  const SC={
    noise(){
      S.seenCutscenes[name]=true;
      app.npc&&app.npc.summon('hall');
      app.hud.say({who:'苏婉娘',glyph:'嬿',
        text:'鼓声未落，喜堂的红绸便绷直了。\n「公子想得热闹？」她坐在高堂椅上，两条腿并得极齐，手叠在膝上，姿态端正得叫人发毛。\n「那正好。热闹了，才看得出谁是客人，谁是<b>礼</b>。」'});
    },
    seeDress(){
      S.seenCutscenes[name]=true;
      app.hud.say({who:'苏婉娘',glyph:'嬿',
        text:'「你喜欢大红么？」声音就从你耳后。\n「我量过你了。井水凉的量法，量得最准。」\n嫁衣在无风的院子里自己翻了个袖口。',speed:26});
      app.audio.whisper(-.4,1);app.postfx.scream(.4);
    },
    burnJoss(){
      S.seenCutscenes[name]=true;
      advance(app,1);
      app.hud.say({who:'柳三娘',glyph:'媒',
        text:'纸灰卷成一个小旋儿，旋儿里站出一个胖瘦合度的妇人，手上还搓着红线。\n「烧我的账簿，看得惯么？」她把账簿推回你胸口。\n「十七桩，我一张帖一张帖说成的。只有婉娘这一桩，主家要的<b>不是价</b>。」'});
      S.give('list');
    },
    seenPortrait(){
      S.seenCutscenes[name]=true;
      app.hud.say({who:'苏婉娘',glyph:'嬿',
        text:'「画上是十七岁的我。」\n她站到画前，比画里高半头，也比画里好看。\n「公子别嫌我老。这三年，我只能靠被人想起，才敢长一岁。」'});
      advance(app,1);
    },
    seenLiuPortrait(){
      S.seenCutscenes[name]=true;
      app.hud.say({who:'柳三娘',glyph:'媒',
        text:'「像上画得年轻了。」她在你背后打量那幅像，像在挑货。\n「我在这宅里说媒二十八年。死人好说，活人难说——」\n「活人<b>会跑</b>。」'});
      enableHints(app);
    },
    wellOpened(){
      S.seenCutscenes[name]=true;
      app.hud.say({who:'井 中',glyph:'？',
        text:'绳上有人在往下抹泥。你抬头，井口只有一圈青白的天。\n很轻的一声：「<b>钥匙拿走，绳子给我留一条</b>。」'});
    },
    stageEnter(){
      S.seenCutscenes[name]=true;
      app.hud.say({who:'阮香绫',glyph:'绫',
        text:'台上那人正唱到「寻魂」。她一个转身，眼风压着鼓点打过来。\n「好。又来了个听戏的。」\n「我这出戏缺一角 —— 缺个不走的。」'});
    },
    ling_done(){
      S.seenCutscenes['ling_end']=true;
      app.hud.say(STORY.ling_done);
    },
    enterEast(){
      S.seenCutscenes[name]=true;
      advance(app,2);
      app.npc&&app.npc.setMood('wan',.6);
    },
    mirrorFirst(){
      S.seenCutscenes[name]=true;
      app.hud.say({who:'苏婉娘',glyph:'嬿',
        text:'镜里没有人替你梳头 —— 只有她自己。她把簪子插进你影子的发里。\n「别急。等这出礼完了，我便让你看看，我到底有多好看。」'});
    },
    enterWest(){
      S.seenCutscenes[name]=true;
      advance(app,2);
    },
    openCoffin(){
      S.seenCutscenes[name]=true;
      app.hud.say({who:'苏婉娘',glyph:'嬿',
        text:'棺里没有我。\n「你以为冥婚是埋两个死人？」她隔着红绸按住你的手，掌心冰凉，力道却极活。\n「是要一个<b>不肯走的</b>。」'});
    },
    gotVeil(){
      S.seenCutscenes[name]=true;
      note(app,'红盖头已得 —— 亲迎之礼齐了。可上供桌行最后一步。','礼');
      advance(app,3);
    },
    nailsOut(){
      S.seenCutscenes[name]=true;
      advance(app,3);
      app.npc&&app.npc.setMood('wan',1);
      app.postfx.scream(.9);app.audio.jump();
      curtain(app,[['七钉落地，如七声更鼓。'],['祠堂里，红绸一根根自己直了。'],['<em>她终于肯以自己的名字见你。</em>']]);
      setTimeout(()=>app.hud.say(STORY.wan_first),2400);
    },
    hints:()=>{},
  };
  const f=SC[name];
  if(typeof f==='function')f();
}

/* =====================================================================
   柳三娘 · 卖关子（提示系统，以阴气为价）
   ===================================================================== */
export function enableHints(app){
  app.hintOn=true;
  app.hud.toast('柳三娘肯替你留灯了 —— 按 [G] 问她','good');
}
export function askHint(app){
  const S=app.state;
  if(!app.hintOn){
    triggerScripted(app,'seenLiuPortrait');
    if(!app.hintOn){app.hud.toast('没人应你。','bad');return;}
  }
  const pool=HINTS.filter(h=>h.when(S));
  if(!pool.length){app.hud.say({who:'柳三娘',glyph:'媒',
    text:'「没要紧的了。」她笑，「你要么全知道了，要么就要成亲了 —— 一样的，都不用问。」'});return;}
  const h=pool[Math.floor(Math.random()*pool.length)];
  S.addDread(h.cost);
  app.audio.guzheng(392,{dur:1.6,gain:.3});
  app.hud.say({who:'柳三娘',glyph:'媒',
    text:`她凑得极近，近到你能数清她睫毛上的粉。价目是<b>你心里那点火</b>。（阴气 +${h.cost}）\n「${h.give}」`});
  S.note('柳三娘告示：'+h.give,'示');app.hud.updateJournal();
}

/* =====================================================================
   终局
   ===================================================================== */
export function finale(app){
  const S=app.state;
  const hasAll=['woodgoose','longfeng','coins','silkwool','almanac','veil'].every(i=>S.liPlaced.includes(i));
  const freed=S.done('mirrors')&&S.get('nailsOut');
  S.seenCutscenes['gateOpen']=true;
  curtain(app,[['九闩尽落。门轴长吟。'],['门外五更天青，更夫梆子声由远而近。'],['门内 —— 她站在门槛的<b>里侧</b>，手里托着盖头。']],()=>{
    const opts=[];
    if(freed)opts.push({label:'接过盖头，一言不发地跨出门',go:()=>endEscape(app,hasAll)});
    opts.push({label:'替她把盖头戴上',risk:true,go:()=>endSubstitute(app,hasAll)});
    if(freed&&S.has('sutra'))opts.push({label:'念完那卷《往生咒》',go:()=>endTransfer(app,hasAll)});
    if(!opts.length)opts.push({label:'替她把盖头戴上',risk:true,go:()=>endSubstitute(app,hasAll)});
    app.hud.say({who:'苏婉娘',glyph:'嬿',
      text:freed
        ?'钉拔尽了，她反倒轻了。她把盖头托在胸前，眼睛亮得像刚洗过。\n「公子。门开着。风都进来了 ——」\n「可风一进来，我就得走了。你选。」'
        :'钉还在。她笑着，笑得脸很平。\n「你没拔钉，便算不得我自愿。可我不在意 ——」\n「<b>你反正在门里</b>。」',
      choices:opts});
  });
}

function endBody(app,kind,hasAll){
  const S=app.state;
  const E={
    escape:{k:'结 局 一',t:'出 门',
      b:hasAll
        ?'你跨出门时，六礼俱备 —— 冥婚不成，因为新娘无名。\n她替你把礼数凑齐了，自己做了那个「未嫁之鬼」。\n\n民国十七年后，槐宅焚于无人负责的火灾。灰里拾出两张帖：\n一张写你名，一张空白。'
        :'你逃出去了。身后喜乐大作，唢呐吹的是《得子》。\n\n此后每年八月十六，你家门上会挂一件洗得极干净的红衫。\n你没敢数那是一年一次，还是她来了一回。'},
    substitute:{k:'结 局 二',t:'替 嫁',
      b:'盖头落下的一瞬，你才明白：那件长衫的尺寸、盖头的量法、井里泡过的水袖 ——<br>宅子从头到尾准备的都是<b>你</b>。\n\n柳三娘的账簿添了一笔：<br>「活人一口。不估价。」\n\n五更，喜轿起。轿中人一动不动，红裳下摆露出一双男人的靴子。'},
    transfer:{k:'结 局 三 · 隐',t:'同 穴',
      b:'你念到「度」字，残卷在手里烧完了。\n\n她终于把名字还给自己的时候，天也亮了。<br>门开着，她站在门槛内侧，第一次不是红裳 —— 是白布素衣，头发散着，很平常的一个二十二岁的样子。\n\n「公子。」她福了一福，做得极标准。\n「我不留你了。我把自己嫁回我自己的名字上去。」\n\n你出门，她在身后点了三炷香 —— 给你的寿。'},
  };
  const e=E[kind];
  const el=document.getElementById('endscreen');
  document.getElementById('enKicker').textContent=e.k;
  document.getElementById('enTitle').textContent=e.t;
  document.getElementById('enBody').innerHTML=e.b.replace(/\n/g,'<br>');
  document.getElementById('btnResume').textContent='再 入 此 宅';
  el.classList.remove('hidden');
  app.dead=true;app.uiOpen=true;
  app.input.exitLock();
  app.audio.melody(['宫','角','徵','羽','少宫'],{gap:.55,gain:.34});
  app.audio.setDread(kind==='escape'?0:.6);
  S.note('【'+e.t+'】'+kind,'终');
  app.hud.updateJournal();
}
const endEscape=(app,h)=>endBody(app,'escape',h);
const endSubstitute=(app,h)=>endBody(app,'substitute',h);
const endTransfer=(app,h)=>endBody(app,'transfer',h);

/* =====================================================================
   夺舍 / 失败
   ===================================================================== */
export function soulLost(app){
  const S=app.state;
  S.deaths++;
  app.audio.jump();app.postfx.scream(1);
  const el=document.getElementById('endscreen');
  document.getElementById('enKicker').textContent='魂 散';
  document.getElementById('enTitle').textContent='灯 灭 了';
  document.getElementById('enBody').innerHTML=
    '你的魂灯烧到底了。<br>'+
    (S.deaths%2?'最后看见的是自己的手 —— 那只手在替你理鬓角。'
      :'你醒来时，喜堂上多了一个拜天地的人。穿的是你的长衫。')+
    '<br><br><span style="opacity:.6">阴气 -40 · 从香炉前重新起身。机关不会白破。</span>';
  document.getElementById('btnResume').textContent='自 香 炉 前 醒 来';
  el.classList.remove('hidden');
  app.dead=true;app.syncUi();app.input.exitLock();
  S.addDread(-40);
}
