export function yerevanToday(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Yerevan' });
}

export function addCalendarDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

/** Value for datetime-local controls, always expressed in Yerevan civil time. */
export function yerevanDateTime(now = new Date()): string {
  return `${yerevanToday(now)}T${now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Yerevan', hour: '2-digit', minute: '2-digit', hour12: false })}`;
}
