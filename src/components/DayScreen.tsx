import { getNightReveals } from '../engine/engine';
import { getRole } from '../engine/roles';
import type { GameState } from '../engine/types';

export function DayScreen({
  state,
  onStartVote,
}: {
  state: GameState;
  onStartVote: () => void;
}) {
  const reveals = getNightReveals(state);
  const lastNightDeaths = state.deaths.filter(
    (d) => d.round === state.round && d.cause === 'night',
  );

  return (
    <div>
      <div className="top-bar">
        <h1>Ngày {state.round}</h1>
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

      {reveals.length > 0 && (
        <div>
          <p className="muted">Thông tin chỉ dành cho quản trò:</p>
          {reveals.map((r, i) => {
            const roleName = getRole(r.roleId).name;
            const targetName = state.players.find((p) => p.id === r.targetId)?.name ?? '?';
            const teamName = r.info === 'werewolves' ? 'Ma Sói' : 'Dân làng';
            return (
              <div className="reveal-box" key={i}>
                {roleName} biết được: {targetName} thuộc phe {teamName}.
              </div>
            );
          })}
        </div>
      )}

      <h2 style={{ marginTop: 16 }}>Người chơi</h2>
      <div className="card">
        {state.players.map((p) => (
          <div className="row" key={p.id}>
            <span>{p.name}</span>
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
