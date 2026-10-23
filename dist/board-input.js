// A tap commits on click (after release), never while a finger is still down.
export function bindBoardInput(board,onSelect) {
 board.addEventListener('click',event=>{
  if(event.button!==undefined&&event.button!==0)return;
  const target=event.target.closest('[data-index]');
  if(target&&board.contains(target)){onSelect(Number(target.dataset.index));return;}
  const rect=board.getBoundingClientRect();
  const col=Math.round(((event.clientX-rect.left)/rect.width*900-50)/100);
  const row=Math.round(((event.clientY-rect.top)/rect.height*1000-50)/100);
  if(col>=0&&col<9&&row>=0&&row<10)onSelect(row*9+col);
 });
}
