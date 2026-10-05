import {el,button,prompt,feedback,controls,celebrate} from './shared.js';
export class Quiz {
  constructor(ctx){this.ctx=ctx;this.index=0;this.score=0;this.results=[];this.max=ctx.items.length*100;}
  start(){this.show();}
  show(){
    const c=this.ctx,item=c.items[this.index];if(!item){c.finish(this.score,this.max,this.results);return;}
    this.destroy();this.answered=false;this.attempted=false;c.root.replaceChildren();c.progress(this.index+1,c.items.length,this.score);
    this.beforeQuestion?.(item);prompt(c,item.prompt,item.bonus&&c.kind==='gameshow'?'BONUS ROUND · DOUBLE POINTS':`QUESTION ${this.index+1}`);
    const answers=el('div','answers');this.buttons=item.options.map((option,i)=>{const b=button('',()=>this.choose(i),'answer-button');b.append(el('span','answer-letter',String.fromCharCode(65+i)));const text=el('span','',option);if(c.kind==='maths')text.dataset.math='';b.append(text);answers.append(b);return b;});c.root.append(answers);
    this.status=feedback(c);this.next=button(this.index===c.items.length-1?'See results →':'Next question →',()=>{this.index++;this.show();},'btn btn-primary');this.next.hidden=true;controls(c,this.next);c.render();this.afterQuestion?.(item);
  }
  choose(index){
    if(this.answered||this.buttons[index]?.disabled)return;
    const item=this.ctx.items[this.index],right=index===item.correct;
    GameAudio.play(right?'correct':'wrong');
    if(!right&&this.allowRetry?.()){
      this.attempted=true;this.buttons[index].classList.add('is-wrong');this.buttons[index].disabled=true;this.status.textContent='One more chance. You’ve got this!';this.status.className='feedback bad';return;
    }
    this.complete(right,index);
  }
  complete(right,index=null){
    if(this.answered)return;this.answered=true;this.destroy();const c=this.ctx,item=c.items[this.index];
    this.buttons.forEach((b,i)=>{b.disabled=true;if(i===item.correct)b.classList.add('is-correct');else if(i===index)b.classList.add('is-wrong');});
    const points=item.bonus&&c.kind==='gameshow'?200:100;if(right){this.score+=points;celebrate();}
    this.status.textContent=right?`Brilliant! +${points} points`:`${index===null?'Time’s up!':'Good try!'} The answer is ${item.options[item.correct]}.`;
    this.status.className=`feedback ${right?'good':'bad'}`;this.results.push({prompt:item.prompt,answer:item.options[item.correct],correct:right});this.next.hidden=false;c.progress(this.index+1,c.items.length,this.score);c.render();
  }
  key(event){if(/^[1-4]$/.test(event.key)){event.preventDefault();this.choose(Number(event.key)-1);}else if(event.key==='Enter'&&this.answered){event.preventDefault();this.next.click();}}
  destroy(){}
}
