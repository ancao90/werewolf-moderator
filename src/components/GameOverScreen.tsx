import { getRole } from '../engine/roles';
import type { GameState } from '../engine/types';

export function GameOverScreen({
  state,
  onNewGame,
}: {
  state: GameState;
  onNewGame: () => void;
}) {
  return (
    <div>
      <div className="top-bar">
        <h1>Kết Thúc</h1>
      </div>
      <div className="card">
        <h2>{state.winner === 'werewolves' ? '🐺 Ma Sói thắng!' : '🧑‍🌾 Dân làng thắng!'}</h2>
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
    </div>
  );
}
