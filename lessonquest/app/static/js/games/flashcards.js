import {el,button,controls,shuffle} from './shared.js';
export class Flashcards {
  constructor(ctx){this.ctx=ctx;this.deck=[...ctx.items];this.index=0;}
  start(){this.show();}
  show(){const c=this.ctx,item=this.deck[this.index];c.root.replaceChildren();c.progress(this.index+1,this.deck.length);this.card=el('div','flashcard');this.card.tabIndex=0;this.card.setAttribute('role','button');this.card.setAttribute('aria-label','Flip card');this.card.setAttribute('aria-pressed','false');const inner=el('div','flashcard-inner');
    for(const [side,text] of [['front',item.prompt],['back',item.back]]){const face=el('div',`card-face ${side}`);face.setAttribute('aria-hidden',String(side==='back'));face.append(el('div','question-label',side==='front'?'THINK FIRST · THEN FLIP':'THE OTHER SIDE'));const content=el('div','question-prompt',text);if(c.kind==='maths')content.dataset.math='';face.append(content);inner.append(face);}
    this.card.append(inner);this.card.onclick=()=>this.flip();this.card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.flip();}};c.root.append(this.card);
    const prev=button('← Previous',()=>{this.index--;this.show();});prev.disabled=this.index===0;
    controls(c,prev,button('Flip card',()=>this.flip(),'btn btn-primary'),button(this.index===this.deck.length-1?'Finish →':'Next →',()=>{if(this.index===this.deck.length-1)c.finish();else{this.index++;this.show();}}),button('Shuffle',()=>{this.deck=shuffle(this.deck);this.index=0;GameAudio.play('flip');this.show();}));c.render();
  }
  flip(){const flipped=this.card.classList.toggle('flipped');this.card.setAttribute('aria-pressed',String(flipped));this.card.querySelector('.front').setAttribute('aria-hidden',String(flipped));this.card.querySelector('.back').setAttribute('aria-hidden',String(!flipped));GameAudio.play('flip');}
  key(event){if(event.key===' '){event.preventDefault();this.flip();}else if(event.key==='ArrowRight'){event.preventDefault();if(this.index<this.deck.length-1){this.index++;this.show();}else this.ctx.finish();}else if(event.key==='ArrowLeft'&&this.index>0){event.preventDefault();this.index--;this.show();}}
}
