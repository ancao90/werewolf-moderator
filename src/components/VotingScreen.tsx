import { useState } from 'react';
import { getRole } from '../engine/roles';
import type { GameState } from '../engine/types';

export function VotingScreen({
  state,
  onResolve,
}: {
  state: GameState;
  onResolve: (eliminatedId: string | null) => void;
}) {
  const livingPlayers = state.players.filter((p) => p.alive);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div>
      <div className="top-bar">
        <h1>🗳️ Bỏ Phiếu</h1>
      </div>

      <h2 style={{ marginBottom: 16 }}>Làng đã bầu loại ai?</h2>

      {livingPlayers.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`btn ${selected === p.id ? 'selected' : ''}`}
          onClick={() => setSelected((s) => (s === p.id ? null : p.id))}
        >
          {p.name}
          {p.roleId && <span className="muted"> — {getRole(p.roleId).icon} {getRole(p.roleId).name}</span>}
        </button>
      ))}

      <button
        type="button"
        className="btn btn-primary"
        disabled={!selected}
        onClick={() => onResolve(selected)}
      >
        Xác Nhận
      </button>

      <button type="button" className="btn btn-ghost" onClick={() => onResolve(null)}>
        Không loại ai (hòa phiếu)
      </button>
    </div>
  );
}
