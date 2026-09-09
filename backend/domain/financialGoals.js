const CATEGORIES = Object.freeze({
    PROTECTION: 'PROTECTION', PLANNED: 'PLANNED', RECURRING: 'RECURRING', ASSET: 'ASSET', SOCIAL: 'SOCIAL'
});
const LIFECYCLE = Object.freeze({ ACTIVE: 'ACTIVE', PAUSED: 'PAUSED', COMPLETED: 'COMPLETED' });
const PRIORITIES = Object.freeze({ CRITICAL: 1, HIGH: 2, MEDIUM: 3, NORMAL: 4, LOW: 5 });
const validCategory = value => Object.values(CATEGORIES).includes(value);

const money = value => Math.max(Number(value) || 0, 0);
const ratio = (current, target) => target > 0 ? current / target : 0;
const daysUntil = value => value ? Math.ceil((new Date(value).getTime() - Date.now()) / 86400000) : null;

function deriveGoal(goal) {
    const current = money(goal.collected_amount);
    const target = money(goal.target_amount);
    const progressRatio = ratio(current, target);
    const progress = Math.round(progressRatio * 1000) / 10;
    const remaining = Math.max(target - current, 0);
    const surplus = Math.max(current - target, 0);
    const reachedBefore = Boolean(goal.target_reached_at) || current >= target;
    const refillEnabled = Boolean(Number(goal.refill_enabled));
    const refillDeficit = refillEnabled && reachedBefore ? remaining : 0;
    const dueInDays = daysUntil(goal.next_due_date || goal.target_date);
    const healthyThreshold = Number(goal.healthy_threshold ?? 0.8);
    const criticalThreshold = Number(goal.critical_threshold ?? 0.5);

    let effectiveStatus = goal.lifecycle_status || LIFECYCLE.ACTIVE;
    if (effectiveStatus !== LIFECYCLE.PAUSED && effectiveStatus !== LIFECYCLE.COMPLETED) {
        if (refillDeficit > 0) effectiveStatus = 'NEEDS_REFILL';
        else if (target > 0 && current >= target) effectiveStatus = 'TARGET_REACHED';
        else if (goal.target_date && dueInDays != null && dueInDays > 0 && progressRatio >= Math.min(1, 1 - dueInDays / 365)) effectiveStatus = 'ON_TRACK';
        else effectiveStatus = LIFECYCLE.ACTIVE;
    }

    let effectivePriority = Number(goal.configured_priority) || PRIORITIES.NORMAL;
    if (goal.category === CATEGORIES.PROTECTION && progressRatio < criticalThreshold) effectivePriority = PRIORITIES.CRITICAL;
    else if (goal.category === CATEGORIES.PROTECTION && (refillDeficit > 0 || progressRatio < healthyThreshold)) effectivePriority = PRIORITIES.HIGH;
    else if (goal.category === CATEGORIES.RECURRING && dueInDays != null && dueInDays <= 45 && remaining > 0) effectivePriority = PRIORITIES.MEDIUM;
    effectivePriority = Math.min(effectivePriority, Number(goal.configured_priority) || PRIORITIES.LOW);

    return { ...goal, current_amount: current, target_amount: target, progress, remaining_amount: remaining,
        surplus_amount: surplus, refill_deficit: refillDeficit, effective_status: effectiveStatus,
        effective_priority: effectivePriority, due_in_days: dueInDays };
}

function buildRecommendation(goals, capacity) {
    let available = money(capacity);
    return goals.map(deriveGoal).filter(goal => goal.remaining_amount > 0 && goal.effective_status !== LIFECYCLE.COMPLETED)
        .sort((a, b) => a.effective_priority - b.effective_priority || b.refill_deficit - a.refill_deficit || a.remaining_amount - b.remaining_amount)
        .map(goal => {
            const need = goal.refill_deficit || goal.remaining_amount;
            const allocation = Math.min(need, available);
            available -= allocation;
            const reasons = goal.refill_deficit > 0
                ? [`Perlu refill untuk kembali ke saldo ideal`, `Prioritas P${goal.effective_priority}`]
                : [`Masih kurang menuju target`, `Prioritas P${goal.effective_priority}`];
            return { goal_id: goal.id, goal_name: goal.title, allocation, reasons, priority: goal.effective_priority };
        }).filter(item => item.allocation > 0);
}

module.exports = { CATEGORIES, LIFECYCLE, PRIORITIES, validCategory, deriveGoal, buildRecommendation };
