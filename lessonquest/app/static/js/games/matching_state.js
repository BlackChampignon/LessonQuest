// Pair identity is independent of either column's shuffled display order.
export class MatchingState {
  constructor(items) {
    this.items = items;
    this.pairs = new Map();
  }

  connect(question, answer) {
    if (![question, answer].every(id => Number.isInteger(id) && id >= 0 && id < this.items.length)) {
      throw new RangeError('Unknown question or answer');
    }
    for (const [q, a] of this.pairs) {
      if (a === answer) this.pairs.delete(q);
    }
    this.pairs.set(question, answer);
  }

  disconnect(side, id) {
    if (side === 'question') this.pairs.delete(id);
    else for (const [q, a] of this.pairs) if (a === id) this.pairs.delete(q);
  }

  get complete() {
    return this.pairs.size === this.items.length;
  }

  grade() {
    if (!this.complete) throw new Error('Connect every question before submitting.');
    const results = this.items.map((item, id) => ({
      prompt: item.prompt,
      answer: item.answer,
      selectedAnswer: this.items[this.pairs.get(id)].answer,
      correct: this.pairs.get(id) === id
    }));
    return {results, correctCount: results.filter(result => result.correct).length};
  }
}
