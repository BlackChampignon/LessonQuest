import test from 'node:test';
import assert from 'node:assert/strict';
import {MatchingState} from '../app/static/js/games/matching_state.js';

const items = [
  {prompt:'Red planet?',answer:'Mars'},
  {prompt:'Largest ocean?',answer:'Pacific'},
  {prompt:'Bees make?',answer:'Honey'}
];

test('submission requires every question to have an answer', () => {
  const state = new MatchingState(items);
  state.connect(0, 1);
  assert.equal(state.complete, false);
  assert.throws(() => state.grade(), /Connect every question/);
});

test('reassigning either endpoint keeps matches one-to-one', () => {
  const state = new MatchingState(items);
  state.connect(0, 0);
  state.connect(1, 1);
  state.connect(0, 1);
  assert.deepEqual([...state.pairs], [[0, 1]]);
  state.connect(2, 1);
  assert.deepEqual([...state.pairs], [[2, 1]]);
  state.disconnect('answer', 1);
  assert.equal(state.pairs.size, 0);
  state.connect(0, 0);
  state.disconnect('question', 0);
  assert.equal(state.pairs.size, 0);
});

test('grading uses pair identity, includes chosen answers, and leaves connections intact', () => {
  const state = new MatchingState(items);
  state.connect(2, 2);
  state.connect(0, 1);
  state.connect(1, 0);
  const grade = state.grade();
  assert.equal(state.complete, true);
  assert.equal(grade.correctCount, 1);
  assert.deepEqual(grade.results.map(r => r.correct), [false, false, true]);
  assert.equal(grade.results[0].selectedAnswer, 'Pacific');
  assert.equal(grade.results[0].answer, 'Mars');
  assert.equal(state.pairs.size, 3);
});

test('all correct pairs earn a perfect result regardless of connection order', () => {
  const state = new MatchingState(items);
  [2, 0, 1].forEach(id => state.connect(id, id));
  assert.equal(state.grade().correctCount, 3);
});

test('invalid endpoints cannot change connections', () => {
  const state = new MatchingState(items);
  for (const [q,a] of [[-1,0],[0,3],[0,NaN],[.5,1]]) assert.throws(() => state.connect(q,a), RangeError);
  assert.equal(state.pairs.size, 0);
});
