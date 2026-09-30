import { Paper, Typography, Box, Button } from '@mui/material';
import { useGameStore } from '../store/gameStore';
import { Ranking } from '../../../shared/types';

export default function Result({ onBack }: { onBack: () => void }) {
  const rankings = useGameStore((s) => s.rankings);
  if (!rankings) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Typography variant="h4" className="mb-4 text-white">
        🏆 最终排名
      </Typography>
      <Paper className="p-5 w-full max-w-sm bg-white/10 text-white">
        {rankings.map((r: Ranking) => (
          <Box
            key={r.id}
            className="flex justify-between py-2 border-b border-white/10"
          >
            <Typography>
              {r.rank}. {r.name}
              {r.isBot ? '🤖' : ''}
            </Typography>
            <Typography className="text-yellow-300">💰 {r.score}</Typography>
          </Box>
        ))}
        <Button fullWidth variant="contained" className="mt-4" onClick={onBack}>
          返回大厅
        </Button>
      </Paper>
    </div>
  );
}
