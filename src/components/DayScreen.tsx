import { getRole } from '../engine/roles';
import type { GameState } from '../engine/types';

export function DayScreen({
  state,
  onStartVote,
}: {
  state: GameState;
  onStartVote: () => void;
}) {
  const lastNightDeaths = state.deaths.filter(
    (d) => d.round === state.round && (d.cause === 'night' || d.cause === 'hunterNight'),
  );

  return (
    <div>
      <div className="top-bar">
        <h1>☀️ Ngày <span className="round-num">{state.round}</span></h1>
      </div>

      <div className="card">
        {lastNightDeaths.length === 0 ? (
          <p>Không ai chết trong đêm qua.</p>
        ) : (
          lastNightDeaths.map((d) => {
            const name = state.players.find((p) => p.id === d.playerId)?.name ?? '?';
            return <p key={d.playerId}>💀 {name} đã chết.</p>;
          })
        )}
      </div>

      <h2 style={{ marginTop: 16 }}>Người chơi</h2>
      <div className="card">
        {state.players.map((p) => (
          <div className="row" key={p.id}>
            <span>
              {p.name}
              {p.roleId && (
                <span className="muted"> — {getRole(p.roleId).icon} {getRole(p.roleId).name}</span>
              )}
            </span>
            <span className={`pill ${p.alive ? '' : 'dead'}`}>
              {p.alive ? 'còn sống' : 'đã loại'}
            </span>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-primary" onClick={onStartVote}>
        Bắt Đầu Bỏ Phiếu
      </button>
    </div>
  );
}
