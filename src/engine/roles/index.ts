import type { RoleDefinition } from '../types';
import { villager } from './villager';
import { werewolf } from './werewolf';
import { seer } from './seer';
import { witch } from './witch';
import { bodyguard } from './bodyguard';
import { hunter } from './hunter';

/**
 * Every supported card is registered here and nowhere else.
 * To add a new card: write a RoleDefinition in its own file, import it,
 * and add it to this list. Nothing else in the engine changes.
 */
export const ROLE_REGISTRY: RoleDefinition[] = [villager, werewolf, bodyguard, witch, seer, hunter];

const ROLES_BY_ID: Record<string, RoleDefinition> = Object.fromEntries(
  ROLE_REGISTRY.map((r) => [r.id, r]),
);

export function getRole(roleId: string): RoleDefinition {
  const role = ROLES_BY_ID[roleId];
  if (!role) throw new Error(`Unknown role id: ${roleId}`);
  return role;
}
