// 房间管理：创建/加入/补机器人/离开，维护 playerId <-> socketId 映射。
import { GameEngine } from '../game/engine';
import { Player } from '../../../shared/types';
import { INITIAL_SCORE } from '../../../shared/constants';

// 避免易混淆字符（0/O、1/I 等）
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 5;

export interface Room {
  id: string;
  engine: GameEngine;
  createdBy: string;
  practice: boolean;
  sockets: Map<string, string>; // playerId -> socketId
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  /** 生成 6 位唯一房间码 */
  genCode(): string {
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(
    playerName: string,
    totalRounds: number,
    practice: boolean,
  ): { room: Room; playerId: string } {
    const id = this.genCode();
    const engine = new GameEngine(id, totalRounds, practice);
    const playerId = this.makePlayerId();
    engine.addPlayer(this.makePlayer(playerId, playerName, 0, false));
    const room: Room = {
      id,
      engine,
      createdBy: playerId,
      practice,
      sockets: new Map(),
    };
    room.sockets.set(playerId, '');
    this.rooms.set(id, room);
    return { room, playerId };
  }

  joinRoom(roomId: string, playerName: string): string | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const humans = room.engine.players.filter((p) => !p.isBot).length;
    if (humans >= MAX_PLAYERS) return null;
    const seat = this.nextSeat(room.engine);
    const playerId = this.makePlayerId();
    room.engine.addPlayer(this.makePlayer(playerId, playerName, seat, false));
    room.sockets.set(playerId, '');
    return playerId;
  }

  /** 按主理人规则补机器人：2 真人补 1 bot；1 真人且练习模式补 2 bot；≥3 真人无 bot */
  fillBots(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const humans = room.engine.players.filter((p) => !p.isBot).length;
    let botsToAdd = 0;
    if (humans >= 3) botsToAdd = 0;
    else if (humans === 2) botsToAdd = 1;
    else if (humans === 1) botsToAdd = room.practice ? 2 : 0;
    for (let i = 0; i < botsToAdd; i++) {
      const seat = this.nextSeat(room.engine);
      const botId = this.makePlayerId();
      room.engine.addPlayer(
        this.makePlayer(botId, `机器人${i + 1}`, seat, true),
      );
    }
  }

  removePlayer(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const p = room.engine.getPlayer(playerId);
    if (p) p.connected = false; // 已开局则标记断线；未开局则可后续清理
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  setSocket(roomId: string, playerId: string, socketId: string): void {
    const room = this.rooms.get(roomId);
    if (room) room.sockets.set(playerId, socketId);
  }

  getSocketId(roomId: string, playerId: string): string | undefined {
    return this.rooms.get(roomId)?.sockets.get(playerId);
  }

  private makePlayer(
    id: string,
    name: string,
    seat: number,
    isBot: boolean,
  ): Player {
    return {
      id,
      name,
      seat,
      isBot,
      score: INITIAL_SCORE,
      cards: [],
      looked: false,
      status: 'waiting',
      raiseCount: 0,
      contributed: 0,
      connected: true,
    };
  }

  private nextSeat(engine: GameEngine): number {
    const used = new Set(engine.players.map((p) => p.seat));
    for (let s = 0; s < MAX_PLAYERS; s++) {
      if (!used.has(s)) return s;
    }
    return engine.players.length;
  }

  private makePlayerId(): string {
    return (
      Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    );
  }
}
