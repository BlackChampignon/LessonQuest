import {el,button,prompt,controls} from './shared.js';
export class OpenBox {
  constructor(ctx){this.ctx=ctx;this.opened=new Set();}
  start(){this.grid();}
  grid(){
    const c=this.ctx;c.root.replaceChildren();c.progress(this.opened.size,c.items.length);prompt(c,'What will you discover?','CHOOSE A MYSTERY BOX');const grid=el('div','box-grid');
    c.items.forEach((item,i)=>{const opened=this.opened.has(i);const box=button('',()=>this.open(i),`mystery-box ${opened?'opened':''}`);box.append(el('span','',opened?'✓':String(i+1)));box.setAttribute('aria-label',`Box ${i+1}${opened?', already opened':''}`);grid.append(box);});c.root.append(grid);
    if(this.opened.size===c.items.length)controls(c,button('Finish adventure',()=>c.finish(),'btn btn-primary'));c.render();
  }
  open(index){const c=this.ctx,item=c.items[index];this.opened.add(index);GameAudio.play('box');c.root.replaceChildren();c.progress(this.opened.size,c.items.length);const card=prompt(c,item.prompt,`BOX ${index+1} · YOUR CHALLENGE`);card.classList.add('box-reveal');
    if(item.answer){const answer=el('div','challenge-answer',item.answer);answer.hidden=true;card.append(answer);const reveal=button('Reveal answer',()=>{answer.hidden=false;reveal.disabled=true;GameAudio.play('flip');c.render();});controls(c,reveal);}
    controls(c,button('Back to the boxes',()=>this.grid(),'btn btn-primary'));c.render();
  }
}
