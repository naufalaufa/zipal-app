import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getScheduledTheme, getNextThemeChange } from './themeSchedule.js';

test('local-time schedule and exact transition boundaries', () => {
  for (const [hour, minute, expected] of [
    [0, 0, 'dark'], [4, 59, 'dark'], [5, 0, 'light'],
    [12, 0, 'light'], [17, 59, 'light'], [18, 0, 'dark'], [23, 59, 'dark'],
  ]) {
    const now = new Date(2026, 8, 10, hour, minute);
    assert.equal(getScheduledTheme(now), expected);
    const next = getNextThemeChange(now);
    assert.ok(next > now);
    assert.notEqual(getScheduledTheme(next), expected);
    assert.equal(getScheduledTheme(new Date(next.getTime() - 1)), expected);
  }
});

test('night schedule rolls over into the next year', () => {
  assert.equal(getNextThemeChange(new Date(2026, 11, 31, 23, 59)).getTime(), new Date(2027, 0, 1, 5).getTime());
});
