// 全局游戏状态（Zustand）：房间/自己/牌桌状态/私牌/结算排名。
import { create } from 'zustand';
import { Card, GameState, Ranking } from '../../../shared/types';

interface GameStore {
  roomId: string;
  myPlayerId: string;
  myName: string;
  roomLink: string;
  roomState: GameState | null;
  myCards: Card[];
  rankings: Ranking[] | null;
  setRoomId: (id: string) => void;
  setMyPlayerId: (id: string) => void;
  setMyName: (n: string) => void;
  setRoomLink: (l: string) => void;
  setRoomState: (s: GameState) => void;
  setMyCards: (c: Card[]) => void;
  setRankings: (r: Ranking[]) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  roomId: '',
  myPlayerId: '',
  myName: '',
  roomLink: '',
  roomState: null,
  myCards: [],
  rankings: null,
  setRoomId: (id) => set({ roomId: id }),
  setMyPlayerId: (id) => set({ myPlayerId: id }),
  setMyName: (n) => set({ myName: n }),
  setRoomLink: (l) => set({ roomLink: l }),
  setRoomState: (s) => set({ roomState: s }),
  setMyCards: (c) => set({ myCards: c }),
  setRankings: (r) => set({ rankings: r }),
  reset: () =>
    set({
      roomId: '',
      myPlayerId: '',
      myName: '',
      roomLink: '',
      roomState: null,
      myCards: [],
      rankings: null,
    }),
}));
