import {Quiz} from './quiz.js';
import {el,button,shuffle} from './shared.js';
export class Gameshow extends Quiz {
  constructor(ctx){super(ctx);this.usedFifty=false;this.usedDouble=false;this.max=ctx.items.reduce((sum,item)=>sum+(item.bonus?200:100),0);}
  beforeQuestion(item){
    this.doubleActive=false;const bar=el('div','lifelines');this.timerLabel=el('span','timer');this.timerLabel.setAttribute('aria-label','Seconds remaining');
    this.fifty=button('½  50:50',()=>{
      if(this.answered||this.usedFifty)return;this.usedFifty=true;this.fifty.disabled=true;
      const wrong=shuffle(item.options.map((_,i)=>i).filter(i=>i!==item.correct&&!this.buttons[i].disabled));
      wrong.slice(0,Math.min(2,Math.max(0,wrong.length-1))).forEach(i=>{this.buttons[i].disabled=true;this.buttons[i].classList.add('eliminated');});GameAudio.play('select');
    });
    this.double=button('♡  Double chance',()=>{if(this.answered||this.usedDouble)return;this.usedDouble=true;this.doubleActive=true;this.double.disabled=true;this.double.textContent='♡  Double chance ready';GameAudio.play('select');});
    this.fifty.disabled=this.usedFifty;this.double.disabled=this.usedDouble;bar.append(this.timerLabel,this.fifty,this.double);if(item.bonus)bar.append(el('span','bonus-badge','2× BONUS'));this.ctx.root.append(bar);
  }
  afterQuestion(){
    this.deadline=performance.now()+this.ctx.settings.time_limit*1000;this.lastSecond=null;
    const tick=()=>{const remaining=Math.max(0,Math.ceil((this.deadline-performance.now())/1000));this.timerLabel.textContent=`◷ ${remaining}s`;this.timerLabel.classList.toggle('urgent',remaining<=10);
      if(remaining!==this.lastSecond){if(remaining>0)GameAudio.play('tick');this.lastSecond=remaining;}
      if(remaining===0){GameAudio.play('wrong');this.complete(false);}
    };tick();this.interval=setInterval(tick,150);
  }
  allowRetry(){if(this.doubleActive&&!this.attempted){this.doubleActive=false;return true;}return false;}
  complete(right,index=null){super.complete(right,index);this.fifty.disabled=true;this.double.disabled=true;}
  destroy(){clearInterval(this.interval);}
}
