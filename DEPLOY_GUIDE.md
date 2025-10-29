# 数字人系统 - Linux 服务器部署指南

服务器信息：8.152.96.186

## ⚠️ 重要：首次部署前的安全设置

**立即执行以下操作保护服务器安全：**

```bash
# 1. 连接到服务器
ssh root@8.152.96.186

# 2. 立即修改 root 密码
passwd
# 输入新密码（至少12位，包含大小写字母、数字、特殊字符）

# 3. 创建新的管理员用户（不要使用 root）
adduser admin
usermod -aG sudo admin

# 4. 配置 SSH 密钥认证（推荐）
# 在本地生成密钥（如果还没有）
ssh-keygen -t rsa -b 4096

# 复制公钥到服务器
ssh-copy-id admin@8.152.96.186

# 5. 禁用 root SSH 登录和密码登录（可选但强烈推荐）
nano /etc/ssh/sshd_config
# 修改以下配置：
# PermitRootLogin no
# PasswordAuthentication no
# 然后重启 SSH: systemctl restart sshd
```

---

## 📋 部署步骤

### 步骤 1：连接到服务器

```bash
ssh root@8.152.96.186
# 或使用新创建的用户
ssh admin@8.152.96.186
```

### 步骤 2：更新系统

```bash
# Ubuntu/Debian
apt update && apt upgrade -y

# CentOS
yum update -y
```

### 步骤 3：安装 Node.js

```bash
# 安装 Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 验证安装
node -v
npm -v
```

### 步骤 4：安装 Git

```bash
apt install -y git
```

### 步骤 5：克隆项目

```bash
# 进入工作目录
cd /var/www

# 克隆项目（替换为你的仓库地址）
git clone <your-repo-url> DignalPeople
cd DignalPeople

# 切换到正确的分支
git checkout claude/digital-avatar-live2d-011CUbSp3dp4ZbN7WBRT6JiD
```

### 步骤 6：配置环境变量

```bash
# 编辑 .env 文件
nano .env

# 确保以下配置正确：
VOLCANO_APP_ID=6114666617
VOLCANO_ACCESS_TOKEN=fkeEVXGjHapUzfHWuiFm8WjNHR7c9CoQ
VOLCANO_SECRET_KEY=ouElsPqdOshjVKeMYiz-o91P6cvKzoMW
PORT=3000
WS_PORT=8080
```

### 步骤 7：安装依赖和构建

```bash
# 安装依赖
npm install

# 构建前端
npm run build
```

### 步骤 8：安装 PM2

```bash
# 全局安装 PM2
npm install -g pm2

# 创建 PM2 配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'digital-people',
    script: 'server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      WS_PORT: 8080
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
EOF

# 创建日志目录
mkdir -p logs

# 启动服务
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
# 执行命令输出的命令
```

### 步骤 9：安装和配置 Nginx

```bash
# 安装 Nginx
apt install -y nginx

# 创建网站配置
cat > /etc/nginx/sites-available/digital-people << 'EOF'
server {
    listen 80;
    server_name 8.152.96.186;  # 或你的域名

    # 开启 gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 静态文件
    location / {
        root /var/www/DignalPeople/dist;
        try_files $uri $uri/ /index.html;
    }

    # WebSocket 代理
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # WebSocket 超时
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # API 代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# 启用配置
ln -s /etc/nginx/sites-available/digital-people /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
systemctl enable nginx
```

### 步骤 10：配置防火墙

```bash
# 安装 ufw（如果未安装）
apt install -y ufw

# 允许必要端口
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 8080/tcp  # WebSocket
ufw allow 3000/tcp  # API

# 启用防火墙
ufw enable

# 查看状态
ufw status
```

### 步骤 11：配置前端 WebSocket 地址

需要修改前端代码中的 WebSocket 地址：

```bash
# 编辑 App.tsx
nano /var/www/DignalPeople/src/App.tsx

# 找到这一行：
# clientRef.current = new RealtimeClient('ws://localhost:8080');

# 改为：
# clientRef.current = new RealtimeClient('ws://8.152.96.186:8080');
# 或如果配置了 Nginx 反向代理：
# clientRef.current = new RealtimeClient(`ws://${window.location.hostname}/ws`);

# 重新构建
npm run build

# 重启 PM2 服务
pm2 restart digital-people
```

---

## ✅ 验证部署

### 1. 检查服务状态

```bash
# 查看 PM2 服务状态
pm2 status
pm2 logs digital-people

# 查看 Nginx 状态
systemctl status nginx

# 检查端口监听
netstat -tlnp | grep -E '3000|8080|80'
```

### 2. 访问应用

打开浏览器访问：
- **HTTP**: http://8.152.96.186
- 如果配置了域名：http://your-domain.com

### 3. 测试功能

- [ ] 页面正常加载
- [ ] 配置面板显示正常
- [ ] 能连接到后端服务
- [ ] WebSocket 连接成功
- [ ] 麦克风权限正常（需要 HTTPS）
- [ ] 音频播放正常

---

## 🔒 配置 HTTPS（强烈推荐）

麦克风权限需要 HTTPS，使用 Let's Encrypt 免费证书：

```bash
# 安装 Certbot
apt install -y certbot python3-certbot-nginx

# 如果有域名，获取证书
certbot --nginx -d your-domain.com

# 自动续期
certbot renew --dry-run
```

---

## 📊 监控和维护

### 查看日志

```bash
# PM2 日志
pm2 logs digital-people

# Nginx 访问日志
tail -f /var/log/nginx/access.log

# Nginx 错误日志
tail -f /var/log/nginx/error.log
```

### 常用管理命令

```bash
# 重启服务
pm2 restart digital-people

# 停止服务
pm2 stop digital-people

# 查看监控
pm2 monit

# 更新代码
cd /var/www/DignalPeople
git pull
npm install
npm run build
pm2 restart digital-people
```

---

## 🐛 故障排查

### 1. 服务无法启动

```bash
# 查看详细错误
pm2 logs digital-people --err --lines 50

# 检查环境变量
pm2 env 0

# 手动启动测试
node server/index.js
```

### 2. WebSocket 连接失败

```bash
# 检查端口是否监听
netstat -tlnp | grep 8080

# 检查防火墙
ufw status

# 查看 Nginx 错误
tail -f /var/log/nginx/error.log
```

### 3. 页面 404

```bash
# 检查 dist 目录
ls -la /var/www/DignalPeople/dist

# 重新构建
npm run build

# 检查 Nginx 配置
nginx -t
```

---

## 📞 需要帮助？

如果遇到问题：
1. 查看日志文件
2. 检查服务状态
3. 验证配置文件
4. 查看防火墙设置

---

**部署完成！** 🎉

访问地址：http://8.152.96.186
