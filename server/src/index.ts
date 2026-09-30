// 服务器入口：HTTP 静态托管前端 + Socket.IO 游戏服务。
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { registerHandlers } from './socket/handler';
import { RoomManager } from './socket/roomManager';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const manager = new RoomManager();
registerHandlers(io, manager);

// 生产环境：托管已构建的前端（client/dist）
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// SPA 兜底：非 /socket.io 的请求都返回 index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res
        .status(404)
        .send('前端尚未构建，请先 `cd client && npm run build`。开发请用 vite。');
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`炸金花服务器已启动：http://localhost:${PORT}`);
});
