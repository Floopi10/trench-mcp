export const SHAPES=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]]];
export const rotate=m=>m[0].map((_,i)=>m.map(r=>r[i]).reverse());
export function clearRows(board){const rows=board.filter(r=>r.some(v=>!v)),cleared=board.length-rows.length;return {board:[...Array.from({length:cleared},()=>Array(board[0].length).fill(0)),...rows],cleared};}
export class Blocks{
 constructor(random=Math.random){this.random=random;this.reset();}
 reset(){this.board=Array.from({length:20},()=>Array(10).fill(0));this.bag=[];this.score=0;this.lines=0;this.over=false;this.spawn();}
 spawn(){if(!this.bag.length){this.bag=[0,1,2,3,4,5,6];for(let i=6;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}}const type=this.bag.pop();this.piece={m:SHAPES[type].map(r=>r.slice()),x:3,y:0,color:type+1};if(this.collides(this.piece))this.over=true;}
 collides(p){return p.m.some((r,y)=>r.some((v,x)=>v&&(p.x+x<0||p.x+x>=10||p.y+y>=20||p.y+y<0||this.board[p.y+y][p.x+x])));}
 move(dx,dy){if(this.over)return false;const p={...this.piece,x:this.piece.x+dx,y:this.piece.y+dy};if(this.collides(p))return false;this.piece=p;return true;}
 turn(){if(this.over)return;for(const dx of [0,-1,1,-2,2]){const p={...this.piece,m:rotate(this.piece.m),x:this.piece.x+dx};if(!this.collides(p)){this.piece=p;return;}}}
 step(){if(!this.over&&!this.move(0,1))this.lock();}
 drop(){if(this.over)return;while(this.move(0,1))this.score+=2;this.lock();}
 lock(){const p=this.piece;p.m.forEach((r,y)=>r.forEach((v,x)=>{if(v)this.board[p.y+y][p.x+x]=p.color;}));const c=clearRows(this.board);this.board=c.board;this.lines+=c.cleared;this.score+=([0,100,300,500,800][c.cleared]||0);this.spawn();}
}
