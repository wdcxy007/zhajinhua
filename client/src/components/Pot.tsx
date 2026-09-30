import { Paper, Typography, Box } from '@mui/material';
import { GameState } from '../../../shared/types';

export default function Pot({ state }: { state: GameState }) {
  return (
    <Paper className="p-2 bg-black/30 text-white flex items-center justify-between">
      <Box>
        <Typography variant="subtitle2">🪙 锅底 {state.pot}</Typography>
        <Typography variant="caption" className="text-gray-300">
          单注 {state.currentBet} · 底分 {state.baseScore}
        </Typography>
      </Box>
      <Box className="text-right">
        <Typography variant="subtitle2">
          第 {Math.max(1, state.round)}/{state.totalRounds} 轮
        </Typography>
        <Typography variant="caption" className="text-gray-300">
          {state.practice ? '练习模式' : ''}
        </Typography>
      </Box>
    </Paper>
  );
}
