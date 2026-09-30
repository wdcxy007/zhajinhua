# 通用容器镜像：适用于 Oracle 永久免费 VM / Railway / 任意支持容器的云平台
FROM node:22-alpine

WORKDIR /app

# 仅拷贝 package.json 以利用 Docker 层缓存（依赖不常变）
COPY package.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json

# 安装依赖（构建期）
RUN npm --prefix client install
RUN npm --prefix server install

# 拷贝源码并构建前端
COPY . .
RUN npm --prefix client run build

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

# server 的 start 脚本为 tsx src/index.ts，tsx 已装在 server/node_modules
CMD ["npm", "--prefix", "server", "start"]
