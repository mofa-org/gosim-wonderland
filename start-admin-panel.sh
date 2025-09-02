#!/bin/bash

echo "⚙️ 启动 Admin Panel..."

# 进入admin-panel目录
cd admin-panel

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

echo "🛑 检查并停止现有服务..."
pkill -f "next.*8082" || true
sleep 2

echo "🚀 启动Admin Panel (端口 8082)..."
npm run dev