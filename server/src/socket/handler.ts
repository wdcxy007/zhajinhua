// Socket 事件处理：客户端→服务器 与 服务器→客户端 的桥接。
import { Server, Socket } from 'socket.io';
import { RoomManager, Room } from './roomManager';
import { EVENTS } from '../../../shared/socketEvents';
import { BetAction } from '../../../shared/types';

export function registerHandlers(io: Server, manager: RoomManager): void {
  io.on('connection', (socket: Socket) => {
    // 创建房间
    socket.on(EVENTS.CLIENT_TO_SERVER.ROOM_CREATE, (payload: any) => {
      const { playerName, totalRounds, practice } = payload;
      const { room, playerId } = manager.createRoom(
        String(playerName ?? '玩家'),
        Number(totalRounds ?? 10),
        Boolean(practice),
      );
      socket.join(room.id);
      socket.data.playerId = playerId;
      socket.data.roomId = room.id;
      manager.setSocket(room.id, playerId, socket.id);
      const origin =
        (socket.handshake.headers.origin as string) ||
        `http://localhost:${process.env.PORT || 3000}`;
      const link = `${origin}/?r=${room.id}`;
      socket.emit(EVENTS.SERVER_TO_CLIENT.ROOM_CREATED, {
        roomId: room.id,
        link,
        you: playerId,
      });
      broadcastState(io, manager, room.id);
    });

    // 加入房间
    socket.on(EVENTS.CLIENT_TO_SERVER.ROOM_JOIN, (payload: any) => {
      const { roomId, playerName } = payload;
      const room = manager.getRoom(String(roomId));
      if (!room) {
        socket.emit(EVENTS.SERVER_TO_CLIENT.ERROR, {
          code: 'NO_ROOM',
          message: '房间不存在',
        });
        return;
      }
      const playerId = manager.joinRoom(String(roomId), String(playerName ?? '玩家'));
      if (!playerId) {
        socket.emit(EVENTS.SERVER_TO_CLIENT.ERROR, {
          code: 'FULL',
          message: '房间已满（最多 5 人）',
        });
        return;
      }
      socket.join(roomId);
      socket.data.playerId = playerId;
      socket.data.roomId = roomId;
      manager.setSocket(roomId, playerId, socket.id);
      const origin =
        (socket.handshake.headers.origin as string) ||
        `http://localhost:${process.env.PORT || 3000}`;
      const link = `${origin}/?r=${room.id}`;
      // 加入者同样收到 room:created 以获知自己的 playerId 与分享链接
      socket.emit(EVENTS.SERVER_TO_CLIENT.ROOM_CREATED, {
        roomId: room.id,
        link,
        you: playerId,
      });
      broadcastState(io, manager, roomId);
    });

    // 开始游戏
    socket.on(EVENTS.CLIENT_TO_SERVER.GAME_START, (payload: any) => {
      const { roomId } = payload;
      const room = manager.getRoom(String(roomId));
      if (!room) return;
      const humans = room.engine.players.filter((p) => !p.isBot).length;
      if (humans < 2 && !room.practice) {
        socket.emit(EVENTS.SERVER_TO_CLIENT.ERROR, {
          code: 'NEED_PLAYERS',
          message: '至少需要 2 名真人玩家才能开局',
        });
        return;
      }
      manager.fillBots(String(roomId));
      if (room.engine.players.length < 2) {
        socket.emit(EVENTS.SERVER_TO_CLIENT.ERROR, {
          code: 'NEED_PLAYERS',
          message: '人数不足，无法开局',
        });
        return;
      }
      room.engine.startGame();
      broadcastState(io, manager, roomId);
      sendPrivateCards(io, manager, roomId);
      if (room.engine.phase === 'over') {
        io.to(roomId).emit(EVENTS.SERVER_TO_CLIENT.GAME_OVER, {
          rankings: room.engine.getRankings(),
        });
      }
    });

    // 下注动作
    socket.on(EVENTS.CLIENT_TO_SERVER.GAME_ACTION, (payload: any) => {
      const { roomId, playerId, action } = payload;
      const room = manager.getRoom(String(roomId));
      if (!room) return;
      if (socket.data.playerId !== playerId) return; // 简单鉴权
      // 比牌守卫：>2 人需第 2 轮起、仅剩 2 人任意轮；非法则报错并返回，不进入引擎
      const actingPlayer = room.engine.getPlayer(String(playerId));
      if (
        action &&
        action.type === 'compare' &&
        actingPlayer &&
        !room.engine.canCompare(actingPlayer.seat)
      ) {
        socket.emit(EVENTS.SERVER_TO_CLIENT.ERROR, {
          code: 'ILLEGAL_COMPARE',
          message: '当前轮次/人数不可比牌',
        });
        return;
      }
      room.engine.handleAction(String(playerId), action as BetAction);
      broadcastState(io, manager, roomId);
      sendPrivateCards(io, manager, roomId);
      if (room.engine.phase === 'over') {
        io.to(roomId).emit(EVENTS.SERVER_TO_CLIENT.GAME_OVER, {
          rankings: room.engine.getRankings(),
        });
      }
    });

    // 离开房间
    socket.on(EVENTS.CLIENT_TO_SERVER.ROOM_LEAVE, () => {
      const roomId = socket.data.roomId as string | undefined;
      const playerId = socket.data.playerId as string | undefined;
      if (roomId && playerId) {
        manager.removePlayer(roomId, playerId);
        socket.leave(roomId);
      }
    });
  });
}

function broadcastState(io: Server, manager: RoomManager, roomId: string): void {
  const room: Room | undefined = manager.getRoom(roomId);
  if (!room) return;
  const state = room.engine.getState();
  io.to(roomId).emit(EVENTS.SERVER_TO_CLIENT.ROOM_STATE, { state });
}

function sendPrivateCards(
  io: Server,
  manager: RoomManager,
  roomId: string,
): void {
  const room: Room | undefined = manager.getRoom(roomId);
  if (!room) return;
  for (const p of room.engine.players) {
    if (!p.isBot && p.cards.length > 0) {
      const sid = manager.getSocketId(roomId, p.id);
      if (sid) {
        io.to(sid).emit(EVENTS.SERVER_TO_CLIENT.PLAYER_CARDS, {
          cards: p.cards,
        });
      }
    }
  }
}
