// 牌堆：生成、洗牌、发牌。
import type { Card, Suit } from '../../../shared/types';

const SUITS: Suit[] = ['♠', '♥', '♣', '♦'];

/** 生成一副 52 张扑克牌（A=14） */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push({ suit, rank, id: `${suit}${rank}` });
    }
  }
  return deck;
}

/** Fisher-Yates 洗牌，返回新数组（不修改入参） */
export function shuffle(deck: Card[]): Card[] {
  const arr = deck.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 给 count 名玩家各发 3 张牌，返回手牌数组 */
export function dealHands(deck: Card[], count: number): Card[][] {
  const hands: Card[][] = [];
  for (let p = 0; p < count; p++) {
    hands.push(deck.slice(p * 3, p * 3 + 3));
  }
  return hands;
}
