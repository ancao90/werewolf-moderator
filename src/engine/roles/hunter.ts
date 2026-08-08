import type { NightEvent, RoleDefinition } from '../types';

/** The player the Hunter secretly marked this night as their revenge target if they die, if any. */
export function hunterMarkedTargetId(nightEvents: NightEvent[]): string | null {
  return nightEvents.find((e) => e.type === 'markShot' && e.sourceRoleId === 'hunter')?.targetId ?? null;
}

export const hunter: RoleDefinition = {
  id: 'hunter',
  name: 'Thợ Săn',
  icon: '🏹',
  team: 'villagers',
  description:
    'Mỗi đêm, bí mật chọn trước một người. Nếu Thợ Săn bị Ma Sói cắn chết đêm đó hoặc bị dân làng bỏ phiếu loại ngày hôm sau, người đó cũng chết theo ngay lập tức.',
  nightOrder: 25,
  hasDeathTrigger: true,
  nightInstruction: () => 'Thợ Săn, hãy thức dậy và bí mật chọn trước người sẽ chết theo mình nếu mình chết hôm nay.',
  resolveNightAction: (_ctx, targetId) => {
    if (!targetId) return [];
    return [{ type: 'markShot', sourceRoleId: 'hunter', targetId }];
  },
};
