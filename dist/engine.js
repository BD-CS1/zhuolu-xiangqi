// Board: 9 columns × 10 ranks. Red starts at the bottom and moves first.
export const OTHER = s => s === 'r' ? 'b' : 'r';
export const NAMES={rK:'帥',rA:'仕',rE:'相',rH:'傌',rR:'俥',rC:'炮',rP:'兵',bK:'將',bA:'士',bE:'象',bH:'馬',bR:'車',bC:'砲',bP:'卒'};
export const VALUE={K:100000,A:210,E:220,H:420,R:920,C:460,P:110};
export function initialBoard(){
 const b=Array(90).fill(null),row=['R','H','E','A','K','A','E','H','R'];
 row.forEach((t,c)=>{b[c]='b'+t;b[81+c]='r'+t;});
 [1,7].forEach(c=>{b[18+c]='bC';b[63+c]='rC';});
 [0,2,4,6,8].forEach(c=>{b[27+c]='bP';b[54+c]='rP';});return b;
}
export function applyMove(b,m){const n=b.slice();n[m.to]=n[m.from];n[m.from]=null;return n;}
export function rawMoves(b,i){
 const p=b[i];if(!p)return [];const s=p[0],t=p[1],r=Math.floor(i/9),c=i%9,out=[];
 const inside=(y,x)=>y>=0&&y<10&&x>=0&&x<9;
 const add=(y,x)=>{if(inside(y,x)&&b[y*9+x]?.[0]!==s)out.push(y*9+x);};
 const palace=(y,x)=>x>=3&&x<=5&&(s==='r'?y>=7&&y<=9:y>=0&&y<=2);
 if(t==='R'||t==='C'){
  for(const [dy,dx] of [[1,0],[-1,0],[0,1],[0,-1]]){
   let screen=false;for(let y=r+dy,x=c+dx;inside(y,x);y+=dy,x+=dx){const j=y*9+x;
    if(t==='R'){if(!b[j])out.push(j);else{if(b[j][0]!==s)out.push(j);break;}}
    else if(!screen){if(!b[j])out.push(j);else screen=true;}else if(b[j]){if(b[j][0]!==s)out.push(j);break;}
   }
  }
 }else if(t==='H'){
  for(const [dy,dx] of [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[-1,2],[1,-2],[-1,-2]]){
   const ly=r+(Math.abs(dy)===2?Math.sign(dy):0),lx=c+(Math.abs(dx)===2?Math.sign(dx):0);
   if(inside(r+dy,c+dx)&&!b[ly*9+lx])add(r+dy,c+dx);
  }
 }else if(t==='E'){
  for(const [dy,dx] of [[2,2],[2,-2],[-2,2],[-2,-2]]){const y=r+dy,x=c+dx;
   if(inside(y,x)&&(s==='r'?y>=5:y<=4)&&!b[(r+dy/2)*9+c+dx/2])add(y,x);
  }
 }else if(t==='A'){
  for(const [dy,dx] of [[1,1],[1,-1],[-1,1],[-1,-1]])if(palace(r+dy,c+dx))add(r+dy,c+dx);
 }else if(t==='K'){
  for(const [dy,dx] of [[1,0],[-1,0],[0,1],[0,-1]])if(palace(r+dy,c+dx))add(r+dy,c+dx);
  for(const dy of [-1,1])for(let y=r+dy;inside(y,c);y+=dy){const j=y*9+c;if(b[j]){if(b[j]===OTHER(s)+'K')out.push(j);break;}}
 }else if(t==='P'){
  add(r+(s==='r'?-1:1),c);if(s==='r'?r<=4:r>=5){add(r,c-1);add(r,c+1);}
 }return out;
}
export function inCheck(b,s){const k=b.indexOf(s+'K');if(k<0)return true;for(let i=0;i<90;i++)if(b[i]?.[0]===OTHER(s)&&rawMoves(b,i).includes(k))return true;return false;}
export function legalMoves(b,i){if(!b[i])return [];const s=b[i][0];return rawMoves(b,i).filter(to=>!inCheck(applyMove(b,{from:i,to}),s));}
export function allMoves(b,s){const m=[];for(let i=0;i<90;i++)if(b[i]?.[0]===s)for(const to of legalMoves(b,i))m.push({from:i,to});return m;}
export function gameState(b,s){if(b.indexOf(s+'K')<0)return {over:true,winner:OTHER(s),reason:'主帥陷陣'};const check=inCheck(b,s);if(!allMoves(b,s).length)return {over:true,winner:OTHER(s),reason:check?'將死':'困斃'};return {over:false,check};}
export function evaluate(b,s){let score=0;for(let i=0;i<90;i++){const p=b[i];if(!p)continue;const r=Math.floor(i/9),c=i%9,advance=p[0]==='r'?9-r:r;let v=VALUE[p[1]];
 if(p[1]==='P')v+=advance*10+(advance>=5?100:0)+(4-Math.abs(c-4))*4;
 if(p[1]==='H'||p[1]==='C')v+=(4-Math.abs(c-4))*8+Math.min(advance,6)*4;
 if(p[1]==='R')v+=advance*3;score+=p[0]===s?v:-v;}return score;}
export function searchBest(b,s,level=2){
 const settings=[null,[1,180],[2,600],[3,1500]], [maxDepth,budget]=settings[level]||settings[2];
 const deadline=Date.now()+budget;let nodes=0,aborted=false;
 const order=(board,moves)=>moves.sort((a,z)=>{
  const priority=m=>(board[m.to]?VALUE[board[m.to][1]]*10-VALUE[board[m.from][1]]:0)+(4-Math.abs(m.to%9-4));
  return priority(z)-priority(a);
 });
 const negamax=(board,side,depth,alpha,beta,ply)=>{
  if((++nodes&127)===0&&Date.now()>deadline){aborted=true;return evaluate(board,side);}
  if(board.indexOf(side+'K')<0)return -999999+ply;
  if(depth===0)return evaluate(board,side);
  const moves=order(board,allMoves(board,side));if(!moves.length)return -999999+ply;
  let best=-Infinity;for(const m of moves){const v=-negamax(applyMove(board,m),OTHER(side),depth-1,-beta,-alpha,ply+1);if(aborted)return 0;best=Math.max(best,v);alpha=Math.max(alpha,v);if(alpha>=beta)break;}return best;
 };
 let moves=order(b,allMoves(b,s));if(!moves.length)return null;let best=moves[0],score=-Infinity,depthDone=0;
 for(let depth=1;depth<=maxDepth;depth++){
  let candidate=best,current=-Infinity;const scored=[];
  for(const m of moves){const v=-negamax(applyMove(b,m),OTHER(s),depth-1,-Infinity,-current,1);if(aborted)break;scored.push({...m,score:v});if(v>current){current=v;candidate=m;}}
  if(aborted)break;best={from:candidate.from,to:candidate.to};score=current;depthDone=depth;moves=scored.sort((a,z)=>z.score-a.score);
 }
 return {...best,score,nodes,depth:depthDone};
}
