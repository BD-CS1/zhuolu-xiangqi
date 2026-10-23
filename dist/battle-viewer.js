import {NAMES} from './engine.js';
import {ROLE_NAMES} from './battle-catalog.js';

const preloaded = new Map();
export function preloadBattleScene(scene) {
 if(!scene || preloaded.has(scene.key)) return;
 const img = new Image();
 img.decoding = 'async';
 img.src = scene.image;
 img.onerror = () => preloaded.delete(scene.key);
 preloaded.set(scene.key, img);
}

// Capture and gallery share the same portrait viewer. The countdown starts only
// after the full-resolution image loads; pausing never advances the chess game.
export function createBattleViewer(root, game) {
 const find = id => root.querySelector('#'+id);
 let closeCurrent = null;
 return {
  close() { closeCurrent?.(); },
  show(scene, {attacker=null, defender=null, autoplay=true}={}) {
   closeCurrent?.();
   return new Promise(resolve => {
    const art=find('battle-art'), pause=find('pause-battle'), skip=find('skip-battle');
    const progress=find('battle-progress'), count=find('battle-count'), loading=find('battle-loading');
    const previousFocus=document.activeElement;
    let finished=false, ready=false, paused=!autoplay, remaining=7000, lastTick=performance.now(),backgroundPressed=false;
    const blackAttack=attacker?.[0]==='b';
    root.className='battle loading'+(blackAttack?' blue':'')+(!autoplay?' gallery-view':'');
    root.style.setProperty('--battle-image',`url("${scene.thumbnail}")`);
    root.dataset.scene=scene.key;
    root.setAttribute('aria-label',`紅${NAMES['r'+scene.red]}對黑${NAMES['b'+scene.black]}：${scene.title}`);
    root.hidden=false;
    game.inert=true;
    find('battle-camp').textContent=autoplay?(blackAttack?'九黎陣營 · 蚩尤進擊':'軒轅陣營 · 黃帝進擊'):'神話戰場圖鑑 · 雙軍交鋒';
    find('battle-title').textContent=scene.title;
    find('battle-matchup').innerHTML=`<span class="match-red">紅${NAMES['r'+scene.red]} · ${ROLE_NAMES[scene.red]}</span><i>交鋒</i><span class="match-black">黑${NAMES['b'+scene.black]} · ${ROLE_NAMES[scene.black]}</span>`;
    find('battle-desc').textContent=attacker?`${attacker[0]==='r'?'紅':'黑'}${NAMES[attacker]} 吃 ${defender[0]==='r'?'紅':'黑'}${NAMES[defender]} · ${scene.location}`:`${scene.location} · 雙軍交鋒`;
    find('battle-note').textContent=autoplay?'點擊畫面繼續，或暫停欣賞完整插畫':'點擊畫面返回圖鑑';
    loading.textContent='戰場繪卷載入中';
    pause.hidden=!autoplay;
    pause.textContent='暫停賞圖';
    pause.setAttribute('aria-pressed','false');
    skip.textContent=autoplay?'返回棋局 →':'返回圖鑑 →';
    progress.hidden=!autoplay;
    progress.style.setProperty('--remaining','100%');
    count.textContent=autoplay?'7 秒':'';
    const finish=()=>{
     if(finished)return;
     finished=true;
     clearInterval(ticker);
     clearTimeout(loadTimeout);
     document.removeEventListener('keydown',keyHandler);
     document.removeEventListener('visibilitychange',visibilityHandler);
     art.onload=null;art.onerror=null;
     root.onclick=null;root.onpointerdown=null;root.onpointercancel=null;pause.onclick=null;skip.onclick=null;
     root.hidden=true;
     game.inert=false;
     closeCurrent=null;
     if(previousFocus?.isConnected && !previousFocus.closest('dialog:not([open])')) previousFocus.focus({preventScroll:true});
     else game.querySelector('#board')?.focus({preventScroll:true});
     resolve();
    };
    closeCurrent=finish;
    const tick=()=>{
     const now=performance.now(),elapsed=now-lastTick;lastTick=now;
     if(!ready||!autoplay||paused)return;
     remaining=Math.max(0,remaining-elapsed);
     count.textContent=Math.ceil(remaining/1000)+' 秒';
     progress.style.setProperty('--remaining',`${remaining/70}%`);
     if(remaining<=0)finish();
    };
    const setPaused=value=>{
     tick();paused=value;lastTick=performance.now();
     pause.textContent=paused?'繼續播放':'暫停賞圖';
     pause.setAttribute('aria-pressed',String(paused));
     count.textContent=paused?'賞圖中':Math.ceil(remaining/1000)+' 秒';
    };
    const keyHandler=e=>{
     if(e.key==='Escape'||e.key==='Enter'){e.preventDefault();finish();}
     else if(e.key===' '&&autoplay){e.preventDefault();setPaused(!paused);}
    };
    const visibilityHandler=()=>{lastTick=performance.now();if(document.hidden&&autoplay)setPaused(true);};
    const markReady=()=>{if(finished)return;ready=true;lastTick=performance.now();root.classList.remove('loading');root.classList.add('ready');loading.textContent='';};
    const loadTimeout=setTimeout(()=>{if(!ready&&!finished){loading.textContent='圖片載入較慢，可繼續等待或返回';}},12000);
    const ticker=setInterval(tick,100);
    art.onload=markReady;
    art.onerror=()=>{if(!finished){loading.textContent='高畫質圖片暫時無法載入，請返回後重試';root.classList.remove('loading');root.classList.add('load-error');}};
    art.alt=`${scene.title}：紅方${ROLE_NAMES[scene.red]}與黑方${ROLE_NAMES[scene.black]}於${scene.location}正面交戰的直幅神話插畫`;
    art.removeAttribute('src');
    art.src=scene.image;
    // Ignore a compatibility click left over from the tap that opened this view.
    root.onpointerdown=()=>{backgroundPressed=true;};
    root.onpointercancel=()=>{backgroundPressed=false;};
    root.onclick=()=>{if(backgroundPressed){backgroundPressed=false;finish();}};
    pause.onclick=e=>{e.stopPropagation();backgroundPressed=false;setPaused(!paused);};
    skip.onclick=e=>{e.stopPropagation();finish();};
    document.addEventListener('keydown',keyHandler);
    document.addEventListener('visibilitychange',visibilityHandler);
    (autoplay?pause:skip).focus({preventScroll:true});
   });
  }
 };
}
