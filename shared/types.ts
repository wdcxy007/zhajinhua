// 共享类型定义：前后端共用，禁止在此处引入第三方依赖。

/** 花色（♠黑桃 ♥红心 ♣梅花 ♦方块），花色不分大小 */
export type Suit = '♠' | '♥' | '♣' | '♦';

/** 一张牌：rank 为点数（2-14，A=14），id 用于前端稳定渲染 */
export interface Card {
  suit: Suit;
  rank: number;
  id: string;
}

/**
 * 牌型（数值越大越强：豹子 > 顺金 > 金花 > 顺子 > 对子 > 散牌）
 *
 * 注意：此处使用 `const 对象 + 字符串联合类型` 而非 `enum`：
 *  1. Node 22 的 --experimental-strip-types 不支持 enum 运行时转换；
 *  2. 前后端共用一份定义，const 对象在「值」与「类型」两个层面都向后兼容
 *     （HandType.Leopard 仍可作值访问，`: HandType` 仍可作类型注解）。
 * 导出名与字符串取值均与原 enum 保持一致，不破坏任何现有引用。
 */
export const HandType = {
  HighCard: 'high', // 散牌
  Pair: 'pair', // 对子
  Straight: 'straight', // 顺子
  Flush: 'flush', // 金花
  StraightFlush: 'straightFlush', // 顺金
  Leopard: 'leopard', // 豹子
} as const;
export type HandType = (typeof HandType)[keyof typeof HandType];

/** 牌型判定结果 */
export interface HandResult {
  type: HandType;
  /** 用于比大小的权重序列，按重要度降序 */
  ranks: number[];
}

/** 下注动作类型 */
export type BetActionType =
  | 'look' // 看牌（转明牌，免费，过手）
  | 'call' // 跟注
  | 'raise' // 加注
  | 'compare' // 比牌
  | 'fold' // 弃牌
  | 'allin'; // 全下

/** 下注动作 */
export interface BetAction {
  type: BetActionType;
  /** 加注金额（保留字段，实际金额由引擎按规则计算） */
  amount?: number;
  /** 比牌目标座位号 */
  targetSeat?: number;
}

/** 玩家状态 */
export type PlayerStatus = 'waiting' | 'active' | 'folded' | 'out';

/** 完整玩家（服务器内部使用，含私密手牌） */
export interface Player {
  id: string;
  name: string;
  seat: number;
  isBot: boolean;
  score: number;
  cards: Card[];
  looked: boolean;
  status: PlayerStatus;
  raiseCount: number;
  contributed: number;
  connected: boolean;
}

/** 对外公开的玩家视图（隐藏手牌，仅广播状态） */
export interface PlayerView {
  id: string;
  name: string;
  seat: number;
  isBot: boolean;
  score: number;
  looked: boolean;
  status: PlayerStatus;
  raiseCount: number;
  contributed: number;
  connected: boolean;
}

/** 游戏阶段 */
export type GamePhase = 'waiting' | 'playing' | 'over';

/** 广播给客户端的游戏状态 */
export interface GameState {
  roomId: string;
  phase: GamePhase;
  round: number;
  totalRounds: number;
  /** 当前行动座位号 */
  currentTurnSeat: number;
  /** 当前单注基准（暗注），明注 = 暗注 ×2 */
  currentBet: number;
  /** 锅底总额 */
  pot: number;
  baseScore: number;
  practice: boolean;
  /** 当前是第几轮下注（用于比牌限制） */
  bettingRound: number;
  players: PlayerView[];
}

/** 结算排名 */
export interface Ranking {
  id: string;
  name: string;
  score: number;
  rank: number;
  isBot: boolean;
}
