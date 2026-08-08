export type Team = 'villagers' | 'werewolves';

export type Phase = 'setup' | 'night' | 'day' | 'voting' | 'resolution' | 'gameover';

export interface Player {
  id: string;
  name: string;
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
  | { type: 'block'; sourceRoleId: string; targetId: string };

export interface NightContext {
  round: number;
  players: Player[];
  /** Events already emitted earlier this same night, in nightOrder. */
  eventsSoFar: NightEvent[];
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
}

export interface DeathRecord {
  playerId: string;
  round: number;
  cause: 'night' | 'vote';
}

export interface GameState {
  phase: Phase;
  round: number;
  players: Player[];
  /** Night steps still to be collected this round, in order. */
  pendingNightSteps: NightStep[];
  /** Events collected so far during the current night. */
  nightEvents: NightEvent[];
  deaths: DeathRecord[];
  log: string[];
  winner: Team | null;
}
