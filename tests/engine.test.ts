// engine 单元测试（零依赖，Node22 --experimental-transform-types 直接运行）
// 覆盖：底注入锅与 currentBet 初值、暗牌跟注额、明牌跟注=暗牌×2、
//       加注先加后翻倍且封顶 100、比牌费计算、raiseCount≥5 自动开牌、
//       currentBet≥100 自动开牌、破产自动弃牌、score 不为负。
import { GameEngine } from '../server/src/game/engine';
import {
  BASE_SCORE,
  SINGLE_BET_CAP,
  RAISE_CAP,
  COMPARE_FEE_MULT,
} from '../shared/constants';
import { assert, eq, section, finish } from './assert';

/** 构造全真人引擎（isBot=false），便于手动逐步驱动动作、结果可预测。 */
function makeEngine(num: number, totalRounds = 1, scores?: number[]): GameEngine {
  const e = new GameEngine('r1', totalRounds, false);
  for (let i = 0; i < num; i++) {
    e.addPlayer({
      id: 'p' + i,
      name: 'P' + i,
      seat: i,
      isBot: false,
      score: scores ? scores[i] : 150,
      cards: [],
      looked: false,
      status: 'waiting',
      raiseCount: 0,
      contributed: 0,
      connected: true,
    });
  }
  e.startGame();
  return e;
}

// ---------- 底注入锅与 currentBet 初值 ----------
section('底注入锅与 currentBet 初值');
{
  const e = makeEngine(3);
  eq(e.phase, 'playing', '开局后 phase=playing');
  eq(e.currentBet, BASE_SCORE, 'currentBet 初值 = 底分(10)');
  eq(e.pot, BASE_SCORE * 3, '底注：每人扣 10 入锅，pot=30');
  for (let i = 0; i < 3; i++) {
    const p = e.getPlayer('p' + i)!;
    eq(p.score, 150 - BASE_SCORE, `玩家${i} 开局扣底分后 score=140`);
    eq(p.contributed, BASE_SCORE, `玩家${i} contributed=10`);
    eq(p.status, 'active', `玩家${i} 状态 active`);
  }
  eq(e.currentTurnSeat, 0, '首行动座位=0');
}

// ---------- 暗牌跟注额 ----------
section('暗牌跟注额 = currentBet');
{
  const e = makeEngine(2);
  const before = e.getPlayer('p0')!.score;
  e.handleAction('p0', { type: 'call' });
  const p0 = e.getPlayer('p0')!;
  eq(p0.score, before - BASE_SCORE, '暗牌跟注支付 currentBet(10)');
  eq(e.pot, BASE_SCORE * 2 + BASE_SCORE, 'pot 增加 10');
  eq(e.currentBet, BASE_SCORE, '跟注不改变 currentBet');
  eq(e.currentTurnSeat, 1, '跟注后轮到 seat1');
}

// ---------- 明牌跟注 = 暗牌 ×2 ----------
section('明牌跟注 = 暗牌×2');
{
  const e = makeEngine(2);
  // p0 看牌（免费，转明牌），p1 跟注（暗，×1），再 p0 跟注（明，×2）
  e.handleAction('p0', { type: 'look' });
  eq(e.getPlayer('p0')!.looked, true, 'p0 看牌后 looked=true');
  eq(e.getPlayer('p0')!.score, 140, '看牌免费，score 不变');
  eq(e.currentTurnSeat, 1, '看牌后轮到 seat1');

  const p1Before = e.getPlayer('p1')!.score;
  e.handleAction('p1', { type: 'call' });
  eq(e.getPlayer('p1')!.score, p1Before - BASE_SCORE, '暗牌 p1 跟注支付 10');

  const p0Before = e.getPlayer('p0')!.score;
  e.handleAction('p0', { type: 'call' });
  eq(e.getPlayer('p0')!.score, p0Before - BASE_SCORE * 2, '明牌 p0 跟注支付 20 = 暗牌×2');
  eq(e.getPlayer('p0')!.contributed, BASE_SCORE + BASE_SCORE * 2, 'p0 contributed=30');
  eq(e.pot, BASE_SCORE * 2 + BASE_SCORE + BASE_SCORE * 2, 'pot=50');
}

// ---------- 加注先加后翻倍且封顶 100 ----------
section('加注：先加后翻倍，封顶 100 自动开牌');
{
  const e = makeEngine(2, 1);
  e.handleAction('p0', { type: 'raise' });
  eq(e.currentBet, 20, '首次加注：currentBet 翻倍为 20');
  eq(e.getPlayer('p0')!.score, 140 - (20 - BASE_SCORE), '暗牌加注支付增量 10（140-10）');
  e.handleAction('p1', { type: 'raise' });
  eq(e.currentBet, 40, '二次加注：currentBet=40');
  e.handleAction('p0', { type: 'raise' });
  eq(e.currentBet, 80, '三次加注：currentBet=80');
  e.handleAction('p1', { type: 'raise' }); // 80 -> min(160,100)=100
  eq(e.currentBet, 100, '四次加注封顶 currentBet=100');
  eq(e.phase, 'over', 'currentBet≥100 触发自动开牌并结束本局');
}

// ---------- 比牌费计算 ----------
section('比牌费 = 当前单注 × 2 × 明注系数');
{
  // 3 人，回合足够多，比牌后本局不立即结束（仍 ≥2 人）
  const e = makeEngine(3, 5);
  e.bettingRound = 2; // >2 人需第 2 轮起才允许比牌（canCompare 守卫），否则被引擎忽略
  e.handleAction('p0', { type: 'compare', targetSeat: 1 });
  const p0 = e.getPlayer('p0')!;
  // 暗牌(mult=1)：费 = currentBet(10) * COMPARE_FEE_MULT(2) * 1 = 20
  eq(p0.contributed, BASE_SCORE + BASE_SCORE * COMPARE_FEE_MULT, '暗牌比牌费 20（10×2×1）');
  eq(e.pot, BASE_SCORE * 3 + BASE_SCORE * COMPARE_FEE_MULT, 'pot 增加 20');
  eq(e.currentBet, BASE_SCORE, '比牌不改变 currentBet');

  // 明牌比牌费 = 暗牌 ×2（直接置 p0 为已看牌；p0 仍是首行动座位）
  const e2 = makeEngine(3, 5);
  e2.bettingRound = 2; // 同上：先满足比牌守卫条件
  e2.getPlayer('p0')!.looked = true;
  e2.handleAction('p0', { type: 'compare', targetSeat: 1 });
  const p0b = e2.getPlayer('p0')!;
  // 明牌(mult=2)：费 = 10 * 2 * 2 = 40
  eq(p0b.contributed, BASE_SCORE + BASE_SCORE * COMPARE_FEE_MULT * 2, '明牌比牌费 40（10×2×2）');
  eq(e2.pot, BASE_SCORE * 3 + BASE_SCORE * COMPARE_FEE_MULT * 2, 'pot 增加 40');
}

// ---------- canCompare 逻辑（引擎自带规则） ----------
section('canCompare 规则：>2人第2轮起可发起，仅剩2人任意轮');
{
  const e = makeEngine(3, 5);
  eq(e.canCompare(0), false, '3人第1轮不可比牌');
  e.bettingRound = 2;
  eq(e.canCompare(0), true, '3人第2轮起可比牌');
  const e2 = makeEngine(2, 5);
  eq(e2.canCompare(0), true, '仅剩2人任意轮可比牌');
}

// ---------- raiseCount≥5 自动开牌 ----------
section('raiseCount≥5 自动开牌');
{
  const e = makeEngine(2, 1);
  e.getPlayer('p0')!.raiseCount = RAISE_CAP; // 直接置为封顶次数
  e.handleAction('p0', { type: 'call' }); // 任何触发 checkAutoShow 的动作
  eq(e.phase, 'over', 'raiseCount≥5 触发自动开牌并结束本局');
}

// ---------- currentBet≥100 自动开牌（直接置值验证） ----------
section('currentBet≥100 自动开牌（直接置值）');
{
  const e = makeEngine(2, 1);
  e.currentBet = SINGLE_BET_CAP; // 直接置 100
  e.handleAction('p0', { type: 'call' });
  eq(e.phase, 'over', 'currentBet≥100 触发自动开牌并结束本局');
  eq(e.currentBet, SINGLE_BET_CAP, 'currentBet 保持 100');
}

// ---------- 破产自动弃牌 + score 不为负 ----------
section('破产自动弃牌 与 score 不为负');
{
  // p1 初始分恰为底分：开局扣底分后 score=0
  const e = makeEngine(2, 1, [150, BASE_SCORE]);
  eq(e.getPlayer('p1')!.score, 0, 'p1 开局扣底分后 score=0（不为负）');
  // p0 看牌过手，轮到 p1
  e.handleAction('p0', { type: 'look' });
  // p1 行动时 score<=0 → 自动弃牌
  e.handleAction('p1', { type: 'call' });
  eq(e.getPlayer('p1')!.status, 'folded', 'score<=0 轮到行动自动弃牌');
  eq(e.getPlayer('p1')!.score, 0, '破产玩家 score 不为负');
  eq(e.phase, 'over', '仅剩 1 人，本局结束');

  // 额外验证：pay 有下限钳制，分数永不为负
  const e2 = makeEngine(2);
  e2.getPlayer('p0')!.score = 3; // 人为压低分数
  e2.handleAction('p0', { type: 'call' }); // 应支付 min(10,3)=3
  eq(e2.getPlayer('p0')!.score, 0, '低分跟注被钳制，score 不为负');

  // 全局断言：任何时刻分数都不应出现负值
  const e3 = makeEngine(2);
  for (const p of e3.players) {
    assert(p.score >= 0, `玩家 ${p.id} score 不为负`);
  }
}

finish('engine');
