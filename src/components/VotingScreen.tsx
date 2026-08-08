import type { GameState } from '../engine/types';

export function VotingScreen({
  state,
  onResolve,
}: {
  state: GameState;
  onResolve: (eliminatedId: string | null) => void;
}) {
  const livingPlayers = state.players.filter((p) => p.alive);

  return (
    <div>
      <div className="top-bar">
        <h1>🗳️ Bỏ Phiếu</h1>
      </div>

      <div className="card">
        <h2>Làng đã bầu loại ai?</h2>
      </div>

      {livingPlayers.map((p) => (
        <button key={p.id} type="button" className="btn" onClick={() => onResolve(p.id)}>
          {p.name}
        </button>
      ))}

      <button type="button" className="btn btn-ghost" onClick={() => onResolve(null)}>
        Không loại ai (hòa phiếu)
      </button>
    </div>
  );
}
