import { useState, useEffect, useRef } from 'react';
import { getHistory, saveToHistory, updateHistory, deleteFromHistory } from './utils/storage';
import { exportToPDF } from './utils/pdfExport';
import { parseExcelFile } from './utils/excelImport';
import './App.css';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function getDaysInMonth(year, month) {
  const days = new Date(year, month, 0).getDate();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(year, month - 1, i + 1);
    return { day: i + 1, weekday: WEEKDAYS[d.getDay()], date: d.toISOString().slice(0, 10) };
  });
}

function parseTimeToMin(str) {
  if (!str) return null;
  const parts = String(str).split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1];
}

function minToTimeStr(min) {
  if (min == null || isNaN(min)) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function calcDayMinutes(d) {
  const start = parseTimeToMin(d.startTime);
  const end = parseTimeToMin(d.endTime);
  if (start == null || end == null) return 0;
  let work = end - start;
  if (work < 0) work += 24 * 60;
  const breakMin = parseTimeToMin(d.breakTime) ?? 0;
  return Math.max(0, work - breakMin);
}

function calcSummary(dailyRecords, hourlyRate) {
  const records = dailyRecords || [];
  const totalMin = records.reduce((sum, d) => sum + calcDayMinutes(d), 0);
  const workDays = records.filter((d) => calcDayMinutes(d) > 0).length;
  const rate = Number(hourlyRate) || 0;
  const reward = rate && totalMin ? Math.round((totalMin / 60) * rate) : null;
  return { totalMin, workDays, reward };
}

const newDailyRecord = (d) => ({
  date: d.date,
  weekday: d.weekday,
  startTime: '',
  endTime: '',
  breakTime: '',
  notes: '',
});

const emptyRecord = () => ({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  name: '',
  department: '',
  hourlyRate: '',
  workHoursNotes: '',
  dailyRecords: getDaysInMonth(new Date().getFullYear(), new Date().getMonth() + 1).map(newDailyRecord),
});

function App() {
  const [view, setView] = useState('form');
  const [history, setHistory] = useState([]);
  const [formData, setFormData] = useState(emptyRecord());
  const [editingId, setEditingId] = useState(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setHistory(getHistory());
  }, [view]);

  const updateForm = (updates) => {
    setFormData((prev) => {
      const next = { ...prev, ...updates };
      if (updates.year !== undefined || updates.month !== undefined) {
        next.dailyRecords = getDaysInMonth(next.year, next.month).map((d) => {
          const existing = prev.dailyRecords?.find((r) => r.date === d.date);
          return existing ? { ...newDailyRecord(d), ...existing, date: d.date, weekday: d.weekday } : newDailyRecord(d);
        });
      }
      return next;
    });
  };

  const updateDailyRecord = (index, updates) => {
    setFormData((prev) => {
      const records = [...(prev.dailyRecords || [])];
      records[index] = { ...records[index], ...updates };
      return { ...prev, dailyRecords: records };
    });
  };

  const handleSave = () => {
    if (editingId) {
      updateHistory(editingId, formData);
      setEditingId(null);
    } else {
      saveToHistory(formData);
    }
    setFormData(emptyRecord());
    setView('history');
    setHistory(getHistory());
  };

  const handleEdit = (record) => {
    const base = getDaysInMonth(record.year || new Date().getFullYear(), record.month || new Date().getMonth() + 1);
    const dailyRecords = base.map((d) => {
      const existing = record.dailyRecords?.find((r) => r.date === d.date);
      return existing ? { ...newDailyRecord(d), ...existing, date: d.date, weekday: d.weekday } : newDailyRecord(d);
    });
    setFormData({ ...emptyRecord(), ...record, dailyRecords });
    setEditingId(record.id);
    setView('form');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(emptyRecord());
    setView('history');
  };

  const handleDelete = (id) => {
    if (!window.confirm('この記録を削除しますか？')) return;
    deleteFromHistory(id);
    setHistory(getHistory());
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    try {
      const data = await parseExcelFile(file);
      setFormData((prev) => ({ ...prev, ...data }));
      setEditingId(null);
      setView('form');
    } catch (err) {
      setImportError(err?.message || 'インポートに失敗しました');
    }
    e.target.value = '';
  };

  const days = formData.dailyRecords || [];
  const { totalMin, workDays, reward } = calcSummary(days, formData.hourlyRate);

  return (
    <div className="app">
      <header className="header">
        <h1>藤澤さんシフト管理</h1>
        <nav>
          <button className={view === 'form' ? 'active' : ''} onClick={() => { setView('form'); setEditingId(null); setFormData(emptyRecord()); }}>
            新規作成
          </button>
          <button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}>
            履歴一覧
          </button>
        </nav>
      </header>

      {view === 'form' && (
        <main className="form-container">
          <div className="form-header">
            <h2>{editingId ? '編集' : '新規作成'}</h2>
            <div className="import-area">
              <input type="file" ref={fileInputRef} accept=".xlsx,.xls" onChange={handleImportExcel} style={{ display: 'none' }} />
              <button className="btn-import" onClick={() => fileInputRef.current?.click()}>Excelから読み込む</button>
              {importError && <span className="import-error">{importError}</span>}
            </div>
          </div>

          <section className="section">
            <h3>基本情報</h3>
            <div className="form-row">
              <label>年</label>
              <input type="number" value={formData.year} onChange={(e) => updateForm({ year: +e.target.value })} min={2020} max={2030} />
              <label>月</label>
              <input type="number" value={formData.month} onChange={(e) => updateForm({ month: +e.target.value })} min={1} max={12} />
            </div>
            <div className="form-row">
              <label>氏名</label>
              <input value={formData.name} onChange={(e) => updateForm({ name: e.target.value })} placeholder="氏名" />
              <label>所属</label>
              <input value={formData.department} onChange={(e) => updateForm({ department: e.target.value })} placeholder="所属" />
            </div>
          </section>

          <section className="section">
            <h3>集計</h3>
            <div className="form-row">
              <label>時給（円）</label>
              <input type="number" value={formData.hourlyRate} onChange={(e) => updateForm({ hourlyRate: e.target.value })} placeholder="例: 2400" />
            </div>
            <div className="summary-cards">
              <div className="summary-card">
                <span className="summary-card-label">出勤日数</span>
                <span className="summary-card-value">{workDays}<small> 日</small></span>
              </div>
              <div className="summary-card">
                <span className="summary-card-label">総稼働時間</span>
                <span className="summary-card-value">{totalMin > 0 ? minToTimeStr(totalMin) : '—'}</span>
              </div>
              <div className="summary-card highlight">
                <span className="summary-card-label">報酬（自動計算）</span>
                <span className="summary-card-value">
                  {reward != null ? `¥${reward.toLocaleString('ja-JP')}` : '—'}
                </span>
              </div>
            </div>
            <div className="form-group-full">
              <label>備考</label>
              <textarea value={formData.workHoursNotes} onChange={(e) => updateForm({ workHoursNotes: e.target.value })} placeholder="備考を記入" rows={3} />
            </div>
          </section>

          <section className="section">
            <h3>日別勤怠</h3>
            <div className="daily-table-wrapper">
              <table className="daily-table">
                <thead>
                  <tr>
                    <th>日</th>
                    <th>曜日</th>
                    <th>開始</th>
                    <th>終了</th>
                    <th>休憩</th>
                    <th>稼働時間</th>
                    <th>備考</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d, i) => {
                    const dayMin = calcDayMinutes(d);
                    return (
                      <tr key={d.date}>
                        <td>{new Date(d.date).getDate()}</td>
                        <td>{d.weekday}</td>
                        <td><input type="time" value={d.startTime} onChange={(e) => updateDailyRecord(i, { startTime: e.target.value })} /></td>
                        <td><input type="time" value={d.endTime} onChange={(e) => updateDailyRecord(i, { endTime: e.target.value })} /></td>
                        <td><input value={d.breakTime} onChange={(e) => updateDailyRecord(i, { breakTime: e.target.value })} placeholder="0:30" size={5} /></td>
                        <td className="calc-cell">{dayMin > 0 ? minToTimeStr(dayMin) : ''}</td>
                        <td><input value={d.notes || ''} onChange={(e) => updateDailyRecord(i, { notes: e.target.value })} placeholder="備考" className="notes-input" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleSave}>保存</button>
            {editingId && <button className="btn-secondary" onClick={handleCancelEdit}>キャンセル</button>}
          </div>
        </main>
      )}

      {view === 'history' && (
        <main className="history-container">
          <h2>保存履歴</h2>
          {history.length === 0 ? (
            <p className="empty">保存された履歴はありません。</p>
          ) : (
            <ul className="history-list">
              {history.map((record) => {
                const { totalMin: tMin, reward: rwd } = calcSummary(record.dailyRecords, record.hourlyRate);
                return (
                  <li key={record.id} className="history-item">
                    <div className="history-info">
                      <span className="title">{record.year}年{record.month}月 - {record.name || '無題'}</span>
                      <span className="meta">
                        {tMin > 0 && <span>稼働: {minToTimeStr(tMin)}</span>}
                        {rwd != null && <span>　報酬: ¥{rwd.toLocaleString('ja-JP')}</span>}
                        　作成: {new Date(record.createdAt).toLocaleString('ja-JP')}
                        {record.editedAt && <span className="edited"> ｜ 編集: {new Date(record.editedAt).toLocaleString('ja-JP')}</span>}
                      </span>
                    </div>
                    <div className="history-actions">
                      <button onClick={() => handleEdit(record)}>編集</button>
                      <button onClick={() => exportToPDF(record)}>PDF</button>
                      <button className="btn-delete" onClick={() => handleDelete(record.id)}>削除</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
