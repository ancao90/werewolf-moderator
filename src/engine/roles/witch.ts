import type { NightEvent, RoleDefinition } from '../types';

export const WITCH_HEAL = 'heal';
export const WITCH_POISON_PREFIX = 'poison:';

export function witchHealUsed(history: NightEvent[]): boolean {
  return history.some((e) => e.sourceRoleId === 'witch' && e.type === 'protect');
}

export function witchPoisonUsed(history: NightEvent[]): boolean {
  return history.some((e) => e.sourceRoleId === 'witch' && e.type === 'kill');
}

export const witch: RoleDefinition = {
  id: 'witch',
  name: 'Phù Thủy',
  icon: '🧪',
  team: 'villagers',
  description:
    'Có một bình thuốc cứu và một bình thuốc độc, mỗi bình chỉ dùng được một lần trong suốt ván đấu.',
  nightOrder: 15,
  nightInstruction: (ctx) => {
    const victimId = ctx.eventsSoFar.find((e) => e.type === 'kill')?.targetId;
    const victim = victimId ? ctx.players.find((p) => p.id === victimId) : undefined;
    const victimText = victim ? `${victim.name} vừa bị Ma Sói cắn.` : 'Đêm nay không ai bị Ma Sói cắn.';
    return `Phù Thủy, hãy thức dậy. ${victimText}`;
  },
  resolveNightAction: (ctx, targetId) => {
    if (!targetId) return [];

    const events: NightEvent[] = [];
    const parts = targetId.split('|');

    if (parts.includes(WITCH_HEAL) && !witchHealUsed(ctx.history)) {
      const victimId = ctx.eventsSoFar.find((e) => e.type === 'kill')?.targetId;
      if (victimId) events.push({ type: 'protect', sourceRoleId: 'witch', targetId: victimId });
    }

    const poisonPart = parts.find((p) => p.startsWith(WITCH_POISON_PREFIX));
    if (poisonPart && !witchPoisonUsed(ctx.history)) {
      const poisonTargetId = poisonPart.slice(WITCH_POISON_PREFIX.length);
      events.push({ type: 'kill', sourceRoleId: 'witch', targetId: poisonTargetId });
    }

    return events;
  },
};
