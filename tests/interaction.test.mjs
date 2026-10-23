import test from 'node:test';
import assert from 'node:assert/strict';
import {bindBoardInput} from '../dist/board-input.js';
import {createBattleViewer} from '../dist/battle-viewer.js';
import {getBattleScene} from '../dist/battle-catalog.js';

test('a touch press cannot commit a capture before release and click',()=>{
 const listeners={},selected=[],target={dataset:{index:'1'},closest(){return this;}};
 const board={addEventListener:(name,fn)=>listeners[name]=fn,contains:el=>el===target};
 bindBoardInput(board,i=>selected.push(i));
 listeners.pointerdown?.({pointerType:'touch',target,button:0});assert.deepEqual(selected,[]);
 listeners.click({target,button:0});assert.deepEqual(selected,[1]);
});
test('empty board space maps to the same index independently of piece direction',()=>{
 let click;const selected=[];const board={addEventListener:(_,fn)=>click=fn,contains:()=>false,getBoundingClientRect:()=>({left:10,top:20,width:900,height:1000})};
 bindBoardInput(board,i=>selected.push(i));
 click({button:0,target:{closest:()=>null},clientX:160,clientY:870});assert.deepEqual(selected,[73]);
 click({button:2,target:{closest:()=>null},clientX:160,clientY:870});assert.equal(selected.length,1);
});

function viewerFixture(t){
 const previous=globalThis.document;
 const element=()=>({hidden:false,style:{setProperty(){}},classList:{add(){},remove(){}},setAttribute(){},removeAttribute(){},focus(){},textContent:''});
 const nodes=Object.fromEntries(['battle-art','pause-battle','skip-battle','battle-progress','battle-count','battle-loading','battle-camp','battle-title','battle-matchup','battle-desc','battle-note'].map(id=>[id,element()]));
 const root={...element(),dataset:{},querySelector:s=>nodes[s.slice(1)]};
 const game={inert:false,querySelector:()=>element()};
 const doc=new EventTarget();doc.activeElement=null;doc.hidden=false;globalThis.document=doc;
 t.after(()=>{globalThis.document=previous;});
 t.mock.timers.enable({apis:['setInterval','setTimeout']});
 let now=0;t.mock.method(performance,'now',()=>now);
 const tick=ms=>{now+=ms;t.mock.timers.tick(ms);};
 return {viewer:createBattleViewer(root,game),root,game,nodes,tick};
}
test('a leftover click from the opening touch cannot dismiss the battle',async t=>{
 const h=viewerFixture(t);const done=h.viewer.show(getBattleScene('rC','bH'));assert.equal(h.game.inert,true);
 h.root.onclick();assert.equal(h.root.hidden,false);assert.equal(h.game.inert,true);
 h.root.onpointerdown();h.root.onclick();await done;assert.equal(h.root.hidden,true);assert.equal(h.game.inert,false);
});
test('full countdown starts after loading and pause preserves the battle',async t=>{
 const h=viewerFixture(t);const done=h.viewer.show(getBattleScene('rC','bH'));
 h.tick(8000);assert.equal(h.root.hidden,false);h.nodes['battle-art'].onload();
 h.nodes['pause-battle'].onclick({stopPropagation(){}});h.tick(8000);assert.equal(h.root.hidden,false);
 h.nodes['pause-battle'].onclick({stopPropagation(){}});h.tick(6900);assert.equal(h.root.hidden,false);
 h.tick(100);await done;assert.equal(h.root.hidden,true);assert.equal(h.root.onpointerdown,null);
});
