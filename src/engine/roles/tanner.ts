import type { RoleDefinition } from '../types';

export const tanner: RoleDefinition = {
  id: 'tanner',
  name: 'Kẻ Chán Đời',
  icon: '🎭',
  team: 'tanner',
  description:
    'Chán sống nên chỉ muốn bị dân làng bỏ phiếu loại. Nếu bị treo cổ vào ban ngày, Kẻ Chán Đời thắng ngay lập tức, bất kể tình hình Ma Sói và dân làng ra sao. Chết vì lý do khác thì không thắng.',
  // Has to be called (round 1) so the moderator learns who holds this card, same
  // as any other role — even though there's nothing for them to actually do at
  // night. Unlike the Villager, Tanner's specific identity is win-condition
  // critical, so it can't be left to the silent passive-role fallback.
  nightOrder: 90,
  firstNightOnly: true,
  nightInstruction: () => 'Kẻ Chán Đời, hãy thức dậy để quản trò xác nhận, rồi ngủ lại ngay — không cần làm gì đêm nay.',
};
