#!/bin/bash

# 数字人实时对话系统 - 部署脚本
# 适用于 Linux 服务器部署

set -e

echo "======================================"
echo "数字人实时对话系统 - 自动部署脚本"
echo "======================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未检测到 Node.js，请先安装 Node.js 16+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ 错误: Node.js 版本过低，需要 16+，当前版本: $(node -v)"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo ""

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未检测到 npm"
    exit 1
fi

echo "✅ npm 版本: $(npm -v)"
echo ""

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️  警告: .env 文件不存在，从 .env.example 复制..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "📝 请编辑 .env 文件，填入火山引擎 API 密钥"
        exit 1
    else
        echo "❌ 错误: .env.example 文件不存在"
        exit 1
    fi
fi

echo "✅ 环境变量文件存在"
echo ""

# 安装依赖
echo "📦 安装依赖..."
npm install

echo ""
echo "✅ 依赖安装完成"
echo ""

# 构建前端
echo "🔨 构建前端..."
npm run build

echo ""
echo "✅ 前端构建完成"
echo ""

# 创建 PM2 配置文件
echo "📝 创建 PM2 配置..."
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

echo "✅ PM2 配置文件已创建"
echo ""

# 创建日志目录
mkdir -p logs

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 未安装，正在安装..."
    npm install -g pm2
    echo "✅ PM2 安装完成"
else
    echo "✅ PM2 已安装: $(pm2 -v)"
fi

echo ""

# 询问是否启动服务
read -p "是否使用 PM2 启动服务？(y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 启动服务..."

    # 停止旧进程
    pm2 delete digital-people 2>/dev/null || true

    # 启动新进程
    pm2 start ecosystem.config.js

    # 保存 PM2 进程列表
    pm2 save

    # 设置开机自启
    pm2 startup

    echo ""
    echo "✅ 服务启动成功！"
    echo ""
    echo "📊 查看服务状态: pm2 status"
    echo "📋 查看日志: pm2 logs digital-people"
    echo "🔄 重启服务: pm2 restart digital-people"
    echo "⏹  停止服务: pm2 stop digital-people"
    echo ""
else
    echo ""
    echo "ℹ️  手动启动服务:"
    echo "   npm run serve"
    echo ""
fi

echo "======================================"
echo "部署完成！"
echo "======================================"
echo ""
echo "访问地址:"
echo "  本地: http://localhost:5173 (开发)"
echo "  生产: 需配置 Nginx 反向代理"
echo ""
echo "WebSocket 端口: 8080"
echo "HTTP API 端口: 3000"
echo ""
