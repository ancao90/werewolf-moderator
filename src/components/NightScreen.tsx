import { getRole } from '../engine/roles';
import { getCurrentNightStep } from '../engine/engine';
import type { GameState } from '../engine/types';

export function NightScreen({
  state,
  onSubmit,
}: {
  state: GameState;
  onSubmit: (targetId: string | null) => void;
}) {
  const step = getCurrentNightStep(state);
  if (!step) return null;

  const role = getRole(step.roleId);
  const actingNames = step.actingPlayerIds
    .map((id) => state.players.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .join(' & ');
  const livingPlayers = state.players.filter((p) => p.alive);
  const instruction = role.nightInstruction?.({
    round: state.round,
    players: state.players,
    eventsSoFar: state.nightEvents,
  });

  return (
    <div>
      <div className="top-bar">
        <h1>Đêm {state.round}</h1>
        <span className="pill">{role.name}</span>
      </div>

      <div className="card">
        <h2>{actingNames}</h2>
        <p className="muted">{instruction ?? `${role.name}, hãy chọn mục tiêu.`}</p>
      </div>

      {livingPlayers.map((p) => (
        <button key={p.id} type="button" className="btn" onClick={() => onSubmit(p.id)}>
          {p.name}
        </button>
      ))}

      <button type="button" className="btn btn-ghost" onClick={() => onSubmit(null)}>
        Bỏ qua / Không chọn
      </button>
    </div>
  );
}
