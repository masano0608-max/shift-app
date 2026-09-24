export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
export const HOURLY_RATE = 2400;

export function getDaysInMonth(year, month) {
  const days = new Date(year, month, 0).getDate();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(year, month - 1, i + 1);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    return { day: i + 1, weekday: WEEKDAYS[d.getDay()], date: dateStr };
  });
}

export function parseTimeToMin(str) {
  if (!str) return null;
  const parts = String(str).split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1];
}

export function minToTimeStr(min) {
  if (min == null || isNaN(min) || min === 0) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

export function calcDayMinutes(d) {
  const start = parseTimeToMin(d.startTime);
  const end = parseTimeToMin(d.endTime);
  if (start == null || end == null) return 0;
  let work = end - start;
  if (work < 0) work += 24 * 60;
  const breakMin = parseTimeToMin(d.breakTime) ?? 0;
  return Math.max(0, work - breakMin);
}

export function calcSummary(dailyRecords) {
  const records = dailyRecords || [];
  const totalMin = records.reduce((sum, d) => sum + calcDayMinutes(d), 0);
  const workDays = records.filter((d) => calcDayMinutes(d) > 0).length;
  const reward = totalMin ? Math.round((totalMin / 60) * HOURLY_RATE) : null;
  return { totalMin, workDays, reward };
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
}
