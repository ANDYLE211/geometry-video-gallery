(function (root) {
  'use strict';
  const categories = ['计算共形几何', '最优传输', '流体模拟'];
  const categoryRank = (value) => {
    const index = categories.indexOf(value);
    return index < 0 ? categories.length : index;
  };
  const weight = (video) => Number.isSafeInteger(video.sortWeight) ? video.sortWeight : 0;
  const dateKey = (video) => /^\d{4}-\d{2}-\d{2}$/.test(video.publishedAt || '') ? video.publishedAt : '';
  function compare(a, b, mode = 'default') {
    if (mode === 'default' || mode === 'grouped') {
      const category = categoryRank(a.category) - categoryRank(b.category);
      if (category) return category;
    }
    if (mode === 'default') {
      const priority = Number(b.pinned === true) - Number(a.pinned === true) || weight(b) - weight(a);
      if (priority) return priority;
    }
    const first = dateKey(a), second = dateKey(b);
    if (!first || !second) return first ? -1 : second ? 1 : 0;
    return mode === 'oldest' ? first.localeCompare(second) : second.localeCompare(first);
  }
  const api = { compare, categoryRank, weight };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VideoOrder = api;
})(globalThis);
