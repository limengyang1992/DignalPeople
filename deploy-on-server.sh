#!/bin/bash

# 数字人系统 - 服务器端部署脚本（支持 CentOS/RHEL）
# 直接在服务器上运行

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}======================================"
echo "数字人实时对话系统 - 服务器部署"
echo -e "======================================${NC}"
echo ""

# 检查是否在项目目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 检测包管理器
if command -v yum &> /dev/null; then
    PKG_MANAGER="yum"
    PKG_UPDATE="yum update -y"
    PKG_INSTALL="yum install -y"
elif command -v apt &> /dev/null; then
    PKG_MANAGER="apt"
    PKG_UPDATE="apt update && apt upgrade -y"
    PKG_INSTALL="apt install -y"
else
    echo -e "${RED}错误: 不支持的系统，找不到 yum 或 apt${NC}"
    exit 1
fi

echo "检测到包管理器: $PKG_MANAGER"
echo ""

echo -e "${GREEN}[1/8] 更新系统包...${NC}"
$PKG_UPDATE

echo -e "${GREEN}[2/8] 安装 Node.js（如果需要）...${NC}"
if ! command -v node &> /dev/null; then
    echo "安装 Node.js 18.x..."
    if [ "$PKG_MANAGER" = "yum" ]; then
        # CentOS/RHEL
        curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
        yum install -y nodejs
    else
        # Ubuntu/Debian
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt install -y nodejs
    fi
fi
echo "Node.js: $(node -v)"
echo "npm: $(npm -v)"

echo -e "${GREEN}[3/8] 安装 PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
echo "PM2: $(pm2 -v)"

echo -e "${GREEN}[4/8] 安装项目依赖...${NC}"
npm install

echo -e "${GREEN}[5/8] 构建前端...${NC}"
npm run build

echo -e "${GREEN}[6/8] 配置 PM2...${NC}"
# 创建日志目录
mkdir -p logs

# 停止旧服务
pm2 delete digital-people 2>/dev/null || true

# 启动服务
pm2 start server/index.js --name digital-people \
    --max-memory-restart 500M \
    --error logs/err.log \
    --output logs/out.log

# 保存配置
pm2 save

# 设置开机自启
pm2 startup systemd -u root --hp /root

echo -e "${GREEN}[7/8] 安装和配置 Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    $PKG_INSTALL nginx

    # CentOS 需要启动 Nginx
    if [ "$PKG_MANAGER" = "yum" ]; then
        systemctl start nginx
        systemctl enable nginx
    fi
fi

# CentOS 的配置文件路径不同
if [ "$PKG_MANAGER" = "yum" ]; then
    NGINX_CONF="/etc/nginx/conf.d/digital-people.conf"
else
    NGINX_CONF="/etc/nginx/sites-available/digital-people"
fi

# 创建 Nginx 配置
cat > $NGINX_CONF << 'EOF'
server {
    listen 80;
    server_name 8.152.96.186;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        root /home/user/DignalPeople/dist;
        try_files $uri $uri/ /index.html;
    }

    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    access_log /var/log/nginx/digital-people-access.log;
    error_log /var/log/nginx/digital-people-error.log;
}
EOF

# Ubuntu/Debian 需要启用站点
if [ "$PKG_MANAGER" = "apt" ]; then
    ln -sf /etc/nginx/sites-available/digital-people /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
fi

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
systemctl enable nginx

echo -e "${GREEN}[8/8] 配置防火墙...${NC}"
if [ "$PKG_MANAGER" = "yum" ]; then
    # CentOS 使用 firewalld
    if command -v firewall-cmd &> /dev/null; then
        systemctl start firewalld
        systemctl enable firewalld
        firewall-cmd --permanent --add-port=22/tcp
        firewall-cmd --permanent --add-port=80/tcp
        firewall-cmd --permanent --add-port=443/tcp
        firewall-cmd --permanent --add-port=8080/tcp
        firewall-cmd --permanent --add-port=3000/tcp
        firewall-cmd --reload
        firewall-cmd --list-all
    fi
else
    # Ubuntu 使用 ufw
    if command -v ufw &> /dev/null; then
        ufw allow 22/tcp
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw allow 8080/tcp
        ufw allow 3000/tcp
        ufw --force enable
        ufw status
    fi
fi

# CentOS 需要配置 SELinux
if [ "$PKG_MANAGER" = "yum" ]; then
    echo -e "${GREEN}配置 SELinux...${NC}"
    if command -v setenforce &> /dev/null; then
        # 允许 Nginx 网络连接
        setsebool -P httpd_can_network_connect 1
        # 临时设置为宽容模式（可选）
        # setenforce 0
    fi
fi

echo ""
echo -e "${GREEN}======================================"
echo "✅ 部署完成！"
echo -e "======================================${NC}"
echo ""
echo "服务状态:"
pm2 status
echo ""
echo "访问地址: http://8.152.96.186"
echo ""
echo "常用命令:"
echo "  查看日志: pm2 logs digital-people"
echo "  重启服务: pm2 restart digital-people"
echo "  停止服务: pm2 stop digital-people"
echo "  Nginx日志: tail -f /var/log/nginx/digital-people-error.log"
echo ""
echo -e "${YELLOW}⚠️  安全提醒：${NC}"
echo "1. 立即修改 root 密码: passwd"
echo "2. 创建普通用户，禁用 root SSH 登录"
echo "3. 配置 SSH 密钥认证"
echo ""
echo -e "${YELLOW}📝 CentOS 特别说明：${NC}"
echo "如果遇到权限问题，可能需要调整 SELinux:"
echo "  临时关闭: setenforce 0"
echo "  永久关闭: 编辑 /etc/selinux/config，设置 SELINUX=disabled"
echo ""
