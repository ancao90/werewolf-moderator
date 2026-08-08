import { useEffect, useState } from 'react';
import { getRole } from '../engine/roles';
import type { GameState } from '../engine/types';

function DiscussionTimer({ round, durationSeconds }: { round: number; durationSeconds: number }) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    setSecondsLeft(durationSeconds);
    setRunning(true);
  }, [round, durationSeconds]);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running, secondsLeft]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const pct = (secondsLeft / durationSeconds) * 100;
  const timeUp = secondsLeft === 0;

  if (timeUp) {
    return (
      <div className="card">
        <div className="timer-warning timer-warning-lg">
          ⚠️ Đã hết thời gian thảo luận
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row" style={{ borderBottom: 'none', padding: '0 0 10px' }}>
        <span>⏱️ Thời gian thảo luận</span>
        <span className="pill">
          {minutes}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: 'var(--border)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            transition: 'width 1s linear',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          type="button"
          className="btn"
          style={{ flex: 1 }}
          onClick={() => setRunning((r) => !r)}
        >
          {running ? 'Tạm dừng' : 'Tiếp tục'}
        </button>
        <button
          type="button"
          className="btn"
          style={{ flex: 1 }}
          onClick={() => {
            setSecondsLeft(durationSeconds);
            setRunning(true);
          }}
        >
          Đặt lại
        </button>
      </div>
    </div>
  );
}

export function DayScreen({
  state,
  onStartVote,
}: {
  state: GameState;
  onStartVote: () => void;
}) {
  const lastNightDeaths = state.deaths.filter(
    (d) => d.round === state.round && (d.cause === 'night' || d.cause === 'hunterNight'),
  );

  return (
    <div>
      <div className="top-bar">
        <h1>☀️ Ngày <span className="round-num">{state.round}</span></h1>
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

      <DiscussionTimer round={state.round} durationSeconds={state.discussionSeconds ?? 3 * 60} />

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

      <button type="button" className="btn btn-primary" onClick={onStartVote}>
        Bắt Đầu Bỏ Phiếu
      </button>
    </div>
  );
}
