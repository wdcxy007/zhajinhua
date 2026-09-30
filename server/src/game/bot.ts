// 机器人 AI：根据手牌强度与局面返回下注动作。
// 仅以 GameEngine 的公开接口为依赖（类型层面），避免运行时循环依赖。
import type { GameEngine } from './engine';
import type { Player, BetAction } from '../../../shared/types';
import { HandType } from '../../../shared/types';
import { RAISE_CAP, COMPARE_FEE_MULT } from '../../../shared/constants';
import { evaluate } from '../../../shared/handEvaluator';

export class BotAI {
  /** 决定机器人下一步动作 */
  decide(engine: GameEngine, player: Player): BetAction {
    const mult = player.looked ? 2 : 1; // 明注 = 暗注 ×2
    const callCost = engine.currentBet * mult;
    const canCompare = engine.canCompare(player.seat);

    // 达到加注上限：只能比牌或弃牌（跟注/加注被禁止）
    if (player.raiseCount >= RAISE_CAP) {
      if (
        canCompare &&
        Math.random() < 0.6 &&
        player.score >= engine.currentBet * COMPARE_FEE_MULT * mult
      ) {
        return { type: 'compare', targetSeat: this.pickTarget(engine, player.seat) };
      }
      return { type: 'fold' };
    }

    // 还没看牌：一半概率先看牌
    if (!player.looked && Math.random() < 0.5) {
      return { type: 'look' };
    }

    const strength = this.evalStrength(player);

    if (strength > 0.75) {
      // 强牌：尝试比牌或加注
      if (canCompare && Math.random() < 0.4) {
        return { type: 'compare', targetSeat: this.pickTarget(engine, player.seat) };
      }
      if (player.score >= engine.currentBet * mult) {
        return { type: 'raise' };
      }
      if (player.score >= callCost) {
        return { type: 'call' };
      }
      return { type: 'fold' };
    }

    if (strength > 0.45) {
      if (player.score >= callCost) return { type: 'call' };
      return { type: 'fold' };
    }

    // 弱牌：偶尔跟注诈唬，或比牌碰运气，否则弃牌
    if (Math.random() < 0.3 && player.score >= callCost) return { type: 'call' };
    if (
      canCompare &&
      Math.random() < 0.2 &&
      player.score >= engine.currentBet * COMPARE_FEE_MULT * mult
    ) {
      return { type: 'compare', targetSeat: this.pickTarget(engine, player.seat) };
    }
    return { type: 'fold' };
  }

  /** 评估手牌强度 0~1 */
  private evalStrength(player: Player): number {
    const r = evaluate(player.cards);
    const base: Record<HandType, number> = {
      [HandType.HighCard]: 0.2,
      [HandType.Pair]: 0.5,
      [HandType.Straight]: 0.65,
      [HandType.Flush]: 0.75,
      [HandType.StraightFlush]: 0.9,
      [HandType.Leopard]: 1.0,
    };
    let s = base[r.type];
    s += (r.ranks[0] - 2) / 200; // 高点小幅加成
    return Math.min(1, s);
  }

  /** 随机挑选一个其他存活玩家作为比牌目标 */
  private pickTarget(engine: GameEngine, seat: number): number {
    const others = engine.activePlayers.filter((p) => p.seat !== seat);
    if (others.length === 0) return seat;
    return others[Math.floor(Math.random() * others.length)].seat;
  }
}
