import { useState } from 'react';
import { getRole } from '../engine/roles';
import { getCurrentNightStep, needsIdentification } from '../engine/engine';
import type { GameState } from '../engine/types';

export function NightScreen({
  state,
  onSubmit,
  onIdentify,
}: {
  state: GameState;
  onSubmit: (targetId: string | null) => void;
  onIdentify: (playerIds: string[]) => void;
}) {
  const step = getCurrentNightStep(state);
  const stepKey = step ? `${state.round}-${step.roleId}` : null;
  const [selected, setSelected] = useState<string[]>([]);

  if (!step) return null;

  const role = getRole(step.roleId);

  if (needsIdentification(state)) {
    const expected = state.roleComposition[step.roleId] ?? 0;
    const candidates = state.players.filter((p) => p.alive && !p.roleId);

    function toggle(id: string) {
      setSelected((sel) => {
        if (sel.includes(id)) return sel.filter((x) => x !== id);
        if (sel.length >= expected) return [...sel.slice(1), id];
        return [...sel, id];
      });
    }

    return (
      <div key={stepKey}>
        <div className="top-bar">
          <h1>🌙 Đêm <span className="round-num">{state.round}</span></h1>
          <span className="role-badge role-badge-center">
            <span className="role-badge-icon">{role.icon}</span>
            <span className="role-badge-name">{role.name}</span>
          </span>
        </div>

        <div className="card">
          <h2>Ai là {role.name}?</h2>
          <p className="muted">
            Gọi {role.name} thức dậy / mở mắt, rồi chọn đúng {expected} người ({selected.length}/{expected}).
          </p>
        </div>

        {candidates.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`btn ${selected.includes(p.id) ? 'selected' : ''}`}
            onClick={() => toggle(p.id)}
          >
            {p.name}
          </button>
        ))}

        <button
          type="button"
          className="btn btn-primary"
          disabled={selected.length !== expected}
          onClick={() => {
            onIdentify(selected);
            setSelected([]);
          }}
        >
          Xác Nhận
        </button>
      </div>
    );
  }

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
    <div key={stepKey}>
      <div className="top-bar">
        <h1>🌙 Đêm <span className="round-num">{state.round}</span></h1>
        <span className="role-badge role-badge-center">
          <span className="role-badge-icon">{role.icon}</span>
          <span className="role-badge-name">{role.name}</span>
        </span>
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
