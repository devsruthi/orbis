const MS_PER_DAY = 86_400_000;

export function utcDateKey(value: string | Date): string {
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 10);
}

export function previousUtcDateKey(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return utcDateKey(new Date(date.getTime() - MS_PER_DAY));
}

export function endOfUtcDay(dateKey: string): string {
  return `${dateKey}T23:59:59.999Z`;
}

export function addUtcDaysIso(now: string | Date, days: number): string {
  const date = typeof now === "string" ? new Date(now) : now;
  return new Date(date.getTime() + days * MS_PER_DAY).toISOString();
}

export function learningStreak(
  completedAt: string[],
  now: Date = new Date(),
): number {
  const days = new Set(
    completedAt.map((value) => utcDateKey(value)).filter(Boolean),
  );
  if (days.size === 0) {
    return 0;
  }
  const today = utcDateKey(now);
  const yesterday = previousUtcDateKey(today);
  let cursor = days.has(today) ? today : days.has(yesterday) ? yesterday : null;
  if (!cursor) {
    return 0;
  }
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = previousUtcDateKey(cursor);
  }
  return streak;
}
