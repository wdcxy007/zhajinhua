// Socket 单例与事件订阅（全局唯一连接）。
// 所有组件共用同一个 socket 实例与全局监听，避免多连接导致房间/状态错乱。
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';
import { EVENTS } from '../../../shared/socketEvents';
import { BetAction, Card, GameState, Ranking } from '../../../shared/types';

export const socket: Socket = io();

// 全局监听，直接写入 store
socket.on(
  EVENTS.SERVER_TO_CLIENT.ROOM_CREATED,
  (payload: { roomId: string; link: string; you: string }) => {
    const s = useGameStore.getState();
    s.setRoomId(payload.roomId);
    s.setMyPlayerId(payload.you);
    s.setRoomLink(payload.link);
  },
);

socket.on(
  EVENTS.SERVER_TO_CLIENT.ROOM_STATE,
  (payload: { state: GameState }) => {
    useGameStore.getState().setRoomState(payload.state);
  },
);

socket.on(
  EVENTS.SERVER_TO_CLIENT.PLAYER_CARDS,
  (payload: { cards: Card[] }) => {
    useGameStore.getState().setMyCards(payload.cards);
  },
);

socket.on(
  EVENTS.SERVER_TO_CLIENT.GAME_OVER,
  (payload: { rankings: Ranking[] }) => {
    useGameStore.getState().setRankings(payload.rankings);
  },
);

socket.on(EVENTS.SERVER_TO_CLIENT.ERROR, (err: { code: string; message: string }) => {
  alert(err.message || '出错了');
});

// 客户端→服务器 动作封装
export function createRoom(
  playerName: string,
  totalRounds: number,
  practice: boolean,
): void {
  socket.emit(EVENTS.CLIENT_TO_SERVER.ROOM_CREATE, {
    playerName,
    totalRounds,
    practice,
  });
}

export function joinRoom(roomId: string, playerName: string): void {
  socket.emit(EVENTS.CLIENT_TO_SERVER.ROOM_JOIN, { roomId, playerName });
}

export function startGame(roomId: string): void {
  socket.emit(EVENTS.CLIENT_TO_SERVER.GAME_START, { roomId });
}

export function sendAction(
  roomId: string,
  playerId: string,
  action: BetAction,
): void {
  socket.emit(EVENTS.CLIENT_TO_SERVER.GAME_ACTION, {
    roomId,
    playerId,
    action,
  });
}

export function leaveRoom(roomId: string): void {
  socket.emit(EVENTS.CLIENT_TO_SERVER.ROOM_LEAVE, { roomId });
}
