import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ENCOUNTERS,getBattleScene,filterScenes} from '../dist/battle-catalog.js';

test('all 72 supported directed captures have the exact red/black pairing',()=>{
 const mobile=['R','H','C','P'],home=['A','E','K'];let captures=0;
 for(const side of ['r','b'])for(const attacker of [...mobile,...home]){
  const victims=mobile.includes(attacker)?[...mobile,'A','E']:mobile;
  for(const victim of victims){
   const piece=side+attacker,target=(side==='r'?'b':'r')+victim;
   const scene=getBattleScene(piece,target);assert.ok(scene,`${piece} captures ${target}`);
   assert.equal(scene.red,side==='r'?attacker:victim);
   assert.equal(scene.black,side==='b'?attacker:victim);captures++;
  }
 }
 assert.equal(captures,72);assert.equal(ENCOUNTERS.length,40);
});
test('swapping red/black piece roles selects a different illustration',()=>{
 assert.notEqual(getBattleScene('rC','bH').image,getBattleScene('rH','bC').image);
 assert.equal(getBattleScene('rC','bH').image,getBattleScene('bH','rC').image);
 assert.equal(getBattleScene('rA','bE'),null);assert.equal(getBattleScene('rP','rH'),null);
 assert.equal(getBattleScene('invalid','bH'),null);
 assert.equal(filterScenes('C','H').length,1);
 assert.equal(filterScenes('A','E').length,0);
});
test('all forty artworks and thumbnails exist and the artworks are distinct',()=>{
 const hashes=new Set();
 for(const scene of ENCOUNTERS){
  for(const path of [scene.image,scene.thumbnail])assert.ok(existsSync(new URL('../dist/'+path.slice(2),import.meta.url)),path);
  hashes.add(createHash('sha256').update(readFileSync(new URL('../dist/'+scene.image.slice(2),import.meta.url))).digest('hex'));
 }
 assert.equal(hashes.size,40);
});
