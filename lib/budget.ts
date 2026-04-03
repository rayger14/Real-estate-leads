type UsageBucket = {
  date: string;
  calls: number;
};

const usage = new Map<string, UsageBucket>();

export function canUsePaidModel(key: string, dailyCallLimit = 40): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const current = usage.get(key);

  if (!current || current.date !== today) {
    usage.set(key, { date: today, calls: 1 });
    return true;
  }

  if (current.calls >= dailyCallLimit) return false;
  current.calls += 1;
  return true;
}
