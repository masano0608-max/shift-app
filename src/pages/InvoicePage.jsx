import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { exportToPDF } from '../utils/pdfExport';
import { calcSummary, minToTimeStr, HOURLY_RATE } from '../utils/timeHelpers';

export default function InvoicePage({ onEditRecord }) {
  const { history, deleteFromHistory, refreshHistory } = useAppContext();
  const [toast, setToast] = useState('');

  const handleDelete = async (id) => {
    if (!window.confirm('この記録を削除しますか？')) return;
    await deleteFromHistory(id);
    await refreshHistory();
    showToast('削除しました');
  };

  const handlePDF = async (record) => {
    // Ensure hourlyRate is set for PDF
    const pdfRecord = { ...record, hourlyRate: String(HOURLY_RATE) };
    await exportToPDF(pdfRecord);
    showToast('PDFをダウンロードしました');
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  return (
    <div className="page">
      <h2 className="page-title">請求書</h2>

      {history.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p>保存された履歴はありません</p>
        </div>
      ) : (
        <ul className="invoice-list">
          {history.map((record) => {
            const { totalMin, workDays, reward } = calcSummary(record.dailyRecords);
            return (
              <li key={record.id} className="invoice-item">
                <div className="invoice-item-header">
                  <span className="invoice-item-title">{record.year}年{record.month}月 請求書</span>
                  <span className="invoice-item-amount">
                    {reward != null ? `¥${reward.toLocaleString()}` : '—'}
                  </span>
                </div>
                <div className="invoice-item-meta">
                  {workDays > 0 && <span>出勤: {workDays}日</span>}
                  {totalMin > 0 && <span> / 稼働: {minToTimeStr(totalMin)}</span>}
                  <span> / 作成: {new Date(record.createdAt).toLocaleDateString('ja-JP')}</span>
                  {record.editedAt && <span> / 編集: {new Date(record.editedAt).toLocaleDateString('ja-JP')}</span>}
                </div>
                <div className="invoice-item-actions">
                  <button onClick={() => onEditRecord(record)}>編集</button>
                  <button className="btn-pdf" onClick={() => handlePDF(record)}>PDF出力</button>
                  <button className="btn-delete" onClick={() => handleDelete(record.id)}>削除</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
