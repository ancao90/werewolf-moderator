import { describe, expect, it } from 'vitest';
import {
  createGame,
  getCurrentNightStep,
  getNightReveals,
  resolveNight,
  resolveVote,
  startNextNight,
  startVoting,
  submitNightStep,
} from '../engine';
import type { GameState } from '../types';

/**
 * These are scenario/regression tests: each one scripts a full round of a
 * small game and asserts the exact outcome. Their job is to catch
 * cross-role regressions (e.g. a new role subtly changing night order or
 * event resolution) that unit tests on a single role would miss.
 * Run the full suite whenever a new card is added.
 */

// 2 werewolves vs. 4 villager-team players, so a single night kill doesn't
// immediately hit parity and end the game before the scenario can play out.
function setupFive(): GameState {
  return createGame([
    { id: 'p1', name: 'Alice', roleId: 'werewolf' },
    { id: 'p2', name: 'Bob', roleId: 'werewolf' },
    { id: 'p3', name: 'Carol', roleId: 'seer' },
    { id: 'p4', name: 'Dave', roleId: 'villager' },
    { id: 'p5', name: 'Eve', roleId: 'villager' },
    { id: 'p6', name: 'Frank', roleId: 'villager' },
  ]);
}

/** Drives all pending night steps by submitting a target per step, in order. */
function runNight(state: GameState, targetsInOrder: (string | null)[]): GameState {
  let s = state;
  for (const target of targetsInOrder) {
    expect(getCurrentNightStep(s)).not.toBeNull();
    s = submitNightStep(s, target);
  }
  expect(getCurrentNightStep(s)).toBeNull();
  return resolveNight(s);
}

describe('night order', () => {
  it('acts werewolves before seer', () => {
    const state = setupFive();
    const step1 = getCurrentNightStep(state);
    expect(step1?.roleId).toBe('werewolf');
    expect(step1?.actingPlayerIds.sort()).toEqual(['p1', 'p2']);

    const afterWerewolves = submitNightStep(state, 'p4');
    const step2 = getCurrentNightStep(afterWerewolves);
    expect(step2?.roleId).toBe('seer');
    expect(step2?.actingPlayerIds).toEqual(['p3']);
  });

  it('skips villagers, who have no night action', () => {
    const state = setupFive();
    const roleIds = state.pendingNightSteps.map((s) => s.roleId);
    expect(roleIds).toEqual(['werewolf', 'seer']);
  });
});

describe('werewolf kill', () => {
  it('kills the chosen target overnight', () => {
    const state = setupFive();
    const afterNight = runNight(state, ['p4', 'p3']);
    expect(afterNight.phase).toBe('day');
    const dave = afterNight.players.find((p) => p.id === 'p4');
    expect(dave?.alive).toBe(false);
    expect(afterNight.deaths).toEqual([{ playerId: 'p4', round: 1, cause: 'night' }]);
  });

  it('produces no death when werewolves pass', () => {
    const state = setupFive();
    const afterNight = runNight(state, [null, 'p1']);
    expect(afterNight.deaths).toHaveLength(0);
    expect(afterNight.players.every((p) => p.alive)).toBe(true);
  });
});

describe('seer reveal', () => {
  it('reports the true team of the checked player, for the moderator only', () => {
    const state = setupFive();
    let s = submitNightStep(state, 'p4'); // werewolves kill Dave
    s = submitNightStep(s, 'p1'); // seer checks Alice (a werewolf)
    const reveals = getNightReveals(s);
    expect(reveals).toEqual([{ roleId: 'seer', targetId: 'p1', info: 'werewolves' }]);
  });
});

describe('day vote', () => {
  it('eliminates the player the moderator names', () => {
    const state = setupFive();
    const afterNight = runNight(state, [null, null]);
    const voting = startVoting(afterNight);
    const resolved = resolveVote(voting, 'p1');

    const alice = resolved.players.find((p) => p.id === 'p1');
    expect(alice?.alive).toBe(false);
    expect(resolved.deaths.at(-1)).toEqual({ playerId: 'p1', round: 1, cause: 'vote' });
  });

  it('eliminates no one when the moderator records no elimination', () => {
    const state = setupFive();
    const afterNight = runNight(state, [null, null]);
    const voting = startVoting(afterNight);
    const resolved = resolveVote(voting, null);

    expect(resolved.players.every((p) => p.alive)).toBe(true);
    expect(resolved.deaths).toHaveLength(0);
  });

  it('goes to a resolution status screen after voting, before the next night', () => {
    const state = setupFive();
    const afterNight = runNight(state, [null, null]);
    const voting = startVoting(afterNight);
    const resolved = resolveVote(voting, 'p4');

    expect(resolved.phase).toBe('resolution');
    expect(resolved.round).toBe(1);
  });

  it('advances to the next round and re-seeds night steps once the moderator starts the next night', () => {
    const state = setupFive();
    const afterNight = runNight(state, [null, null]);
    const voting = startVoting(afterNight);
    const resolved = resolveVote(voting, 'p4');
    const nextNight = startNextNight(resolved);

    expect(nextNight.round).toBe(2);
    expect(nextNight.phase).toBe('night');
    expect(nextNight.pendingNightSteps.map((st) => st.roleId)).toEqual(['werewolf', 'seer']);
  });
});

describe('win conditions', () => {
  it('villagers win when the last werewolf is voted out', () => {
    const state = createGame([
      { id: 'p1', name: 'Alice', roleId: 'werewolf' },
      { id: 'p2', name: 'Bob', roleId: 'villager' },
      { id: 'p3', name: 'Carol', roleId: 'villager' },
    ]);
    const afterNight = runNight(state, [null]);
    const voting = startVoting(afterNight);
    const resolved = resolveVote(voting, 'p1');

    expect(resolved.phase).toBe('gameover');
    expect(resolved.winner).toBe('villagers');
  });

  it('werewolves win when they reach parity with villagers', () => {
    const state = createGame([
      { id: 'p1', name: 'Alice', roleId: 'werewolf' },
      { id: 'p2', name: 'Bob', roleId: 'villager' },
      { id: 'p3', name: 'Carol', roleId: 'villager' },
    ]);
    // Werewolf kills Bob overnight -> 1 werewolf vs 1 villager alive = parity.
    const afterNight = runNight(state, ['p2']);
    expect(afterNight.phase).toBe('gameover');
    expect(afterNight.winner).toBe('werewolves');
  });
});
