import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import MonthSelector from '../components/MonthSelector';
import { getDaysInMonth, calcDayMinutes, minToTimeStr, WEEKDAYS } from '../utils/timeHelpers';

export default function SchedulePage() {
  const { scheduleList, getScheduleByMonth, saveSchedule, updateSchedule, deleteSchedule, refreshSchedules } = useAppContext();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [scheduleId, setScheduleId] = useState(null);
  const [days, setDays] = useState([]);
  const [toast, setToast] = useState('');

  // Form state for quick entry
  const [formDate, setFormDate] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formBreak, setFormBreak] = useState('');
  const [formMemo, setFormMemo] = useState('');

  // Load schedule for selected month
  useEffect(() => {
    (async () => {
      const existing = await getScheduleByMonth(year, month);
      const base = getDaysInMonth(year, month);
      if (existing) {
        const merged = base.map((d) => {
          const ex = existing.days?.find((r) => r.date === d.date);
          return ex ? { ...ex, date: d.date, weekday: d.weekday } : { date: d.date, weekday: d.weekday, startTime: '', endTime: '', breakTime: '', memo: '' };
        });
        setDays(merged);
        setScheduleId(existing.id);
      } else {
        setDays(base.map((d) => ({ date: d.date, weekday: d.weekday, startTime: '', endTime: '', breakTime: '', memo: '' })));
        setScheduleId(null);
      }
    })();
  }, [year, month, getScheduleByMonth]);

  // Set default form date to today or first of selected month
  useEffect(() => {
    const today = new Date();
    if (today.getFullYear() === year && today.getMonth() + 1 === month) {
      setFormDate(`${year}-${String(month).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
    } else {
      setFormDate(`${year}-${String(month).padStart(2, '0')}-01`);
    }
  }, [year, month]);

  // Filter days that have schedule
  const scheduledDays = useMemo(() =>
    days.filter((d) => d.startTime && d.endTime).sort((a, b) => a.date.localeCompare(b.date)),
    [days]
  );

  const totalPlannedMin = useMemo(() => scheduledDays.reduce((sum, d) => sum + calcDayMinutes(d), 0), [scheduledDays]);
  const plannedWorkDays = scheduledDays.length;

  const handleSubmit = async () => {
    if (!formDate || !formStart || !formEnd) return;

    const updated = days.map((d) => {
      if (d.date === formDate) {
        return { ...d, startTime: formStart, endTime: formEnd, breakTime: formBreak, memo: formMemo };
      }
      return d;
    });
    setDays(updated);

    // Auto-save to Firestore
    const scheduleData = { year, month, days: updated };
    if (scheduleId) {
      await updateSchedule(scheduleId, scheduleData);
    } else {
      const saved = await saveSchedule(scheduleData);
      setScheduleId(saved.id);
    }
    await refreshSchedules();

    showToast('シフトを登録しました');
    // Reset form (keep date for consecutive entry)
    setFormStart('');
    setFormEnd('');
    setFormBreak('');
    setFormMemo('');
  };

  const handleDeleteDay = async (dateStr) => {
    const updated = days.map((d) => {
      if (d.date === dateStr) {
        return { ...d, startTime: '', endTime: '', breakTime: '', memo: '' };
      }
      return d;
    });
    setDays(updated);

    if (scheduleId) {
      await updateSchedule(scheduleId, { year, month, days: updated });
      await refreshSchedules();
      showToast('削除しました');
    }
  };

  const handleEditDay = (day) => {
    setFormDate(day.date);
    setFormStart(day.startTime);
    setFormEnd(day.endTime);
    setFormBreak(day.breakTime || '');
    setFormMemo(day.memo || '');
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  // Calculate min date and max date for date input
  const minDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const maxDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return (
    <div className="page">
      <h2 className="page-title">シフト予定</h2>

      <MonthSelector
        year={year}
        month={month}
        onChange={(y, m) => { setYear(y); setMonth(m); }}
      />

      {/* Quick entry form */}
      <div className="card">
        <div className="card-title">シフト登録</div>
        <div className="schedule-form">
          <div className="form-group">
            <label>日付</label>
            <input
              type="date"
              value={formDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
          </div>
          <div className="time-row">
            <div className="form-group">
              <label>開始時間</label>
              <input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)} />
            </div>
            <div className="form-group">
              <label>終了時間</label>
              <input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} />
            </div>
          </div>
          <div className="time-row">
            <div className="form-group">
              <label>休憩</label>
              <input
                type="text"
                value={formBreak}
                onChange={(e) => setFormBreak(e.target.value)}
                placeholder="0:30"
              />
            </div>
            <div className="form-group">
              <label>メモ</label>
              <input
                type="text"
                value={formMemo}
                onChange={(e) => setFormMemo(e.target.value)}
                placeholder="任意"
              />
            </div>
          </div>
          <button
            className="btn-submit"
            onClick={handleSubmit}
            disabled={!formDate || !formStart || !formEnd}
          >
            {days.find((d) => d.date === formDate && d.startTime) ? '上書き登録' : '登録'}
          </button>
        </div>
      </div>

      {/* Summary */}
      {plannedWorkDays > 0 && (
        <div className="schedule-summary">
          <div className="stat">
            <div className="stat-label">予定出勤日数</div>
            <div className="stat-value">{plannedWorkDays}日</div>
          </div>
          <div className="stat">
            <div className="stat-label">予定総稼働</div>
            <div className="stat-value">{minToTimeStr(totalPlannedMin)}</div>
          </div>
        </div>
      )}

      {/* Schedule list */}
      <div className="card">
        <div className="card-title">{year}年{month}月のシフト</div>
        {scheduledDays.length === 0 ? (
          <div className="text-muted text-center" style={{ padding: '20px 0' }}>
            シフト予定がありません
          </div>
        ) : (
          scheduledDays.map((day) => {
            const d = new Date(day.date);
            const dayNum = d.getDate();
            const weekday = WEEKDAYS[d.getDay()];
            const min = calcDayMinutes(day);
            return (
              <div key={day.date} className="schedule-entry" onClick={() => handleEditDay(day)}>
                <div className="schedule-entry-date">
                  <div className="day">{dayNum}</div>
                  <div className={`weekday${weekday === '日' ? ' sun' : weekday === '土' ? ' sat' : ''}`} style={{ color: weekday === '日' ? 'var(--red)' : weekday === '土' ? '#3b82f6' : undefined }}>
                    {weekday}
                  </div>
                </div>
                <div className="schedule-entry-time">
                  {day.startTime} - {day.endTime}
                  {day.memo && <span style={{ marginLeft: 8, color: 'var(--gray-400)', fontSize: '0.8rem' }}>{day.memo}</span>}
                </div>
                <div className="schedule-entry-hours">{minToTimeStr(min)}</div>
                <div className="schedule-entry-actions">
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteDay(day.date); }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
