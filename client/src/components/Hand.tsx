import { Box } from '@mui/material';
import { Card } from '../../../shared/types';
import { rankLabel, suitColor } from '../utils/format';

export default function Hand({
  cards,
  revealed,
}: {
  cards: Card[];
  revealed: boolean;
}) {
  return (
    <Box className="flex gap-2 justify-center">
      {[0, 1, 2].map((i) => {
        const c = cards[i];
        if (!c || !revealed) {
          // 牌背（未看牌 / 无牌）
          return (
            <Box
              key={i}
              className="w-14 h-20 rounded-lg bg-gradient-to-b from-red-800 to-red-600 border-2 border-yellow-300 flex items-center justify-center text-yellow-200 text-xs"
            >
              金花
            </Box>
          );
        }
        const color = suitColor(c.suit);
        const text = color === 'red' ? 'text-red-600' : 'text-black';
        return (
          <Box
            key={i}
            className="w-14 h-20 rounded-lg bg-white border border-gray-300 flex flex-col items-center justify-center shadow"
          >
            <span className={`text-lg font-bold ${text}`}>
              {rankLabel(c.rank)}
            </span>
            <span className={`text-2xl ${text}`}>{c.suit}</span>
          </Box>
        );
      })}
    </Box>
  );
}
