import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import useClockSession from '../hooks/useClockSession';
import ClockButton from '../components/ClockButton';
import SummaryCard from '../components/SummaryCard';
import { WEEKDAYS, HOURLY_RATE, calcDayMinutes, minToTimeStr, calcSummary, getDaysInMonth } from '../utils/timeHelpers';
import { updateHistory } from '../utils/storage';

export default function DashboardPage({ onNavigate }) {
  const { history, scheduleList, saveToHistory, refreshHistory } = useAppContext();
  const { isWorking, isOnBreak, elapsed, startWork, endWork, toggleBreak } = useClockSession();

  const today = new Date();
  const todayStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const todayWeekday = `${WEEKDAYS[today.getDay()]}曜日`;

  // Current month summary from history
  const monthlySummary = useMemo(() => {
    const thisYear = today.getFullYear();
    const thisMonth = today.getMonth() + 1;
    const currentRecord = history.find((r) => r.year === thisYear && r.month === thisMonth);
    if (!currentRecord) return { workDays: 0, totalMin: 0, reward: null };
    return calcSummary(currentRecord.dailyRecords);
  }, [history, today]);

  // Upcoming shifts (next 3 days with schedule)
  const upcomingShifts = useMemo(() => {
    const now = new Date();
    const upcoming = [];
    for (const schedule of scheduleList) {
      if (!schedule.days) continue;
      for (const day of schedule.days) {
        if (!day.startTime || !day.endTime) continue;
        const d = new Date(day.date);
        if (d >= now) {
          const min = calcDayMinutes(day);
          upcoming.push({ ...day, minutes: min });
        }
      }
    }
    upcoming.sort((a, b) => a.date.localeCompare(b.date));
    return upcoming.slice(0, 3);
  }, [scheduleList]);

  const handleClockToggle = async () => {
    if (isWorking) {
      const result = endWork();
      if (!result) return;

      // Find or create a history record for this month
      const existing = history.find((r) => r.year === result.year && r.month === result.month);
      if (existing) {
        const records = [...(existing.dailyRecords || [])];
        const idx = records.findIndex((r) => r.date === result.dateStr);
        const entry = {
          date: result.dateStr,
          weekday: WEEKDAYS[new Date(result.dateStr).getDay()],
          startTime: result.startTime,
          endTime: result.endTime,
          breakTime: result.breakTime,
          notes: '打刻',
        };
        if (idx >= 0) records[idx] = { ...records[idx], ...entry };
        else records.push(entry);
        await updateHistory(existing.id, { ...existing, dailyRecords: records });
      } else {
        // Create new month record
        const days = getDaysInMonth(result.year, result.month);
        const dailyRecords = days.map((d) => {
          if (d.date === result.dateStr) {
            return { date: d.date, weekday: d.weekday, startTime: result.startTime, endTime: result.endTime, breakTime: result.breakTime, notes: '打刻' };
          }
          return { date: d.date, weekday: d.weekday, startTime: '', endTime: '', breakTime: '', notes: '' };
        });
        await saveToHistory({
          year: result.year,
          month: result.month,
          name: '',
          department: '',
          hourlyRate: String(HOURLY_RATE),
          workHoursNotes: '',
          dailyRecords,
        });
      }
      await refreshHistory();
    } else {
      startWork();
    }
  };

  return (
    <div className="page">
      <div className="dash-date">
        <div className="dash-date-main">{todayStr}</div>
        <div className="dash-date-sub">{todayWeekday}</div>
      </div>

      <ClockButton isWorking={isWorking} elapsed={elapsed} onToggle={handleClockToggle} />

      {isWorking && (
        <div className="break-btn-wrap">
          <button className={`break-btn${isOnBreak ? ' on-break' : ''}`} onClick={toggleBreak}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 8h1a4 4 0 110 8h-1" />
              <path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z" />
              <line x1="6" y1="2" x2="6" y2="4" />
              <line x1="10" y1="2" x2="10" y2="4" />
              <line x1="14" y1="2" x2="14" y2="4" />
            </svg>
            {isOnBreak ? '休憩終了' : '休憩'}
          </button>
        </div>
      )}

      <div className="summary-row">
        <SummaryCard label="出勤日数" value={monthlySummary.workDays} unit="日" />
        <SummaryCard label="総稼働" value={monthlySummary.totalMin > 0 ? minToTimeStr(monthlySummary.totalMin) : '—'} />
        <SummaryCard
          label="報酬"
          value={monthlySummary.reward != null ? `¥${monthlySummary.reward.toLocaleString()}` : '—'}
          highlight
        />
      </div>

      <div className="card">
        <div className="card-title">今後のシフト予定</div>
        {upcomingShifts.length === 0 ? (
          <div className="text-muted text-center">予定なし</div>
        ) : (
          upcomingShifts.map((shift) => {
            const d = new Date(shift.date);
            return (
              <div key={shift.date} className="upcoming-item">
                <div className="upcoming-date">
                  <div className="day">{d.getDate()}</div>
                  <div className="weekday">{WEEKDAYS[d.getDay()]}</div>
                </div>
                <div className="upcoming-info">
                  <div className="upcoming-time">{shift.startTime} - {shift.endTime}</div>
                  <div className="upcoming-hours">{minToTimeStr(shift.minutes)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
