import { test } from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import { goalToForm, goalFormPayload, toPickerDate } from './goalForm.js';

test('save and reopen repeatedly: API strings always become valid picker objects', () => {
  let goal = { title:'Rumah', category:'PLANNED', target_amount:'100000', target_date:'2027-02-28T00:00:00.000Z' };
  for (let edit = 0; edit < 5; edit++) {
    const form = goalToForm(goal);
    assert.equal(dayjs.isDayjs(form.target_date), true);
    assert.equal(form.target_date.isValid(), true);
    assert.equal(form.target_amount, 100000);
    const payload = goalFormPayload(form);
    assert.equal(payload.target_date, '2027-02-28');
    goal = JSON.parse(JSON.stringify(payload));
  }
});

test('recurring dates roundtrip and preserve custom cycle interval', () => {
  const form = goalToForm({ category:'RECURRING', next_due_date:'2026-12-31', cycle_type:'CUSTOM', cycle_interval:45, refill_enabled:'0' });
  assert.equal(form.refill_enabled, false);
  assert.equal(goalFormPayload(form).next_due_date, '2026-12-31');
  assert.equal(goalFormPayload(form).cycle_interval, 45);
});

test('empty or corrupt dates cannot reach DatePicker as strings/objects', () => {
  for (const value of [null, undefined, '', '0000-00-00', '2026-02-30', 'bad date', {}, 1, new Date('invalid')]) assert.equal(toPickerDate(value), null);
  assert.equal(toPickerDate(dayjs('2028-02-29')).format('YYYY-MM-DD'), '2028-02-29');
});

test('opening another goal or creating one clears previous dates and fields', () => {
  const old = goalToForm({ title:'A', category:'SOCIAL', target_date:'2027-01-01', description:'Old' });
  const next = { ...old, ...goalToForm({ title:'B', category:'PROTECTION' }) };
  assert.equal(next.target_date, null);
  assert.equal(next.description, '');
  const fresh = { ...next, ...goalToForm() };
  assert.equal(fresh.title, '');
  assert.equal(fresh.category, 'PLANNED');
});

test('switching category does not submit hidden dates or refill settings', () => {
  const form = { ...goalToForm({ category:'RECURRING', next_due_date:'2027-01-01', cycle_type:'MONTHLY' }), category:'ASSET', target_date:dayjs('2027-06-01'), refill_enabled:true };
  const payload = goalFormPayload(form);
  assert.equal(payload.target_date, null);
  assert.equal(payload.next_due_date, null);
  assert.equal(payload.cycle_type, null);
  assert.equal(payload.refill_enabled, false);
});
