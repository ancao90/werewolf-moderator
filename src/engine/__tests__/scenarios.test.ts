import { describe, expect, it } from 'vitest';
import {
  createGame,
  getCurrentNightStep,
  getNightReveals,
  identifyNightRoleHolders,
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
// Players are dealt but roles are unknown to the moderator until identified
// during round 1, same as a real deck of cards handed out before play.
function setupFive(): GameState {
  return createGame(
    [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Carol' },
      { id: 'p4', name: 'Dave' },
      { id: 'p5', name: 'Eve' },
      { id: 'p6', name: 'Frank' },
    ],
    { werewolf: 2, seer: 1, villager: 3 },
  );
}

/**
 * Drives all pending night steps: identifies each step's role holders (as
 * the moderator would when calling the role) before submitting its action.
 */
function runNight(state: GameState, steps: { identify: string[]; target: string | null }[]): GameState {
  let s = state;
  for (const step of steps) {
    expect(getCurrentNightStep(s)).not.toBeNull();
    s = identifyNightRoleHolders(s, step.identify);
    s = submitNightStep(s, step.target);
  }
  expect(getCurrentNightStep(s)).toBeNull();
  return resolveNight(s);
}

describe('night order', () => {
  it('acts werewolves before seer', () => {
    const state = setupFive();
    const step1 = getCurrentNightStep(state);
    expect(step1?.roleId).toBe('werewolf');
    expect(step1?.actingPlayerIds).toEqual([]); // not yet identified

    const identified = identifyNightRoleHolders(state, ['p1', 'p2']);
    expect(getCurrentNightStep(identified)?.actingPlayerIds.sort()).toEqual(['p1', 'p2']);

    const afterWerewolves = submitNightStep(identified, 'p4');
    const step2 = getCurrentNightStep(afterWerewolves);
    expect(step2?.roleId).toBe('seer');
    expect(step2?.actingPlayerIds).toEqual([]); // seer not yet identified either
  });

  it('skips villagers, who have no night action', () => {
    const state = setupFive();
    const roleIds = state.pendingNightSteps.map((s) => s.roleId);
    expect(roleIds).toEqual(['werewolf', 'seer']);
  });
});

describe('role identification', () => {
  it('rejects identifying the wrong number of players for a role', () => {
    const state = setupFive();
    expect(() => identifyNightRoleHolders(state, ['p1'])).toThrow();
  });

  it('rejects re-identifying a step that already has its holders recorded', () => {
    const state = setupFive();
    const identified = identifyNightRoleHolders(state, ['p1', 'p2']);
    expect(() => identifyNightRoleHolders(identified, ['p3', 'p4'])).toThrow();
  });

  it('fills remaining players into no-night-action roles once the last acting role is identified', () => {
    const state = setupFive();
    const afterWerewolves = submitNightStep(identifyNightRoleHolders(state, ['p1', 'p2']), null);
    const afterSeer = identifyNightRoleHolders(afterWerewolves, ['p3']);

    const roleIds = afterSeer.players.map((p) => p.roleId).sort();
    expect(roleIds).toEqual(['seer', 'villager', 'villager', 'villager', 'werewolf', 'werewolf']);
  });
});

describe('werewolf kill', () => {
  it('kills the chosen target overnight', () => {
    const state = setupFive();
    const afterNight = runNight(state, [
      { identify: ['p1', 'p2'], target: 'p4' },
      { identify: ['p3'], target: 'p3' },
    ]);
    expect(afterNight.phase).toBe('day');
    const dave = afterNight.players.find((p) => p.id === 'p4');
    expect(dave?.alive).toBe(false);
    expect(afterNight.deaths).toEqual([{ playerId: 'p4', round: 1, cause: 'night' }]);
  });

  it('produces no death when werewolves pass', () => {
    const state = setupFive();
    const afterNight = runNight(state, [
      { identify: ['p1', 'p2'], target: null },
      { identify: ['p3'], target: 'p1' },
    ]);
    expect(afterNight.deaths).toHaveLength(0);
    expect(afterNight.players.every((p) => p.alive)).toBe(true);
  });
});

describe('seer reveal', () => {
  it('reports the true team of the checked player, for the moderator only', () => {
    const state = setupFive();
    let s = identifyNightRoleHolders(state, ['p1', 'p2']); // record: Alice & Bob are werewolves
    s = submitNightStep(s, 'p4'); // werewolves kill Dave
    s = identifyNightRoleHolders(s, ['p3']); // record: Carol is the seer
    s = submitNightStep(s, 'p1'); // seer checks Alice (a werewolf)
    const reveals = getNightReveals(s);
    expect(reveals).toEqual([{ roleId: 'seer', targetId: 'p1', info: 'werewolves' }]);
  });
});

describe('day vote', () => {
  it('eliminates the player the moderator names', () => {
    const state = setupFive();
    const afterNight = runNight(state, [
      { identify: ['p1', 'p2'], target: null },
      { identify: ['p3'], target: null },
    ]);
    const voting = startVoting(afterNight);
    const resolved = resolveVote(voting, 'p1');

    const alice = resolved.players.find((p) => p.id === 'p1');
    expect(alice?.alive).toBe(false);
    expect(resolved.deaths.at(-1)).toEqual({ playerId: 'p1', round: 1, cause: 'vote' });
  });

  it('eliminates no one when the moderator records no elimination', () => {
    const state = setupFive();
    const afterNight = runNight(state, [
      { identify: ['p1', 'p2'], target: null },
      { identify: ['p3'], target: null },
    ]);
    const voting = startVoting(afterNight);
    const resolved = resolveVote(voting, null);

    expect(resolved.players.every((p) => p.alive)).toBe(true);
    expect(resolved.deaths).toHaveLength(0);
  });

  it('goes to a resolution status screen after voting, before the next night', () => {
    const state = setupFive();
    const afterNight = runNight(state, [
      { identify: ['p1', 'p2'], target: null },
      { identify: ['p3'], target: null },
    ]);
    const voting = startVoting(afterNight);
    const resolved = resolveVote(voting, 'p4');

    expect(resolved.phase).toBe('resolution');
    expect(resolved.round).toBe(1);
  });

  it('advances to the next round and re-seeds night steps once the moderator starts the next night', () => {
    const state = setupFive();
    const afterNight = runNight(state, [
      { identify: ['p1', 'p2'], target: null },
      { identify: ['p3'], target: null },
    ]);
    const voting = startVoting(afterNight);
    const resolved = resolveVote(voting, 'p4');
    const nextNight = startNextNight(resolved);

    expect(nextNight.round).toBe(2);
    expect(nextNight.phase).toBe('night');
    // Roles are already known by round 2, so steps come pre-identified — no re-identification needed.
    expect(nextNight.pendingNightSteps.map((st) => st.roleId)).toEqual(['werewolf', 'seer']);
    expect(nextNight.pendingNightSteps[0].actingPlayerIds.sort()).toEqual(['p1', 'p2']);
  });
});

describe('win conditions', () => {
  it('villagers win when the last werewolf is voted out', () => {
    const state = createGame(
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Carol' },
      ],
      { werewolf: 1, villager: 2 },
    );
    const afterNight = runNight(state, [{ identify: ['p1'], target: null }]);
    const voting = startVoting(afterNight);
    const resolved = resolveVote(voting, 'p1');

    expect(resolved.phase).toBe('gameover');
    expect(resolved.winner).toBe('villagers');
  });

  it('werewolves win when they reach parity with villagers', () => {
    const state = createGame(
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Carol' },
      ],
      { werewolf: 1, villager: 2 },
    );
    // Werewolf kills Bob overnight -> 1 werewolf vs 1 villager alive = parity.
    const afterNight = runNight(state, [{ identify: ['p1'], target: 'p2' }]);
    expect(afterNight.phase).toBe('gameover');
    expect(afterNight.winner).toBe('werewolves');
  });
});
