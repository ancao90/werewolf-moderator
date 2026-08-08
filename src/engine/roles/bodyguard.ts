import type { NightEvent, RoleDefinition } from '../types';

/** The player the bodyguard protected last night, if any — they can't be picked again tonight. */
export function bodyguardRepeatTargetId(previousNightEvents: NightEvent[]): string | null {
  return previousNightEvents.find((e) => e.type === 'protect' && e.sourceRoleId === 'bodyguard')?.targetId ?? null;
}

export const bodyguard: RoleDefinition = {
  id: 'bodyguard',
  name: 'Bảo Vệ',
  icon: '🛡️',
  team: 'villagers',
  description: 'Mỗi đêm, chọn một người để bảo vệ khỏi Ma Sói. Không được bảo vệ cùng một người hai đêm liên tiếp.',
  nightOrder: 5,
  nightInstruction: (ctx) => {
    const repeatId = bodyguardRepeatTargetId(ctx.previousNightEvents);
    const repeatName = repeatId ? ctx.players.find((p) => p.id === repeatId)?.name : null;
    const base = 'Bảo Vệ, hãy thức dậy và chọn một người để bảo vệ.';
    return repeatName ? `${base} (Không được chọn lại ${repeatName}.)` : base;
  },
  resolveNightAction: (ctx, targetId) => {
    if (!targetId) return [];
    if (targetId === bodyguardRepeatTargetId(ctx.previousNightEvents)) return [];
    return [{ type: 'protect', sourceRoleId: 'bodyguard', targetId }];
  },
};
