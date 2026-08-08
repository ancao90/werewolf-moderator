export type Team = 'villagers' | 'werewolves';

export type Phase = 'setup' | 'night' | 'day' | 'voting' | 'resolution' | 'gameover';

export interface Player {
  id: string;
  name: string;
  /** '' means not yet identified — dealt a card, but the moderator doesn't know which one yet. */
  roleId: string;
  alive: boolean;
}

/**
 * Effects a role's night action can produce. The resolver only understands
 * these primitives, so a new role never needs the resolver to change —
 * it just emits the events that already exist (or a genuinely new type,
 * which is the one time the resolver needs a matching update).
 */
export type NightEvent =
  | { type: 'kill'; sourceRoleId: string; targetId: string }
  | { type: 'protect'; sourceRoleId: string; targetId: string }
  | { type: 'reveal'; sourceRoleId: string; targetId: string; info: string }
  | { type: 'block'; sourceRoleId: string; targetId: string }
  | { type: 'markShot'; sourceRoleId: string; targetId: string };

export interface NightContext {
  round: number;
  players: Player[];
  /** Events already emitted earlier this same night, in nightOrder. */
  eventsSoFar: NightEvent[];
  /** Every event emitted since the game began, across all rounds — for roles with a once-per-game limit (e.g. the Witch's potions). */
  history: NightEvent[];
  /** Events emitted during the immediately preceding night — for roles that can't repeat last night's choice (e.g. the Bodyguard). Empty on round 1. */
  previousNightEvents: NightEvent[];
}

/**
 * A card/role plugin. The engine core only ever talks to roles through
 * this interface — adding a role means adding one object to the registry,
 * never editing the engine or other roles.
 */
export interface RoleDefinition {
  id: string;
  name: string;
  /** Single emoji shown on the night hand-off screen and other role badges. */
  icon: string;
  team: Team;
  description: string;
  /** Roles act in ascending nightOrder. `null` = no night action (e.g. Villager). */
  nightOrder: number | null;
  /**
   * True if dying (by any cause) also kills whoever this role's holder
   * marked as their target that same night — e.g. the Hunter's `markShot`
   * event, applied automatically by the resolver when they die, with no
   * separate moderator prompt at the moment of death.
   */
  hasDeathTrigger?: boolean;
  /**
   * True if all living players holding this role act as one collective turn
   * (e.g. Werewolves choosing one victim together) rather than individually.
   */
  actsAsGroup?: boolean;
  /** Human-readable instruction the moderator reads aloud/shows for this role's turn. */
  nightInstruction?: (ctx: NightContext) => string;
  /**
   * Turns the moderator's recorded target (or null if the role passes) into
   * events for the resolver to apply. Pure function — no I/O, no mutation.
   */
  resolveNightAction?: (ctx: NightContext, targetId: string | null) => NightEvent[];
}

export interface NightStep {
  roleId: string;
  actingPlayerIds: string[];
  /**
   * True when every player who ever held this role is now dead. The
   * moderator still "calls" the role in sequence — same as a real game,
   * where skipping a dead role's turn would let players deduce who died
   * just from which roles get called each night.
   */
  allHoldersDead?: boolean;
}

export interface DeathRecord {
  playerId: string;
  round: number;
  cause: 'night' | 'vote' | 'hunterNight' | 'hunterVote';
}

export interface GameState {
  phase: Phase;
  round: number;
  players: Player[];
  /** The deck this game was dealt from, e.g. { werewolf: 2, seer: 1, villager: 3 }. */
  roleComposition: Record<string, number>;
  /** Night steps still to be collected this round, in order. */
  pendingNightSteps: NightStep[];
  /** Events collected so far during the current night. */
  nightEvents: NightEvent[];
  /** Every night event ever emitted, across all rounds — never cleared. */
  allNightEvents: NightEvent[];
  /** Events from the immediately preceding night, kept around for one round after nightEvents resets. Empty on round 1. */
  previousNightEvents: NightEvent[];
  deaths: DeathRecord[];
  log: string[];
  winner: Team | null;
}
