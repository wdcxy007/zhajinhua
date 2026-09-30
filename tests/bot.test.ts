// bot 单元测试（零依赖，Node22 --experimental-transform-types 直接运行）
// 覆盖：decide 返回合法动作集合内、不会产出非法下注额、比牌目标合法、
//       达到加注上限后只比牌/弃牌。
import { BotAI } from '../server/src/game/bot';
import { GameEngine } from '../server/src/game/engine';
import { RAISE_CAP } from '../shared/constants';
import { assert, eq, section, finish } from './assert';

type PlayerSeed = { id: string; seat: number; isBot: boolean };

function buildEngine(seeds: PlayerSeed[], totalRounds = 5): GameEngine {
  const e = new GameEngine('r1', totalRounds, false);
  for (const s of seeds) {
    e.addPlayer({
      id: s.id,
      name: s.id,
      seat: s.seat,
      isBot: s.isBot,
      score: 150,
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

const LEGAL = new Set(['look', 'call', 'raise', 'compare', 'fold', 'allin']);

// ---------- 基本合法性（3 人：1 真人 + 2 机器人） ----------
section('decide 返回合法动作集合，且不含非法下注额');
{
  const e = buildEngine([
    { id: 'h', seat: 0, isBot: false },
    { id: 'b1', seat: 1, isBot: true },
    { id: 'b2', seat: 2, isBot: true },
  ]);
  const bot = new BotAI();
  const bot1 = e.getPlayer('b1')!;
  // 3 人第 1 轮 canCompare=false，bot 不应比牌；此处只校验动作合法性与金额。
  // （比牌动作的真正出现与合法性在下方 2 人局中验证。）
  for (let i = 0; i < 2000; i++) {
    const action = bot.decide(e, bot1);
    assert(LEGAL.has(action.type), `动作合法: ${action.type}`);
    // bot 不自行计算金额，金额交由引擎处理（amount 不应被设置）
    eq(action.amount, undefined, 'bot 不产出具体下注额（交由引擎计算）');
    if (action.type === 'compare') {
      // 本轮不应出现，但万一出现也须合法
      const active = e.activePlayers;
      const ok = active.some((p) => p.seat === action.targetSeat && p.id !== 'b1');
      assert(ok, '比牌目标为其他存活玩家');
    }
  }
}

// ---------- 2 人局：必能比牌，验证目标合法性 ----------
section('2 人局 decide 比牌目标合法');
{
  const e = buildEngine([
    { id: 'h', seat: 0, isBot: false },
    { id: 'b1', seat: 1, isBot: true },
  ]);
  const bot = new BotAI();
  const bot1 = e.getPlayer('b1')!;
  for (let i = 0; i < 1000; i++) {
    const action = bot.decide(e, bot1);
    assert(LEGAL.has(action.type), `动作合法: ${action.type}`);
    if (action.type === 'compare') {
      eq(action.targetSeat, 0, '2 人局比牌目标只能是真人 seat0');
      eq(e.canCompare(bot1.seat), true, '比牌前满足 canCompare');
    }
  }
}

// ---------- 加注上限：达到 RAISE_CAP 后只比牌/弃牌 ----------
section('达到加注上限后只返回 compare / fold');
{
  const e = buildEngine([
    { id: 'h', seat: 0, isBot: false },
    { id: 'b1', seat: 1, isBot: true },
  ]);
  const bot = new BotAI();
  const bot1 = e.getPlayer('b1')!;
  bot1.raiseCount = RAISE_CAP; // 达到上限
  let compareSeen = 0;
  for (let i = 0; i < 500; i++) {
    const action = bot.decide(e, bot1);
    assert(
      action.type === 'compare' || action.type === 'fold',
      `上限后动作 ∈ {compare,fold}，实际 ${action.type}`,
    );
    if (action.type === 'compare') {
      compareSeen++;
      eq(action.targetSeat, 0, '比牌目标合法');
      eq(e.canCompare(bot1.seat), true, '比牌前满足 canCompare');
    }
  }
  assert(compareSeen > 0, '达到上限后随机策略中应出现过比牌动作');
}

// ---------- 未看牌时可能先看牌（look 合法） ----------
section('未看牌时 decide 可返回 look');
{
  const e = buildEngine([
    { id: 'h', seat: 0, isBot: false },
    { id: 'b1', seat: 1, isBot: true },
  ]);
  const bot = new BotAI();
  const bot1 = e.getPlayer('b1')!;
  let lookSeen = false;
  for (let i = 0; i < 1000; i++) {
    const action = bot.decide(e, bot1);
    if (action.type === 'look') lookSeen = true;
  }
  assert(lookSeen, '随机策略中应出现过 look');
}

finish('bot');
