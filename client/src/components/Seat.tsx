import { Paper, Typography, Box, Chip } from '@mui/material';
import { PlayerView } from '../../../shared/types';

export default function Seat({
  player,
  isCurrent,
}: {
  player: PlayerView;
  isCurrent: boolean;
}) {
  const folded = player.status === 'folded' || player.status === 'out';
  return (
    <Paper
      className={`p-2 flex items-center justify-between bg-white/10 text-white ${
        isCurrent ? 'ring-2 ring-yellow-400' : ''
      } ${folded ? 'opacity-50' : ''}`}
    >
      <Box>
        <Typography className="font-bold">
          {player.name}
          {player.isBot ? '🤖' : ''}
        </Typography>
        <Box className="flex gap-1 mt-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block w-6 h-8 rounded bg-white/20 border border-white/30 text-center text-xs leading-8"
            >
              背
            </span>
          ))}
        </Box>
      </Box>
      <Box className="text-right">
        <Typography className="text-yellow-300">💰{player.score}</Typography>
        <Box className="flex gap-1 mt-1 justify-end">
          {player.looked && (
            <Chip size="small" label="明" color="warning" />
          )}
          {player.status === 'active' && (
            <Chip size="small" label={`加${player.raiseCount}`} />
          )}
          {folded && (
            <Chip
              size="small"
              label={player.status === 'out' ? '出局' : '弃牌'}
            />
          )}
        </Box>
      </Box>
    </Paper>
  );
}
