import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

function parseTimeToMin(str) {
  if (!str) return null;
  const parts = String(str).split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1];
}

function minToTimeStr(min) {
  if (min == null || isNaN(min) || min === 0) return '';
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

function buildHTML(record) {
  const days = record.dailyRecords || [];
  const totalMin = days.reduce((sum, d) => sum + calcDayMinutes(d), 0);
  const workDays = days.filter((d) => calcDayMinutes(d) > 0).length;
  const rate = Number(record.hourlyRate) || 0;
  const reward = rate && totalMin ? Math.round((totalMin / 60) * rate) : null;

  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  const rows = days.map((d) => {
    const date = d.date ? new Date(d.date) : null;
    const weekday = date ? weekdays[date.getDay()] : (d.weekday || '');
    const dayNum = date ? `${date.getMonth() + 1}/${date.getDate()}` : '';
    const isHoliday = weekday === '日';
    const isSat = weekday === '土';
    const rowBg = isHoliday ? '#ffecec' : isSat ? '#ecf0ff' : 'white';
    const dayMin = calcDayMinutes(d);

    return `<tr style="background:${rowBg}">
      <td style="padding:2px 6px;border:1px solid #ddd;text-align:center;">${dayNum}</td>
      <td style="padding:2px 6px;border:1px solid #ddd;text-align:center;">${weekday}</td>
      <td style="padding:2px 6px;border:1px solid #ddd;text-align:center;">${d.startTime || ''}</td>
      <td style="padding:2px 6px;border:1px solid #ddd;text-align:center;">${d.endTime || ''}</td>
      <td style="padding:2px 6px;border:1px solid #ddd;text-align:center;">${d.breakTime || ''}</td>
      <td style="padding:2px 6px;border:1px solid #ddd;text-align:center;color:#27ae60;font-weight:600;">${minToTimeStr(dayMin)}</td>
      <td style="padding:2px 6px;border:1px solid #ddd;">${d.notes || ''}</td>
    </tr>`;
  }).join('');

  const summaryParts = [
    `出勤日数: <strong>${workDays}日</strong>`,
    `総稼働時間: <strong>${totalMin > 0 ? minToTimeStr(totalMin) : '—'}</strong>`,
    `時給: <strong>${rate ? rate.toLocaleString('ja-JP') + '円' : '—'}</strong>`,
    `報酬: <strong style="color:#1a5276;">${reward != null ? '¥' + reward.toLocaleString('ja-JP') : '—'}</strong>`,
  ].map((s) => `<span style="margin-right:20px;">${s}</span>`).join('');

  const notesSection = record.workHoursNotes
    ? `<div style="margin-top:10px;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:4px;font-size:11px;white-space:pre-wrap;">備考: ${record.workHoursNotes}</div>`
    : '';

  return `
    <div style="
      font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Meiryo', sans-serif;
      padding: 14px 18px;
      width: 680px;
      color: #222;
      background: white;
    ">
      <h2 style="text-align:center;margin:0 0 6px;font-size:15px;">
        ${record.year}年${record.month}月 シフト表
      </h2>
      <div style="margin-bottom:6px;font-size:11px;">
        氏名: <strong>${record.name || ''}</strong>
        所属: <strong>${record.department || ''}</strong>
      </div>
      <div style="margin-bottom:8px;padding:6px 12px;background:#f0f4ff;border-radius:4px;border:1px solid #c8d8f8;font-size:11px;">
        ${summaryParts}
      </div>
      ${notesSection}
      <table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:6px;">
        <thead>
          <tr style="background:#2c3e50;color:white;">
            <th style="padding:4px 6px;border:1px solid #555;min-width:40px;">日</th>
            <th style="padding:4px 6px;border:1px solid #555;min-width:28px;">曜日</th>
            <th style="padding:4px 6px;border:1px solid #555;">開始</th>
            <th style="padding:4px 6px;border:1px solid #555;">終了</th>
            <th style="padding:4px 6px;border:1px solid #555;">休憩</th>
            <th style="padding:4px 6px;border:1px solid #555;">稼働時間</th>
            <th style="padding:4px 6px;border:1px solid #555;width:220px;">備考</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div style="margin-top:6px;font-size:9px;color:#777;text-align:right;">
        作成日: ${new Date(record.createdAt).toLocaleString('ja-JP')}
        ${record.editedAt ? `　最終編集: ${new Date(record.editedAt).toLocaleString('ja-JP')}` : ''}
      </div>
    </div>`;
}

export async function exportToPDF(record) {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.background = 'white';
  container.innerHTML = buildHTML(record);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 縦横ともにページ内に収まるようスケールを計算
    const scaleByWidth = pageWidth / canvas.width;
    const scaleByHeight = pageHeight / canvas.height;
    const scale = Math.min(scaleByWidth, scaleByHeight);
    const finalWidth = canvas.width * scale;
    const finalHeight = canvas.height * scale;

    doc.addImage(imgData, 'PNG', 0, 0, finalWidth, finalHeight);

    const filename = `シフト表_${record.year}年${record.month}月_${record.name || '無題'}.pdf`;
    doc.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}
