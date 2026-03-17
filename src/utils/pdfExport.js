import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

function buildHTML(record) {
  const days = record.dailyRecords || [];

  const rows = days.map((d) => {
    const date = d.date ? new Date(d.date) : null;
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = date ? weekdays[date.getDay()] : (d.weekday || '');
    const dayNum = date ? `${date.getMonth() + 1}/${date.getDate()}` : '';
    const isHoliday = weekday === '日';
    const isSat = weekday === '土';
    const color = isHoliday ? '#ffecec' : isSat ? '#ecf0ff' : 'white';

    const fmt = (v) => v || '';
    return `<tr style="background:${color}">
      <td>${dayNum}</td>
      <td>${weekday}</td>
      <td>${fmt(d.clockIn)}</td>
      <td>${fmt(d.clockOut)}</td>
      <td>${fmt(d.breakTime)}</td>
      <td>${fmt(d.startTime)}</td>
      <td>${fmt(d.endTime)}</td>
      <td>${fmt(d.basicHours)}</td>
      <td>${fmt(d.earlyMorningHours)}</td>
      <td>${fmt(d.lateNightHours)}</td>
    </tr>`;
  }).join('');

  const notesRow = record.workHoursNotes
    ? `<tr><td colspan="10" style="padding:8px;font-size:11px;white-space:pre-wrap;border:1px solid #ccc;background:#fafafa;">稼働時間備考: ${record.workHoursNotes}</td></tr>`
    : '';

  const summaryItems = [
    ['総就業時間', record.totalWorkHours],
    ['早朝割増時間', record.earlyMorningHours],
    ['深夜割増時間', record.lateNightHours],
    ['出勤日数', record.workDays ? `${record.workDays}日` : ''],
    ['時給', record.hourlyRate ? `${Number(record.hourlyRate).toLocaleString('ja-JP')}円` : ''],
  ].filter(([, v]) => v).map(([k, v]) => `
    <div style="display:inline-block;margin:0 12px 6px 0;font-size:12px;">
      <span style="color:#555;">${k}: </span><strong>${v}</strong>
    </div>`).join('');

  return `
    <div style="
      font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Meiryo', sans-serif;
      padding: 24px;
      width: 1050px;
      color: #222;
    ">
      <h2 style="text-align:center;margin:0 0 8px;font-size:18px;">
        ${record.year}年${record.month}月 シフト表
      </h2>
      <div style="margin-bottom:8px;font-size:13px;">
        氏名: <strong>${record.name || ''}</strong>
        所属: <strong>${record.department || ''}</strong>
      </div>
      <div style="margin-bottom:12px;padding:8px 12px;background:#f0f4ff;border-radius:6px;border:1px solid #c8d8f8;">
        ${summaryItems}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>
          <tr style="background:#2c3e50;color:white;">
            <th style="padding:6px 4px;border:1px solid #555;min-width:40px;">日</th>
            <th style="padding:6px 4px;border:1px solid #555;min-width:28px;">曜日</th>
            <th style="padding:6px 4px;border:1px solid #555;">出社</th>
            <th style="padding:6px 4px;border:1px solid #555;">退社</th>
            <th style="padding:6px 4px;border:1px solid #555;">休憩</th>
            <th style="padding:6px 4px;border:1px solid #555;">開始</th>
            <th style="padding:6px 4px;border:1px solid #555;">終了</th>
            <th style="padding:6px 4px;border:1px solid #555;">基本</th>
            <th style="padding:6px 4px;border:1px solid #555;">早朝割増</th>
            <th style="padding:6px 4px;border:1px solid #555;">深夜割増</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          ${notesRow}
        </tbody>
      </table>
      <div style="margin-top:10px;font-size:10px;color:#777;text-align:right;">
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

    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    if (imgHeight <= pageHeight) {
      doc.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
    } else {
      // 複数ページに分割
      let yOffset = 0;
      const ratio = canvas.width / pageWidth;
      while (yOffset < canvas.height) {
        const sliceHeight = Math.min(pageHeight * ratio, canvas.height - yOffset);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        const sliceData = sliceCanvas.toDataURL('image/png');
        if (yOffset > 0) doc.addPage();
        const sliceImgHeight = (sliceHeight * pageWidth) / canvas.width;
        doc.addImage(sliceData, 'PNG', 0, 0, pageWidth, sliceImgHeight);
        yOffset += sliceHeight;
      }
    }

    const filename = `シフト表_${record.year}年${record.month}月_${record.name || '無題'}.pdf`;
    doc.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}
