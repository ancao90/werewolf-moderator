import { getRole } from './roles';
import type {
  DeathRecord,
  GameState,
  NightEvent,
  NightStep,
  Player,
  Team,
} from './types';

export interface PlayerSetup {
  id: string;
  name: string;
  roleId: string;
}

function livingPlayers(players: Player[]): Player[] {
  return players.filter((p) => p.alive);
}

/** Builds this round's ordered night steps from whichever roles have living holders. */
function computeNightSteps(players: Player[]): NightStep[] {
  const alive = livingPlayers(players);
  const roleIdsPresent = Array.from(new Set(alive.map((p) => p.roleId)));

  const steps = roleIdsPresent
    .map((roleId) => getRole(roleId))
    .filter((role) => role.nightOrder !== null)
    .sort((a, b) => (a.nightOrder as number) - (b.nightOrder as number))
    .map((role): NightStep => {
      const actingPlayerIds = alive
        .filter((p) => p.roleId === role.id)
        .map((p) => p.id);
      return { roleId: role.id, actingPlayerIds };
    });

  return steps;
}

export function checkWinCondition(players: Player[]): Team | null {
  const alive = livingPlayers(players);
  const werewolves = alive.filter((p) => getRole(p.roleId).team === 'werewolves');
  const villagers = alive.filter((p) => getRole(p.roleId).team === 'villagers');

  if (werewolves.length === 0) return 'villagers';
  if (werewolves.length >= villagers.length) return 'werewolves';
  return null;
}

export function createGame(setup: PlayerSetup[]): GameState {
  const players: Player[] = setup.map((p) => ({
    id: p.id,
    name: p.name,
    roleId: p.roleId,
    alive: true,
  }));

  return {
    phase: 'night',
    round: 1,
    players,
    pendingNightSteps: computeNightSteps(players),
    nightEvents: [],
    deaths: [],
    log: [`Round 1 begins. Night falls on the village.`],
    winner: null,
  };
}

export function getCurrentNightStep(state: GameState): NightStep | null {
  return state.pendingNightSteps[0] ?? null;
}

/**
 * Records the outcome of the current night step (the moderator's chosen
 * target, or null if the role passes) and advances to the next step.
 * Does not resolve deaths yet — call resolveNight() once pendingNightSteps is empty.
 */
export function submitNightStep(state: GameState, targetId: string | null): GameState {
  const step = getCurrentNightStep(state);
  if (!step) throw new Error('No pending night step to submit');

  const role = getRole(step.roleId);
  const events: NightEvent[] = role.resolveNightAction
    ? role.resolveNightAction(
        { round: state.round, players: state.players, eventsSoFar: state.nightEvents },
        targetId,
      )
    : [];

  return {
    ...state,
    pendingNightSteps: state.pendingNightSteps.slice(1),
    nightEvents: [...state.nightEvents, ...events],
  };
}

/**
 * Applies all events collected during the night: kills minus protections
 * become deaths. Moves the game to the day phase and checks for a win.
 */
export function resolveNight(state: GameState): GameState {
  if (state.pendingNightSteps.length > 0) {
    throw new Error('Cannot resolve night: pending night steps remain');
  }

  const protectedIds = new Set(
    state.nightEvents.filter((e) => e.type === 'protect').map((e) => e.targetId),
  );
  const killedIds = new Set(
    state.nightEvents
      .filter((e) => e.type === 'kill' && !protectedIds.has(e.targetId))
      .map((e) => e.targetId),
  );

  const players = state.players.map((p) =>
    killedIds.has(p.id) ? { ...p, alive: false } : p,
  );

  const newDeaths: DeathRecord[] = Array.from(killedIds).map((playerId) => ({
    playerId,
    round: state.round,
    cause: 'night',
  }));

  const log = [...state.log];
  if (newDeaths.length === 0) {
    log.push(`Dawn breaks. No one died during the night.`);
  } else {
    for (const d of newDeaths) {
      const name = players.find((p) => p.id === d.playerId)?.name ?? d.playerId;
      log.push(`Dawn breaks. ${name} was found dead.`);
    }
  }

  const winner = checkWinCondition(players);

  return {
    ...state,
    phase: winner ? 'gameover' : 'day',
    players,
    deaths: [...state.deaths, ...newDeaths],
    log,
    winner,
  };
}

/** Reveal info (e.g. Seer results) gathered during the just-resolved night, for the moderator's eyes only. */
export function getNightReveals(state: GameState): { roleId: string; targetId: string; info: string }[] {
  return state.nightEvents
    .filter((e): e is Extract<NightEvent, { type: 'reveal' }> => e.type === 'reveal')
    .map((e) => ({ roleId: e.sourceRoleId, targetId: e.targetId, info: e.info }));
}

export function startVoting(state: GameState): GameState {
  if (state.phase !== 'day') throw new Error('Can only start voting from the day phase');
  return { ...state, phase: 'voting' };
}

/**
 * Applies the moderator's chosen elimination (or null if no one is
 * eliminated, e.g. a tie) and advances the game to the next round.
 */
export function resolveVote(state: GameState, eliminatedId: string | null): GameState {
  if (state.phase !== 'voting') throw new Error('Not in voting phase');

  const players = eliminatedId
    ? state.players.map((p) => (p.id === eliminatedId ? { ...p, alive: false } : p))
    : state.players;

  const newDeaths: DeathRecord[] = eliminatedId
    ? [{ playerId: eliminatedId, round: state.round, cause: 'vote' }]
    : [];

  const log = [...state.log];
  if (eliminatedId) {
    const name = players.find((p) => p.id === eliminatedId)?.name ?? eliminatedId;
    log.push(`The village voted out ${name}.`);
  } else {
    log.push(`The village did not eliminate anyone.`);
  }

  const winner = checkWinCondition(players);
  const nextRound = state.round + 1;

  return {
    ...state,
    phase: winner ? 'gameover' : 'night',
    round: winner ? state.round : nextRound,
    players,
    deaths: [...state.deaths, ...newDeaths],
    pendingNightSteps: winner ? [] : computeNightSteps(players),
    nightEvents: [],
    log: winner ? log : [...log, `Round ${nextRound} begins. Night falls on the village.`],
    winner,
  };
}
