import { getRole } from '../engine/roles';
import type { GameState } from '../engine/types';

export function ResolutionScreen({
  state,
  onStartNight,
}: {
  state: GameState;
  onStartNight: () => void;
}) {
  const eliminated = state.deaths.filter(
    (d) => d.round === state.round && (d.cause === 'vote' || d.cause === 'hunterVote'),
  );

  return (
    <div>
      <div className="top-bar">
        <h1>🌅 Kết Quả Bỏ Phiếu</h1>
      </div>

      <div className="card">
        {eliminated.length === 0 ? (
          <p>Không ai bị loại.</p>
        ) : (
          eliminated.map((d) => {
            const name = state.players.find((p) => p.id === d.playerId)?.name ?? '?';
            return <p key={d.playerId}>💀 {name} đã bị loại.</p>;
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

      <button type="button" className="btn btn-primary" onClick={onStartNight}>
        Bắt Đầu Đêm Mới
      </button>
    </div>
  );
}
