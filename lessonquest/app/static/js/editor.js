(() => {
  const {kind, activity} = JSON.parse(document.getElementById('editor-data').textContent);
  const form = document.getElementById('activity-form'), container = document.getElementById('items-editor');
  const hints = {
    quiz:'Write a question, add 2–4 choices, and select the correct answer.',
    gameshow:'Create your questions and mark bonus rounds. Lifelines and a ticking timer add suspense.',
    open_box:'Hide a question, discussion prompt, or challenge inside each box. Answers are optional.',
    flashcards:'Add a front and back to each card. Use $…$ for mathematical formulas.',
    type_answer:'Add a prompt and its answer. Alternate answers are separated by a vertical bar (|).',
    unjumble:'Write the correct sentence. Separate mathematical tokens with spaces, e.g. 2 + 3 = 5.',
    cloze:'Wrap missing words in brackets, e.g. The [Earth] orbits the [Sun].',
    maths:'Enter manual formulas in LaTeX. Choose multiple choice or flip cards for rapid drill review.'
  };
  const blank = () => ({prompt:'',options:['',''],correct:0,answer:'',aliases:[],back:'',sentence:'',bonus:false});
  let items = activity ? structuredClone(activity.content_json.items) : [blank()];
  let mode = activity?.content_json.mode || 'choice';
  let selected = 0, dirty = false, saving = false;
  const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const choice = () => ['quiz','gameshow'].includes(kind) || (kind === 'maths' && mode === 'choice');
  const cards = () => kind === 'flashcards' || (kind === 'maths' && mode === 'cards');
  document.getElementById('template-help').textContent = hints[kind];
  const settings = document.getElementById('settings');
  if (kind === 'maths') {
    settings.innerHTML = '<label>Play style<select id="maths-mode"><option value="choice">Multiple choice</option><option value="cards">Flip cards</option></select></label>';
    settings.querySelector('select').value = mode;
    settings.querySelector('select').onchange = event => { mode = event.target.value; markDirty(); render(); };
  } else if (kind === 'gameshow') {
    settings.innerHTML = '<label>Seconds per question<input id="time-limit" type="number" min="10" max="120" value="30" required></label>';
    settings.querySelector('input').value = activity?.content_json.time_limit || 30;
  }
  function markDirty() { dirty = true; document.getElementById('save-state').textContent = 'Unsaved changes · save when you’re ready.'; }
  function field(label, key, value, multiline = true, extra = '') {
    return `<label class="field-row">${label}${multiline ? `<textarea data-field="${key}" maxlength="${key === 'answer' ? 2000 : 4000}" ${extra}>${esc(value)}</textarea>` : `<input data-field="${key}" value="${esc(value)}" ${extra}>`}</label>`;
  }
  function render() {
    if (choice()) items.forEach(item => { while (item.options.length < 2) item.options.push(''); });
    container.innerHTML = items.map((item, index) => {
      let fields = '';
      if (['unjumble','cloze'].includes(kind)) fields = field(kind === 'cloze' ? 'Sentence with [missing words]' : 'Correct sentence or expression', 'sentence', item.sentence, true, 'required');
      else fields = field(cards() ? 'Front of card' : kind === 'open_box' ? 'Question or challenge' : kind === 'maths' ? 'Formula or question (LaTeX supported)' : 'Question', 'prompt', item.prompt, true, 'required');
      if (choice()) {
        fields += `<p class="option-help">Select the circle beside the correct choice.</p><div class="options-list">${item.options.map((value, oi) => `<div class="option-row"><input type="radio" name="correct-${index}" data-correct="${oi}" ${item.correct === oi ? 'checked' : ''} aria-label="Choice ${oi+1} is correct"><input type="text" data-option="${oi}" value="${esc(value)}" maxlength="1000" required placeholder="Choice ${oi+1}" aria-label="Choice ${oi+1}"><button type="button" class="icon-btn" data-remove-option="${oi}" ${item.options.length <= 2 ? 'disabled' : ''} aria-label="Remove choice"><i data-lucide="x"></i></button></div>`).join('')}</div><button type="button" class="btn btn-secondary" data-add-option ${item.options.length >= 4 ? 'disabled' : ''} style="margin-top:12px;font-size:12px">+ Add choice</button>`;
      }
      if (cards()) fields += field('Back of card / solution', 'back', item.back, true, 'required');
      if (['open_box','type_answer'].includes(kind)) fields += field(kind === 'open_box' ? 'Reveal answer (optional)' : 'Correct answer', 'answer', item.answer, true, kind === 'type_answer' ? 'required' : '');
      if (kind === 'type_answer') fields += field('Alternate answers (separate with |)', 'aliases', item.aliases.join(' | '), false, 'maxlength="2000"');
      if (kind === 'gameshow') fields += `<label class="check-label"><input type="checkbox" data-field="bonus" ${item.bonus ? 'checked' : ''}> Bonus round · double points</label>`;
      return `<article class="item-editor panel" data-index="${index}"><div class="item-heading"><span class="item-number">${index+1}</span><h3>${cards() ? 'Card' : kind === 'open_box' ? 'Box' : 'Item'} ${index+1}</h3><button type="button" class="icon-btn" data-move="-1" ${index === 0 ? 'disabled' : ''} aria-label="Move item up"><i data-lucide="arrow-up"></i></button><button type="button" class="icon-btn" data-move="1" ${index === items.length-1 ? 'disabled' : ''} aria-label="Move item down"><i data-lucide="arrow-down"></i></button><button type="button" class="icon-btn danger" data-remove ${items.length === 1 ? 'disabled' : ''} aria-label="Remove item"><i data-lucide="trash-2"></i></button></div>${fields}</article>`;
    }).join('');
    container.querySelectorAll('.item-editor').forEach(article => {
      const index = Number(article.dataset.index), item = items[index];
      article.addEventListener('focusin', () => { selected = index; preview(); });
      article.querySelectorAll('[data-field]').forEach(input => input.addEventListener('input', () => {
        const key = input.dataset.field;
        item[key] = key === 'bonus' ? input.checked : key === 'aliases' ? input.value.split('|').map(x => x.trim()).filter(Boolean) : input.value;
        selected = index; markDirty(); preview();
      }));
      article.querySelectorAll('[data-option]').forEach(input => input.oninput = () => { item.options[Number(input.dataset.option)] = input.value; markDirty(); preview(); });
      article.querySelectorAll('[data-correct]').forEach(input => input.onchange = () => { item.correct = Number(input.dataset.correct); markDirty(); preview(); });
      article.querySelectorAll('[data-remove-option]').forEach(button => button.onclick = () => {
        const oi = Number(button.dataset.removeOption); item.options.splice(oi,1);
        if (item.correct === oi) item.correct = 0; else if (item.correct > oi) item.correct--;
        markDirty(); render();
      });
      const add = article.querySelector('[data-add-option]'); if (add) add.onclick = () => { item.options.push(''); markDirty(); render(); };
      article.querySelector('[data-remove]').onclick = () => { items.splice(index,1); selected = Math.min(selected,items.length-1); markDirty(); render(); };
      article.querySelectorAll('[data-move]').forEach(button => button.onclick = () => { const target = index + Number(button.dataset.move); [items[index],items[target]] = [items[target],items[index]]; selected = target; markDirty(); render(); });
    });
    document.getElementById('add-item').disabled = items.length >= 100;
    preview(); LQ.icons();
  }
  function preview() {
    const item = items[selected] || items[0], surface = document.getElementById('item-preview');
    const text = ['cloze','unjumble'].includes(kind) ? item.sentence : item.prompt;
    surface.innerHTML = `<div class="preview-prompt" ${kind === 'maths' ? 'data-math' : ''}>${esc(text || 'Your question appears here')}</div>`;
    if (choice()) surface.innerHTML += item.options.map((option, i) => `<div class="preview-answer ${item.correct === i ? 'correct' : ''}" ${kind === 'maths' ? 'data-math' : ''}>${esc(option || `Choice ${i+1}`)}</div>`).join('');
    else if (cards() || item.answer) surface.innerHTML += `<div class="preview-answer" ${kind === 'maths' ? 'data-math' : ''}>${esc(cards() ? item.back || 'Your solution appears here' : item.answer)}</div>`;
    LQ.math(surface, kind === 'maths');
  }
  document.getElementById('add-item').onclick = () => { if (items.length >= 100) return; items.push(blank()); selected = items.length-1; markDirty(); render(); container.lastElementChild.scrollIntoView({behavior:'smooth',block:'center'}); container.lastElementChild.querySelector('textarea').focus(); };
  form.addEventListener('input', markDirty);
  document.getElementById('load-example').onclick = () => {
    if (dirty && !confirm('Replace the current items with an example?')) return;
    const examples = {
      quiz:{prompt:'Which planet is known as the Red Planet?',options:['Earth','Mars','Jupiter','Venus'],correct:1},
      gameshow:{prompt:'How many sides does a hexagon have?',options:['5','6','7','8'],correct:1,bonus:true},
      open_box:{prompt:'Name three things a plant needs to grow.',answer:'Sunlight, water, and air.'},
      flashcards:{prompt:'What is photosynthesis?',back:'Plants use sunlight, water, and carbon dioxide to make food and release oxygen.'},
      type_answer:{prompt:'What is the largest ocean on Earth?',answer:'Pacific',aliases:['Pacific Ocean','the Pacific Ocean']},
      unjumble:{sentence:'The Earth travels around the Sun'},
      cloze:{sentence:'A triangle has [three] sides and [three] angles.'},
      maths:{prompt:'\\frac{3}{4} + \\frac{1}{4}',options:['1','2','\\frac{1}{2}','\\frac{3}{8}'],correct:0,back:'1'}
    };
    items = [{...blank(),...examples[kind]}]; selected = 0; if (!document.getElementById('activity-title').value) document.getElementById('activity-title').value = 'My first ' + kind.replace('_',' ') + ' adventure'; markDirty(); render();
  };
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (saving) return;
    const error = document.getElementById('form-error'); error.hidden = true;
    const savedItems = items.map(item => {
      if (choice()) return {prompt:item.prompt,options:item.options,correct:item.correct,bonus:kind==='gameshow'&&item.bonus};
      if (cards()) return {prompt:item.prompt,back:item.back};
      if (kind==='open_box') return {prompt:item.prompt,answer:item.answer};
      if (kind==='type_answer') return {prompt:item.prompt,answer:item.answer,aliases:item.aliases};
      return {sentence:item.sentence};
    });
    const payload = {title:document.getElementById('activity-title').value.trim(),template_type:kind,content_json:{items:savedItems,mode,time_limit:Number(document.getElementById('time-limit')?.value || 30)}};
    saving = true; document.querySelectorAll('.save-bar button').forEach(b => b.disabled = true);
    try {
      const result = await LQ.request(activity ? `/api/activities/${activity.id}` : '/api/activities', activity ? 'PUT' : 'POST', payload);
      dirty = false; location.href = event.submitter?.value === 'play' ? `/play/${result.id}` : '/';
    } catch (e) { error.textContent = e.message; error.hidden = false; error.scrollIntoView({block:'center'}); }
    finally { saving = false; document.querySelectorAll('.save-bar button').forEach(b => b.disabled = false); }
  });
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  render();
})();
