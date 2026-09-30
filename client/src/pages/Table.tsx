import { Button, Paper, Typography, Box, Divider } from '@mui/material';
import { useGameStore } from '../store/gameStore';
import { startGame } from '../hooks/useSocket';
import { PlayerView } from '../../../shared/types';
import Seat from '../components/Seat';
import Hand from '../components/Hand';
import ActionBar from '../components/ActionBar';
import Pot from '../components/Pot';

export default function Table() {
  const roomState = useGameStore((s) => s.roomState);
  const myCards = useGameStore((s) => s.myCards);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const roomId = useGameStore((s) => s.roomId);
  const roomLink = useGameStore((s) => s.roomLink);

  if (!roomState) return null;

  const me: PlayerView | undefined = roomState.players.find(
    (p) => p.id === myPlayerId,
  );
  const isMyTurn =
    me?.status === 'active' &&
    roomState.currentTurnSeat === me.seat &&
    roomState.phase === 'playing';
  const others = roomState.players.filter((p) => p.id !== myPlayerId);

  // 等待开局阶段（也可用于分享房间）
  if (roomState.phase === 'waiting') {
    const humans = roomState.players.filter((p) => !p.isBot).length;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Paper className="p-5 w-full max-w-sm bg-white/10 text-white">
          <Typography variant="h6" className="mb-1">
            房间码：{roomState.roomId}
          </Typography>
          <Typography className="mb-2 text-xs text-green-300 break-all">
            分享链接：{roomLink}
          </Typography>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            className="mb-3"
            onClick={() => navigator.clipboard?.writeText(roomLink)}
          >
            复制链接
          </Button>
          <Divider className="bg-white/20 my-2" />
          <Typography className="mb-2 text-sm">
            已加入（{roomState.players.length} 人）：
          </Typography>
          {roomState.players.map((p) => (
            <Typography key={p.id} className="text-sm">
              {p.name}
              {p.isBot ? '🤖' : ''}
              {p.id === myPlayerId ? '（你）' : ''}
            </Typography>
          ))}
          <Button
            fullWidth
            variant="contained"
            color="primary"
            className="mt-4"
            disabled={humans < 2}
            onClick={() => startGame(roomId)}
          >
            {humans < 2 ? '至少需要 2 名真人' : '开始游戏'}
          </Button>
        </Paper>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto">
      <Box className="p-2">
        <Pot state={roomState} />
      </Box>
      <Box className="flex-1 overflow-y-auto p-2 space-y-2">
        {others.map((p) => (
          <Seat
            key={p.id}
            player={p}
            isCurrent={roomState.currentTurnSeat === p.seat}
          />
        ))}
      </Box>
      <Box className="p-2 pb-4">
        <Hand cards={myCards} revealed={!!me?.looked} />
        <Box className="mt-2">
          <ActionBar isMyTurn={isMyTurn} me={me} state={roomState} />
        </Box>
      </Box>
    </div>
  );
}
