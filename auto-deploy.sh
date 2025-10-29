#!/bin/bash

# 数字人系统 - 自动部署脚本
# 用法: ./auto-deploy.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 服务器信息
SERVER_IP="8.152.96.186"
SERVER_USER="root"
DEPLOY_PATH="/var/www/DignalPeople"
BRANCH="claude/digital-avatar-live2d-011CUbSp3dp4ZbN7WBRT6JiD"

echo -e "${GREEN}======================================"
echo "数字人实时对话系统 - 自动部署"
echo -e "======================================${NC}"
echo ""

# 警告信息
echo -e "${RED}⚠️  安全警告：${NC}"
echo "1. 建议使用 SSH 密钥而不是密码"
echo "2. 部署后立即修改服务器密码"
echo "3. 不要在生产环境使用 root 用户"
echo ""
read -p "按回车继续，或 Ctrl+C 取消..."
echo ""

# 检查本地 Git 仓库
if [ ! -d ".git" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

echo -e "${GREEN}[1/10] 检查本地代码...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}警告: 有未提交的更改${NC}"
    git status --short
    read -p "是否继续？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}[2/10] 测试服务器连接...${NC}"
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes ${SERVER_USER}@${SERVER_IP} exit 2>/dev/null; then
    echo -e "${YELLOW}无法使用密钥连接，将提示输入密码${NC}"
fi

echo -e "${GREEN}[3/10] 检查服务器系统...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    if ! command -v node &> /dev/null; then
        echo "正在安装 Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt install -y nodejs
    fi

    if ! command -v git &> /dev/null; then
        echo "正在安装 Git..."
        apt install -y git
    fi

    if ! command -v pm2 &> /dev/null; then
        echo "正在安装 PM2..."
        npm install -g pm2
    fi

    if ! command -v nginx &> /dev/null; then
        echo "正在安装 Nginx..."
        apt install -y nginx
    fi

    echo "Node.js: $(node -v)"
    echo "npm: $(npm -v)"
    echo "PM2: $(pm2 -v)"
    echo "Nginx: $(nginx -v 2>&1)"
ENDSSH

echo -e "${GREEN}[4/10] 创建部署目录...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${DEPLOY_PATH}"

echo -e "${GREEN}[5/10] 上传代码...${NC}"
echo "打包本地代码..."
tar -czf /tmp/digital-people.tar.gz \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='logs' \
    .

echo "上传到服务器..."
scp /tmp/digital-people.tar.gz ${SERVER_USER}@${SERVER_IP}:/tmp/

echo -e "${GREEN}[6/10] 解压代码...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
    cd ${DEPLOY_PATH}
    tar -xzf /tmp/digital-people.tar.gz
    rm /tmp/digital-people.tar.gz
ENDSSH

echo -e "${GREEN}[7/10] 安装依赖和构建...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
    cd ${DEPLOY_PATH}
    npm install --production
    npm run build
ENDSSH

echo -e "${GREEN}[8/10] 配置 PM2...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    cd /var/www/DignalPeople

    # 创建 PM2 配置
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

    # 停止旧服务
    pm2 delete digital-people 2>/dev/null || true

    # 启动新服务
    pm2 start ecosystem.config.js
    pm2 save
ENDSSH

echo -e "${GREEN}[9/10] 配置 Nginx...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    # 创建 Nginx 配置
    cat > /etc/nginx/sites-available/digital-people << 'EOF'
server {
    listen 80;
    server_name 8.152.96.186;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        root /var/www/DignalPeople/dist;
        try_files $uri $uri/ /index.html;
    }

    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

    # 启用配置
    ln -sf /etc/nginx/sites-available/digital-people /etc/nginx/sites-enabled/

    # 测试并重启
    nginx -t && systemctl restart nginx
ENDSSH

echo -e "${GREEN}[10/10] 配置防火墙...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    if command -v ufw &> /dev/null; then
        ufw allow 22/tcp
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw allow 8080/tcp
        ufw allow 3000/tcp
        echo "y" | ufw enable
    fi
ENDSSH

echo ""
echo -e "${GREEN}======================================"
echo "部署完成！"
echo -e "======================================${NC}"
echo ""
echo "访问地址: http://${SERVER_IP}"
echo ""
echo "管理命令:"
echo "  查看日志: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 logs digital-people'"
echo "  重启服务: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 restart digital-people'"
echo "  查看状态: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 status'"
echo ""
echo -e "${YELLOW}重要提醒：${NC}"
echo "1. 立即修改服务器 root 密码"
echo "2. 创建新的管理员用户"
echo "3. 配置 SSH 密钥认证"
echo "4. 考虑配置 HTTPS"
echo ""
