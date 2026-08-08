import type { GameState, Team } from './engine/types';

const SESSIONS_KEY = 'werewolf_sessions';
const LEGACY_HISTORY_KEY = 'werewolf_history';
const MAX_SESSIONS = 50;
const MAX_GAMES_PER_SESSION = 200;

export interface GameResultPlayer {
  name: string;
  roleId: string;
  alive: boolean;
}

export interface GameResult {
  date: string;
  rounds: number;
  winner: Team | null;
  players: GameResultPlayer[];
}

export interface GameSession {
  id: string;
  createdAt: string;
  /** Newest first. */
  games: GameResult[];
}

function migrateLegacyHistory(): GameSession[] {
  try {
    const raw = localStorage.getItem(LEGACY_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    const games = parsed as GameResult[];
    const session: GameSession = {
      id: crypto.randomUUID(),
      createdAt: games[games.length - 1].date,
      games,
    };
    localStorage.setItem(SESSIONS_KEY, JSON.stringify([session]));
    localStorage.removeItem(LEGACY_HISTORY_KEY);
    return [session];
  } catch {
    return [];
  }
}

function saveSessions(sessions: GameSession[]): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
}

/** All sessions, newest-created first. */
export function loadSessions(): GameSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return migrateLegacyHistory();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getSession(id: string): GameSession | null {
  return loadSessions().find((s) => s.id === id) ?? null;
}

/** Creates a new, empty session and persists it. Players must join a session before they can play. */
export function createSession(): GameSession {
  const session: GameSession = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    games: [],
  };
  saveSessions([session, ...loadSessions()]);
  return session;
}

/** Appends a finished game's outcome to the given session. Call once, right when a game reaches 'gameover'. */
export function recordGameResult(sessionId: string, state: GameState): void {
  const result: GameResult = {
    date: new Date().toISOString(),
    rounds: state.round,
    winner: state.winner,
    players: state.players.map((p) => ({ name: p.name, roleId: p.roleId, alive: p.alive })),
  };

  const sessions = loadSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return;
  session.games = [result, ...session.games].slice(0, MAX_GAMES_PER_SESSION);
  saveSessions(sessions);
}
