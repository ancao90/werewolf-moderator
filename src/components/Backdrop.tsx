const STAR_POSITIONS = [
  [6, 10], [18, 22], [32, 6], [48, 28], [62, 12], [77, 24], [88, 8],
  [12, 45], [28, 62], [42, 50], [58, 68], [72, 52], [92, 44],
  [8, 78], [24, 88], [38, 94], [54, 82], [68, 92], [84, 76], [95, 90],
];

export function getPhaseTheme(phase: string): 'night' | 'day' | null {
  if (phase === 'night' || phase === 'setup') return 'night';
  if (phase === 'day' || phase === 'voting' || phase === 'resolution' || phase === 'gameover') return 'day';
  return null;
}

export function Backdrop({ phase }: { phase: string }) {
  const theme = getPhaseTheme(phase);

  if (theme === 'night') {
    return (
      <div className="backdrop backdrop-night" aria-hidden="true">
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

  if (theme === 'day') {
    return (
      <div className="backdrop backdrop-day" aria-hidden="true">
        <div className="sun" />
      </div>
    );
  }

  return null;
}
