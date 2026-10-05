import {el,button,prompt,feedback,controls,normalize,celebrate} from './shared.js';
export class TypeAnswer {
  constructor(ctx){this.ctx=ctx;this.index=0;this.score=0;this.results=[];}
  start(){this.show();}
  show(){const c=this.ctx,item=c.items[this.index];if(!item){c.finish(this.score,c.items.length*100,this.results);return;}this.answered=false;c.root.replaceChildren();c.progress(this.index+1,c.items.length,this.score);prompt(c,item.prompt,`QUESTION ${this.index+1}`);
    const form=el('form');this.input=el('input','type-input');this.input.type='text';this.input.autocomplete='off';this.input.spellcheck=false;this.input.maxLength=2000;this.input.placeholder='Type your answer…';this.input.setAttribute('aria-label','Your answer');form.append(this.input);c.root.append(form);
    const keypad=el('div','keypad');for(const key of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-=.,')keypad.append(button(key,()=>this.insert(key),'key'));
    keypad.append(button('Space',()=>this.insert(' '),'key wide'),button('⌫',()=>{if(this.answered)return;const start=this.input.selectionStart,end=this.input.selectionEnd;this.input.setRangeText('',Math.max(0,start-(start===end?1:0)),end,'end');this.input.focus();},'key wide'));c.root.append(keypad);
    this.status=feedback(c);this.check=button('Check answer',()=>this.checkAnswer(),'btn btn-primary');this.reveal=button('Reveal & continue',()=>this.complete(false));this.next=button('Next →',()=>{this.index++;this.show();},'btn btn-primary');this.next.hidden=true;controls(c,this.check,this.reveal,this.next);form.onsubmit=e=>{e.preventDefault();this.checkAnswer();};c.render();this.input.focus();
  }
  insert(text){if(this.answered)return;this.input.setRangeText(text,this.input.selectionStart,this.input.selectionEnd,'end');this.input.focus();}
  checkAnswer(){if(this.answered)return;const item=this.ctx.items[this.index];if(!this.input.value.trim()){this.status.textContent='Add an answer first.';return;}this.complete([item.answer,...item.aliases].some(a=>normalize(a)===normalize(this.input.value)));}
  complete(right){if(this.answered)return;this.answered=true;const item=this.ctx.items[this.index];if(right){this.score+=100;celebrate();}GameAudio.play(right?'correct':'wrong');this.input.readOnly=true;this.input.classList.add(right?'is-correct':'is-wrong');this.status.className=`feedback ${right?'good':'bad'}`;this.status.textContent=right?'You got it! +100 points':`Keep learning! The answer is ${item.answer}.`;this.check.hidden=true;this.reveal.hidden=true;this.next.hidden=false;this.results.push({prompt:item.prompt,answer:item.answer,correct:right});this.ctx.progress(this.index+1,this.ctx.items.length,this.score);}
}
