export function yerevanToday(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Yerevan' });
}

export function addCalendarDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}
