import * as THREE from 'three';
import {ITEMS} from './state.js';
import {LIU_LI} from '../ui/panels.js';
import {applySolve,trigger} from './story.js';

/* =====================================================================
   交互登记：全屋物件以「点位 + 半径 + 视锥」拾取
   ===================================================================== */
export function registerInteractives(app){
  const A=app.manor.anchors,S=app.state;
  app.interactives.length=0;

  const give=(id,msg)=>{
    if(S.has(id))return false;
    S.give(id);
    const it=ITEMS[id]||{n:id,g:'物'};
    app.hud.toast('得：'+it.g+' '+it.n,'good');
    app.hud.renderInv();app.hud.updateJournal();
    app.audio.bell(1318,{dur:1.8,gain:.16,pan:(Math.random()-.5)*.5});
    if(msg)app.hud.say({who:'',glyph:'·',text:msg});
    return true;
  };
  const note=(t,tag='线索')=>{S.note(t,tag);app.hud.updateJournal();};
  const col=(x0,z0,x1,z1,y1)=>{const c={minX:x0,maxX:x1,minZ:z0,maxZ:z1,y0:0,y1,
    id:app.colliders.length,solid:true,door:true};app.colliders.push(c);return c;};

  const eastCol=col(9.8,-1.45,10.2,1.05,2.45);
  const westCol=col(-10.2,-1.45,-9.8,1.05,2.45);
  if(S.get('eastOpen'))eastCol.solid=false;
  if(S.get('westOpen'))westCol.solid=false;

  const P=(def,radius)=>{
    def.vec=def.at instanceof THREE.Vector3?def.at.clone():new THREE.Vector3(def.at[0],def.at[1],def.at[2]);
    def.radius=radius??(def.r||1.3);
    def.idx=app.interactives.length;
    app.interactives.push(def);
    return def;
  };

  /* ================= 喜堂 ================= */
  P({id:'gate',kind:'gate',name:'宅门 · 九重闩',at:[0,1.5,18.5],r:2.7,
    examine(){const n=S.boltsOpen;
      return `九道铁闩，铜环铺首。门外是更声，门内是喜乐。<br>已落 <b>${n}</b> 道闩。${n>=9?'门轴已松，只欠一个「理」字 —— 九宫归位，门自认你。':''}`;},
    use(){
      if(S.boltsOpen<9){
        app.hud.toast(`差 ${9-S.boltsOpen} 道闩。每破一处机关，自有一令落闩。`,'bad');
        app.audio.woodfish({gain:.28});return;}
      app.panels.jiugong({onWin:()=>{S.solve('jiugong');applySolve(app,'jiugong');}});
    }});

  P({id:'censer_hall',kind:'censer',name:'喜堂香炉',at:[0,1.25,17.0],r:2.1,
    examine(){return '三足铜炉，香灰是热的 —— 在你之前，已有人燃过。<br>按 [H] 燃香可定心神。';},
    use(){app.tryIncense();}});

  P({id:'hallAltar',kind:'altar',name:'供桌',at:[0,1.1,17.1],r:2.3,
    examine(){
      const owned=LIU_LI.filter(l=>S.has(l.item)&&!S.liPlaced.includes(l.item)).length;
      return `左设「新郎」牌位，右设虚位 —— 那位子，是留给你的。<br>案前六只果盘皆空。${owned?`囊中有聘礼 ${owned} 件，可行礼。`:'六礼未集。'}`;},
    use(){
      const owned=LIU_LI.filter(l=>S.has(l.item));
      if(!owned.length){
        if(!S.get('altarSearched')){
          S.set('altarSearched');give('huozhe');give('xiang');
          note('供桌抽屉：火折子一具、三炷香一把。香脚尚温。','物');
          app.audio.creak();
        }else app.hud.toast('抽屉空了。','');
        return;}
      app.panels.liuLi({onWin:()=>{S.liPlaced=LIU_LI.map(l=>l.item);S.solve('liuli');applySolve(app,'liuli');}});
    }});

  (A.hallDolls||[]).forEach((d,i)=>P({id:'halldoll'+i,kind:'doll',name:i?'纸扎童男':'纸扎童女',
    at:[d.position.x,1.0,d.position.z],r:1.45,
    examine(){return i?'童男俑。两团胭脂涂得极匀，眼窝里塞着别人的头发。'
      :'童女俑。双手捧着一只空匣，匣底刻一个「待」字。';},
    use(){
      if(i===0&&!S.get('dollGoose')){S.set('dollGoose');give('woodgoose');
        note('纸童女匣中得木雁 —— 纳采用雁，取其不再偶。','礼');return;}
      S.addDread(2);app.hud.toast('纸皮陷下去一块，没有回声','');}}));

  P({id:'couplet_hall',kind:'text',name:'喜堂挽联',at:[-2.35,1.5,18.5],r:1.8,
    examine(){return '桃之夭夭　灼灼其華<br>之子于歸　宜其室家<br><span style="opacity:.7">—— 写的是嫁，贴的是挽。红纸底下压着一层白。</span>';},
    use(){note('「宜其室家」四字被描过，原字是「宜其幽宅」。','判');}});

  P({id:'drum',kind:'noise',name:'堂鼓',at:[-5.4,.9,12.6],r:1.6,
    examine(){return '蒙皮未紧，一击便震得梁上落灰。'},
    use(){app.audio.drum({gain:.85});S.addDread(11);app.shakeT=.9;
      app.hud.toast('鼓声穿宅 —— 你被听见了','bad');
      setTimeout(()=>trigger(app,'noise'),900);}});

  P({id:'gong',kind:'noise',name:'铜锣',at:[5.2,1.2,12.6],r:1.6,
    examine(){return '锣边有一圈指痕，是有人日日按着听出去的。'},
    use(){app.audio.bell(784,{dur:3.2,gain:.32});S.addDread(9);app.shakeT=.7;
      app.hud.toast('锣声悠长。院里的纸人似转过脸来','bad');
      setTimeout(()=>trigger(app,'noise'),900);}});

  P({id:'spiritwall',kind:'text',name:'影壁',at:[0,1.4,12.2],r:2.0,
    examine(){return '砖雕「福」字被凿去半笔，成了「一口田」。<br>旧说：福字缺笔，是给阴宅留门。';},
    use(){note('影壁「福」字缺笔，凿口尚新，石屑未扫。','异');}});

  /* ================= 天井 ================= */
  P({id:'well',kind:'puzzle',name:'甜水井',at:[-5.4,.9,1.2],r:2.0,
    examine(){return `井栏磨出深槽，辘轳锈死，绳断在第三股。<br>井底有<b>有重量</b>的东西。<br>${S.done('steelyard')?'坠石已开，可下井取物。':'须以五石为权，称出与石匣等重之数。'}`;},
    use(){
      if(S.done('steelyard')){
        if(!S.get('wellTaken')){S.set('wellTaken');
          give('silver_key');give('rope');give('red_thread');
          note('井底石匣：银钥一枚（齿上缠长发）、麻绳一股、红头绳一根。','物');
          trigger(app,'wellOpened');}
        else app.hud.toast('井底已空。','');
        return;}
      if(!S.get('steelyardHint')){S.set('steelyardHint');
        app.hud.toast('辘轳纹丝不动。得先寻到「权」。','bad');
        note('井须以石坠开。石以方色为名，重依生数。','机');return;}
      app.panels.steelyard({onWin:()=>{S.solve('steelyard');applySolve(app,'steelyard');}});
    }});

  P({id:'jar',kind:'prop',name:'太平缸',at:[7.4,.9,-1.6],r:1.7,
    examine(){return '水面结着一层薄冰。缸底三枚铜钱，一枚压着一枚。'},
    use(){
      app.audio.noiseHit({dur:.6,freq:600,gain:.18,q:2,pan:.3});
      if(!S.get('jarDone')){S.set('jarDone');give('coins');
        note('缸底得卜吉钱三枚 —— 纳吉之礼。三枚皆正面。','礼');}
      else app.hud.toast('缸底只剩水锈。','');}});

  P({id:'censer_court',kind:'censer',name:'天井宝鼎',at:[0,1.0,-4.4],r:2.4,
    examine(){return '石座大炉，炉壁刻「回」：一炉香火，两界平安。<br>按 [H] 燃香，此方之地她不敢入。';},
    use(){app.tryIncense();}});

  P({id:'tree',kind:'prop',name:'老槐',at:[5.6,1.2,4.6],r:2.3,
    examine(){return '槐者，木旁有鬼 —— 旧宅不种槐，可这棵活了百年。<br>树干钉着一圈红绳，绳上系十七枚小纸人，个个写着「妻」。'},
    use(){note('老槐红绳系十七枚纸人，皆书「妻」。','异');
      app.audio.noiseHit({dur:1.1,freq:1500,gain:.09,q:3,pan:-.2});}});

  P({id:'noose',kind:'prop',name:'槐上绳套',at:[6.7,2.6,4.6],r:1.5,
    examine(){return '双套结。上吊的人打不出这种结 —— 那是<b>替人套上</b>的结法。<br>绳环离地七尺，是留给一个站着的人的。'},
    use(){note('槐上双套绳，离地七尺，非自尽之结。','判');S.addDread(7);
      app.hud.whisper('你猜 这绳子是给谁留的');}});

  P({id:'dress',kind:'prop',name:'晾着的嫁衣',at:[-2.6,1.4,6.8],r:1.8,
    examine(){return '大红缂丝，凤冠霞帔，袖口是湿的。<br>衣上别一纸签：「<b>身量合 公子</b>」。'},
    use(){note('嫁衣纸签：身量合「公子」—— 这衣是替我量的。','判');
      if(!S.get('sawDress')){S.set('sawDress');S.addDread(9);trigger(app,'seeDress');}}});

  P({id:'joss',kind:'prop',name:'纸钱堆',at:[2.2,.2,7.6],r:1.7,
    examine(){return '烧剩的纸钱堆成小冢。灰里有一张没烧透，上头写着一个名字。'},
    use(){
      if(!S.has('huozhe')){app.hud.toast('没有火。','bad');return;}
      if(S.get('jossBurnt')){app.hud.toast('灰已经冷了。','');return;}
      S.set('jossBurnt');
      app.audio.noiseHit({dur:1.6,freq:2400,gain:.2,q:.8,rev:.6});
      give('list');
      note('焚余得《喜娘账簿》：十七桩阴亲，各记其价。婉娘一栏，写着「<b>活人一口，不估价</b>」。','物');
      trigger(app,'burnJoss');}});

  P({id:'mill',kind:'prop',name:'石磨',at:[-7.6,.5,-3.6],r:1.7,
    examine(){return '磨眼里塞着红绸。磨盘上干了的不是豆汁。'},
    use(){note('石磨磨眼塞红绸 —— 旧俗：磨能镇魂，见血则灵。','异');}});

  (A.yardDolls||[]).forEach((d,i)=>P({id:'yd'+i,kind:'doll',name:'廊下纸人',
    at:[d.position.x,1.0,d.position.z],r:1.2,
    examine(){return '纸脸。眼窝留着两个针孔 —— 从里往外看，才看得见。';},
    use(){S.addDread(3);app.hud.toast('纸皮下是空的，却有体温','');}}));

  /* ================= 祠堂 ================= */
  P({id:'wuxing',kind:'puzzle',name:'五方灯架',at:[-5.0,1.7,-13.2],r:3.6,
    examine(){return '五盏素纸灯：東、南、中、西、北。<br>灯上无一字一画 —— 素得像等人来染。'},
    use(){app.panels.wuxing({onWin:()=>{S.solve('wuxing');applySolve(app,'wuxing');}});}});

  P({id:'tablets',kind:'puzzle',name:'祖先龛 · 七主',at:[-4.5,1.2,-17.0],r:3.2,
    examine(){return '四层龛架，最下七块主位空着，香灰摆成七个圈。<br>侧刻：「昭穆既失，魂魄无依」。'},
    use(){app.panels.tablets({onWin:()=>{S.solve('tablets');applySolve(app,'tablets');}});}});

  P({id:'shrineAltar',kind:'prop',name:'祠堂供台',at:[-4.5,1.05,-16.1],r:2.1,
    examine(){return '案上五杯合卺酒，杯杯满，杯底皆穿。<br>抽屉里压着一本历书。'},
    use(){if(!S.get('shrineAltarDone')){S.set('shrineAltarDone');give('almanac');
      note('供台得《择日历》—— 请期之礼。朱笔圈在今夜：宜嫁娶，宜收魂。','礼');}
      else app.hud.toast('历书已取。','');}});

  P({id:'censer_shrine',kind:'censer',name:'祠堂香炉',at:[-4.5,1.2,-15.85],r:2.1,
    examine(){return '炉身刻「回」。灰里插着半根没烧完的香 —— 是别人的。';},
    use(){app.tryIncense();}});

  P({id:'portrait_wan',kind:'npc',name:'婉娘小像',at:[-2.1,1.6,-17.5],r:2.0,
    examine(){return '红裳妇人，眉眼被香火烧去一角。角题「婉娘 小像 十七岁」。<br>眼珠是两颗黑玛瑙 —— 它们跟着你转。';},
    use(){S.addDread(8);note('祠堂西壁挂「婉娘小像」，年十七，黑玛瑙为目。','人');
      trigger(app,'seenPortrait');}});

  P({id:'portrait_liu',kind:'npc',name:'「媒」字像',at:[-6.9,1.6,-17.5],r:2.0,
    examine(){return '慈眉善目的老妇，掌中托一只红绳结。只题一个字：<b>媒</b>。';},
    use(){note('祠堂东壁挂「媒」字像 —— 鬼媒人柳三娘。','人');
      trigger(app,'seenLiuPortrait');}});

  P({id:'plaque_shrine',kind:'text',name:'匾额「德報本根」',at:[-4.5,3.3,-17.4],r:2.4,
    examine(){return '背面还有一行小字，被香灰糊住：<br>「<b>左昭右穆，代不移序；居中者不迁</b>」。'},
    use(){note('匾背小字：左昭右穆，代不移序，居中者不迁。','机');}});

  P({id:'cellarBox',kind:'puzzle',name:'神龛暗格 · 镇魂匣',at:[-4.5,1.0,-17.1],r:2.0,
    visible(){return S.done('tablets');},
    examine(){return S.done('mirrors')
      ? '匣已开。七枚北斗钉摊在案上，钉头刻的名字都被磨平了。'
      : '龛板滑开，露出一格暗屉：一只薄匣，七枚铜钉封口，钉头刻北斗。<br>匣面无锁，只有一道缝 —— <b>光从哪条缝进去，匣就从哪条缝开</b>。';},
    use(){
      if(S.done('mirrors')){
        if(!S.get('nailsOut')){S.set('nailsOut');give('nail');
          note('拔七钉。匣中名册十七个名字：苏婉娘、阮香绫、柳三娘……最后一栏是空的，等着填。','判');
          trigger(app,'nailsOut');}
        else app.hud.toast('匣中已空。','');
        return;}
      app.panels.mirrors({onWin:()=>{S.solve('mirrors');applySolve(app,'mirrors');}});
    }});

  /* ================= 戏楼 ================= */
  P({id:'jinghu',kind:'puzzle',name:'戏案 · 胡琴',at:[8.4,.9,-9.6],r:2.5,
    examine(){return '案上摊着《牡丹亭·寻魂》工尺谱，末句被血糊住。<br>谱旁一柄胡琴，弦尚温。'},
    use(){app.panels.gongche({onWin:()=>{S.solve('gongche');applySolve(app,'gongche');}});}});

  P({id:'score',kind:'prop',name:'戏本',at:[8.0,.85,-9.4],r:1.7,
    visible(){return !S.has('score');},
    examine(){return '《寻魂》一折。曲律森严，眉批：「凡起六落，中间三转」。<br>凡＝徵，六＝羽。'},
    use(){give('score');note('得《工尺谱》。五音配工尺：上＝宫，尺＝商，工＝角，凡＝徵，六＝羽。','机');}});

  P({id:'backDoor',kind:'door',name:'后台门',at:[8.2,1.0,-10.0],r:1.8,
    examine(){return S.get('backOpen')
      ? '后台门开着。六张脸挂在墙上，妆盒翻在桌上 —— 妆才上了一半。'
      : '铜锁。锁鼻内刻一个「绫」字。';},
    use(){
      if(S.get('backOpen')){
        if(!S.get('veilTaken')){S.set('veilTaken');
          give('veil');give('mask');
          note('后台得红盖头（亲迎之礼）与一张旦角脸谱。额前一面小镜上写着：「香绫 年廿三」。','礼');
          trigger(app,'gotVeil');}
        else app.hud.toast('后台已空。','');
        return;}
      if(!S.has('bronze_key')){app.hud.toast('锁着。要一把刻「绫」的钥。','bad');return;}
      S.set('backOpen');app.audio.creak();
      if(A.backDoor){A.backDoor.position.x=7.3;A.backDoor.rotation.y=.2;}
      app.hud.toast('后台门开了','good');}});

  [0,1,2].forEach(i=>P({id:'ochest'+i,kind:'prop',name:'戏衣箱',at:[2.4+i*.95,.4,-16.4],r:1.35,
    examine(){return ['蟒袍。箱底压着一撮白发，用红绳扎着。','凤冠。点翠掉了三片，补的是纸。','水袖。湿的，还在往下滴。'][i];},
    use(){app.audio.noiseHit({dur:.5,freq:1100,gain:.1,q:1.5});
      if(i===2&&!S.get('chestWet')){S.set('chestWet');S.addDread(8);
        note('水袖湿透 —— 在井里泡过。这件衣的主人下过井。','判');}
      else app.hud.toast('樟脑气冲鼻。','');}}));

  P({id:'stage',kind:'npc',name:'戏台',at:[5.5,1.2,-11.8],r:2.7,
    examine(){return '台口朝北，正对祠堂 —— 神前唱戏，唱的是《寻魂》。<br>台板上两行脚印：一行到人腰高处，断了。'},
    use(){note('戏台脚印至高腰处断 —— 人是从这里被提上去的。','判');
      trigger(app,'stageEnter');}});

  /* ================= 东厢·绣楼 ================= */
  P({id:'door_east',kind:'door',name:'绣楼门',at:[10,1.3,-.2],r:2.0,
    examine(){return S.get('eastOpen')?'门开着。里头红得像刚出过血。':'门上银锁，锁孔细如眉针。';},
    use(){
      if(S.get('eastOpen'))return;
      if(!S.has('silver_key')){app.hud.toast('银锁。要井里那把钥。','bad');return;}
      S.set('eastOpen');eastCol.solid=false;
      if(A.door_east){A.door_east.position.z=1.75;A.door_east.position.x=10.22;}
      app.audio.creak();app.hud.toast('绣楼门开了','good');
      trigger(app,'enterEast');}});

  P({id:'mirror_east',kind:'puzzle',name:'妆台铜镜',at:[15.6,1.2,-2.6],r:2.0,
    examine(){return '镜背刻「照胆」。镜面发暗，照得出红帐、烛台 ——<br>唯独<b>照不出你</b>。';},
    use(){
      if(S.get('mirrorTalk')){app.hud.toast('镜里的人已摆好姿势，等你开口。','');return;}
      S.set('mirrorTalk');S.addDread(16);
      app.audio.whisper(.25,1.2);app.postfx.scream(.55);
      give('mirror_shard');
      note('铜镜照不出我。镜里只有她 —— 她在镜里替我理妆。','异');
      trigger(app,'mirrorFirst');}});

  P({id:'chest_east',kind:'prop',name:'嫁妆箱',at:[11.9,.6,2.6],r:1.8,
    visible(){return !S.get('eastChestDone');},
    examine(){return '樟木箱，铜扣锈死。里头有纸帛窸窣之声。'},
    use(){S.set('eastChestDone');give('longfeng');give('jade_ring');
      note('嫁妆箱得《龙凤帖》—— 问名之礼。帖上两个生辰：一在民国十七年，一在光绪十三年。','礼');
      app.audio.creak();}});

  P({id:'bed_east',kind:'prop',name:'拔步床',at:[14.6,.9,1.2],r:2.3,
    examine(){return '大红销金帐，床四角各压五斤铜钱。<br>枕上有<b>两个</b>窝。'},
    use(){
      S.addDread(6);
      if(!S.get('bedDone')){S.set('bedDone');give('knifer');
        note('床底得压襟刀一把，刃上刻一「还」字。','物');return;}
      app.hud.toast('帐子纹丝不动。你没敢掀。','');}});

  P({id:'veil_east',kind:'puzzle',name:'盖头架',at:[16.6,1.3,.9],r:1.8,
    examine(){return '架上覆一方盖头，四角坠铜钱。<br>老例：新郎连猜三谜，方许揭帖。'},
    use(){app.panels.riddle({onWin:()=>{S.solve('riddle');applySolve(app,'riddle');}});}});

  P({id:'wardrobe_east',kind:'hide',name:'立柜',at:[12.4,1.0,-4.4],r:1.9,
    examine(){return '柜里挂一件男式长衫 —— <b>尺寸正合你</b>。<br>靠近此处便自动缩身；按住 [Ctrl] 屏息。';},
    use(){note('绣楼立柜内挂长衫，尺寸合我。是早备下的。','判');return true;}});

  P({id:'chess_east',kind:'text',name:'残棋',at:[13.0,.85,-1.0],r:1.6,
    examine(){return '黑白各半，行至第十七手。黑已围死白的大龙 —— 白尚未投子。'},
    use(){note('绣楼残棋至十七手，白未投子。','异');}});

  /* ================= 西厢·殡房 ================= */
  P({id:'door_west',kind:'door',name:'殡房门',at:[-10,1.3,-.2],r:2.0,
    examine(){return S.get('westOpen')?'门开着，里头是香灰气。':'门上金锁，锁面铸一「奠」字。';},
    use(){
      if(S.get('westOpen'))return;
      if(!S.has('gold_key')){app.hud.toast('金锁，铸「奠」—— 须由灯阵开出。','bad');return;}
      S.set('westOpen');westCol.solid=false;
      if(A.door_west){A.door_west.position.z=1.75;A.door_west.position.x=-10.22;}
      app.audio.creak();app.hud.toast('殡房门开了','good');
      trigger(app,'enterWest');}});

  P({id:'coffin_closed',kind:'prop',name:'未启之棺',at:[-15.2,.7,1.0],r:2.3,
    examine(){return '红漆新棺，棺头题「苏门王氏女」。七枚铜钉钉死棺盖，钉头皆<b>朝内</b> —— 怕的不是外人打开。';},
    use(){
      if(S.get('coffinOpened'))return;
      if(!S.has('knifer')){app.hud.toast('七枚铜钉，徒手启不动。须一柄薄刃。','bad');return;}
      S.set('coffinOpened');
      const lid=A.coffinClosed&&A.coffinClosed.userData.lid;
      if(lid){lid.position.set(-1.5,.9,0);lid.rotation.z=.9;}
      app.audio.creak();app.audio.noiseHit({dur:.9,freq:420,gain:.28,q:1.2});
      S.addDread(18);
      give('silkwool');
      note('启棺：内无尸，只有一层红绸，绸上压着一把长发。得束帛 —— 纳征之礼。','礼');
      trigger(app,'openCoffin');}});

  P({id:'coffin_open',kind:'prop',name:'已朽之棺',at:[-15.2,.7,-2.6],r:2.3,
    examine(){return '骨殖摆成<b>胎儿</b>的姿势。头骨里塞满了米，七窍皆实，唯双耳空着。<br>棺内侧刻满「归」字，最后一笔歪得厉害 —— 刻的人正被人抬走。';},
    use(){if(!S.get('boneDone')){S.set('boneDone');give('bonebox');
      note('得骨殖匣一具。七窍塞满唯留双耳 —— 「空耳者，听不得后人哭」。','异');
      S.addDread(10);}else app.hud.toast('白骨无言。','');}});

  P({id:'herb',kind:'puzzle',name:'百眼药柜',at:[-11.6,1.1,3.2],r:2.5,
    examine(){return '抽屉上百，皆以五味为签。第三格写着「生数」。<br>柜背悬帖：「魂不虚亦不实 —— 泻其所不胜」。'},
    use(){
      if(!S.get('herbNote')){S.set('herbNote');
        note('药柜总纲：生数 水一火二木三金四土五；方色 东青南赤中黄西白北黑；相克 金木土水火。','机');
        app.hud.toast('第 3 格取出一页《药柜总纲》','good');return;}
      app.panels.herbs({onWin:()=>{S.solve('herbs');applySolve(app,'herbs');}});}});

  P({id:'stove',kind:'prop',name:'灶台',at:[-16.8,1.0,-4.2],r:2.0,
    examine(){return '锅底尚温。灶膛里塞着几张烧了一半的婚帖。'},
    use(){if(!S.get('stoveDone')){S.set('stoveDone');give('sutra');
      note('灶膛得《往生咒》残卷 —— 念到「度」字便断了。','物');}
      else app.hud.toast('灶已冷。','');}});

  P({id:'lamp_west',kind:'prop',name:'长明灯',at:[-13.4,1.0,-5.4],r:1.6,
    examine(){return '一盏倒挂的长明灯。灯芯浸在水里，仍在烧。'},
    use(){app.audio.noiseHit({dur:.4,freq:1400,gain:.1,q:2});
      S.addDread(4);note('西厢长明灯，芯浸水不灭 —— 此乃魂灯。','异');}});

  P({id:'screen_west',kind:'hide',name:'纸糊屏风',at:[-12.4,1.0,-1.15],r:1.9,
    examine(){return '四折白屏，后头只容一人。<br>屏上画「百子图」，孩子们的眼睛都被涂白了。';},
    use(){return true;}});

  P({id:'couplet_west',kind:'text',name:'殡房挽联',at:[-14.1,.9,-5.7],r:2.1,
    examine(){return '一別永成千古恨<br>再逢須待五更魂<br><span style="opacity:.7">—— 「再逢」两字被指甲掐过。</span>';},
    use(){note('挽联「再逢須待五更魂」：天亮前是她，天亮后是它。','判');}});

  P({id:'taliDesk',kind:'puzzle',name:'画符短几',at:[-13.4,.9,2.0],r:1.9,
    visible(){return S.has('blanktal')&&S.has('cinnabar')&&S.has('brush');},
    examine(){return '黄纸三张，朱砂已研，笔架三支。<br>几角压着一行诀：「<b>笔断则气断，气断则鬼入</b>」。<br>可画安神符一枚 —— 捏碎时，她须退三步。';},
    actLabel:'研 砂 画 符',
    use(){app.panels.talisman({onWin:()=>{S.solve('talisman');applySolve(app,'talisman');}});}});

  /* ================= 藏身处 ================= */
  app.hideSpots.push(
    {x:12.4,z:-4.4,r:1.1,visible:()=>S.get('eastOpen')},
    {x:-12.4,z:-1.15,r:1.2,visible:()=>true},
    {x:-4.5,z:-16.6,r:1.0,visible:()=>true},
    {x:7.6,z:-14.2,r:1.2,visible:()=>true},
    {x:-7.6,z:-3.6,r:1.0,visible:()=>true},
  );

  app.give=give;app.markNote=note;
}

/* =====================================================================
   拾取 · 提示
   ===================================================================== */
function segBlocked(app,x0,z0,x1,z1){
  for(const c of app.colliders){
    if(c.solid===false||c.y1<.85)continue;
    const dx=x1-x0,dz=z1-z0;
    let t0=0,t1=1,hit=true;
    const tests=[[x0,dx,c.minX,c.maxX],[z0,dz,c.minZ,c.maxZ]];
    for(const t of tests){
      const p=t[0],d=t[1],mn=t[2],mx=t[3];
      if(Math.abs(d)<1e-9){if(p<mn||p>mx){hit=false;break;}continue;}
      let ta=(mn-p)/d,tb=(mx-p)/d;
      if(ta>tb){const s=ta;ta=tb;tb=s;}
      if(ta>t0)t0=ta;
      if(tb<t1)t1=tb;
      if(t0>t1){hit=false;break;}
    }
    if(!hit||t1<=.001)continue;
    if(x1>c.minX-.12&&x1<c.maxX+.12&&z1>c.minZ-.12&&z1<c.maxZ+.12)continue;
    if(t0<.97)return true;
  }
  return false;
}

const _dir=new THREE.Vector3();
export function updateInteract(app){
  if(app.uiOpen){app.hot=null;app.hud.setPrompt(null);return;}
  const pos=app.camera.position;
  app.camera.getWorldDirection(_dir);
  let best=null,bestScore=1e9;
  for(const i of app.interactives){
    if(i.visible&&!i.visible())continue;
    const v=i.vec;
    const dx=v.x-pos.x,dy=v.y-pos.y,dz=v.z-pos.z;
    const d=Math.hypot(dx,dy,dz);
    if(d>5.4)continue;
    if(d>i.radius+(i.kind==='censer'?1.4:1.1))continue;
    const dot=(dx*_dir.x+dy*_dir.y+dz*_dir.z)/(d||1);
    const ang=Math.acos(Math.max(-1,Math.min(1,dot)));
    const cone=Math.atan2(i.radius,Math.max(.7,d))+.05;
    if(ang>cone)continue;
    if(segBlocked(app,pos.x,pos.z,v.x,v.z))continue;
    const score=d+ang*2.4;
    if(score<bestScore){bestScore=score;best=i;}
  }
  app.hot=best;
  if(best){
    let label=best.name;
    if(best.kind==='door'){
      const open=best.id==='door_east'?app.state.get('eastOpen')
        :best.id==='door_west'?app.state.get('westOpen')
        :app.state.get('backOpen');
      if(!open)label+='（锁）';
    }
    app.hud.setPrompt(label,true);
  }else app.hud.setPrompt(null);
}

export function doInteract(app){
  actOn(app,app.hot);
}

/** 对指定交互物执行：先给描述，有动作则附一个动作按钮 */
export function actOn(app,i){
  if(!i)return;
  if(i.visible&&!i.visible())return;
  if(i.use&&i.always){i.use();return;}
  const html=i.examine?i.examine():'';
  const act=i.use?{label:i.actLabel||({puzzle:'布 阵',door:'试 锁',gate:'开 闩',altar:'行 礼',
    censer:'燃 香（平阴气）',npc:'搭 话',stairs:'下',hide:'藏 身'}[i.kind]||'动 手'),run:()=>i.use()}:null;
  app.hud.examine(i.name,html,act);
}

/* ---------- 触控：屏幕坐标 → 交互物 ---------- */
const _p=new THREE.Vector3();
export function pickAtScreen(app,sx,sy){
  const rect=app.renderer.domElement.getBoundingClientRect();
  const hw=rect.width/2, hh=rect.height/2;
  const R=(app.touchPickRadius||46);
  let best=null,bestD=1e9;
  for(const i of app.interactives){
    if(i.visible&&!i.visible())continue;
    const v=i.vec;
    const d=app.camera.position.distanceTo(v);
    if(d>6.2)continue;
    _p.copy(v).project(app.camera);
    if(_p.z<-1||_p.z>1)continue;                       // 在相机背后
    const px=rect.left+(_p.x*0.5+0.5)*rect.width;
    const py=rect.top+(-_p.y*0.5+0.5)*rect.height;
    const sd=Math.hypot(px-sx,py-sy);
    if(sd>R)continue;
    if(segBlocked(app,app.camera.position.x,app.camera.position.z,v.x,v.z))continue;
    const score=sd+d*6;                                 // 屏幕距离优先，其次世界距离
    if(score<bestD){bestD=score;best=i;}
  }
  return best;
}
