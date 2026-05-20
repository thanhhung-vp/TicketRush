import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SEARCH_HISTORY_KEY,
  readSearchHistory,
  saveSearchTerm,
} from '../src/utils/searchHistory.js';

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
}

test('saves newest search term first and de-duplicates case-insensitively', () => {
  const storage = createStorage({
    [SEARCH_HISTORY_KEY]: JSON.stringify(['rock concert', 'Hanoi']),
  });

  assert.deepEqual(saveSearchTerm('  Rock   concert  ', storage), ['Rock concert', 'Hanoi']);
  assert.deepEqual(readSearchHistory(storage), ['Rock concert', 'Hanoi']);
});

test('limits search history to eight items', () => {
  const storage = createStorage();
  for (let i = 1; i <= 10; i += 1) {
    saveSearchTerm(`term ${i}`, storage);
  }

  assert.deepEqual(readSearchHistory(storage), [
    'term 10',
    'term 9',
    'term 8',
    'term 7',
    'term 6',
    'term 5',
    'term 4',
    'term 3',
  ]);
});

test('ignores invalid persisted search history', () => {
  const storage = createStorage({ [SEARCH_HISTORY_KEY]: '{broken' });

  assert.deepEqual(readSearchHistory(storage), []);
});
