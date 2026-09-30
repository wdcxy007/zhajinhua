// 全局数值常量（主理人已决事项，前后端共用，唯一来源）

export const INITIAL_SCORE = 150; // 起始分
export const BASE_SCORE = 10; // 底分（发牌即每人扣 10 入锅，currentBet 初 = 10）
export const SINGLE_BET_CAP = 100; // 单注封顶
export const RAISE_CAP = 5; // 每人下注/加注次数上限（达上限只能比牌或弃牌）
export const COMPARE_FEE_MULT = 2; // 比牌费系数
