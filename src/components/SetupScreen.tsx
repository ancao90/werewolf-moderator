import { useState } from 'react';
import { ROLE_REGISTRY } from '../engine/roles';
import type { PlayerSetup } from '../engine/engine';

interface DraftPlayer {
  id: string;
  name: string;
  roleId: string;
}

let nextId = 1;

export function SetupScreen({ onStart }: { onStart: (setup: PlayerSetup[]) => void }) {
  const [players, setPlayers] = useState<DraftPlayer[]>([
    { id: `p${nextId++}`, name: '', roleId: 'werewolf' },
    { id: `p${nextId++}`, name: '', roleId: 'werewolf' },
    { id: `p${nextId++}`, name: '', roleId: 'villager' },
    { id: `p${nextId++}`, name: '', roleId: 'villager' },
    { id: `p${nextId++}`, name: '', roleId: 'seer' },
  ]);

  function addPlayer() {
    setPlayers((ps) => [...ps, { id: `p${nextId++}`, name: '', roleId: 'villager' }]);
  }

  function removePlayer(id: string) {
    setPlayers((ps) => ps.filter((p) => p.id !== id));
  }

  function updateName(id: string, name: string) {
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  function updateRole(id: string, roleId: string) {
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, roleId } : p)));
  }

  const werewolfCount = players.filter((p) => p.roleId === 'werewolf').length;
  const namesFilled = players.every((p) => p.name.trim().length > 0);
  const canStart = players.length >= 3 && werewolfCount >= 1 && namesFilled;

  return (
    <div>
      <div className="top-bar">
        <h1>Ván Mới</h1>
      </div>
      <p className="muted">Thêm từng người chơi và gán vai trò cho họ.</p>

      <div className="card">
        {players.map((p, i) => (
          <div key={p.id} className="row" style={{ gap: 8 }}>
            <span className="muted" style={{ width: 18 }}>{i + 1}</span>
            <input
              type="text"
              placeholder="Tên người chơi"
              value={p.name}
              onChange={(e) => updateName(p.id, e.target.value)}
            />
            <select value={p.roleId} onChange={(e) => updateRole(p.id, e.target.value)}>
              {ROLE_REGISTRY.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn-ghost"
              aria-label="Xóa người chơi"
              onClick={() => removePlayer(p.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="btn" onClick={addPlayer}>
        + Thêm người chơi
      </button>

      {werewolfCount === 0 && (
        <p className="muted">Cần gán ít nhất một Ma Sói để tiếp tục.</p>
      )}
      {!namesFilled && <p className="muted">Mỗi người chơi cần có tên.</p>}

      <button
        type="button"
        className="btn btn-primary"
        disabled={!canStart}
        onClick={() => onStart(players.map(({ id, name, roleId }) => ({ id, name: name.trim(), roleId })))}
      >
        Bắt Đầu
      </button>
    </div>
  );
}
