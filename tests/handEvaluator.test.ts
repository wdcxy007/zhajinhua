// handEvaluator 单元测试（零依赖，Node22 --experimental-transform-types 直接运行）
// 覆盖：所有牌型识别、跨牌型大小比较、同花顺/顺子点数比较、对子比较、
//       金花比较、A23 不算顺、完全相同牌 compare 返回 0。
import type { Card, Suit } from '../shared/types';
import { HandType } from '../shared/types';
import { evaluate, compare } from '../shared/handEvaluator';
import { assert, eq, eqArr, section, finish } from './assert';

const c = (suit: Suit, rank: number): Card => ({ suit, rank, id: suit + rank });
const ev = (cards: Card[]) => evaluate(cards);
const cmp = (a: Card[], b: Card[]) => compare(ev(a), ev(b));

// ---------- 牌型识别 ----------
section('牌型识别');

const leopard = [c('♠', 9), c('♥', 9), c('♣', 9)];
eq(ev(leopard).type, HandType.Leopard, '豹子识别');
eqArr(ev(leopard).ranks, [9], '豹子点数序列');

const sf = [c('♠', 5), c('♠', 6), c('♠', 7)];
eq(ev(sf).type, HandType.StraightFlush, '顺金识别（同花且连续）');
eqArr(ev(sf).ranks, [7, 6, 5], '顺金点数降序');

const flush = [c('♠', 2), c('♠', 5), c('♠', 9)];
eq(ev(flush).type, HandType.Flush, '金花识别（同花不连续）');
eqArr(ev(flush).ranks, [9, 5, 2], '金花点数降序');

const straight = [c('♠', 5), c('♥', 6), c('♣', 7)];
eq(ev(straight).type, HandType.Straight, '顺子识别（异花连续）');
eqArr(ev(straight).ranks, [7, 6, 5], '顺子点数降序');

const akq = [c('♠', 14), c('♥', 13), c('♣', 12)];
eq(ev(akq).type, HandType.Straight, 'A-K-Q 是顺子');

const pairHigh = [c('♠', 9), c('♥', 9), c('♣', 5)];
eq(ev(pairHigh).type, HandType.Pair, '对子识别（高对）');
eqArr(ev(pairHigh).ranks, [9, 5], '对子点数 [对子, 踢脚]');

const pairLow = [c('♠', 5), c('♥', 9), c('♣', 9)];
eq(ev(pairLow).type, HandType.Pair, '对子识别（对子在最小两张）');
eqArr(ev(pairLow).ranks, [9, 5], '对子点数 [对子, 踢脚]（与高对一致）');

const high = [c('♠', 2), c('♥', 5), c('♣', 9)];
eq(ev(high).type, HandType.HighCard, '散牌识别');
eqArr(ev(high).ranks, [9, 5, 2], '散牌点数降序');

// A23 不算顺子
const a23 = [c('♠', 14), c('♥', 2), c('♣', 3)];
eq(ev(a23).type, HandType.HighCard, 'A23 不算顺子（判为散牌）');
eqArr(ev(a23).ranks, [14, 3, 2], 'A23 点数序列为 [14,3,2]');

// 顺金优先于金花/顺子：既是同花又是连续，必须判顺金而非金花
eq(ev(sf).type, HandType.StraightFlush, '同花连续优先判顺金');
// 豹子优先于顺金（三同点也是同花，但不是顺金）
eq(ev(leopard).type, HandType.Leopard, '三同点优先判豹子');

// ---------- 跨牌型大小比较 ----------
section('跨牌型大小比较（豹子 > 顺金 > 金花 > 顺子 > 对子 > 散牌）');
assert(cmp(leopard, sf) > 0, '豹子 > 顺金');
assert(cmp(sf, flush) > 0, '顺金 > 金花');
assert(cmp(flush, straight) > 0, '金花 > 顺子');
assert(cmp(straight, pairHigh) > 0, '顺子 > 对子');
assert(cmp(pairHigh, high) > 0, '对子 > 散牌');
// 反向
assert(cmp(high, pairHigh) < 0, '散牌 < 对子（反向）');

// ---------- 顺子点数比较 ----------
section('顺子/同花顺点数比较');
assert(cmp([c('♠', 7), c('♥', 6), c('♣', 5)], [c('♠', 6), c('♥', 5), c('♣', 4)]) > 0, '765 顺 > 654 顺');
assert(cmp(akq, [c('♠', 13), c('♥', 12), c('♣', 11)]) > 0, 'AKQ 顺 > KQJ 顺');

// ---------- 对子比较 ----------
section('对子比较');
const pair9k = [c('♠', 9), c('♥', 9), c('♣', 13)]; // [9,13]
const pair9low = [c('♠', 9), c('♥', 9), c('♣', 5)]; // [9,5]
const pair8 = [c('♠', 8), c('♥', 8), c('♣', 14)]; // [8,14]
assert(cmp(pair9k, pair9low) > 0, '同对子 9：踢脚 K > 5');
assert(cmp(pair9low, pair8) > 0, '对子 9 > 对子 8（不论踢脚大小）');
assert(cmp(pair9k, [...pair9k]) === 0, '完全相同对子 compare=0');

// ---------- 金花比较 ----------
section('金花比较');
const flushA = [c('♠', 9), c('♠', 5), c('♠', 2)]; // [9,5,2]
const flushB = [c('♥', 9), c('♥', 5), c('♥', 8)]; // [9,5,8]
assert(cmp(flushA, flushB) < 0, '金花 9-5-2 < 9-5-8');
assert(cmp([c('♠', 14), c('♠', 13), c('♠', 12)], [c('♥', 14), c('♥', 13), c('♥', 11)]) > 0, '同花 A-K-Q > A-K-J');

// ---------- 豹子比较 ----------
section('豹子比较');
assert(cmp([c('♠', 9), c('♥', 9), c('♣', 9)], [c('♠', 8), c('♥', 8), c('♣', 8)]) > 0, '999 > 888');

// ---------- 完全相同牌 compare 返回 0 ----------
section('完全相同牌 compare 返回 0（先比牌者负）');
assert(compare(ev(leopard), ev(leopard)) === 0, '相同豹子 compare=0');
assert(compare(ev(flushA), ev([c('♠', 9), c('♠', 5), c('♠', 2)])) === 0, '相同金花 compare=0');
assert(compare(ev(high), ev([c('♠', 2), c('♥', 5), c('♣', 9)])) === 0, '相同散牌 compare=0');
assert(compare(ev(sf), ev(sf)) === 0, '相同顺金 compare=0');

finish('handEvaluator');
