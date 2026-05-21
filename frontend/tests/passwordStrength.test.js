import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluatePasswordStrength, isPasswordAtLeastMedium } from '../src/utils/passwordStrength.js';

test('classifies short simple passwords as weak', () => {
  const result = evaluatePasswordStrength('abc123');

  assert.equal(result.level, 'weak');
  assert.equal(result.score < 3, true);
});

test('classifies mixed passwords with numbers as medium strength', () => {
  const result = evaluatePasswordStrength('Ticket123');

  assert.equal(result.level, 'medium');
  assert.equal(result.score, 3);
});

test('classifies long mixed passwords with symbols as strong', () => {
  const result = evaluatePasswordStrength('TicketRush#2026');

  assert.equal(result.level, 'strong');
  assert.equal(result.score, 5);
});

test('reports which password checks passed', () => {
  const result = evaluatePasswordStrength('Ticket123');

  assert.deepEqual(result.checks, {
    length: true,
    mixedCase: true,
    number: true,
    symbol: false,
    long: false,
  });
});

test('accepts only medium or strong passwords for account changes', () => {
  assert.equal(isPasswordAtLeastMedium('password123'), false);
  assert.equal(isPasswordAtLeastMedium('Ticket123'), true);
  assert.equal(isPasswordAtLeastMedium('TicketRush#2026'), true);
});
