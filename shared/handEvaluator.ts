// 牌型判定（唯一来源，前后端共用）。
// 注：Card/HandResult 为纯类型（接口），用 import type 引入，
// 以保证 Node 22 原生 --experimental-transform-types 能正确擦除类型导入（ts-node/Vite 同样兼容）。
import type { Card, HandResult } from './types';
import { HandType } from './types';

// 牌型强弱排名（数值越大越强）
const HAND_RANK: Record<HandType, number> = {
  [HandType.HighCard]: 1,
  [HandType.Pair]: 2,
  [HandType.Straight]: 3,
  [HandType.Flush]: 4,
  [HandType.StraightFlush]: 5,
  [HandType.Leopard]: 6,
};

/**
 * 判定三张牌的牌型。
 * 规则：豹子 > 顺金 > 金花 > 顺子 > 对子 > 散牌；花色不分大小；A23 不算顺子。
 */
export function evaluate(cards: Card[]): HandResult {
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a); // 降序
  const suits = cards.map((c) => c.suit);

  const isLeopard = ranks[0] === ranks[1] && ranks[1] === ranks[2];
  const isFlush = suits[0] === suits[1] && suits[1] === suits[2];
  // 顺子：三张点数连续且互不相同（A23 因 14,3,2 不连续，自然排除）
  const isStraight = ranks[0] - ranks[1] === 1 && ranks[1] - ranks[2] === 1;

  if (isLeopard) {
    return { type: HandType.Leopard, ranks: [ranks[0]] };
  }
  if (isStraight && isFlush) {
    return { type: HandType.StraightFlush, ranks };
  }
  if (isFlush) {
    return { type: HandType.Flush, ranks };
  }
  if (isStraight) {
    return { type: HandType.Straight, ranks };
  }
  // 对子
  if (ranks[0] === ranks[1] || ranks[1] === ranks[2]) {
    const pairPoint = ranks[0] === ranks[1] ? ranks[0] : ranks[1];
    const kicker = ranks[0] === ranks[1] ? ranks[2] : ranks[0];
    return { type: HandType.Pair, ranks: [pairPoint, kicker] };
  }
  return { type: HandType.HighCard, ranks };
}

/**
 * 比较两手牌：
 * 返回正数表示 a 大，负数表示 b 大，0 表示完全相同（此时先比牌者负）。
 */
export function compare(a: HandResult, b: HandResult): number {
  const ra = HAND_RANK[a.type];
  const rb = HAND_RANK[b.type];
  if (ra !== rb) {
    return ra - rb;
  }
  const len = Math.max(a.ranks.length, b.ranks.length);
  for (let i = 0; i < len; i++) {
    const va = a.ranks[i] ?? 0;
    const vb = b.ranks[i] ?? 0;
    if (va !== vb) {
      return va - vb;
    }
  }
  return 0;
}
