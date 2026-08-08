import { getRole } from './roles';
import { hunterMarkedTargetId } from './roles/hunter';
import { witchPoisonUsed } from './roles/witch';
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
}

function livingPlayers(players: Player[]): Player[] {
  return players.filter((p) => p.alive);
}

/**
 * Builds this round's ordered night steps from every acting role that was
 * ever dealt into the game — not just roles with living holders. A role
 * whose holders have all died still gets called in sequence (with no one
 * to actually act), so players can't infer who died from which roles the
 * moderator skips calling.
 */
function computeNightSteps(players: Player[], roleComposition: Record<string, number>): NightStep[] {
  const alive = livingPlayers(players);

  const steps = Object.entries(roleComposition)
    .filter(([, count]) => count > 0)
    .map(([roleId]) => getRole(roleId))
    .filter((role) => role.nightOrder !== null)
    .sort((a, b) => (a.nightOrder as number) - (b.nightOrder as number))
    .map((role): NightStep => {
      const actingPlayerIds = alive
        .filter((p) => p.roleId === role.id)
        .map((p) => p.id);
      return { roleId: role.id, actingPlayerIds, allHoldersDead: actingPlayerIds.length === 0 };
    });

  return steps;
}

/**
 * Round-1 steps for a freshly dealt game: one per acting role in the
 * composition, in night order, with actingPlayerIds left empty — the
 * moderator doesn't know who holds them yet, same as in a real game where
 * only the players themselves have looked at their cards.
 */
function computeInitialNightSteps(roleComposition: Record<string, number>): NightStep[] {
  return Object.entries(roleComposition)
    .filter(([, count]) => count > 0)
    .map(([roleId]) => getRole(roleId))
    .filter((role) => role.nightOrder !== null)
    .sort((a, b) => (a.nightOrder as number) - (b.nightOrder as number))
    .map((role): NightStep => ({ roleId: role.id, actingPlayerIds: [] }));
}

/**
 * Assigns every still-unidentified player to one of the composition's
 * no-night-action roles (e.g. villager). Only safe to call once every
 * acting role due this round has already been identified — otherwise some
 * of these players could still turn out to hold one of those instead.
 */
function fillRemainingPassiveRoles(players: Player[], roleComposition: Record<string, number>): Player[] {
  const assignedCounts: Record<string, number> = {};
  for (const p of players) {
    if (p.roleId) assignedCounts[p.roleId] = (assignedCounts[p.roleId] ?? 0) + 1;
  }

  const remainingSlots: string[] = [];
  for (const [roleId, count] of Object.entries(roleComposition)) {
    const remaining = count - (assignedCounts[roleId] ?? 0);
    for (let i = 0; i < remaining; i++) remainingSlots.push(roleId);
  }

  let i = 0;
  return players.map((p) => (p.roleId ? p : { ...p, roleId: remainingSlots[i++] }));
}

/**
 * `canVillagersStillTurnTheTide` covers the one case where reaching parity
 * doesn't yet decide the game: a living Witch with her poison potion still
 * unused could still kill a werewolf before the villagers would ever need
 * to outvote them. Only pass this true right after a day vote — once a
 * night has resolved, the Witch (if any) already had that night's chance
 * to act, so parity there is final.
 */
export function checkWinCondition(players: Player[], canVillagersStillTurnTheTide = false): Team | null {
  const alive = livingPlayers(players);
  const werewolves = alive.filter((p) => getRole(p.roleId).team === 'werewolves');
  const villagers = alive.filter((p) => getRole(p.roleId).team === 'villagers');

  if (werewolves.length === 0) return 'villagers';
  if (werewolves.length === villagers.length && canVillagersStillTurnTheTide) return null;
  if (werewolves.length >= villagers.length) return 'werewolves';
  return null;
}

/**
 * Deals the players into a game without telling the moderator who holds
 * which role — same as shuffling a physical deck and handing it out: every
 * player knows their own card, but the moderator only finds out during
 * round 1, one role at a time, via identifyNightRoleHolders.
 */
export function createGame(setup: PlayerSetup[], roleComposition: Record<string, number>): GameState {
  const players: Player[] = setup.map((p) => ({
    id: p.id,
    name: p.name,
    roleId: '',
    alive: true,
  }));

  return {
    phase: 'night',
    round: 1,
    players,
    roleComposition,
    pendingNightSteps: computeInitialNightSteps(roleComposition),
    nightEvents: [],
    allNightEvents: [],
    previousNightEvents: [],
    deaths: [],
    log: [`Round 1 begins. Night falls on the village.`],
    winner: null,
  };
}

export function getCurrentNightStep(state: GameState): NightStep | null {
  return state.pendingNightSteps[0] ?? null;
}

/** True while the current step's role hasn't been identified yet (round 1 only). */
export function needsIdentification(state: GameState): boolean {
  const step = getCurrentNightStep(state);
  return step !== null && step.actingPlayerIds.length === 0 && !step.allHoldersDead;
}

/**
 * Records which living, not-yet-identified players actually hold the
 * current step's role — the moment the moderator learns it by calling the
 * role (e.g. "werewolves, open your eyes"). Once every acting role due this
 * round has been identified this way, anyone left over is assigned to the
 * composition's remaining no-night-action roles, since by then nobody could
 * still turn out to hold one of the acting roles instead.
 */
export function identifyNightRoleHolders(state: GameState, playerIds: string[]): GameState {
  const step = getCurrentNightStep(state);
  if (!step) throw new Error('No pending night step to identify');
  if (step.actingPlayerIds.length > 0) throw new Error('This step is already identified');

  const expected = state.roleComposition[step.roleId] ?? 0;
  if (playerIds.length !== expected) {
    throw new Error(`Expected ${expected} player(s) for ${step.roleId}, got ${playerIds.length}`);
  }

  let players = state.players.map((p) =>
    playerIds.includes(p.id) ? { ...p, roleId: step.roleId } : p,
  );

  const isLastPendingStep = state.pendingNightSteps.length === 1;
  if (isLastPendingStep) {
    players = fillRemainingPassiveRoles(players, state.roleComposition);
  }

  const pendingNightSteps = [
    { ...step, actingPlayerIds: playerIds },
    ...state.pendingNightSteps.slice(1),
  ];

  return { ...state, players, pendingNightSteps };
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
        {
          round: state.round,
          players: state.players,
          eventsSoFar: state.nightEvents,
          history: state.allNightEvents,
          previousNightEvents: state.previousNightEvents,
        },
        targetId,
      )
    : [];

  return {
    ...state,
    pendingNightSteps: state.pendingNightSteps.slice(1),
    nightEvents: [...state.nightEvents, ...events],
    allNightEvents: [...state.allNightEvents, ...events],
  };
}

/**
 * If any of `newDeaths` holds a death-trigger role (e.g. the Hunter), and
 * that night's `markShot` event named a target who's still alive, kills
 * that target too. The target is chosen in advance during the night (see
 * hunter.ts) precisely so this can apply automatically, with no separate
 * moderator prompt at the moment of death.
 */
function applyMarkedShot(
  players: Player[],
  newDeaths: DeathRecord[],
  nightEvents: NightEvent[],
  round: number,
  cause: 'hunterNight' | 'hunterVote',
): { players: Player[]; extraDeaths: DeathRecord[] } {
  const triggered = newDeaths.some((d) => getRole(players.find((p) => p.id === d.playerId)!.roleId).hasDeathTrigger);
  if (!triggered) return { players, extraDeaths: [] };

  const targetId = hunterMarkedTargetId(nightEvents);
  const target = targetId ? players.find((p) => p.id === targetId) : null;
  if (!target?.alive) return { players, extraDeaths: [] };

  const updatedPlayers = players.map((p) => (p.id === target.id ? { ...p, alive: false } : p));
  return { players: updatedPlayers, extraDeaths: [{ playerId: target.id, round, cause }] };
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

  let players = state.players.map((p) =>
    killedIds.has(p.id) ? { ...p, alive: false } : p,
  );

  let newDeaths: DeathRecord[] = Array.from(killedIds).map((playerId) => ({
    playerId,
    round: state.round,
    cause: 'night',
  }));

  const shot = applyMarkedShot(players, newDeaths, state.nightEvents, state.round, 'hunterNight');
  players = shot.players;
  newDeaths = [...newDeaths, ...shot.extraDeaths];

  const log = [...state.log];
  if (newDeaths.length === 0) {
    log.push(`Dawn breaks. No one died during the night.`);
  } else {
    for (const d of newDeaths) {
      const name = players.find((p) => p.id === d.playerId)?.name ?? d.playerId;
      log.push(
        d.cause === 'hunterNight'
          ? `${name} was shot by the dying Hunter.`
          : `Dawn breaks. ${name} was found dead.`,
      );
    }
  }

  const deaths = [...state.deaths, ...newDeaths];
  const winner = checkWinCondition(players);

  return {
    ...state,
    phase: winner ? 'gameover' : 'day',
    players,
    deaths,
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

  let players = eliminatedId
    ? state.players.map((p) => (p.id === eliminatedId ? { ...p, alive: false } : p))
    : state.players;

  let newDeaths: DeathRecord[] = eliminatedId
    ? [{ playerId: eliminatedId, round: state.round, cause: 'vote' }]
    : [];

  const shot = applyMarkedShot(players, newDeaths, state.nightEvents, state.round, 'hunterVote');
  players = shot.players;
  newDeaths = [...newDeaths, ...shot.extraDeaths];

  const log = [...state.log];
  if (eliminatedId) {
    const name = players.find((p) => p.id === eliminatedId)?.name ?? eliminatedId;
    log.push(`The village voted out ${name}.`);
  } else {
    log.push(`The village did not eliminate anyone.`);
  }
  for (const d of shot.extraDeaths) {
    const name = players.find((p) => p.id === d.playerId)?.name ?? d.playerId;
    log.push(`${name} was shot by the dying Hunter.`);
  }

  const witchCanStillTurnTheTide =
    players.some((p) => p.alive && p.roleId === 'witch') && !witchPoisonUsed(state.allNightEvents);

  const deaths = [...state.deaths, ...newDeaths];
  const winner = checkWinCondition(players, witchCanStillTurnTheTide);

  return {
    ...state,
    phase: winner ? 'gameover' : 'resolution',
    players,
    deaths,
    nightEvents: [],
    previousNightEvents: state.nightEvents,
    log,
    winner,
  };
}

/** Moves from the post-vote status screen into the next round's night phase. */
export function startNextNight(state: GameState): GameState {
  if (state.phase !== 'resolution') throw new Error('Can only start the next night from the resolution phase');

  const nextRound = state.round + 1;
  return {
    ...state,
    phase: 'night',
    round: nextRound,
    pendingNightSteps: computeNightSteps(state.players, state.roleComposition),
    log: [...state.log, `Round ${nextRound} begins. Night falls on the village.`],
  };
}
