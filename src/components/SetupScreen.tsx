import { useEffect, useRef, useState } from 'react';
import { ROLE_REGISTRY } from '../engine/roles';
import type { PlayerSetup } from '../engine/engine';
import type { GameSession } from '../history';
import { formatDateTime } from '../format';

interface DraftPlayer {
  id: string;
  name: string;
}

let nextId = 1;

const ROSTER_KEY = 'werewolf_roster';

function loadRoster(): string[] {
  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'string') : [];
  } catch {
    return [];
  }
}

function makeInitialPlayers(): DraftPlayer[] {
  const saved = loadRoster();
  const names = saved.length > 0 ? saved : ['', '', '', '', ''];
  return names.map((name) => ({ id: `p${nextId++}`, name }));
}

const DISCUSSION_MINUTES_KEY = 'werewolf_discussion_minutes';

function loadDiscussionMinutes(): number {
  const raw = Number(localStorage.getItem(DISCUSSION_MINUTES_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : 3;
}

export function SetupScreen({
  session,
  onStart,
  onBack,
}: {
  session: GameSession;
  onStart: (setup: PlayerSetup[], roleComposition: Record<string, number>, discussionSeconds: number) => void;
  onBack: () => void;
}) {
  const [players, setPlayers] = useState<DraftPlayer[]>(makeInitialPlayers);
  const [focusPlayerId, setFocusPlayerId] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [counts, setCounts] = useState<Record<string, number>>({
    werewolf: 2,
    villager: 2,
    seer: 1,
  });

  const [discussionMinutes, setDiscussionMinutes] = useState<number>(loadDiscussionMinutes);

  useEffect(() => {
    localStorage.setItem(DISCUSSION_MINUTES_KEY, String(discussionMinutes));
  }, [discussionMinutes]);

  useEffect(() => {
    const names = players.map((p) => p.name);
    localStorage.setItem(ROSTER_KEY, JSON.stringify(names));
  }, [players]);

  function addPlayer() {
    const id = `p${nextId++}`;
    setPlayers((ps) => [...ps, { id, name: '' }]);
    setFocusPlayerId(id);
  }

  useEffect(() => {
    if (focusPlayerId) {
      inputRefs.current[focusPlayerId]?.focus();
      setFocusPlayerId(null);
    }
  }, [focusPlayerId]);

  function clearRoster() {
    setPlayers([
      { id: `p${nextId++}`, name: '' },
      { id: `p${nextId++}`, name: '' },
      { id: `p${nextId++}`, name: '' },
      { id: `p${nextId++}`, name: '' },
      { id: `p${nextId++}`, name: '' },
    ]);
  }

  function removePlayer(id: string) {
    setPlayers((ps) => ps.filter((p) => p.id !== id));
  }

  function updateName(id: string, name: string) {
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  function updateCount(roleId: string, count: number) {
    setCounts((c) => {
      const current = c[roleId] ?? 0;
      const otherTotal = Object.values(c).reduce((sum, n) => sum + n, 0) - current;
      const max = Math.max(current, players.length - otherTotal);
      return { ...c, [roleId]: Math.min(max, Math.max(0, count)) };
    });
  }

  const totalAssigned = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const werewolfCount = counts.werewolf ?? 0;
  const namesFilled = players.every((p) => p.name.trim().length > 0);
  const countsMatch = totalAssigned === players.length;
  const canStart = players.length >= 3 && werewolfCount >= 1 && namesFilled && countsMatch;

  function handleStart() {
    const setup: PlayerSetup[] = players.map((p) => ({ id: p.id, name: p.name.trim() }));
    onStart(setup, counts, discussionMinutes * 60);
  }

  return (
    <div>
      <div style={{ textAlign: 'center', margin: '8px 0 24px' }}>
        <span className="hero-emblem" style={{ display: 'inline-block' }}>🐺</span>
        <h1 className="hero-title">Ma Sói</h1>
        <p className="muted">
          Thêm từng người chơi, sau đó chọn bộ vai trò. Hãy xáo và chia bộ bài này cho người chơi
          trước khi bắt đầu — trong đêm đầu tiên, bạn sẽ ghi lại ai nắm vai trò nào khi gọi họ dậy.
        </p>
      </div>

      <div className="row" style={{ gap: 8, borderBottom: 'none' }}>
        <button type="button" className="btn-ghost" onClick={onBack}>
          ← Phiên lúc {formatDateTime(session.createdAt)}
        </button>
      </div>

      <div className="card">
        <h2>Người chơi</h2>
        {players.map((p, i) => (
          <div key={p.id} className="row" style={{ gap: 8 }}>
            <span className="muted" style={{ width: 18 }}>{i + 1}</span>
            <input
              ref={(el) => {
                inputRefs.current[p.id] = el;
              }}
              type="text"
              placeholder="Tên người chơi"
              value={p.name}
              onChange={(e) => updateName(p.id, e.target.value)}
            />
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

      <div className="row" style={{ gap: 8, borderBottom: 'none' }}>
        <button type="button" className="btn" onClick={addPlayer}>
          + Thêm người chơi
        </button>
        <button type="button" className="btn-ghost" onClick={clearRoster}>
          Xóa hết, nhập nhóm mới
        </button>
      </div>

      <div className="card">
        <h2>Bộ vai trò</h2>
        <p className="muted">
          Số lá bài phải khớp với số người chơi ({totalAssigned}/{players.length}).
        </p>
        {ROLE_REGISTRY.map((r) => (
          <div key={r.id} className="row" style={{ gap: 8 }}>
            <span style={{ flex: 1 }}>{r.icon} {r.name}</span>
            <button
              type="button"
              className="btn-ghost"
              aria-label={`Giảm số lượng ${r.name}`}
              onClick={() => updateCount(r.id, (counts[r.id] ?? 0) - 1)}
            >
              −
            </button>
            <span style={{ width: 24, textAlign: 'center' }}>{counts[r.id] ?? 0}</span>
            <button
              type="button"
              className="btn-ghost"
              aria-label={`Tăng số lượng ${r.name}`}
              disabled={totalAssigned >= players.length}
              onClick={() => updateCount(r.id, (counts[r.id] ?? 0) + 1)}
            >
              +
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Thời gian thảo luận</h2>
        <div className="row" style={{ gap: 8 }}>
          <span style={{ flex: 1 }}>⏱️ Mỗi ngày</span>
          <button
            type="button"
            className="btn-ghost"
            aria-label="Giảm thời gian thảo luận"
            onClick={() => setDiscussionMinutes((m) => Math.max(1, m - 1))}
          >
            −
          </button>
          <span style={{ width: 56, textAlign: 'center' }}>{discussionMinutes} phút</span>
          <button
            type="button"
            className="btn-ghost"
            aria-label="Tăng thời gian thảo luận"
            onClick={() => setDiscussionMinutes((m) => m + 1)}
          >
            +
          </button>
        </div>
      </div>

      {werewolfCount === 0 && (
        <p className="muted">Cần ít nhất một lá Ma Sói để tiếp tục.</p>
      )}
      {!namesFilled && <p className="muted">Mỗi người chơi cần có tên.</p>}
      {namesFilled && !countsMatch && (
        <p className="muted">Số lá bài phải bằng đúng số người chơi.</p>
      )}

      <button
        type="button"
        className="btn btn-primary"
        disabled={!canStart}
        onClick={handleStart}
      >
        Bắt Đầu
      </button>
    </div>
  );
}
