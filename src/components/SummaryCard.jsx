export default function SummaryCard({ label, value, unit, highlight }) {
  return (
    <div className={`summary-card${highlight ? ' highlight' : ''}`}>
      <div className="label">{label}</div>
      <div className="value">
        {value}
        {unit && <span className="unit"> {unit}</span>}
      </div>
    </div>
  );
}
