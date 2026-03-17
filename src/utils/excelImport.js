import * as XLSX from 'xlsx';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function formatExcelTime(val) {
  if (val == null || val === '') return '';
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      const h = date.H || 0;
      const m = date.M || 0;
      const s = date.S || 0;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(Math.round(s)).padStart(2, '0')}`;
    }
  }
  return String(val);
}

function formatExcelDate(val) {
  if (val == null || val === '') return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      const d = new Date(date.y, (date.m || 1) - 1, date.d || 1);
      return d.toISOString().slice(0, 10);
    }
  }
  return String(val);
}

export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        const year = rows[0]?.[0] ? Number(rows[0][0]) || new Date().getFullYear() : new Date().getFullYear();
        const month = rows[0]?.[3] != null ? Number(rows[0][3]) || new Date().getMonth() + 1 : new Date().getMonth() + 1;

        const name = String(rows[2]?.[6] ?? '');
        const department = String(rows[2]?.[17] ?? '');

        const totalWorkHours = rows[5]?.[0] != null ? String(rows[5][0]) : '';
        const earlyMorningHours = rows[5]?.[8] != null ? String(rows[5][8]) : '';
        const lateNightHours = rows[5]?.[16] != null ? String(rows[5][16]) : '';
        const workDays = rows[5]?.[23] != null ? String(rows[5][23]) : '';

        const toStr = (v) => (v != null && v !== '' ? String(typeof v === 'number' ? Math.round(v) : v) : '');
        const hourlyRate = toStr(rows[11]?.[33]); // 基本時給の位置を参考

        const dailyRecords = [];
        for (let r = 15; r < 46; r++) {
          const row = rows[r];
          if (!row) break;
          const dateVal = row[0];
          const dateStr = formatExcelDate(dateVal);
          if (!dateStr) continue;
          const d = new Date(dateStr);
          const weekday = WEEKDAYS[d.getDay()];
          const isTotalRow = String(dateVal).includes('合') || String(row[0]).includes('計');
          if (isTotalRow) break;

          dailyRecords.push({
            date: dateStr,
            weekday,
            clockIn: formatExcelTime(row[4]),
            clockOut: formatExcelTime(row[7]),
            breakTime: formatExcelTime(row[10]) || formatExcelTime(row[11]) || '',
            startTime: formatExcelTime(row[13]),
            endTime: formatExcelTime(row[16]),
            basicHours: row[19] != null ? String(row[19]) : '',
            earlyMorningHours: row[22] != null ? String(row[22]) : '',
            lateNightHours: row[25] != null ? String(row[25]) : '',
          });
        }

        const daysInMonth = new Date(year, month, 0).getDate();
        const finalRecords = dailyRecords.length
          ? dailyRecords
          : Array.from({ length: daysInMonth }, (_, i) => {
              const d = new Date(year, month - 1, i + 1);
              return {
                date: d.toISOString().slice(0, 10),
                weekday: WEEKDAYS[d.getDay()],
                clockIn: '',
                clockOut: '',
                breakTime: '',
                startTime: '',
                endTime: '',
                basicHours: '',
                earlyMorningHours: '',
                lateNightHours: '',
              };
            });

        resolve({
          year,
          month,
          name,
          department,
          totalWorkHours,
          earlyMorningHours,
          lateNightHours,
          workDays,
          hourlyRate,
          workHoursNotes: '',
          dailyRecords: finalRecords,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsArrayBuffer(file);
  });
}
