import { calcDayMinutes, minToTimeStr } from '../utils/timeHelpers';

export default function DailyTable({ records, onUpdate, notesLabel = '備考' }) {
  return (
    <div className="daily-table-wrap">
      <table className="daily-table">
        <thead>
          <tr>
            <th>日</th>
            <th>曜日</th>
            <th>開始</th>
            <th>終了</th>
            <th>休憩</th>
            <th>稼働</th>
            <th>{notesLabel}</th>
          </tr>
        </thead>
        <tbody>
          {records.map((d, i) => {
            const dayMin = calcDayMinutes(d);
            const isSun = d.weekday === '日';
            const isSat = d.weekday === '土';
            return (
              <tr key={d.date}>
                <td className="day-col">{Number(d.date.slice(8, 10))}</td>
                <td className={`weekday-col${isSun ? ' sun' : isSat ? ' sat' : ''}`}>{d.weekday}</td>
                <td>
                  <input
                    type="time"
                    value={d.startTime || ''}
                    onChange={(e) => onUpdate(i, { startTime: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="time"
                    value={d.endTime || ''}
                    onChange={(e) => onUpdate(i, { endTime: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={d.breakTime || ''}
                    onChange={(e) => onUpdate(i, { breakTime: e.target.value })}
                    placeholder="0:30"
                  />
                </td>
                <td className="calc-cell">{dayMin > 0 ? minToTimeStr(dayMin) : ''}</td>
                <td>
                  <input
                    type="text"
                    className="notes-input"
                    value={d.notes || d.memo || ''}
                    onChange={(e) => onUpdate(i, { [d.memo !== undefined ? 'memo' : 'notes']: e.target.value })}
                    placeholder={notesLabel}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
