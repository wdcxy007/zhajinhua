// 冒烟测试：验证 toolchain
//   node --experimental-strip-types tests/smoke.test.ts
// 能正常解析无扩展名 .ts 导入、能跑 transform 后的 enum(已重构为 const)。
import { evaluate } from '../shared/handEvaluator';
import { HandType } from '../shared/types';
import { BASE_SCORE, SINGLE_BET_CAP } from '../shared/constants';
import { assert, eq, finish } from './assert';

const c = (suit: string, rank: number) => ({ suit, rank, id: suit + rank });

const r = evaluate([c('♠', 9), c('♥', 9), c('♣', 9)]);
assert(r.type === HandType.Leopard, 'smoke: 豹子识别');
eq(r.ranks[0], 9, 'smoke: 豹子点数');
eq(BASE_SCORE, 10, 'smoke: 底分=10');
eq(SINGLE_BET_CAP, 100, 'smoke: 单注封顶=100');
// 验证 enum 重构后的常量值未被改变
eq(HandType.HighCard, 'high', 'smoke: HandType.HighCard 值');
eq(HandType.Leopard, 'leopard', 'smoke: HandType.Leopard 值');

console.log('SMOKE OK');
finish('smoke');
