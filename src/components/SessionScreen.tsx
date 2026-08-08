import { getRole } from '../engine/roles';
import type { GameResult, GameSession } from '../history';
import { formatDateTime } from '../format';

function GameCard({ game }: { game: GameResult }) {
  return (
    <div className="card">
      <div className="row" style={{ gap: 8 }}>
        <span style={{ flex: 1 }}>
          {game.winner === 'werewolves' ? '🐺 Ma Sói Thắng' : game.winner === 'villagers' ? '🧑‍🌾 Dân Làng Thắng' : 'Chưa rõ kết quả'}
        </span>
        <span className="muted">{formatDateTime(game.date)} · {game.rounds} đêm</span>
      </div>
      {game.players.map((p, j) => (
        <div className="row" key={j}>
          <span>{p.name}</span>
          <span className={`pill ${p.alive ? '' : 'dead'}`}>{getRole(p.roleId).name}</span>
        </div>
      ))}
    </div>
  );
}

export function SessionScreen({
  session,
  onStartGame,
  onBack,
}: {
  session: GameSession;
  onStartGame: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div style={{ textAlign: 'center', margin: '8px 0 24px' }}>
        <span className="hero-emblem" style={{ display: 'inline-block' }}>📜</span>
        <h1 className="hero-title">Phiên Lúc {formatDateTime(session.createdAt)}</h1>
      </div>

      <button type="button" className="btn btn-primary" onClick={onStartGame}>
        Bắt Đầu Ván Mới
      </button>

      {session.games.length === 0 && (
        <div className="card">
          <p className="muted">Chưa có ván nào trong phiên này.</p>
        </div>
      )}

      {session.games.map((game, i) => (
        <GameCard key={i} game={game} />
      ))}

      <button type="button" className="btn-ghost" onClick={onBack}>
        ← Về Trang Chủ
      </button>
    </div>
  );
}
