import { useState } from 'react';
import {
  Button,
  TextField, Typography, FormControlLabel, Switch, Box, Paper,
} from '@mui/material';
import { useGameStore } from '../store/gameStore';
import { createRoom, joinRoom } from '../hooks/useSocket';

export default function Lobby({ prefillCode }: { prefillCode: string }) {
  const setMyName = useGameStore((s) => s.setMyName);
  const roomLink = useGameStore((s) => s.roomLink);

  const [name, setName] = useState('');
  const [rounds, setRounds] = useState(10);
  const [practice, setPractice] = useState(false);
  const [joinCode, setJoinCode] = useState(prefillCode);
  const [mode, setMode] = useState<'create' | 'join'>(
    prefillCode ? 'join' : 'create',
  );

  const handleCreate = () => {
    const n = name.trim() || '玩家';
    setMyName(n);
    createRoom(n, rounds, practice);
  };
  const handleJoin = () => {
    const n = name.trim() || '玩家';
    setMyName(n);
    joinRoom(joinCode.trim().toUpperCase(), n);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Typography variant="h4" className="mb-6 font-bold text-white">
        🃏 炸金花
      </Typography>
      <Paper className="p-5 w-full max-w-sm bg-white/10 text-white backdrop-blur">
        <Box className="flex gap-2 mb-4">
          <Button
            fullWidth
            variant={mode === 'create' ? 'contained' : 'outlined'}
            onClick={() => setMode('create')}
          >
            创建房间
          </Button>
          <Button
            fullWidth
            variant={mode === 'join' ? 'contained' : 'outlined'}
            onClick={() => setMode('join')}
          >
            加入房间
          </Button>
        </Box>

        <TextField
          label="你的昵称"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-3"
          InputProps={{ style: { color: 'white' } }}
          InputLabelProps={{ style: { color: '#ccc' } }}
        />

        {mode === 'create' ? (
          <>
            <Typography className="mb-1 text-sm text-gray-300">
              选择轮数
            </Typography>
            <Box className="flex gap-2 mb-3">
              {[5, 10, 15].map((r) => (
                <Button
                  key={r}
                  variant={rounds === r ? 'contained' : 'outlined'}
                  onClick={() => setRounds(r)}
                  fullWidth
                >
                  {r} 轮
                </Button>
              ))}
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={practice}
                  onChange={(e) => setPractice(e.target.checked)}
                />
              }
              label="练习模式（1 人 + 2 机器人）"
              className="mb-3 text-gray-300"
            />
            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              onClick={handleCreate}
            >
              创建并等待好友
            </Button>
          </>
        ) : (
          <>
            <TextField
              label="房间码"
              fullWidth
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="mb-3"
              InputProps={{
                style: { color: 'white', letterSpacing: 2 },
              }}
              InputLabelProps={{ style: { color: '#ccc' } }}
            />
            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              onClick={handleJoin}
            >
              加入房间
            </Button>
          </>
        )}

        {roomLink && (
          <Typography className="mt-3 text-xs text-green-300 break-all">
            房间链接：{roomLink}
          </Typography>
        )}
      </Paper>
    </div>
  );
}
