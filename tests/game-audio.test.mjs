import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameAudio} from '../dist/game-audio.js';

function setup(resume){
 const settings={sound:true,music:true};let hidden=false,notes=0,resumes=0,timers=0;
 const param={setValueAtTime(){},exponentialRampToValueAtTime(){}};
 const context={state:'suspended',currentTime:0,destination:{},onstatechange:null,
  resume(){resumes++;return resume?resume(context,resumes):(context.state='running',Promise.resolve());},
  suspend(){context.state='suspended';return Promise.resolve();},
  createGain(){return {gain:param,connect(){}};},
  createOscillator(){return {frequency:param,connect(){},start(){assert.equal(context.state,'running');notes++;},stop(){}};}};
 const sound=createGameAudio({getSettings:()=>settings,createContext:()=>context,isHidden:()=>hidden,repeat:()=>++timers,cancel:()=>{timers--;}});
 return {sound,settings,context,hide:v=>{hidden=v;},stats:()=>({notes,resumes,timers})};
}
test('desktop audio waits for resume before scheduling the first effect or music',async()=>{
 let finish;const h=setup(c=>new Promise(resolve=>{finish=()=>{c.state='running';resolve();};}));
 const result=h.sound.play('capture');assert.equal(h.stats().notes,0);finish();assert.equal(await result,true);
 assert.ok(h.stats().notes>=9);assert.equal(h.sound.state().musicPlaying,true);
 await h.sound.unlock();assert.equal(h.stats().timers,1);
});
test('a blocked or still-pending unlock is retried on the next gesture',async()=>{
 const h=setup((c,n)=>n===1?new Promise(()=>{}):(c.state='running',Promise.resolve()));
 void h.sound.unlock();assert.equal(await h.sound.play('move'),true);assert.equal(h.stats().resumes,2);assert.ok(h.stats().notes>0);
});
test('muting while resume is pending prevents delayed playback',async()=>{
 let finish;const h=setup(c=>new Promise(resolve=>{finish=()=>{c.state='running';resolve();};}));
 const result=h.sound.play('capture');h.settings.sound=false;h.sound.sync();finish();await result;
 assert.equal(h.stats().notes,0);assert.equal(h.sound.state().musicPlaying,false);
});
test('backgrounding suspends audio and resuming restarts only one music loop',async()=>{
 const h=setup();await h.sound.unlock();h.hide(true);h.sound.sync();assert.equal(h.context.state,'suspended');assert.equal(h.stats().timers,0);
 h.hide(false);await h.sound.unlock();await h.sound.unlock();assert.equal(h.stats().timers,1);
 h.settings.music=false;h.sound.sync();assert.equal(h.stats().timers,0);assert.equal(await h.sound.play('move'),true);
});
test('audio resume rejection can recover without recreating settings or the game',async()=>{
 const h=setup((c,n)=>n===1?Promise.reject(new Error('blocked')):(c.state='running',Promise.resolve()));
 assert.equal(await h.sound.unlock(),false);assert.equal(await h.sound.play('select'),true);
});
