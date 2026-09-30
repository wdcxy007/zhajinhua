// Socket 事件名（禁止硬编码，统一从此处引用）。
export const EVENTS = {
  CLIENT_TO_SERVER: {
    ROOM_CREATE: 'room:create',
    ROOM_JOIN: 'room:join',
    GAME_START: 'game:start',
    GAME_ACTION: 'game:action',
    ROOM_LEAVE: 'room:leave',
  },
  SERVER_TO_CLIENT: {
    ROOM_CREATED: 'room:created',
    ROOM_STATE: 'room:state',
    PLAYER_CARDS: 'player:cards',
    GAME_OVER: 'game:over',
    ERROR: 'error',
  },
} as const;
