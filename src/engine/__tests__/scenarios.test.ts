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
import { WITCH_HEAL, WITCH_POISON_PREFIX } from '../roles/witch';
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

// 1 werewolf, 1 bodyguard, vs. 2 plain villagers.
function setupWithBodyguard(): GameState {
  return createGame(
    [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Carol' },
      { id: 'p4', name: 'Dave' },
    ],
    { werewolf: 1, bodyguard: 1, villager: 2 },
  );
}

// 2 werewolves, 1 witch, 1 seer, vs. 3 plain villagers.
function setupWithWitch(): GameState {
  return createGame(
    [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Carol' },
      { id: 'p4', name: 'Dave' },
      { id: 'p5', name: 'Eve' },
      { id: 'p6', name: 'Frank' },
      { id: 'p7', name: 'Grace' },
    ],
    { werewolf: 2, witch: 1, seer: 1, villager: 3 },
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

describe('bodyguard', () => {
  it('acts before the werewolves, so their protection is already in place for the kill', () => {
    const state = setupWithBodyguard();
    const step1 = getCurrentNightStep(state);
    expect(step1?.roleId).toBe('bodyguard');

    const identified = identifyNightRoleHolders(state, ['p2']);
    const afterBodyguard = submitNightStep(identified, 'p3');
    const step2 = getCurrentNightStep(afterBodyguard);
    expect(step2?.roleId).toBe('werewolf');
  });

  it('saves the protected player from the werewolf kill', () => {
    const state = setupWithBodyguard();
    const afterNight = runNight(state, [
      { identify: ['p2'], target: 'p3' }, // bodyguard protects Carol
      { identify: ['p1'], target: 'p3' }, // werewolf kills Carol
    ]);

    const carol = afterNight.players.find((p) => p.id === 'p3');
    expect(carol?.alive).toBe(true);
    expect(afterNight.deaths).toHaveLength(0);
  });

  it("doesn't stop a kill on someone other than the protected player", () => {
    const state = setupWithBodyguard();
    const afterNight = runNight(state, [
      { identify: ['p2'], target: 'p3' }, // bodyguard protects Carol
      { identify: ['p1'], target: 'p4' }, // werewolf kills Dave instead
    ]);

    const dave = afterNight.players.find((p) => p.id === 'p4');
    expect(dave?.alive).toBe(false);
    expect(afterNight.deaths).toEqual([{ playerId: 'p4', round: 1, cause: 'night' }]);
  });

  it("can't protect the same player on two consecutive nights", () => {
    const state = setupWithBodyguard();
    const afterFirstNight = runNight(state, [
      { identify: ['p2'], target: 'p3' }, // bodyguard protects Carol
      { identify: ['p1'], target: null }, // werewolf passes
    ]);
    const afterVote = resolveVote(startVoting(afterFirstNight), null);
    const secondNight = startNextNight(afterVote);

    // Round 2+: roles are already known, so no identify calls are needed.
    let s = submitNightStep(secondNight, 'p3'); // bodyguard tries to protect Carol again
    s = submitNightStep(s, 'p3'); // werewolf kills Carol
    const afterSecondNight = resolveNight(s);

    const carol = afterSecondNight.players.find((p) => p.id === 'p3');
    expect(carol?.alive).toBe(false);
    expect(afterSecondNight.deaths).toEqual([{ playerId: 'p3', round: 2, cause: 'night' }]);
  });

  it('can protect the same player again once a night has passed in between', () => {
    const state = setupWithBodyguard();
    const afterFirstNight = runNight(state, [
      { identify: ['p2'], target: 'p3' }, // bodyguard protects Carol
      { identify: ['p1'], target: null }, // werewolf passes
    ]);
    const afterVote1 = resolveVote(startVoting(afterFirstNight), null);
    const secondNight = startNextNight(afterVote1);

    let s = submitNightStep(secondNight, 'p4'); // bodyguard protects Dave instead
    s = submitNightStep(s, null); // werewolf passes
    const afterSecondNight = resolveNight(s);
    const afterVote2 = resolveVote(startVoting(afterSecondNight), null);
    const thirdNight = startNextNight(afterVote2);

    let s2 = submitNightStep(thirdNight, 'p3'); // bodyguard protects Carol again — allowed now
    s2 = submitNightStep(s2, 'p3'); // werewolf kills Carol
    const afterThirdNight = resolveNight(s2);

    const carol = afterThirdNight.players.find((p) => p.id === 'p3');
    expect(carol?.alive).toBe(true);
    expect(afterThirdNight.deaths).toHaveLength(0);
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

describe('witch', () => {
  it('heals the werewolves\' victim', () => {
    const state = setupWithWitch();
    const afterNight = runNight(state, [
      { identify: ['p1', 'p2'], target: 'p4' },
      { identify: ['p3'], target: WITCH_HEAL },
      { identify: ['p5'], target: null },
    ]);

    const dave = afterNight.players.find((p) => p.id === 'p4');
    expect(dave?.alive).toBe(true);
    expect(afterNight.deaths).toHaveLength(0);
  });

  it('poisons a chosen target in addition to the werewolves\' kill', () => {
    const state = setupWithWitch();
    const afterNight = runNight(state, [
      { identify: ['p1', 'p2'], target: null },
      { identify: ['p3'], target: `${WITCH_POISON_PREFIX}p6` },
      { identify: ['p5'], target: null },
    ]);

    const frank = afterNight.players.find((p) => p.id === 'p6');
    expect(frank?.alive).toBe(false);
    expect(afterNight.deaths).toEqual([{ playerId: 'p6', round: 1, cause: 'night' }]);
  });

  it('can heal and poison in the same night', () => {
    const state = setupWithWitch();
    const afterNight = runNight(state, [
      { identify: ['p1', 'p2'], target: 'p4' },
      { identify: ['p3'], target: `${WITCH_HEAL}|${WITCH_POISON_PREFIX}p6` },
      { identify: ['p5'], target: null },
    ]);

    const dave = afterNight.players.find((p) => p.id === 'p4');
    const frank = afterNight.players.find((p) => p.id === 'p6');
    expect(dave?.alive).toBe(true);
    expect(frank?.alive).toBe(false);
    expect(afterNight.deaths).toEqual([{ playerId: 'p6', round: 1, cause: 'night' }]);
  });

  it('only lets each potion be used once across the whole game', () => {
    const state = setupWithWitch();
    const afterFirstNight = runNight(state, [
      { identify: ['p1', 'p2'], target: 'p4' },
      { identify: ['p3'], target: WITCH_HEAL },
      { identify: ['p5'], target: null },
    ]);

    const voting = startVoting(afterFirstNight);
    const resolved = resolveVote(voting, null);
    const secondNight = startNextNight(resolved);

    // Round 2+: every role's holders are already known, so steps arrive
    // pre-identified — no identifyNightRoleHolders calls needed.
    let s = submitNightStep(secondNight, 'p5'); // werewolves kill Eve
    s = submitNightStep(s, WITCH_HEAL); // witch tries to heal again — potion already spent
    s = submitNightStep(s, null); // seer
    const afterSecondNight = resolveNight(s);

    const eve = afterSecondNight.players.find((p) => p.id === 'p5');
    expect(eve?.alive).toBe(false);
    expect(afterSecondNight.deaths).toEqual([{ playerId: 'p5', round: 2, cause: 'night' }]);
  });

  it('keeps the game open at parity while the witch still has her poison, and lets her decide it that night', () => {
    const state = createGame(
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Carol' },
        { id: 'p4', name: 'Dave' },
      ],
      { werewolf: 1, witch: 1, villager: 2 },
    );

    // Round 1: no one acts; vote out Carol. 1 werewolf vs. 2 villagers-team (Bob + Dave) — not parity yet.
    const round1 = runNight(state, [
      { identify: ['p1'], target: null },
      { identify: ['p2'], target: null },
    ]);
    const afterVote1 = resolveVote(startVoting(round1), 'p3');
    expect(afterVote1.winner).toBeNull();

    // Round 2: no one acts; vote out Dave. Now 1 werewolf vs. 1 witch — parity, but the
    // witch's poison is still unused, so the game must stay open instead of handing
    // werewolves the win.
    const round2 = startNextNight(afterVote1);
    let s = submitNightStep(round2, null); // werewolf
    s = submitNightStep(s, null); // witch
    const afterVote2 = resolveVote(startVoting(resolveNight(s)), 'p4');

    expect(afterVote2.winner).toBeNull();
    expect(afterVote2.phase).toBe('resolution');

    // That night, the witch poisons the last werewolf and wins it for the village.
    const round3 = startNextNight(afterVote2);
    let s2 = submitNightStep(round3, null); // werewolf
    s2 = submitNightStep(s2, `${WITCH_POISON_PREFIX}p1`); // witch poisons Alice
    const afterNight3 = resolveNight(s2);

    expect(afterNight3.phase).toBe('gameover');
    expect(afterNight3.winner).toBe('villagers');
  });

  it('still lets werewolves win at parity once the witch has already spent her poison', () => {
    const state = createGame(
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Carol' },
        { id: 'p4', name: 'Dave' },
      ],
      { werewolf: 1, witch: 1, villager: 2 },
    );

    // Round 1: the witch spends her poison on Dave, unrelated to parity.
    const afterNight1 = runNight(state, [
      { identify: ['p1'], target: null },
      { identify: ['p2'], target: `${WITCH_POISON_PREFIX}p4` },
    ]);
    expect(afterNight1.players.find((p) => p.id === 'p4')?.alive).toBe(false);

    // Voting out Carol now reaches parity (1 werewolf vs. the witch), but her poison
    // is already spent — there's nothing left to turn the tide, so it's decided.
    const resolved = resolveVote(startVoting(afterNight1), 'p3');

    expect(resolved.phase).toBe('gameover');
    expect(resolved.winner).toBe('werewolves');
  });
});

// 1 werewolf, 1 hunter, vs. 3 plain villagers.
function setupWithHunter(): GameState {
  return createGame(
    [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Carol' },
      { id: 'p4', name: 'Dave' },
      { id: 'p5', name: 'Eve' },
    ],
    { werewolf: 1, hunter: 1, villager: 3 },
  );
}

describe('hunter', () => {
  it('acts after the werewolves each night, pre-marking a revenge target', () => {
    const state = setupWithHunter();
    const roleIds = state.pendingNightSteps.map((s) => s.roleId);
    expect(roleIds).toEqual(['werewolf', 'hunter']);
  });

  it('automatically kills the marked target if the hunter dies to the werewolves that same night', () => {
    const state = setupWithHunter();
    let s = identifyNightRoleHolders(state, ['p1']); // record: Alice is the werewolf
    s = submitNightStep(s, 'p2'); // werewolf kills Bob
    s = identifyNightRoleHolders(s, ['p2']); // record: Bob is the hunter
    s = submitNightStep(s, 'p1'); // Bob pre-marks Alice, in case he dies tonight
    s = resolveNight(s);

    expect(s.deaths).toEqual([
      { playerId: 'p2', round: 1, cause: 'night' },
      { playerId: 'p1', round: 1, cause: 'hunterNight' },
    ]);
    // No werewolves left -> villagers win, checked once the marked kill is applied.
    expect(s.phase).toBe('gameover');
    expect(s.winner).toBe('villagers');
  });

  it('leaves the marked target alone if the hunter chose not to mark anyone', () => {
    const state = setupWithHunter();
    let s = identifyNightRoleHolders(state, ['p1']);
    s = submitNightStep(s, 'p2'); // werewolf kills the hunter
    s = identifyNightRoleHolders(s, ['p2']);
    s = submitNightStep(s, null); // hunter declines to mark anyone
    s = resolveNight(s);

    expect(s.phase).toBe('day');
    expect(s.deaths).toEqual([{ playerId: 'p2', round: 1, cause: 'night' }]);
  });

  it('leaves the marked target alone if the hunter survives the night', () => {
    const state = setupWithHunter();
    let s = identifyNightRoleHolders(state, ['p1']);
    s = submitNightStep(s, 'p3'); // werewolf kills Carol instead of the hunter
    s = identifyNightRoleHolders(s, ['p2']);
    s = submitNightStep(s, 'p1'); // hunter marks Alice, but doesn't die tonight
    s = resolveNight(s);

    expect(s.deaths).toEqual([{ playerId: 'p3', round: 1, cause: 'night' }]);
    expect(s.players.find((p) => p.id === 'p1')?.alive).toBe(true);
  });

  it('applies the same night\'s marked target if the hunter is voted out the next day instead', () => {
    const state = setupWithHunter();
    let s = identifyNightRoleHolders(state, ['p1']); // Alice is the werewolf
    s = submitNightStep(s, null); // werewolf passes
    s = identifyNightRoleHolders(s, ['p2']); // Bob is the hunter
    s = submitNightStep(s, 'p3'); // Bob pre-marks Carol
    s = resolveNight(s);
    expect(s.phase).toBe('day');

    const voting = startVoting(s);
    const resolved = resolveVote(voting, 'p2'); // village votes out the hunter

    expect(resolved.deaths).toEqual([
      { playerId: 'p2', round: 1, cause: 'vote' },
      { playerId: 'p3', round: 1, cause: 'hunterVote' },
    ]);
    expect(resolved.phase).toBe('resolution');
  });
});

// 1 werewolf, 1 tanner, vs. 2 plain villagers.
function setupWithTanner(): GameState {
  return createGame(
    [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Carol' },
      { id: 'p4', name: 'Dave' },
    ],
    { werewolf: 1, tanner: 1, villager: 2 },
  );
}

describe('tanner', () => {
  it('has to be called on round 1 so the moderator identifies its holder, like any other role', () => {
    const state = setupWithTanner();
    const roleIds = state.pendingNightSteps.map((s) => s.roleId);
    expect(roleIds).toEqual(['werewolf', 'tanner']);
  });

  it('wins outright when voted out, regardless of villagers/werewolves parity', () => {
    const state = setupWithTanner();
    const afterNight = runNight(state, [
      { identify: ['p1'], target: null }, // werewolf
      { identify: ['p2'], target: null }, // tanner — nothing to do, just identified
    ]);
    const voting = startVoting(afterNight);
    const resolved = resolveVote(voting, 'p2'); // village votes out the tanner

    expect(resolved.phase).toBe('gameover');
    expect(resolved.winner).toBe('tanner');
  });

  it('does not win by dying at night, and the game continues normally', () => {
    const state = setupWithTanner();
    let s = identifyNightRoleHolders(state, ['p1']); // Alice is the werewolf
    s = submitNightStep(s, 'p2'); // werewolf kills the tanner overnight
    s = identifyNightRoleHolders(s, ['p2']); // Bob is the tanner
    s = submitNightStep(s, null); // tanner has nothing to do
    s = resolveNight(s);

    expect(s.phase).toBe('day');
    expect(s.winner).toBeNull();
    expect(s.players.find((p) => p.id === 'p2')?.alive).toBe(false);
  });

  it('does not win when the vote eliminates no one', () => {
    const state = setupWithTanner();
    const afterNight = runNight(state, [
      { identify: ['p1'], target: null },
      { identify: ['p2'], target: null },
    ]);
    const voting = startVoting(afterNight);
    const resolved = resolveVote(voting, null);

    expect(resolved.phase).toBe('resolution');
    expect(resolved.winner).toBeNull();
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
