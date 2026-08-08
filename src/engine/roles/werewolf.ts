import type { RoleDefinition } from '../types';

export const werewolf: RoleDefinition = {
  id: 'werewolf',
  name: 'Ma Sói',
  team: 'werewolves',
  description: 'Mỗi đêm, tất cả Ma Sói cùng chọn một người chơi để giết.',
  nightOrder: 10,
  actsAsGroup: true,
  nightInstruction: () => 'Ma Sói, hãy thức dậy và chọn một người để giết.',
  resolveNightAction: (_ctx, targetId) => {
    if (!targetId) return [];
    return [{ type: 'kill', sourceRoleId: 'werewolf', targetId }];
  },
};
