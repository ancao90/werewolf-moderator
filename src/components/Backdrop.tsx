const STAR_POSITIONS = [
  [6, 10], [18, 22], [32, 6], [48, 28], [62, 12], [77, 24], [88, 8],
  [12, 45], [28, 62], [42, 50], [58, 68], [72, 52], [92, 44],
  [8, 78], [24, 88], [38, 94], [54, 82], [68, 92], [84, 76], [95, 90],
];

export function Backdrop({ phase }: { phase: string }) {
  if (phase === 'night' || phase === 'voting' || phase === 'setup') {
    return (
      <div className="backdrop" aria-hidden="true">
        <div className="moon" />
        {STAR_POSITIONS.map(([x, y], i) => (
          <span
            key={i}
            className="star"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              animationDelay: `${(i % 7) * 0.4}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (phase === 'day' || phase === 'resolution') {
    return (
      <div className="backdrop" aria-hidden="true">
        <div className="sun" />
      </div>
    );
  }

  return null;
}
