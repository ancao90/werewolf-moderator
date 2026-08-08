import type { GameState, Team } from './engine/types';

const HISTORY_KEY = 'werewolf_history';
const MAX_ENTRIES = 200;

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

export function loadHistory(): GameResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Appends a finished game's outcome to history. Call once, right when a game reaches 'gameover'. */
export function recordGameResult(state: GameState): void {
  const result: GameResult = {
    date: new Date().toISOString(),
    rounds: state.round,
    winner: state.winner,
    players: state.players.map((p) => ({ name: p.name, roleId: p.roleId, alive: p.alive })),
  };

  const history = [result, ...loadHistory()].slice(0, MAX_ENTRIES);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
