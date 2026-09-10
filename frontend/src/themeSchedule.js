// Local device time, matching the application's morning/evening greeting.
export function getScheduledTheme(date = new Date()) {
  const hour = date.getHours();
  return hour >= 5 && hour < 18 ? 'light' : 'dark';
}

export function getNextThemeChange(date = new Date()) {
  const next = new Date(date);
  const hour = date.getHours();
  next.setHours(hour < 5 ? 5 : hour < 18 ? 18 : 5, 0, 0, 0);
  if (hour >= 18) next.setDate(next.getDate() + 1);
  return next;
}
