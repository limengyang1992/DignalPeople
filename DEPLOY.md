# 部署指南

本文档详细说明如何将数字人实时对话系统部署到 Linux 服务器。

## 系统要求

- **操作系统**: Linux (Ubuntu 20.04+ / CentOS 7+ / Debian 10+)
- **Node.js**: 16.x 或更高版本
- **内存**: 至少 1GB RAM
- **存储**: 至少 2GB 可用空间
- **网络**: 需要访问火山引擎 API

## 快速部署

### 1. 克隆代码

```bash
git clone <your-repo-url>
cd DignalPeople
```

### 2. 配置环境变量

```bash
cp .env.example .env
nano .env  # 或使用 vim
```

编辑 `.env` 文件，填入火山引擎 API 密钥：

```env
VOLCANO_APP_ID=你的APP_ID
VOLCANO_ACCESS_TOKEN=你的ACCESS_TOKEN
VOLCANO_SECRET_KEY=你的SECRET_KEY
PORT=3000
WS_PORT=8080
```

### 3. 运行部署脚本

```bash
chmod +x deploy.sh
./deploy.sh
```

脚本会自动完成：
- 检查 Node.js 环境
- 安装依赖
- 构建前端
- 创建 PM2 配置
- 启动服务

### 4. 访问应用

**开发模式**:
```bash
npm run dev
# 访问 http://localhost:5173
```

**生产模式**:
```bash
pm2 start ecosystem.config.js
# 配置 Nginx 反向代理后访问
```

## 详细部署步骤

### 方式一: 使用 PM2（推荐）

PM2 是 Node.js 应用的进程管理器，支持自动重启、日志管理等功能。

#### 1. 安装 PM2

```bash
npm install -g pm2
```

#### 2. 启动应用

```bash
pm2 start ecosystem.config.js
```

#### 3. 管理应用

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs digital-people

# 重启
pm2 restart digital-people

# 停止
pm2 stop digital-people

# 删除
pm2 delete digital-people
```

#### 4. 开机自启

```bash
pm2 startup
pm2 save
```

### 方式二: 使用 systemd

创建 systemd 服务文件：

```bash
sudo nano /etc/systemd/system/digital-people.service
```

内容如下：

```ini
[Unit]
Description=Digital People Realtime Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/DignalPeople
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=digital-people
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable digital-people
sudo systemctl start digital-people
sudo systemctl status digital-people
```

### 方式三: 使用 Docker

创建 `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000 8080

CMD ["node", "server/index.js"]
```

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  digital-people:
    build: .
    ports:
      - "3000:3000"
      - "8080:8080"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
```

运行：

```bash
docker-compose up -d
```

## Nginx 配置

### 1. 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS
sudo yum install nginx
```

### 2. 配置反向代理

```bash
sudo nano /etc/nginx/sites-available/digital-people
```

复制 `nginx.conf.example` 的内容并修改：
- 替换 `your-domain.com` 为你的域名
- 替换 `/path/to/DignalPeople/dist` 为实际路径

### 3. 启用配置

```bash
# Ubuntu/Debian
sudo ln -s /etc/nginx/sites-available/digital-people /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 4. 配置 HTTPS（推荐）

使用 Let's Encrypt 免费 SSL 证书：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 防火墙配置

### UFW (Ubuntu)

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 3000/tcp
sudo ufw enable
```

### Firewalld (CentOS)

```bash
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## 性能优化

### 1. Node.js 优化

在 `ecosystem.config.js` 中调整：

```javascript
{
  instances: 'max',  // 使用所有 CPU 核心
  exec_mode: 'cluster',  // 集群模式
  max_memory_restart: '500M'  // 内存限制
}
```

### 2. Nginx 优化

在 Nginx 配置中启用缓存：

```nginx
# 浏览器缓存
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Gzip 压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

### 3. 前端资源优化

构建时自动进行：
- 代码压缩
- Tree-shaking
- 资源哈希

## 监控和日志

### PM2 监控

```bash
# 实时监控
pm2 monit

# 日志
pm2 logs digital-people --lines 100

# 错误日志
pm2 logs digital-people --err

# 清空日志
pm2 flush
```

### 系统监控

推荐使用：
- **PM2 Plus**: https://pm2.io/
- **Grafana + Prometheus**: 系统监控
- **ELK Stack**: 日志分析

## 故障排查

### 1. 服务无法启动

检查日志：
```bash
pm2 logs digital-people --err
```

常见问题：
- 端口被占用：修改 `.env` 中的端口
- 环境变量未配置：检查 `.env` 文件
- Node.js 版本过低：升级到 16+

### 2. WebSocket 连接失败

- 检查防火墙是否开放 8080 端口
- 检查 Nginx WebSocket 代理配置
- 查看浏览器控制台错误信息

### 3. 音频播放问题

- 确保使用 HTTPS（浏览器要求）
- 检查麦克风权限
- 查看浏览器兼容性

### 4. 火山引擎 API 错误

- 检查 API 密钥是否正确
- 检查网络是否能访问火山引擎
- 查看 API 配额是否用完

## 更新部署

### 1. 拉取最新代码

```bash
git pull origin main
```

### 2. 重新构建

```bash
npm install
npm run build
```

### 3. 重启服务

```bash
pm2 restart digital-people
```

或使用脚本：

```bash
./deploy.sh
```

## 备份和恢复

### 备份

```bash
# 备份配置
cp .env .env.backup

# 备份数据库（如果有）
# mysqldump -u user -p database > backup.sql

# 打包整个项目
tar -czf digital-people-backup-$(date +%Y%m%d).tar.gz DignalPeople/
```

### 恢复

```bash
# 解压备份
tar -xzf digital-people-backup-20250101.tar.gz

# 恢复配置
cp .env.backup .env

# 重新部署
./deploy.sh
```

## 安全建议

1. **不要将 `.env` 文件提交到 Git**
2. **使用 HTTPS** 保护通信
3. **定期更新依赖** `npm audit fix`
4. **限制 API 访问** 使用防火墙和速率限制
5. **监控异常访问** 使用日志分析工具
6. **定期备份** 配置和数据

## 技术支持

如遇问题，请：
1. 查看日志文件
2. 检查文档和 FAQ
3. 提交 Issue 到 GitHub

---

更新日期: 2025-01-06
