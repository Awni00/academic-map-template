type ComparisonProps = {
  leftLabel?: string;
  rightLabel?: string;
  left: string;
  right: string;
};

export default function Comparison({
  leftLabel = "Before",
  rightLabel = "After",
  left,
  right
}: ComparisonProps) {
  return (
    <div className="comparison">
      <div className="comparison__panel">
        <strong>{leftLabel}</strong>
        <p>{left}</p>
      </div>
      <div className="comparison__panel">
        <strong>{rightLabel}</strong>
        <p>{right}</p>
      </div>
    </div>
  );
}
