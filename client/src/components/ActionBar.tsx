import { useState } from 'react';
import { Button, Box, Typography } from '@mui/material';
import { useGameStore } from '../store/gameStore';
import { sendAction } from '../hooks/useSocket';
import { PlayerView, GameState, BetAction } from '../../../shared/types';
import { SINGLE_BET_CAP, COMPARE_FEE_MULT, RAISE_CAP } from '../../../shared/constants';

export default function ActionBar({
  isMyTurn,
  me,
  state,
}: {
  isMyTurn: boolean;
  me?: PlayerView;
  state: GameState;
}) {
  const roomId = useGameStore((s) => s.roomId);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const [compareMode, setCompareMode] = useState(false);

  if (!me) return null;

  const mult = me.looked ? 2 : 1; // 明注 = 暗注 ×2
  const callCost = state.currentBet * mult;
  const newBet = Math.min(state.currentBet * 2, SINGLE_BET_CAP);
  const raiseCost = (newBet - state.currentBet) * mult;
  const compareCost = state.currentBet * COMPARE_FEE_MULT * mult;

  const activeOthers = state.players.filter(
    (p) => p.status === 'active' && p.id !== myPlayerId,
  );
  const activeCount = state.players.filter((p) => p.status === 'active').length;
  // 比牌允许性：仅剩 2 人任意轮；>2 人从第 2 轮下注起
  const canCompare = activeOthers.length >= 1 && (activeCount <= 2 || state.bettingRound >= 2);
  const atRaiseCap = me.raiseCount >= RAISE_CAP;

  const doAction = (action: BetAction) => {
    sendAction(roomId, myPlayerId, action);
    setCompareMode(false);
  };

  if (!isMyTurn) {
    return (
      <Box className="text-center text-gray-300 py-3">等待其他玩家行动…</Box>
    );
  }
  if (me.status !== 'active') {
    return (
      <Box className="text-center text-gray-300 py-3">
        你已弃牌 / 出局，本局旁观
      </Box>
    );
  }

  if (compareMode) {
    return (
      <Box>
        <Typography className="text-xs mb-1">选择比牌对象：</Typography>
        <Box className="flex flex-wrap gap-2">
          {activeOthers.map((p) => (
            <Button
              key={p.id}
              size="small"
              variant="contained"
              color="secondary"
              onClick={() =>
                doAction({ type: 'compare', targetSeat: p.seat })
              }
            >
              {p.name}
            </Button>
          ))}
          <Button
            size="small"
            variant="outlined"
            onClick={() => setCompareMode(false)}
          >
            取消
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="grid grid-cols-3 gap-2">
      {!me.looked && (
        <Button variant="outlined" color="info" onClick={() => doAction({ type: 'look' })}>
          看牌
        </Button>
      )}
      <Button
        variant="contained"
        color="primary"
        disabled={me.score < callCost}
        onClick={() => doAction({ type: 'call' })}
      >
        跟注 {callCost}
      </Button>
      <Button
        variant="contained"
        color="success"
        disabled={atRaiseCap || me.score < raiseCost}
        onClick={() => doAction({ type: 'raise' })}
      >
        加注 {raiseCost}
      </Button>
      <Button
        variant="contained"
        color="warning"
        disabled={!canCompare || me.score < compareCost}
        onClick={() => setCompareMode(true)}
      >
        比牌 {compareCost}
      </Button>
      <Button variant="outlined" color="error" onClick={() => doAction({ type: 'fold' })}>
        弃牌
      </Button>
    </Box>
  );
}
