import { useEffect, useRef, useState } from 'react';
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
  const stepKey = step ? `${state.round}-${step.roleId}` : null;

  const [flashKey, setFlashKey] = useState<string | null>(null);
  const prevKey = useRef<string | null>(null);

  useEffect(() => {
    if (stepKey && prevKey.current !== null && prevKey.current !== stepKey) {
      setFlashKey(stepKey);
    }
    prevKey.current = stepKey;
  }, [stepKey]);

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
    <div key={stepKey}>
      {flashKey === stepKey && (
        <div className="role-flash" onAnimationEnd={() => setFlashKey(null)}>
          <span className="role-flash-icon">{role.icon}</span>
          <h1 className="role-flash-title">{role.name}</h1>
          <p className="role-flash-names">{actingNames}</p>
        </div>
      )}

      <div className="top-bar">
        <h1>🌙 Đêm <span className="round-num">{state.round}</span></h1>
        <span className="pill">{role.icon} {role.name}</span>
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
