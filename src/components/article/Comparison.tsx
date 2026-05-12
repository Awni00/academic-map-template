import { useState } from "react";

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
  const [showRight, setShowRight] = useState(true);
  return (
    <div className="comparison">
      <div className="comparison__panel">
        <strong>{leftLabel}</strong>
        <p>{left}</p>
      </div>
      <div className="comparison__panel">
        <strong>{rightLabel}</strong>
        <p>{showRight ? right : "Hidden"}</p>
        <button type="button" className="button" onClick={() => setShowRight((value) => !value)}>
          Toggle
        </button>
      </div>
    </div>
  );
}
