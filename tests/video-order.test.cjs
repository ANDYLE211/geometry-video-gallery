const assert = require('node:assert/strict');
const { compare, weight } = require('../assets/video-order.js');
const test = (name, run) => { run(); console.log(`PASS ${name}`); };

const video = (id, extra = {}) => ({ id, category: '计算共形几何', publishedAt: '2026-09-01', ...extra });
const ids = (items, mode) => items.slice().sort((a, b) => compare(a, b, mode)).map(item => item.id);

test('default prioritizes pinned videos, then descending weights within each category', () => {
  assert.deepEqual(ids([
    video('regular'), video('weighted', { sortWeight: 10 }),
    video('pinned', { pinned: true, sortWeight: -5 }),
    video('pinned-weighted', { pinned: true, sortWeight: 1 })
  ]), ['pinned-weighted', 'pinned', 'weighted', 'regular']);
});

test('default keeps entire category groups ahead of pins and weights in later groups', () => {
  const items = [
    video('fluid-pinned', { category: '流体模拟', pinned: true, sortWeight: 999999 }),
    video('transport-weighted', { category: '最优传输', sortWeight: 999999 }),
    video('geometry-low', { sortWeight: -999999 }),
    video('fluid-regular', { category: '流体模拟' }),
    video('transport-pinned', { category: '最优传输', pinned: true, sortWeight: -999999 }),
    video('geometry-pinned', { pinned: true })
  ];
  assert.deepEqual(ids(items), ['geometry-pinned', 'geometry-low', 'transport-pinned',
    'transport-weighted', 'fluid-pinned', 'fluid-regular']);
  for (const category of ['计算共形几何', '最优传输', '流体模拟']) {
    assert.deepEqual(ids(items.filter(item => item.category === category)),
      ids(items).filter(id => items.find(item => item.id === id).category === category));
  }
});

test('unconfigured videos keep the existing grouped date ordering', () => {
  const items = [video('fluid', { category: '流体模拟' }), video('old'),
    video('new', { publishedAt: '2026-10-01' }), video('undated', { publishedAt: '' })];
  assert.deepEqual(ids(items), ['new', 'old', 'undated', 'fluid']);
  assert.deepEqual(ids(items, 'grouped'), ids(items));
});

test('explicit date and grouped sorts do not apply saved priorities', () => {
  const items = [video('pinned-old', { pinned: true, sortWeight: 100 }), video('new', { publishedAt: '2026-10-01' })];
  assert.deepEqual(ids(items, 'newest'), ['new', 'pinned-old']);
  assert.deepEqual(ids(items, 'oldest'), ['pinned-old', 'new']);
  assert.deepEqual(ids(items, 'grouped'), ['new', 'pinned-old']);
});

test('unpinning restores weight-based position and filtering preserves relative order', () => {
  const items = [video('featured', { pinned: true, sortWeight: -1 }),
    video('weighted', { sortWeight: 5 }), video('regular')];
  assert.deepEqual(ids(items), ['featured', 'weighted', 'regular']);
  items[0].pinned = false;
  assert.deepEqual(ids(items), ['weighted', 'regular', 'featured']);
  const subset = items.filter(item => item.id !== 'weighted');
  assert.deepEqual(ids(subset), ids(items).filter(id => id !== 'weighted'));
});

test('unknown categories, missing dates, ties, and invalid weights remain deterministic', () => {
  const items = [video('unknown', { category: '其他' }), video('one'), video('two')];
  assert.deepEqual(ids(items), ['one', 'two', 'unknown']);
  for (const value of [undefined, null, '10', NaN, Infinity, 1.5]) assert.equal(weight({ sortWeight: value }), 0);
  assert.equal(weight({ sortWeight: -3 }), -3);
  assert.deepEqual(ids([video('missing', { publishedAt: '' }), video('dated')], 'oldest'), ['dated', 'missing']);
});
