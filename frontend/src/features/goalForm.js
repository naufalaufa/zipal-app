import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';

dayjs.extend(customParseFormat);
export const goalDefaults = { category: 'PLANNED', configured_priority: 4, healthy_threshold: .8, critical_threshold: .5, refill_enabled: false };

export function toPickerDate(value) {
  if (value == null || value === '') return null;
  if (dayjs.isDayjs(value)) return value.isValid() ? value : null;
  if (typeof value === 'string') {
    // SQL DATE / ISO date fields represent a calendar day, not a timezone shift.
    const date = dayjs(value.slice(0, 10), 'YYYY-MM-DD', true);
    return date.isValid() ? date : null;
  }
  if (value instanceof Date) {
    const date = dayjs(value);
    return date.isValid() ? date : null;
  }
  return null;
}

export function goalToForm(goal = {}) {
  return {
    ...goalDefaults,
    title: goal.title ?? '', description: goal.description ?? '',
    category: goal.category ?? goalDefaults.category,
    target_amount: goal.target_amount == null ? null : Number(goal.target_amount),
    collected_amount: undefined,
    configured_priority: goal.configured_priority == null ? 4 : Number(goal.configured_priority),
    healthy_threshold: Number(goal.healthy_threshold ?? .8), critical_threshold: Number(goal.critical_threshold ?? .5),
    refill_enabled: goal.refill_enabled === true || goal.refill_enabled === 1 || goal.refill_enabled === '1',
    target_date: toPickerDate(goal.target_date), next_due_date: toPickerDate(goal.next_due_date),
    cycle_type: goal.cycle_type ?? undefined, cycle_interval: goal.cycle_interval ?? null,
    lifecycle_status: goal.lifecycle_status ?? 'ACTIVE',
  };
}

export function goalFormPayload(values) {
  const planned = ['PLANNED', 'SOCIAL'].includes(values.category);
  const recurring = values.category === 'RECURRING';
  return {
    ...values,
    target_date: planned ? toPickerDate(values.target_date)?.format('YYYY-MM-DD') ?? null : null,
    next_due_date: recurring ? toPickerDate(values.next_due_date)?.format('YYYY-MM-DD') ?? null : null,
    cycle_type: recurring ? values.cycle_type : null,
    cycle_interval: recurring ? values.cycle_interval : null,
    refill_enabled: values.category === 'PROTECTION' && Boolean(values.refill_enabled),
  };
}
