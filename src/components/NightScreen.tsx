import { useState } from 'react';
import { getRole } from '../engine/roles';
import { WITCH_HEAL, WITCH_POISON_PREFIX, witchHealUsed, witchPoisonUsed } from '../engine/roles/witch';
import { bodyguardRepeatTargetId } from '../engine/roles/bodyguard';
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
  const [witchHeal, setWitchHeal] = useState(false);
  const [witchPoisonTarget, setWitchPoisonTarget] = useState<string | null>(null);

  if (!step) return null;

  const role = getRole(step.roleId);

  if (step.allHoldersDead) {
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
          <h2>{role.name}</h2>
          <p className="muted">
            Gọi {role.name} thức dậy / mở mắt như bình thường, rồi cho ngủ lại ngay (không còn ai giữ vai này).
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={() => onSubmit(null)}>
          Tiếp Tục
        </button>
      </div>
    );
  }

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

  if (!role.resolveNightAction) {
    const actingNames = step.actingPlayerIds
      .map((id) => state.players.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join(' & ');
    const instruction = role.nightInstruction?.({
      round: state.round,
      players: state.players,
      eventsSoFar: state.nightEvents,
      history: state.allNightEvents,
      previousNightEvents: state.previousNightEvents,
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
          <p className="muted">{instruction ?? `Gọi ${role.name} thức dậy rồi cho ngủ lại ngay.`}</p>
        </div>

        <button type="button" className="btn btn-primary" onClick={() => onSubmit(null)}>
          Tiếp Tục
        </button>
      </div>
    );
  }

  if (role.id === 'witch') {
    const victimId = state.nightEvents.find((e) => e.type === 'kill')?.targetId;
    const victim = victimId ? state.players.find((p) => p.id === victimId) : undefined;
    const healPotionUsed = witchHealUsed(state.allNightEvents);
    const poisonPotionUsed = witchPoisonUsed(state.allNightEvents);
    const healAvailable = !!victim && !healPotionUsed;
    const poisonAvailable = !poisonPotionUsed;
    const livingPlayers = state.players.filter((p) => p.alive);

    function submitWitch() {
      const parts: string[] = [];
      if (witchHeal) parts.push(WITCH_HEAL);
      if (witchPoisonTarget) parts.push(`${WITCH_POISON_PREFIX}${witchPoisonTarget}`);
      onSubmit(parts.length > 0 ? parts.join('|') : null);
      setWitchHeal(false);
      setWitchPoisonTarget(null);
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
          <h2>{role.name}</h2>
          <p className="muted">
            {victim ? `${victim.name} vừa bị Ma Sói cắn.` : 'Đêm nay không ai bị Ma Sói cắn.'}
          </p>
          <p className="muted">🧪 Thuốc cứu: {healPotionUsed ? 'đã dùng' : 'còn 1 lần'}</p>
          <p className="muted">☠️ Thuốc độc: {poisonPotionUsed ? 'đã dùng' : 'còn 1 lần'}</p>
        </div>

        {healAvailable && (
          <button
            type="button"
            className={`btn ${witchHeal ? 'selected' : ''}`}
            onClick={() => setWitchHeal((v) => !v)}
          >
            Cứu {victim!.name}
          </button>
        )}

        {poisonAvailable && (
          <>
            <p className="muted">Đầu độc ai đó?</p>
            {livingPlayers.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`btn ${witchPoisonTarget === p.id ? 'selected' : ''}`}
                onClick={() => setWitchPoisonTarget((t) => (t === p.id ? null : p.id))}
              >
                {p.name}
                {state.round > 1 && p.roleId && (
                  <span className="muted"> — {getRole(p.roleId).icon} {getRole(p.roleId).name}</span>
                )}
              </button>
            ))}
          </>
        )}

        <button type="button" className="btn btn-primary" onClick={submitWitch}>
          Xác Nhận
        </button>
      </div>
    );
  }

  const actingNames = step.actingPlayerIds
    .map((id) => state.players.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .join(' & ');
  const repeatTargetId = role.id === 'bodyguard' ? bodyguardRepeatTargetId(state.previousNightEvents) : null;
  const livingPlayers = state.players.filter((p) => p.alive && p.id !== repeatTargetId);
  const instruction = role.nightInstruction?.({
    round: state.round,
    players: state.players,
    eventsSoFar: state.nightEvents,
    history: state.allNightEvents,
    previousNightEvents: state.previousNightEvents,
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
          {state.round > 1 && p.roleId && (
            <span className="muted"> — {getRole(p.roleId).icon} {getRole(p.roleId).name}</span>
          )}
        </button>
      ))}

      <button type="button" className="btn btn-ghost" onClick={() => onSubmit(null)}>
        Bỏ qua / Không chọn
      </button>
    </div>
  );
}
