import type { RoleDefinition } from '../types';
import { getRole } from './index';

export const seer: RoleDefinition = {
  id: 'seer',
  name: 'Tiên Tri',
  icon: '🔮',
  team: 'villagers',
  description: 'Mỗi đêm, bí mật soi phe thật của một người chơi.',
  nightOrder: 20,
  nightInstruction: () => 'Tiên Tri, hãy thức dậy và chọn một người để soi.',
  resolveNightAction: (ctx, targetId) => {
    if (!targetId) return [];
    const target = ctx.players.find((p) => p.id === targetId);
    if (!target || !target.roleId) return [];
    const team = getRole(target.roleId).team;
    return [{ type: 'reveal', sourceRoleId: 'seer', targetId, info: team }];
  },
};
