import type { GameSession } from '../history';
import { formatDateTime } from '../format';

export function HomeScreen({
  sessions,
  onCreateSession,
  onSelectSession,
}: {
  sessions: GameSession[];
  onCreateSession: () => void;
  onSelectSession: (id: string) => void;
}) {
  return (
    <div>
      <div style={{ textAlign: 'center', margin: '8px 0 24px' }}>
        <span className="hero-emblem" style={{ display: 'inline-block' }}>🐺</span>
        <h1 className="hero-title">Ma Sói</h1>
        <p className="muted">Chọn một phiên để tiếp tục, hoặc tạo phiên mới để bắt đầu chơi.</p>
      </div>

      <button type="button" className="btn btn-primary" onClick={onCreateSession}>
        + Tạo Phiên Mới
      </button>

      {sessions.length === 0 && (
        <div className="card">
          <p className="muted">Chưa có phiên nào. Hãy tạo một phiên để bắt đầu.</p>
        </div>
      )}

      {sessions.map((s) => (
        <div
          className="card"
          key={s.id}
          onClick={() => onSelectSession(s.id)}
          style={{ cursor: 'pointer' }}
        >
          <div className="row" style={{ gap: 8 }}>
            <span style={{ flex: 1 }}>Phiên lúc {formatDateTime(s.createdAt)}</span>
            <span className="muted">{s.games.length} ván</span>
          </div>
        </div>
      ))}
    </div>
  );
}
