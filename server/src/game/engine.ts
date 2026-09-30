// 权威游戏状态机（服务器唯一可信来源）。
//
// ===== 下注数学模型（所有下注数学集中此处）=====
// 变量：
//   currentBet  当前单注基准（暗注）。仅加注时变大，封顶 SINGLE_BET_CAP。
//   mult        明注系数：看牌后为 2（明注 = 暗注 ×2），否则 1。
//   raiseCount  每个玩家自己的下注/加注次数，达 RAISE_CAP 后禁止再加注。
//
// 各动作本次支付：
//   看牌 look    0（免费，转明牌，过手）
//   跟注 call    currentBet * mult
//   加注 raise   newBet = min(currentBet*2, SINGLE_BET_CAP)
//               本次支付 = (newBet - currentBet) * mult   // 即“先加后翻倍”的增量
//   比牌 compare currentBet * COMPARE_FEE_MULT * mult
//   弃牌 fold    0
// 发牌时每人先扣底分 BASE_SCORE 入锅（currentBet 初始 = BASE_SCORE）。
// 任一玩家 raiseCount >= RAISE_CAP 或 currentBet >= SINGLE_BET_CAP 时系统自动开牌。
// 破产保护：轮到行动且 score<=0 自动弃牌，保证分数不为负。
import type {
  Card,
  Player,
  PlayerView,
  GameState,
  GamePhase,
  BetAction,
  Ranking,
} from '../../../shared/types';
import {
  BASE_SCORE,
  SINGLE_BET_CAP,
  RAISE_CAP,
  COMPARE_FEE_MULT,
} from '../../../shared/constants';
import { evaluate, compare } from '../../../shared/handEvaluator';
import { createDeck, shuffle, dealHands } from './deck';
import { BotAI } from './bot';

export class GameEngine {
  roomId: string;
  totalRounds: number;
  practice: boolean;
  players: Player[] = [];
  round = 0;
  currentTurnSeat = -1;
  currentBet = BASE_SCORE;
  pot = 0;
  phase: GamePhase = 'waiting';
  bettingRound = 1;
  private rankings: Ranking[] = [];
  private botAI = new BotAI();

  constructor(roomId: string, totalRounds: number, practice: boolean) {
    this.roomId = roomId;
    this.totalRounds = totalRounds;
    this.practice = practice;
  }

  addPlayer(p: Player): void {
    this.players.push(p);
  }

  getPlayer(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }

  get activePlayers(): Player[] {
    return this.players.filter((p) => p.status === 'active');
  }

  /** 判断某座位当前是否可以发起比牌：仅剩 2 人任意轮可发起；>2 人从第 2 轮下注起可发起 */
  canCompare(seat: number): boolean {
    const active = this.activePlayers;
    if (active.length <= 2) return true;
    return this.bettingRound >= 2;
  }

  // ---------------- 开局 ----------------

  startGame(): void {
    if (this.phase === 'playing' || this.phase === 'over') return;
    this.phase = 'playing';
    this.startRound();
    if (this.phase === 'playing') this.runBotTurns();
  }

  private startRound(): void {
    const participants = this.players.filter((p) => p.score >= BASE_SCORE);
    if (participants.length < 2) {
      this.endGame();
      return;
    }
    this.round += 1;
    this.pot = 0;
    this.currentBet = BASE_SCORE;
    this.bettingRound = 1;

    const deck = shuffle(createDeck());
    const hands = dealHands(deck, participants.length);
    let idx = 0;
    for (const p of this.players) {
      if (p.score < BASE_SCORE) {
        p.status = 'out';
        p.cards = [];
        p.looked = false;
        p.raiseCount = 0;
        p.contributed = 0;
        continue;
      }
      p.status = 'active';
      p.looked = false;
      p.raiseCount = 0;
      p.contributed = 0;
      p.cards = hands[idx++];
      // 发牌即每人扣底分入锅
      p.score -= BASE_SCORE;
      p.contributed += BASE_SCORE;
      this.pot += BASE_SCORE;
    }
    const active = this.activePlayers;
    this.currentTurnSeat = active[0].seat;
  }

  // ---------------- 动作入口 ----------------

  handleAction(playerId: string, action: BetAction): void {
    if (this.phase !== 'playing') return;
    const player = this.getPlayer(playerId);
    if (!player || player.status !== 'active') return;
    if (player.seat !== this.currentTurnSeat) return; // 非其回合，忽略
    // 破产保护：轮到行动且分数<=0 自动弃牌
    if (player.score <= 0) {
      player.status = 'folded';
      this.advanceTurn();
      this.checkRoundEnd();
      return;
    }
    // 双保险：比牌合法性守卫（>2 人需 bettingRound>=2；仅剩 2 人任意轮）。非法则忽略，不进入 doCompare
    if (action.type === 'compare' && !this.canCompare(player.seat)) {
      return;
    }
    this.applyAction(player, action);
    if (this.phase !== 'playing') return;
    this.runBotTurns(); // 轮到机器人时自动落子
  }

  private applyAction(player: Player, action: BetAction): void {
    const mult = player.looked ? 2 : 1; // 明注 = 暗注 ×2
    switch (action.type) {
      case 'look':
        player.looked = true; // 免费，转明牌，过手
        this.advanceTurn();
        return;
      case 'fold':
        player.status = 'folded';
        this.advanceTurn();
        this.checkRoundEnd();
        return;
      case 'call': {
        this.pay(player, this.currentBet * mult); // 跟注 = 当前单注
        this.advanceTurn();
        this.checkAutoShow();
        this.checkRoundEnd();
        return;
      }
      case 'raise': {
        // 加注「先加后翻倍」：新单注 = min(当前×2, 封顶)
        const newBet = Math.min(this.currentBet * 2, SINGLE_BET_CAP);
        // 本次支付 = (新单注 - 当前单注) × 明注系数（增量）
        const cost = (newBet - this.currentBet) * mult;
        this.pay(player, cost);
        this.currentBet = newBet;
        player.raiseCount += 1;
        this.advanceTurn();
        this.checkAutoShow();
        this.checkRoundEnd();
        return;
      }
      case 'compare': {
        this.doCompare(player, action.targetSeat);
        this.advanceTurn();
        this.checkAutoShow();
        this.checkRoundEnd();
        return;
      }
      case 'allin': {
        // 全下：以剩余分数为上限尽量加注
        const remaining = player.score;
        const newBet = Math.min(
          this.currentBet * 2,
          SINGLE_BET_CAP,
          this.currentBet + remaining,
        );
        const cost = Math.min((newBet - this.currentBet) * mult, remaining);
        this.pay(player, cost);
        this.currentBet = Math.max(this.currentBet, newBet);
        player.raiseCount += 1;
        this.advanceTurn();
        this.checkAutoShow();
        this.checkRoundEnd();
        return;
      }
      default:
        return;
    }
  }

  /** 统一扣费：保证分数不为负 */
  private pay(player: Player, amount: number): void {
    const actual = Math.max(0, Math.min(amount, player.score));
    player.score -= actual;
    player.contributed += actual;
    this.pot += actual;
  }

  // ---------------- 比牌 ----------------

  private doCompare(attacker: Player, targetSeat?: number): void {
    const mult = attacker.looked ? 2 : 1;
    const cost = this.currentBet * COMPARE_FEE_MULT * mult; // 比牌费
    this.pay(attacker, cost);

    let target: Player | undefined;
    if (targetSeat != null) {
      target = this.players.find(
        (p) => p.seat === targetSeat && p.status === 'active' && p.id !== attacker.id,
      );
    }
    if (!target) {
      const others = this.activePlayers.filter((p) => p.id !== attacker.id);
      if (others.length === 0) return;
      target = others[Math.floor(Math.random() * others.length)];
    }

    const a = evaluate(attacker.cards);
    const b = evaluate(target.cards);
    const cmp = compare(a, b);
    if (cmp > 0) {
      target.status = 'folded'; // 攻方胜，守方出局
    } else {
      attacker.status = 'folded'; // 守方胜，或牌型完全相同（cmp===0）→ 发起比牌者负
    }
  }

  // ---------------- 回合推进 ----------------

  private advanceTurn(): void {
    const active = this.activePlayers;
    if (active.length <= 1) return;
    const activeSeats = active.map((p) => p.seat).sort((a, b) => a - b);
    const curr = this.currentTurnSeat;
    const next = activeSeats.find((s) => s > curr);
    if (next === undefined) {
      this.currentTurnSeat = activeSeats[0];
      this.bettingRound += 1; // 绕回起点，进入下一轮下注
    } else {
      this.currentTurnSeat = next;
    }
  }

  /** 封顶触发自动开牌；另加 bettingRound 安全阀，防止纯跟注导致的不收敛 */
  private checkAutoShow(): void {
    const hitCap = this.players.some(
      (p) => p.status === 'active' && p.raiseCount >= RAISE_CAP,
    );
    if (
      this.currentBet >= SINGLE_BET_CAP ||
      hitCap ||
      this.bettingRound >= 12
    ) {
      this.showdown();
    }
  }

  /** 仅剩 1 人时结束本局，胜者通吃锅底 */
  private checkRoundEnd(): void {
    const active = this.activePlayers;
    if (active.length <= 1) {
      if (active.length === 1) {
        active[0].score += this.pot;
      }
      this.pot = 0;
      this.nextRoundOrEnd();
    }
  }

  /** 自动开牌（封顶时）：比大小，最大者通吃 */
  private showdown(): void {
    const active = this.activePlayers;
    if (active.length === 0) {
      this.nextRoundOrEnd();
      return;
    }
    let best = active[0];
    let bestRes = evaluate(best.cards);
    for (const p of active.slice(1)) {
      const r = evaluate(p.cards);
      if (compare(r, bestRes) > 0) {
        best = p;
        bestRes = r;
      }
    }
    best.score += this.pot;
    for (const p of active) {
      if (p.id !== best.id) p.status = 'folded';
    }
    this.pot = 0;
    this.nextRoundOrEnd();
  }

  private nextRoundOrEnd(): void {
    if (this.round >= this.totalRounds) {
      this.endGame();
      return;
    }
    const eligible = this.players.filter((p) => p.score >= BASE_SCORE);
    if (eligible.length < 2) {
      this.endGame();
      return;
    }
    this.startRound();
  }

  private endGame(): void {
    this.phase = 'over';
    this.rankings = this.getRankings();
  }

  // ---------------- 机器人自动行动 ----------------

  private runBotTurns(): void {
    let guard = 0;
    while (this.phase === 'playing') {
      const current = this.players.find((p) => p.seat === this.currentTurnSeat);
      if (!current || !current.isBot) break; // 轮到真人，停止
      if (current.score <= 0) {
        current.status = 'folded';
        this.advanceTurn();
        this.checkRoundEnd();
        continue;
      }
      const action = this.botAI.decide(this, current);
      this.applyAction(current, action);
      if (++guard > 2000) break; // 安全阀
    }
  }

  // ---------------- 对外视图 ----------------

  getState(): GameState {
    const players: PlayerView[] = this.players.map((p) => ({
      id: p.id,
      name: p.name,
      seat: p.seat,
      isBot: p.isBot,
      score: p.score,
      looked: p.looked,
      status: p.status,
      raiseCount: p.raiseCount,
      contributed: p.contributed,
      connected: p.connected,
    }));
    return {
      roomId: this.roomId,
      phase: this.phase,
      round: this.round,
      totalRounds: this.totalRounds,
      currentTurnSeat: this.currentTurnSeat,
      currentBet: this.currentBet,
      pot: this.pot,
      baseScore: BASE_SCORE,
      practice: this.practice,
      bettingRound: this.bettingRound,
      players,
    };
  }

  getPlayerCards(playerId: string): Card[] {
    return this.getPlayer(playerId)?.cards ?? [];
  }

  getRankings(): Ranking[] {
    return this.players
      .map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        rank: 0,
        isBot: p.isBot,
      }))
      .sort((a, b) => b.score - a.score)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }
}
