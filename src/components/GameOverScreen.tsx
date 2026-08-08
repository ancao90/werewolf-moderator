import { getRole } from '../engine/roles';
import type { GameState } from '../engine/types';

const WOLF_CONFETTI = ['🐺', '🌙', '🩸', '🐾'];
const VILLAGER_CONFETTI = ['🎉', '🧑‍🌾', '☀️', '✨'];
const TANNER_CONFETTI = ['🎭', '⚰️', '🖤', '✨'];

function Confetti({ winner }: { winner: 'werewolves' | 'villagers' | 'tanner' }) {
  const icons = winner === 'werewolves' ? WOLF_CONFETTI : winner === 'tanner' ? TANNER_CONFETTI : VILLAGER_CONFETTI;
  const pieces = Array.from({ length: 24 }, (_, i) => ({
    icon: icons[i % icons.length],
    left: (i * 37) % 100,
    duration: 4 + (i % 5),
    delay: (i % 8) * 0.4,
  }));

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        >
          {p.icon}
        </span>
      ))}
    </div>
  );
}

export function GameOverScreen({
  state,
  onNewGame,
  onHome,
}: {
  state: GameState;
  onNewGame: () => void;
  onHome: () => void;
}) {
  const winner = state.winner ?? 'villagers';

  return (
    <div>
      {state.winner && <Confetti winner={winner} />}

      <div className="card gameover-banner">
        <span className="gameover-emoji">
          {winner === 'werewolves' ? '🐺' : winner === 'tanner' ? '🎭' : '🧑‍🌾'}
        </span>
        <h1 className="hero-title" style={{ fontSize: 30 }}>
          {winner === 'werewolves' ? 'Ma Sói Thắng!' : winner === 'tanner' ? 'Kẻ Chán Đời Thắng!' : 'Dân Làng Thắng!'}
        </h1>
      </div>

      <h2>Danh sách cuối cùng</h2>
      <div className="card">
        {state.players.map((p) => (
          <div className="row" key={p.id}>
            <span>{p.name}</span>
            <span className={`pill ${p.alive ? '' : 'dead'}`}>{getRole(p.roleId).name}</span>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-primary" onClick={onNewGame}>
        Ván Mới
      </button>
      <button type="button" className="btn btn-ghost" onClick={onHome}>
        Về Trang Chủ
      </button>
    </div>
  );
}
