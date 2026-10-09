import {el, button, controls, shuffle, celebrate} from './shared.js';
import {MatchingState} from './matching_state.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export class MatchUp {
  constructor(ctx) {
    this.ctx = ctx;
  }

  start() {
    this.destroy();
    this.state = new MatchingState(this.ctx.items);
    this.selected = null;
    this.drag = null;
    this.suppressClick = false;
    this.submitted = false;
    this.cards = {question: new Map(), answer: new Map()};
    const root = this.ctx.root;
    root.replaceChildren();
    const heading = el('div', 'match-heading');
    heading.append(el('h1', '', 'Find the perfect pairs'), el('p', '', 'Drag a question to an answer, or an answer to a question. You can also tap one from each column.'));
    root.append(heading);
    this.board = el('div', 'match-board');
    this.lines = document.createElementNS(SVG_NS, 'svg');
    this.lines.classList.add('match-lines');
    this.lines.setAttribute('aria-hidden', 'true');
    this.board.append(this.lines);
    const ids = this.ctx.items.map((_, i) => i);
    const questions = shuffle(ids), answers = shuffle(ids);
    if (answers.length > 1 && answers.every((id, i) => id === questions[i])) answers.push(answers.shift());
    for (const [side, order] of [['question', questions], ['answer', answers]]) {
      const column = el('section', 'match-column');
      column.setAttribute('aria-label', side === 'question' ? 'Questions' : 'Answers');
      column.append(el('h2', '', side === 'question' ? 'Questions' : 'Answers'));
      for (const id of order) {
        const text = this.ctx.items[id][side === 'question' ? 'prompt' : 'answer'];
        const card = button('', () => {
          if (this.suppressClick) { this.suppressClick = false; return; }
          this.choose(side, id);
        }, `match-card match-${side}`);
        card.dataset.side = side;
        card.dataset.id = id;
        card.append(el('span', 'match-card-text', text), el('span', 'match-connector'));
        card.setAttribute('aria-label', `${side === 'question' ? 'Question' : 'Answer'}: ${text}`);
        card.setAttribute('aria-pressed', 'false');
        card.addEventListener('pointerdown', event => this.pointerDown(event, side, id));
        card.addEventListener('pointermove', event => this.pointerMove(event));
        card.addEventListener('pointerup', event => this.pointerUp(event));
        card.addEventListener('pointercancel', () => { this.drag = null; this.draw(); });
        this.cards[side].set(id, card);
        column.append(card);
      }
      this.board.append(column);
    }
    root.append(this.board);
    this.status = el('p', 'match-status');
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');
    root.append(this.status);
    this.submitButton = button('Submit test', () => this.submit(), 'btn btn-primary');
    this.resetButton = button('Clear connections', () => {
      this.state.pairs.clear(); this.selected = null; this.update();
    });
    controls(this.ctx, this.resetButton, this.submitButton);
    root.append(el('p', 'small-note match-hint', 'One question connects to one answer. Tap a connected card to remove its line, or drag to change a pair. Results appear only after submission.'));
    this.ctx.render();
    this.observer = new ResizeObserver(() => this.draw());
    this.observer.observe(this.board);
    for (const column of this.board.querySelectorAll('.match-column')) this.observer.observe(column);
    this.update();
  }

  choose(side, id) {
    if (this.submitted) return;
    if (this.selected && this.selected.side !== side) {
      this.connect(this.selected, {side, id});
    } else {
      if (this.selected?.side === side && this.selected.id === id) this.selected = null;
      else {
        this.state.disconnect(side, id);
        this.selected = {side, id};
      }
      this.update();
    }
  }

  connect(from, to) {
    const question = from.side === 'question' ? from.id : to.id;
    const answer = from.side === 'answer' ? from.id : to.id;
    this.state.connect(question, answer);
    this.selected = null;
    GameAudio.play('select');
    this.update();
  }

  pointerDown(event, side, id) {
    if (this.submitted || !event.isPrimary || event.button !== 0) return;
    this.suppressClick = false;
    this.drag = {side, id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false};
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  pointerMove(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    this.drag.x = event.clientX; this.drag.y = event.clientY;
    if (Math.hypot(event.clientX - this.drag.startX, event.clientY - this.drag.startY) > 6) this.drag.moved = true;
    if (this.drag.moved) { event.preventDefault(); this.draw(); }
  }

  pointerUp(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    const drag = this.drag;
    this.drag = null;
    if (drag.moved) {
      this.suppressClick = true;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.match-card');
      if (target && this.board.contains(target) && target.dataset.side !== drag.side) {
        this.connect(drag, {side: target.dataset.side, id: Number(target.dataset.id)});
      } else this.draw();
    }
  }

  update() {
    const connected = this.state.pairs.size, total = this.ctx.items.length;
    this.ctx.progress(connected, total);
    this.submitButton.disabled = !this.state.complete;
    this.resetButton.disabled = connected === 0 && !this.selected;
    this.status.textContent = this.state.complete ? 'Every question is connected. Ready to submit?' : `${connected} of ${total} pairs connected. ${this.selected ? 'Choose a card in the other column.' : 'Find your next pair.'}`;
    const linkedAnswers = new Set(this.state.pairs.values());
    for (const side of ['question', 'answer']) for (const [id, card] of this.cards[side]) {
      const active = this.selected?.side === side && this.selected.id === id;
      card.classList.toggle('match-selected', active);
      card.classList.toggle('match-linked', side === 'question' ? this.state.pairs.has(id) : linkedAnswers.has(id));
      card.setAttribute('aria-pressed', String(active));
    }
    this.draw();
  }

  point(side, id) {
    const box = this.cards[side].get(id).getBoundingClientRect(), board = this.board.getBoundingClientRect();
    return {x: (side === 'question' ? box.right : box.left) - board.left, y: box.top + box.height / 2 - board.top};
  }

  path(from, to, className) {
    const path = document.createElementNS(SVG_NS, 'path');
    const bend = Math.max(25, Math.abs(to.x - from.x) * .45);
    const direction = from.x <= to.x ? 1 : -1;
    path.setAttribute('d', `M ${from.x} ${from.y} C ${from.x + bend * direction} ${from.y}, ${to.x - bend * direction} ${to.y}, ${to.x} ${to.y}`);
    path.setAttribute('class', className);
    this.lines.append(path);
  }

  draw() {
    if (!this.board?.isConnected) return;
    this.lines.setAttribute('viewBox', `0 0 ${this.board.clientWidth} ${this.board.clientHeight}`);
    this.lines.replaceChildren();
    for (const [q, a] of this.state.pairs) {
      this.path(this.point('question', q), this.point('answer', a), `match-line${this.submitted ? q === a ? ' match-line-correct' : ' match-line-wrong' : ''}`);
    }
    if (this.drag?.moved) {
      const box = this.board.getBoundingClientRect();
      this.path(this.point(this.drag.side, this.drag.id), {x: this.drag.x - box.left, y: this.drag.y - box.top}, 'match-line match-line-draft');
    }
  }

  submit() {
    if (this.submitted || !this.state.complete) return;
    const {results, correctCount} = this.state.grade(), total = results.length;
    this.submitted = true;
    this.selected = null;
    for (const [q, a] of this.state.pairs) for (const [side, id] of [['question', q], ['answer', a]]) {
      const card = this.cards[side].get(id);
      card.classList.remove('match-selected');
      card.classList.add(q === a ? 'match-correct' : 'match-wrong');
      card.disabled = true;
    }
    this.submitButton.hidden = true;
    this.resetButton.hidden = true;
    this.ctx.progress(total, total, correctCount * 100);
    this.status.textContent = `${correctCount} of ${total} correct · ${Math.round(correctCount / total * 100)}%. Green lines are correct; pink lines need another look.`;
    const review = el('section', 'match-results');
    review.setAttribute('aria-label', 'Test results');
    const heading = el('h2', '', `Your results: ${correctCount} / ${total}`);
    heading.tabIndex = -1;
    review.append(heading);
    const list = el('ul', 'review-list');
    results.forEach(result => {
      const row = el('li', result.correct ? '' : 'missed');
      row.append(el('strong', '', `${result.correct ? '✓ Correct' : '↗ Review'} · ${result.prompt}`), el('span', '', `Your answer: ${result.selectedAnswer}`));
      if (!result.correct) row.append(el('span', '', `Correct answer: ${result.answer}`));
      list.append(row);
    });
    review.append(list);
    this.ctx.root.append(review);
    controls(this.ctx, button('Try again', () => this.start(), 'btn btn-primary'), button('Back to activities', () => { location.href = '/'; }));
    this.ctx.render();
    this.draw();
    GameAudio.play(correctCount === total ? 'victory' : 'wrong');
    if (correctCount === total) celebrate();
    heading.focus({preventScroll: true});
    review.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
  }

  destroy() {
    this.observer?.disconnect();
    this.drag = null;
  }
}
