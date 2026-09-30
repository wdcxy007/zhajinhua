# 炸金花 · 好友房（手机端实时多人）

基于河北炸金花规则的手机端点击即玩小游戏：创建/分享房间，最多 5 人实时对战，不足时自动补人机，每人起始 150 分，开局前选 5/10/15 轮，结束按积分排名。

- 前端：Vite + React + MUI + Tailwind + Zustand，移动端竖向、点击即玩
- 后端：Node + Express + Socket.IO（权威游戏状态机 + 托管前端）
- 共享层：纯 TS，前后端共用牌型判定 / 常量 / 事件名

## 目录结构
```
zhajinhua/
├── shared/      # 类型、常量(BASE_SCORE/SINGLE_BET_CAP/...)、handEvaluator、socketEvents
├── server/      # Express + Socket.IO：deck / engine(下注状态机) / bot / roomManager / handler
├── client/      # Vite React 工程：pages(Lobby/Table/Result) + components(Seat/Hand/ActionBar/Pot)
└── tests/       # 零依赖 Node 原生测试（牌型/下注数学/bot）
```

## 本地运行
> 本仓库需先 `npm install` 安装依赖（express/socket.io/MUI/vite 等）。生产/开发均从 `server` 启动，前端由 server 统一托管。

**方式一：生产一键（推荐手机/朋友访问）**
```bash
cd client && npm install && npm run build      # 产出 client/dist
cd ../server && npm install && npm start        # 监听 3000
# 浏览器/手机打开 http://localhost:3000
```

**方式二：开发（热更新）**
```bash
# 终端 1
cd server && npm install && npm start           # 3000，托管前端 + Socket
# 终端 2
cd client && npm install && npm run dev         # 5173，vite 代理 /socket.io -> 3000
# 打开 http://localhost:5173
```
端口可用环境变量 `PORT` 覆盖（部署平台通常注入 `PORT`）。

## 玩法 / 规则要点（河北炸金花）
- 牌型：豹子 > 顺金(同花顺) > 金花(同花) > 顺子 > 对子 > 散牌；花色不分大小；A23 不算顺；完全相同牌先比牌者负。
- 每人起始 150 分；发牌即扣底分 10 入锅，当前单注初=10。
- 看牌转「明牌」且永久；**明注 = 暗注 ×2**（明牌同一动作支付暗牌的 2 倍）。
- 跟注 / 加注（先加后翻倍，单注封顶 100）/ 比牌（比牌费 = 当前单注×2×明注系数，>2 人第 2 轮起可发起、仅剩 2 人任意轮）/ 弃牌 / 梭哈。
- 手数封顶 5：达到后只能比牌或弃牌；单注达 100 或次数达 5 系统自动开牌。
- 分数≤0 轮到行动自动弃牌，不出现负分。
- 235 吃豹子、天地杠等桌定变体本期**默认关闭**。
- 轮数 5/10/15 由开局前选择，全部轮次结束按剩余分排名。

## 房间与补位
- 创建房间生成 6 位房间码，分享链接形如 `http://<域名或IP>:3000/?r=ABC123`，前端自动读取并填入。
- 开局条件：≥2 名真人可开局；恰好 2 人 → 自动补 1 个 bot（共 3 人）；1 人开「练习模式」→ 补 2 个 bot；3–5 名真人无 bot；<2 人且非练习拒绝开局。

## 分享给朋友（跨设备同房间）
房间状态在后端实时同步，因此需要一个**可被公网访问的 Node 服务**：
1. 把 `zhajinhua/` 部署到任意支持 Node 的平台（云主机 / Railway / Render / CloudStudio Node 等），开放对应端口（读 `PORT` 环境变量）。
2. 在手机或电脑上创建房间，复制链接发给朋友，对方点击即进入同一房间。
3. 纯局域网联机可暂时用本机局域网 IP（如 `http://192.168.x.x:3000/?r=CODE`）给同 Wi-Fi 的朋友访问；跨网络需用上面第 1 步的公网部署或内网穿透（ngrok/cloudflared）。

## 测试
纯逻辑（牌型判定 + 下注数学 + bot 决策）已用零依赖 Node 原生测试覆盖，6389 条断言 0 失败：
```bash
cd zhajinhua && npm test
```
Socket 集成测试需在有依赖的真机 `npm install` 后运行（见 tests 内 vitest 配置说明）。

## 免费云平台一键部署（让朋友异地也能玩）
房间实时同步依赖常驻公网 Node 服务，本地起的服务朋友连不进来。推荐以下免费方案（均零/极低费用），本仓库已备好 `render.yaml` 与 `Dockerfile`。

### 方案 A：Render（最推荐，公网长期有效）
1. 注册 Render 账号（免费档需绑卡验证但不扣费）。
2. 把本仓库推到 GitHub / Gitee（已备好 `.gitignore`，不会把 node_modules 推上去）。
3. 在 Render 新建 **Blueprint** 或 **Web Service**，连仓库；根目录已含 `render.yaml`，会自动读入 Build/Start 命令。
   - 若手动建：Build Command 填 `npm --prefix client install && npm --prefix client run build && npm --prefix server install`，Start Command 填 `npm --prefix server start`。
4. 部署完成得到 `https://xxx.onrender.com` 公网链接，打开即玩；创建房间后把 `?r=房间码` 链接发朋友。
> 免费 Web Service 有冷启动（闲置约 15 分钟后首次访问稍慢），属正常。

### 方案 B：Replit
1. 注册 Replit；新建 Node.js Repl，**Import from GitHub / Gitee** 连本仓库。
2. 在 Replit 的 Shell 执行一次 `npm --prefix client install && npm --prefix client run build && npm --prefix server install`。
3. 设置 Run command 为 `npm --prefix server start`，点 Run → 得到公网 URL。
> 免费档有用量上限，朋友偶尔玩足够。

### 方案 C：Glitch / 容器云（Oracle 永久免费 VM 等）
- Glitch：Import GitHub 仓库即可自动起，免费项目会休眠（需 ping 保活）。
- 自有云服务器（如 Oracle 永久免费 VM）：用根目录 `Dockerfile` 构建镜像跑容器，或 `git clone` 后 `npm install && npm start`，并开放安全组对应端口（读 `PORT`）。

## 已知限制
- 已在开发环境实测通过：依赖可安装、前端可构建、服务可启动，并以 2 真人 + 1 自动补 bot 端到端走完一整局（发牌 / 看牌 / 下注 / 比牌 / 结算，分数守恒、排名正确）。
- 暂未实现：断线重连、喜金彩金、235 开关、历史战绩、音效皮肤（已在 PRD 列为 P1/P2）。
