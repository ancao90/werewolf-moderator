import { getRole } from '../engine/roles';
import type { GameResult } from '../history';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoryScreen({
  history,
  onBack,
}: {
  history: GameResult[];
  onBack: () => void;
}) {
  return (
    <div>
      <div style={{ textAlign: 'center', margin: '8px 0 24px' }}>
        <span className="hero-emblem" style={{ display: 'inline-block' }}>📜</span>
        <h1 className="hero-title">Lịch Sử Ván Đấu</h1>
      </div>

      {history.length === 0 && (
        <div className="card">
          <p className="muted">Chưa có ván nào được ghi lại.</p>
        </div>
      )}

      {history.map((game, i) => (
        <div className="card" key={i}>
          <div className="row" style={{ gap: 8 }}>
            <span style={{ flex: 1 }}>
              {game.winner === 'werewolves' ? '🐺 Ma Sói Thắng' : game.winner === 'villagers' ? '🧑‍🌾 Dân Làng Thắng' : 'Chưa rõ kết quả'}
            </span>
            <span className="muted">{formatDate(game.date)} · {game.rounds} đêm</span>
          </div>
          {game.players.map((p, j) => (
            <div className="row" key={j}>
              <span>{p.name}</span>
              <span className={`pill ${p.alive ? '' : 'dead'}`}>{getRole(p.roleId).name}</span>
            </div>
          ))}
        </div>
      ))}

      <button type="button" className="btn btn-primary" onClick={onBack}>
        Quay Lại
      </button>
    </div>
  );
}
