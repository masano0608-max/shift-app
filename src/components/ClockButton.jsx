export default function ClockButton({ isWorking, elapsed, onToggle }) {
  const formatElapsed = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="clock-btn-wrap">
      <button className={`clock-btn ${isWorking ? 'stop' : 'start'}`} onClick={onToggle}>
        {isWorking ? (
          <>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
            <span className="timer">{formatElapsed(elapsed)}</span>
            <span className="label">勤務終了</span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="8,5 19,12 8,19" />
            </svg>
            <span className="label">勤務スタート</span>
          </>
        )}
      </button>
    </div>
  );
}
