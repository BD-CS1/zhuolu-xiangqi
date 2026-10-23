// Resume inside a real user gesture; schedule notes only once the context runs.
export function createGameAudio({getSettings,createContext=()=>new (window.AudioContext||window.webkitAudioContext)(),isHidden=()=>document.hidden,onStateChange=()=>{},repeat=setInterval,cancel=clearInterval}) {
 let context=null,musicTimer=null,musicStep=0;
 const ready=()=>!!context&&context.state==='running'&&getSettings().sound&&!isHidden();
 const state=()=>({state:context?.state||'locked',musicPlaying:musicTimer!==null});
 const notify=()=>onStateChange(state());
 function tone(freq,time=.16,volume=.09,type='sine',delay=0) {
  if(!ready())return;
  const now=context.currentTime+delay,o=context.createOscillator(),g=context.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,now);
  g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(volume,now+.012);g.gain.exponentialRampToValueAtTime(.0001,now+time);
  o.connect(g);g.connect(context.destination);o.start(now);o.stop(now+time+.03);
 }
 function stopMusic(){if(musicTimer!==null)cancel(musicTimer);musicTimer=null;}
 function startMusic(){
  if(musicTimer!==null||!ready()||!getSettings().music)return;
  const melody=[0,4,7,9,7,4,2,4,7,12,9,7,4,2,0,-3,0,2,4,7,4,2,0,-3,0,4,7,9,12,7,4,2];
  const play=()=>{if(!ready()||!getSettings().music)return;const n=melody[musicStep%melody.length];tone(220*2**(n/12),1.2,.035,'sine');tone(440*2**(n/12),.55,.012,'triangle',.04);if(musicStep%4===0){tone(110,2.3,.025,'sine');tone(164.81,1.7,.012,'sine',.2);}musicStep++;};
  play();musicTimer=repeat(play,560);
 }
 function sync(){
  if(!getSettings().sound||isHidden()){
   stopMusic();
   if(context?.state==='running')context.suspend().catch(()=>{});
  }else if(ready()&&getSettings().music)startMusic();
  else stopMusic();
  notify();
 }
 function unlock(){
  if(!getSettings().sound||isHidden())return Promise.resolve(false);
  try{
   if(!context||context.state==='closed'){
    context=createContext();
    context.onstatechange=sync;
   }
   if(context.state==='running'){sync();return Promise.resolve(true);}
   // A blocked resume may remain pending. Retry on every later user gesture.
   return Promise.resolve(context.resume()).then(()=>{sync();return ready();}).catch(()=>{notify();return false;});
  }catch{notify();return Promise.resolve(false);}
 }
 function notes(kind){
  if(kind==='select'){tone(720,.1,.045);tone(1080,.08,.018,'sine',.02);}
  else if(kind==='move'){tone(150,.12,.12,'triangle');tone(310,.08,.04,'sine',.025);}
  else if(kind==='capture'){[98,147,196,294].forEach((f,i)=>tone(f,1.1-i*.15,.085,'triangle',i*.055));tone(880,.8,.035,'sine',.13);}
  else if(kind==='check'){[392,523,784].forEach((f,i)=>tone(f,.35,.06,'triangle',i*.13));}
  else if(kind==='end'){[261.63,329.63,392,523.25,659.25].forEach((f,i)=>tone(f,1.2,.06,'sine',i*.18));}
  else tone(200,.15,.05,'triangle');
 }
 function play(kind){if(ready()){notes(kind);return Promise.resolve(true);}return unlock().then(ok=>{if(ok&&ready())notes(kind);return ok;});}
 return {unlock,sync,play,state};
}
