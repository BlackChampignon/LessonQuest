export const normalize = value => value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,'').trim();
export function shuffle(array) { const copy = [...array]; for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];} return copy; }
export function el(tag, className = '', text = '') { const node=document.createElement(tag);node.className=className;node.textContent=text;return node; }
export function button(text, onClick, className = 'btn btn-secondary') { const node=el('button',className,text);node.type='button';node.onclick=onClick;return node; }
export function prompt(ctx, text, label = 'LET’S THINK ABOUT THIS') {
  const card=el('div','question-card');card.append(el('div','question-label',label));const question=el('div','question-prompt',text); if(ctx.kind==='maths') question.dataset.math=''; card.append(question);ctx.root.append(card);return card;
}
export function feedback(ctx) { const node=el('div','feedback');node.setAttribute('role','status');node.setAttribute('aria-live','polite');ctx.root.append(node);return node; }
export function controls(ctx, ...buttons) { const node=el('div','game-controls');node.append(...buttons);ctx.root.append(node);return node; }
export function celebrate() { if (!matchMedia('(prefers-reduced-motion: reduce)').matches) window.confetti?.({particleCount:100,spread:85,origin:{y:.68},colors:['#a08ae5','#ffd37c','#8bd8b9','#efaac1']}); }
