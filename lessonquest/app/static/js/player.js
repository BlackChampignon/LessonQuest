import {el, button, controls, celebrate} from './games/shared.js';
import {Quiz} from './games/quiz.js';
import {Gameshow} from './games/gameshow.js';
import {OpenBox} from './games/open_box.js';
import {Flashcards} from './games/flashcards.js';
import {TypeAnswer} from './games/type_answer.js';
import {Unjumble} from './games/unjumble.js';
import {Cloze} from './games/cloze.js';
import {Maths} from './games/maths.js';
const activity=JSON.parse(document.getElementById('activity-data').textContent);
const engines={quiz:Quiz,gameshow:Gameshow,open_box:OpenBox,flashcards:Flashcards,type_answer:TypeAnswer,unjumble:Unjumble,cloze:Cloze,maths:Maths};
let engine;
const ctx={root:document.getElementById('game'),kind:activity.template_type,items:activity.content_json.items,settings:activity.content_json,
  progress(current,total,score=null) { document.getElementById('game-progress').textContent=`${current} / ${total} ${this.kind==='flashcards' || (this.kind==='maths' && this.settings.mode==='cards') ? 'cards' : 'items'}`;document.getElementById('progress-fill').style.width=`${100*current/total}%`;document.getElementById('game-score').textContent=score===null?'':`${score} points`; },
  render() { LQ.math(this.root,this.kind==='maths');LQ.icons(); },
  finish(score=null,max=null,results=[]) {
    engine?.destroy?.(); this.progress(this.items.length,this.items.length,score);this.root.replaceChildren();
    const screen=el('div','finish-screen');screen.append(el('div','finish-icon','🏆'),el('div','eyebrow','ANOTHER ADVENTURE COMPLETE'),el('h1','',score===null?'Look at all you explored!':'You’re building a brilliant mind!'));
    if(score!==null) screen.append(el('div','finish-score',`${score} / ${max}`));
    screen.append(el('p','',score===null?'Bring your curiosity back for another round.':'Every answer is a chance to learn. Ready for the next adventure?'));
    this.root.append(screen);
    controls(this,button('Play again',start,'btn btn-primary'),button('Back to activities',()=>{location.href='/';}));
    if(results.length){ const list=el('ul','review-list');for(const result of results){const row=el('li',result.correct?'':'missed');const heading=el('strong');heading.append(document.createTextNode(`${result.correct?'✓':'↗'} `));const question=el('span','',result.prompt);const answer=el('span','',result.answer);if(this.kind==='maths'){question.dataset.math='';answer.dataset.math='';}heading.append(question);row.append(heading,el('span','','Answer:'),answer);list.append(row);}this.root.append(list); }
    this.render(); GameAudio.play('victory');celebrate();
  }
};
function start(){engine?.destroy?.();GameAudio.unlock();ctx.root.replaceChildren();engine=new engines[ctx.kind](ctx);engine.start();}
document.getElementById('start-game').onclick=start;
document.getElementById('restart-game').onclick=()=>{if(confirm('Restart this activity from the beginning?'))start();};
document.getElementById('sound-toggle').onclick=()=>{GameAudio.enabled=!GameAudio.enabled;const b=document.getElementById('sound-toggle');b.innerHTML=`<i data-lucide="${GameAudio.enabled?'volume-2':'volume-x'}"></i>`;b.setAttribute('aria-label',GameAudio.enabled?'Mute sound':'Enable sound');b.title=GameAudio.enabled?'Sound on':'Sound off';if(GameAudio.enabled)GameAudio.unlock();LQ.icons();};
document.getElementById('fullscreen-toggle').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(e){LQ.toast('Fullscreen isn’t available in this browser. Try the browser’s fullscreen shortcut.');}};
window.addEventListener('pagehide',()=>engine?.destroy?.());
document.addEventListener('keydown',event=>{if(event.target.closest('input,textarea,button,a,select,[role="button"]'))return;engine?.key?.(event);});
