import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import MonthSelector from '../components/MonthSelector';
import DailyTable from '../components/DailyTable';
import { getDaysInMonth, calcSummary, minToTimeStr, HOURLY_RATE } from '../utils/timeHelpers';
import { parseExcelFile } from '../utils/excelImport';

const newDailyRecord = (d) => ({
  date: d.date,
  weekday: d.weekday,
  startTime: '',
  endTime: '',
  breakTime: '',
  notes: '',
});

export default function WorkLogPage() {
  const { history, saveToHistory, updateHistory, refreshHistory } = useAppContext();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [formData, setFormData] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [importError, setImportError] = useState('');
  const [toast, setToast] = useState('');
  const fileInputRef = useRef(null);

  // Load existing record for selected month
  useEffect(() => {
    const existing = history.find((r) => r.year === year && r.month === month);
    if (existing) {
      const base = getDaysInMonth(year, month);
      const dailyRecords = base.map((d) => {
        const ex = existing.dailyRecords?.find((r) => r.date === d.date);
        return ex ? { ...newDailyRecord(d), ...ex, date: d.date, weekday: d.weekday } : newDailyRecord(d);
      });
      setFormData({ ...existing, dailyRecords, hourlyRate: String(HOURLY_RATE) });
      setEditingId(existing.id);
    } else {
      const base = getDaysInMonth(year, month);
      setFormData({
        year,
        month,
        name: '',
        department: '',
        hourlyRate: String(HOURLY_RATE),
        workHoursNotes: '',
        dailyRecords: base.map(newDailyRecord),
      });
      setEditingId(null);
    }
  }, [year, month, history]);

  const updateDailyRecord = (index, updates) => {
    setFormData((prev) => {
      const records = [...prev.dailyRecords];
      records[index] = { ...records[index], ...updates };
      return { ...prev, dailyRecords: records };
    });
  };

  const handleSave = async () => {
    if (!formData) return;
    const data = { ...formData, year, month, hourlyRate: String(HOURLY_RATE) };
    if (editingId) {
      await updateHistory(editingId, data);
    } else {
      await saveToHistory(data);
    }
    await refreshHistory();
    showToast('保存しました');
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    try {
      const data = await parseExcelFile(file);
      setYear(data.year);
      setMonth(data.month);
      setFormData((prev) => ({ ...prev, ...data, hourlyRate: String(HOURLY_RATE) }));
      setEditingId(null);
      showToast('Excelを読み込みました');
    } catch (err) {
      setImportError(err?.message || 'インポートに失敗しました');
    }
    e.target.value = '';
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  if (!formData) return null;

  const { totalMin, workDays, reward } = calcSummary(formData.dailyRecords);

  return (
    <div className="page">
      <h2 className="page-title">稼働管理</h2>

      <MonthSelector
        year={year}
        month={month}
        onChange={(y, m) => { setYear(y); setMonth(m); }}
      />

      <div className="worklog-actions">
        <input
          type="file"
          ref={fileInputRef}
          accept=".xlsx,.xls"
          onChange={handleImportExcel}
          style={{ display: 'none' }}
        />
        <button className="btn-action" onClick={() => fileInputRef.current?.click()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Excel読込
        </button>
        <button className="btn-action primary" onClick={handleSave}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          保存
        </button>
      </div>
      {importError && <div className="import-error">{importError}</div>}

      <div className="worklog-summary">
        <div className="stat">
          <div className="stat-label">出勤日数</div>
          <div className="stat-value">{workDays}日</div>
        </div>
        <div className="stat">
          <div className="stat-label">総稼働時間</div>
          <div className="stat-value">{totalMin > 0 ? minToTimeStr(totalMin) : '—'}</div>
        </div>
        <div className="stat primary">
          <div className="stat-label">報酬</div>
          <div className="stat-value">{reward != null ? `¥${reward.toLocaleString()}` : '—'}</div>
        </div>
      </div>

      <div className="card">
        <DailyTable records={formData.dailyRecords} onUpdate={updateDailyRecord} />
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
