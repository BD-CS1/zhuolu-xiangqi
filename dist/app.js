import {initialBoard,OTHER,NAMES,VALUE,legalMoves,allMoves,inCheck,gameState,applyMove} from './engine.js';
import {ENCOUNTERS,ROLE_NAMES,ROLE_ORDER,getBattleScene,getSceneByKey,filterScenes} from './battle-catalog.js';
import {createBattleViewer,preloadBattleScene} from './battle-viewer.js';
import {createGameAudio} from './game-audio.js';
import {bindBoardInput} from './board-input.js';
const $=id=>document.getElementById(id),KEY='zhuolu-xiangqi-v1';
const battleViewer=createBattleViewer($('battle'),$('game'));
let galleryFilter={red:'',black:''},galleryOpen=false,galleryViewing=false;
const icons={sound:'<path d="M11 4 6 8H3v8h3l5 4z"/><path d="M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',mute:'<path d="M11 4 6 8H3v8h3l5 4zM16 9l5 6m0-6-5 6"/>',settings:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="#102623"/><circle cx="16" cy="12" r="2" fill="#102623"/><circle cx="10" cy="18" r="2" fill="#102623"/>',undo:'<path d="m8 5-5 5 5 5M3 10h10a6 6 0 0 1 0 12" transform="translate(0 -2)"/>',hint:'<path d="M8 16c0-3-3-3-3-7a7 7 0 0 1 14 0c0 4-3 4-3 7M9 19h6m-5 3h4M8 16h8"/>',records:'<path d="M6 3h13v18H6a3 3 0 0 1 0-6h13M6 3a3 3 0 0 0-3 3v12m6-11h6m-6 4h6"/>',new:'<path d="M4 9a8 8 0 1 1 0 7M4 3v6h6"/>'};
const svg=x=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[x]}</svg>`;
for(const [id,icon,label] of [['undo','undo','悔棋'],['hint','hint','點將提示'],['records','records','戰報'],['new-game','new','新局']])$(id).innerHTML=svg(icon)+`<span>${label}</span>`;
$('settings').innerHTML=svg('settings');
let settings={mode:'ai',level:2,sound:true,music:true,animation:true,blackReverse:false},board=initialBoard(),turn='r',history=[],result=null,selected=null,targets=[],hintMove=null,busy=false,worker=null,jobId=0,battleFinish=null,cursor=76,toastTimer,aiTimer;
const soundtrack=createGameAudio({getSettings:()=>settings,onStateChange:()=>updateAudioStatus()});
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(!s)return false;if(s.settings)for(const k of Object.keys(settings))if(typeof s.settings[k]===typeof settings[k])settings[k]=s.settings[k];settings.mode=settings.mode==='local'?'local':'ai';settings.level=[1,2,3].includes(settings.level)?settings.level:2;
 const valid=b=>Array.isArray(b)&&b.length===90&&b.every(p=>p===null||Object.hasOwn(NAMES,p));
 if(valid(s.board)&&['r','b'].includes(s.turn)&&Array.isArray(s.history)&&s.history.length<10000&&s.history.every(h=>valid(h.board)&&['r','b'].includes(h.turn)&&h.move&&Number.isInteger(h.move.from)&&Number.isInteger(h.move.to)&&h.move.from>=0&&h.move.from<90&&h.move.to>=0&&h.move.to<90)){
 board=s.board;turn=s.turn;history=s.history;result=s.result?.over?s.result:null;return history.length>0;
 }}catch{}return false;}
const resumed=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify({board,turn,history,result,settings}));}catch{toast('儲存空間不可用，本局仍可繼續遊玩');}}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2400);}
function initAudio(){return soundtrack.unlock();}
function sfx(kind){void soundtrack.play(kind);}
function updateAudioStatus(){const label=$('audio-status');if(label)label.textContent=!settings.sound?'聲音已關閉':soundtrack.state().state==='running'?'聲音已啟用 · 可試聽落子與戰鬥音效':'點一下「試聽音效」啟用聲音';}
document.addEventListener('visibilitychange',()=>{if(document.hidden)soundtrack.sync();else void initAudio();});
document.addEventListener('click',initAudio,{capture:true});
document.addEventListener('pointerup',initAudio,{capture:true,passive:true});
document.addEventListener('keydown',e=>{if(!e.repeat)void initAudio();},{capture:true});
function updateSound(){const on=settings.sound;$('sound').innerHTML=svg(on?'sound':'mute');$('sound').setAttribute('aria-label',on?'關閉音樂與音效':'開啟音樂與音效');$('sound').title=on?'關閉音樂與音效':'開啟音樂與音效';soundtrack.sync();}
$('sound').onclick=()=>{settings.sound=!settings.sound;if(settings.sound)initAudio();updateSound();save();toast(settings.sound?'古風琴韻已開啟':'聲音已關閉');};
// Draw the traditional board once. Coordinates map directly to piece positions.
let lines='<rect x="38" y="38" width="824" height="924" class="grid-frame"/>';
for(let r=0;r<10;r++)lines+=`<path d="M50 ${50+r*100}H850" class="grid-line"/>`;
for(let c=0;c<9;c++)lines+=`<path d="M${50+c*100} 50V450 M${50+c*100} 550V950${c===0||c===8?` M${50+c*100} 450V550`:''}" class="grid-line"/>`;
lines+='<path d="M350 50 550 250 M550 50 350 250 M350 750 550 950 M550 750 350 950" class="palace"/>';
for(const [r,c] of [[2,1],[2,7],[7,1],[7,7],...[3,6].flatMap(r=>[0,2,4,6,8].map(c=>[r,c]))]){const x=50+c*100,y=50+r*100;for(const d of [-1,1])if(c+d>=0&&c+d<=8)for(const e of [-1,1])lines+=`<path d="M${x+d*14} ${y+e*32}V${y+e*14}H${x+d*32}" class="grid-line"/>`;}
lines+='<text x="180" y="516" class="river-text">楚河</text><text x="590" y="516" class="river-text">漢界</text><path d="M430 500h40m-20-15v30" class="grid-line"/><text x="450" y="488" text-anchor="middle" class="river-sub">涿鹿</text><text x="450" y="535" text-anchor="middle" class="river-sub">之野</text>';
$('grid').innerHTML=lines;
const pos=i=>({left:`${(50+(i%9)*100)/9}%`,top:`${(50+Math.floor(i/9)*100)/10}%`});
const points=[];for(let i=0;i<90;i++){const el=document.createElement('button');el.className='point';Object.assign(el.style,pos(i));el.setAttribute('aria-label',`${i%9+1}路，第${Math.floor(i/9)+1}排`);el.tabIndex=-1;el.dataset.index=i;$('points').append(el);points.push(el);}
$('board').tabIndex=0;
bindBoardInput($('board'),clickIndex);
function render(){
 const last=history.at(-1)?.move;points.forEach((p,i)=>{p.className='point'+(targets.includes(i)?board[i]?' capture':' legal':'')+(last&&(i===last.from||i===last.to)?' last':'')+(hintMove?.to===i?' hinted':'');p.setAttribute('aria-label',`${i%9+1}路，第${Math.floor(i/9)+1}排${board[i]?'，'+(board[i][0]==='r'?'紅方':'黑方')+NAMES[board[i]]:''}${targets.includes(i)?'，可落子':''}`);});
 $('tokens').classList.toggle('black-reversed',settings.blackReverse);
 const frag=document.createDocumentFragment(),checked=inCheck(board,turn);
 board.forEach((p,i)=>{if(!p)return;const el=document.createElement('button');el.className='piece '+(p[0]==='r'?'red':'black')+(selected===i?' selected':'')+(p===turn+'K'&&checked?' checked':'')+(hintMove?.from===i?' hint-piece':'')+(hintMove?.to===i?' hint-target':'');Object.assign(el.style,pos(i));const glyph=document.createElement('span');glyph.className='piece-glyph';glyph.textContent=NAMES[p];el.append(glyph);if(hintMove?.to===i){const badge=document.createElement('span');badge.className='hint-capture-badge';badge.textContent='吃';badge.setAttribute('aria-hidden','true');el.append(badge);}el.setAttribute('aria-label',`${p[0]==='r'?'紅方':'黑方'}${NAMES[p]}，${i%9+1}路第${Math.floor(i/9)+1}排${hintMove?.to===i?'，軍師建議吃子位置':''}`);el.setAttribute('aria-pressed',selected===i);el.tabIndex=-1;el.dataset.index=i;frag.append(el);});$('tokens').replaceChildren(frag);
 const active=s=>!result&&turn===s;$('red-mark').className='turn-mark'+(active('r')?' active':'');$('black-mark').className='turn-mark'+(active('b')?' active':'')+(busy&&turn==='b'?' thinking':'');$('red-mark').querySelector('b').textContent=result?'歇陣':turn==='r'?'執子':'待陣';$('black-mark').querySelector('b').textContent=result?'歇陣':turn==='b'?busy?'思索':'執子':'待陣';
 $('mode-chip').innerHTML=(settings.mode==='ai'?'人機對弈':'同機雙人')+' <span>⌄</span>';$('enemy-sub').textContent=settings.mode==='ai'?'電腦棋手 · '+['','初陣','謀士','名將'][settings.level]:'玩家二 · 執黑';$('player-sub').textContent=settings.mode==='ai'?'由你執掌 · 執紅':'玩家一 · 執紅';
 let status=result?result.winner?(result.winner==='r'?'黃帝':'蚩尤')+'獲勝 · '+result.reason:'雙方和棋 · '+result.reason:busy?(hintRequest?'軍師正在推演棋路…':'蚩尤正在運籌帷幄…'):hintMove?`${checked?'將軍 · ':''}提示：${NAMES[board[hintMove.from]]} → ${board[hintMove.to]?'吃'+(board[hintMove.to][0]==='r'?'紅':'黑')+NAMES[board[hintMove.to]]:'移至'}（${hintMove.to%9+1}路第${Math.floor(hintMove.to/9)+1}排）`:checked?'將軍！請保護你的主帥':selected!==null?`${NAMES[board[selected]]} · 點擊亮點落子`:(settings.mode==='local'?(turn==='r'?'紅方':'黑方')+'回合，請執子':'你的回合，點選棋子開始對弈');
 $('status-text').textContent=status;$('move-count').textContent=`第 ${history.length+1} 手`;$('undo').disabled=!history.length;$('hint').disabled=busy||!!result||!!battleFinish;updateSound();
}
function clickIndex(i){initAudio();cursor=i;if(result){showResult();return;}if(busy||battleFinish)return;if(settings.mode==='ai'&&turn==='b')return;hintMove=null;
 if(selected!==null&&targets.includes(i)){const m={from:selected,to:i};doMove(m);return;}
 if(board[i]?.[0]===turn){selected=i;targets=legalMoves(board,i);for(const target of targets)if(board[target])preloadBattleScene(getBattleScene(board[i],board[target]));sfx('select');render();if(!targets.length)toast('此子暫無合法落點');}
 else{if(selected!==null&&board[i]?.[0]!==turn)toast('此處無法落子，請選擇亮點位置');selected=null;targets=[];render();}}
document.addEventListener('keydown',e=>{if($('panel').open||battleFinish)return;if(e.target.matches('button,select,input')&&!e.target.classList.contains('point'))return;const k=e.key;let next=cursor;
 if(k==='ArrowLeft')next=cursor%9?cursor-1:cursor;else if(k==='ArrowRight')next=cursor%9<8?cursor+1:cursor;else if(k==='ArrowUp')next=Math.max(0,cursor-9);else if(k==='ArrowDown')next=Math.min(89,cursor+9);else if(k==='Enter'||k===' '){e.preventDefault();clickIndex(cursor);return;}else if(k==='Escape'){selected=null;targets=[];render();return;}else return;e.preventDefault();cursor=next;points[cursor].focus();});
function abortWorker(){clearTimeout(aiTimer);worker?.terminate();worker=null;busy=false;hintRequest=false;jobId++;}
let hintRequest=false;
function requestMove(isHint=false){if(busy||result||battleFinish||galleryOpen)return;busy=true;hintRequest=isHint;const id=++jobId;render();
 try{worker??=new Worker('./ai-worker.js',{type:'module'});worker.onmessage=({data})=>{if(data.id!==jobId)return;busy=false;hintRequest=false;if(data.error||!data.move){toast('軍師推演中斷，請再試一次');render();return;}const m=data.move;if(!legalMoves(board,m.from).includes(m.to)){toast('棋局已變動，請重新操作');render();return;}if(isHint){hintMove=m;selected=m.from;targets=legalMoves(board,m.from);sfx('select');render();toast(`軍師建議：${NAMES[board[m.from]]}至${m.to%9+1}路第${Math.floor(m.to/9)+1}排`);}else doMove(m);};worker.onerror=()=>{abortWorker();toast('電腦推演暫停，重新開啟棋局可再試');render();};worker.postMessage({id,board,side:turn,level:isHint?3:settings.level});}
 catch{abortWorker();const moves=allMoves(board,turn);if(!isHint&&moves.length){toast('切換為基礎棋手');aiTimer=setTimeout(()=>doMove(moves[Math.floor(Math.random()*moves.length)]),400);}else{toast('此瀏覽器無法啟用軍師提示');render();}}}
function nextAI(){if(settings.mode==='ai'&&turn==='b'&&!result&&!galleryOpen){clearTimeout(aiTimer);aiTimer=setTimeout(()=>requestMove(),320);}}
async function doMove(m){if(result||!board[m.from]||board[m.from][0]!==turn||!legalMoves(board,m.from).includes(m.to))return;
 const piece=board[m.from],captured=board[m.to];history.push({board:board.slice(),turn,move:m,piece,captured,time:new Date().toISOString()});board=applyMove(board,m);turn=OTHER(turn);selected=null;targets=[];hintMove=null;result=gameState(board,turn);if(!result.over)result=null;
 if(!result){const same=history.filter(h=>h.turn===turn&&h.board.every((p,i)=>p===board[i])).length;if(same>=2)result={over:true,winner:null,reason:'同局面三次重複（休閒規則）'};}
 save();sfx(captured?'capture':'move');render();
 if(captured&&settings.animation)await showBattle(piece,captured);if(result){sfx('end');setTimeout(showResult,200);}else{if(inCheck(board,turn))sfx('check');nextAI();}}
async function showBattle(piece,captured){
 const scene=getBattleScene(piece,captured);
 if(!scene){toast('此組對戰插畫尚未收錄');return;}
 battleFinish=()=>battleViewer.close();
 try{await battleViewer.show(scene,{attacker:piece,defender:captured,autoplay:true});}
 finally{battleFinish=null;}
}
$('hint').onclick=()=>requestMove(true);
$('undo').onclick=()=>{if(!history.length)return;abortWorker();battleFinish?.();const last=history.at(-1);let n=settings.mode==='ai'&&last.turn==='b'?2:1;n=Math.min(n,history.length);let h;while(n--)h=history.pop();board=h.board.slice();turn=h.turn;result=null;selected=null;targets=[];hintMove=null;save();sfx('move');render();toast('已返回上一輪棋局');};
function openPanel(kicker,html){$('panel').classList.toggle('gallery-panel',kicker==='FORTY MYTHIC ENCOUNTERS');$('panel-kicker').textContent=kicker;$('panel-content').innerHTML=html;if(!$('panel').open)$('panel').showModal();}
$('panel').querySelector('.close').onclick=()=>$('panel').close();$('panel').addEventListener('close',()=>{if(galleryOpen&&!galleryViewing){galleryOpen=false;nextAI();}});$('panel').addEventListener('click',e=>{if(e.target===$('panel')){const r=$('panel').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('panel').close();}});
function newGame(){abortWorker();board=initialBoard();turn='r';history=[];result=null;selected=null;targets=[];hintMove=null;save();render();$('panel').close();toast('涿鹿風雲再起，紅方先行');}
function settingsPanel(){openPanel('PREPARE FOR BATTLE',`<h2>布陣開局</h2><p>選擇你的弈戰方式，於方寸之間重寫涿鹿傳說。</p><div class="field"><label for="set-mode">對弈模式<small>黃帝執紅，蚩尤執黑</small></label><select id="set-mode"><option value="ai">人機對弈 · 執紅挑戰</option><option value="local">同機雙人 · 輪流執子</option></select></div><div class="field"><label for="set-black-direction">黑子方向<small>反向朝向對座玩家，方便雙人觀局</small></label><select id="set-black-direction"><option value="forward">正向 · 與紅子同向</option><option value="reverse">反向 · 朝向黑方玩家</option></select></div><div class="field" id="level-field"><label for="set-level">電腦棋力<small>裝置內運算，無需外部服務</small></label><select id="set-level"><option value="1">初陣 · 輕鬆入門</option><option value="2">謀士 · 穩步對弈</option><option value="3">名將 · 深思熟慮</option></select></div><div class="field"><label for="set-animation">神話戰鬥轉場<small>40 幅棋子交戰插畫，可暫停欣賞</small></label><input class="switch" id="set-animation" type="checkbox" ${settings.animation?'checked':''}></div><div class="field"><label for="set-music">古風背景琴韻<small>原創五聲音階，首次操作後播放</small></label><input class="switch" id="set-music" type="checkbox" ${settings.music?'checked':''}></div><div class="field"><label for="set-sound">遊戲聲音<small>音樂與落子、將軍、戰鬥音效</small></label><input class="switch" id="set-sound" type="checkbox" ${settings.sound?'checked':''}></div><button class="secondary" id="test-audio">試聽音效</button><p class="note" id="audio-status" role="status"></p><button class="primary" id="apply-settings">${history.length?'套用設定':'入局 · 開始對弈'}</button><button class="secondary" id="open-gallery">四十式 · 神話戰場圖鑑</button><button class="secondary" id="open-rules">棋行之道 · 遊戲說明</button><p class="note">棋局會自動保存在目前瀏覽器；清除網站資料會移除棋局。</p>`);
 $('set-black-direction').value=settings.blackReverse?'reverse':'forward';$('test-audio').onclick=async()=>{settings.sound=true;settings.music=$('set-music').checked;$('set-sound').checked=true;updateSound();save();const ok=await soundtrack.play('capture');if(!ok)toast('請確認瀏覽器允許播放聲音，再點一次試聽');};updateAudioStatus();$('set-mode').value=settings.mode;$('set-level').value=settings.level;$('level-field').hidden=settings.mode==='local';$('set-mode').onchange=()=>$('level-field').hidden=$('set-mode').value==='local';
 $('apply-settings').onclick=()=>{const mode=$('set-mode').value,changed=mode!==settings.mode;settings={...settings,mode,level:Number($('set-level').value),animation:$('set-animation').checked,blackReverse:$('set-black-direction').value==='reverse',music:$('set-music').checked,sound:$('set-sound').checked};abortWorker();soundtrack.sync();if(settings.sound)void initAudio();updateSound();if(changed)newGame();else{save();render();$('panel').close();nextAI();toast('對弈設定已套用');}};$('open-rules').onclick=showRules;$('open-gallery').onclick=showGallery;}
$('settings').onclick=settingsPanel;$('mode-chip').onclick=settingsPanel;
$('new-game').onclick=()=>{if(!history.length){settingsPanel();return;}openPanel('A NEW LEGEND',`<h2>重啟涿鹿之戰</h2><p class="new-warning">目前棋局將被新的棋局取代。若想繼續原局，請關閉此視窗。</p><button class="primary" id="confirm-new">重新開局 · 紅方先行</button><button class="secondary" id="cancel-new">繼續目前棋局</button>`);$('confirm-new').onclick=newGame;$('cancel-new').onclick=()=>$('panel').close();};
function showRules(){openPanel('THE ART OF XIANGQI',`<h2>棋行之道</h2><p>點選己方棋子，再點擊亮點落子。紅方先行，將死或使對方無子可動（困斃）即可獲勝。棋子保留傳統走法，神話轉場不改變規則。</p><div class="rules-grid"><b>帥將</b><span>九宮內直走一步；雙方將帥不得在同一路上無子相隔。</span><b>仕士</b><span>九宮內斜走一步，守護主帥。</span><b>相象</b><span>斜走田字，不可過河；中間象眼有子時不能行走。</span><b>傌馬</b><span>走日字；直行方向緊鄰的馬腿有子時不能跳。</span><b>俥車</b><span>沿直線任意行走，中途不能越子。</span><b>炮砲</b><span>不吃子時走法同車；吃子時必須隔一枚棋子。</span><b>兵卒</b><span>過河前只能向前一步；過河後也可橫走一步，不能後退。</span></div><p>將軍時必須解將，任何落子都不能使己方主帥受攻擊。點將提示會標出建議棋子與落點；人機悔棋會返回你上一次落子前。</p><p class="keyboard-note">鍵盤：方向鍵移動棋盤游標，Enter／空白鍵選子與落子，Esc 取消選取。手機直接點選即可。</p><p class="note">本作採休閒對弈規則：同局面第三次出現自動和棋；尚未實作競賽的長將、長捉裁定與自然限著。神話為藝術演繹。走法參考 <a href="https://www.wxf-xiangqi.org/images/wxf-rules/2018_World_XiangQi_Rules_English2018.pdf" target="_blank" rel="noopener" style="color:#cbb27d">世界象棋規則</a>。</p><button class="primary" id="back-play">返回棋局</button>`);$('back-play').onclick=()=>$('panel').close();}
function showRecords(){const captured={r:[],b:[]};history.forEach(h=>{if(h.captured)captured[h.turn].push(NAMES[h.captured]);});openPanel('CHRONICLES OF ZHUOLU',`<h2>涿鹿戰報</h2><p>共 ${history.length} 手 · ${settings.mode==='ai'?'人機對弈':'同機雙人'}</p><div class="mini-captures">黃帝俘獲：${captured.r.join(' ')||'尚無'}<br>蚩尤俘獲：${captured.b.join(' ')||'尚無'}</div><div class="record-list">${history.length?history.map((h,i)=>`<div class="record-row ${h.turn==='r'?'red-record':''}"><time>${String(i+1).padStart(2,'0')}</time><span>${h.turn==='r'?'紅':'黑'} ${NAMES[h.piece]} · ${h.move.from%9+1}路${Math.floor(h.move.from/9)+1}排 → ${h.move.to%9+1}路${Math.floor(h.move.to/9)+1}排</span><span>${h.captured?'吃'+NAMES[h.captured]:'落子'}</span></div>`).join(''):'<p>戰鼓未響，靜候第一子。</p>'}</div><button class="primary" id="close-records">返回棋局</button><button class="secondary" id="record-gallery">四十式 · 神話戰場圖鑑</button><button class="secondary" id="record-rules">查看遊戲說明</button>`);$('close-records').onclick=()=>$('panel').close();$('record-rules').onclick=showRules;$('record-gallery').onclick=showGallery;const list=$('panel-content').querySelector('.record-list');list.scrollTop=list.scrollHeight;}
$('records').onclick=showRecords;
function showGallery(){
 galleryOpen=true;abortWorker();render();
 const options=(side,value)=>'<option value="">全部'+(side==='red'?'紅':'黑')+'方棋子</option>'+ROLE_ORDER.map(role=>`<option value="${role}" ${role===value?'selected':''}>${side==='red'?'紅':'黑'}${NAMES[(side==='red'?'r':'b')+role]} · ${ROLE_NAMES[role]}</option>`).join('');
 openPanel('FORTY MYTHIC ENCOUNTERS',`<h2>神話戰場圖鑑</h2><p>四十幅直幅繪卷，記錄軒轅與九黎的兵種交鋒。點選插畫，展開完整畫面。</p><div class="gallery-filters"><select aria-label="紅方棋子篩選" id="gallery-red">${options('red',galleryFilter.red)}</select><select aria-label="黑方棋子篩選" id="gallery-black">${options('black',galleryFilter.black)}</select></div><div class="gallery-summary" id="gallery-count"></div><div class="battle-gallery" id="battle-gallery"></div><p class="note">主帥、禁衛與靈象各有活動範圍，圖鑑依實際可交戰配對編排。紅黑兵種互換有各自的插畫。</p><button class="primary" id="close-gallery">返回棋局</button>`);
 const update=()=>{
  galleryFilter={red:$('gallery-red').value,black:$('gallery-black').value};
  const scenes=filterScenes(galleryFilter.red,galleryFilter.black);
  $('gallery-count').textContent=`目前顯示 ${scenes.length} / ${ENCOUNTERS.length} 幅`;
  $('battle-gallery').innerHTML=scenes.length?scenes.map(scene=>`<button class="gallery-card" data-scene="${scene.key}" aria-label="查看紅${NAMES['r'+scene.red]}對黑${NAMES['b'+scene.black]}插畫"><img src="${scene.thumbnail}" alt="${scene.title}：紅${NAMES['r'+scene.red]}對黑${NAMES['b'+scene.black]}" loading="lazy" decoding="async"><span class="gallery-pair">紅${NAMES['r'+scene.red]} <i>×</i> 黑${NAMES['b'+scene.black]}</span><strong>${scene.title}</strong><small>${scene.location}</small></button>`).join(''):'<p class="gallery-empty">此配對不會在一般合法棋局中交戰。</p>';
 };
 $('gallery-red').onchange=update;$('gallery-black').onchange=update;
 $('battle-gallery').onclick=async e=>{
  const card=e.target.closest('[data-scene]');if(!card)return;
  const scene=getSceneByKey(card.dataset.scene);if(!scene)return;
  galleryViewing=true;$('panel').close();battleFinish=()=>battleViewer.close();
  try{await battleViewer.show(scene,{autoplay:false});}finally{battleFinish=null;galleryViewing=false;showGallery();}
 };
 $('close-gallery').onclick=()=>$('panel').close();update();
}
function showResult(){if(!result)return;openPanel('THE LEGEND CONTINUES',`<div class="result-copy"><div class="result-symbol">${result.winner===null?'和':result.winner==='r'?'龍':'戰'}</div><h2>${result.winner===null?'山河共守':result.winner==='r'?'軒轅定九州':'九黎震山河'}</h2><p>${result.winner===null?'雙方和棋':result.winner==='r'?'黃帝陣營獲勝':'蚩尤陣營獲勝'} · ${result.reason}<br>歷經 ${history.length} 手，這一局的傳說已寫成。</p></div><button class="primary" id="play-again">再戰一局</button><button class="secondary" id="result-records">回看戰報</button><button class="secondary" id="result-board">查看棋盤</button>`);$('play-again').onclick=newGame;$('result-records').onclick=showRecords;$('result-board').onclick=()=>$('panel').close();}
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('此瀏覽器不支援全螢幕，可加入主畫面遊玩');}catch{toast('目前瀏覽器不允許切換全螢幕');}};
preloadBattleScene(getBattleScene('rC','bH'));preloadBattleScene(getBattleScene('bC','rH'));
render();if(resumed)toast('已接續上次的涿鹿棋局');if(!result)nextAI();
