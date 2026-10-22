import {searchBest} from './engine.js';
self.onmessage=({data})=>{try{self.postMessage({id:data.id,move:searchBest(data.board,data.side,data.level)});}catch(e){self.postMessage({id:data.id,error:e.message});}};
