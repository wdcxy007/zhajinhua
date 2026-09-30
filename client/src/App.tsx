import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import Lobby from './pages/Lobby';
import Table from './pages/Table';
import Result from './pages/Result';

export default function App() {
  const roomState = useGameStore((s) => s.roomState);
  const rankings = useGameStore((s) => s.rankings);
  const reset = useGameStore((s) => s.reset);
  const [prefillCode, setPrefillCode] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('r');
    if (r) setPrefillCode(r.toUpperCase());
  }, []);

  // 页面切换：结算 > 牌桌 > 大厅
  if (rankings) {
    return (
      <Result
        onBack={() => {
          reset();
          window.history.replaceState({}, '', '/');
        }}
      />
    );
  }
  if (roomState) {
    return <Table />;
  }
  return <Lobby prefillCode={prefillCode} />;
}
