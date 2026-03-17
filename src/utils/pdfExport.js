import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

function formatTime(val) {
  if (!val) return '';
  if (typeof val === 'string' && val.includes(':')) return val.slice(0, 5);
  return String(val);
}

function formatHours(val) {
  if (!val) return '0:00';
  if (typeof val === 'string') return val;
  const h = Math.floor(val);
  const m = Math.round((val % 1) * 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

export function exportToPDF(record) {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.text(`${record.year}年${record.month}月 シフト表`, pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`氏名: ${record.name || ''}  所属: ${record.department || ''}`, 14, 25);

  const summaryData = [
    ['総就業時間', record.totalWorkHours || '', '早朝割増時間', record.earlyMorningHours || '', '深夜割増時間', record.lateNightHours || '', '出勤日数', record.workDays || ''],
    ['時給（円）', record.hourlyRate ? `${record.hourlyRate}円` : '', '', '', '', '', '', ''],
  ];

  autoTable(doc, {
    startY: 32,
    head: [['項目', '値', '項目', '値', '項目', '値', '項目', '値']],
    body: summaryData,
    theme: 'grid',
    styles: { fontSize: 9 },
  });

  const dailyRecords = record.dailyRecords || [];
  const tableData = dailyRecords.map((d) => {
    const date = d.date ? new Date(d.date) : null;
    const weekday = date ? weekdays[date.getDay()] : (d.weekday || '');
    return [
      date ? `${date.getMonth() + 1}/${date.getDate()}` : '',
      weekday,
      formatTime(d.clockIn),
      formatTime(d.clockOut),
      formatTime(d.breakTime),
      formatTime(d.startTime),
      formatTime(d.endTime),
      formatHours(d.basicHours),
      formatHours(d.earlyMorningHours),
      formatHours(d.lateNightHours),
    ];
  });

  let currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 70;
  if (record.workHoursNotes) {
    doc.setFontSize(9);
    doc.text('稼働時間備考:', 14, currentY);
    currentY += 6;
    const splitNotes = doc.splitTextToSize(record.workHoursNotes, pageWidth - 28);
    doc.text(splitNotes, 14, currentY);
    currentY += splitNotes.length * 5 + 8;
  }

  autoTable(doc, {
    startY: currentY,
    head: [['日', '曜日', '出社', '退社', '休憩', '開始時刻', '終了時刻', '基本', '早朝割増', '深夜割増']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8 },
  });

  if (record.editedAt) {
    doc.setFontSize(8);
    doc.text(`最終編集: ${new Date(record.editedAt).toLocaleString('ja-JP')}`, 14, doc.internal.pageSize.getHeight() - 10);
  }
  doc.text(`作成日: ${new Date(record.createdAt).toLocaleString('ja-JP')}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });

  const filename = `シフト表_${record.year}年${record.month}月_${record.name || '無題'}.pdf`;
  doc.save(filename);
}
