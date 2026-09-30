// 展示用的格式化工具。
import { Card, Suit } from '../../../shared/types';

export function rankLabel(rank: number): string {
  if (rank === 14) return 'A';
  if (rank === 13) return 'K';
  if (rank === 12) return 'Q';
  if (rank === 11) return 'J';
  return String(rank);
}

export function suitColor(suit: Suit): 'red' | 'black' {
  return suit === '♥' || suit === '♦' ? 'red' : 'black';
}

export function cardLabel(card: Card): string {
  return rankLabel(card.rank) + card.suit;
}
