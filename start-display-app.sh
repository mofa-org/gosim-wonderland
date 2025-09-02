#!/bin/bash

echo "📺 启动 Display App..."

# 进入display-app目录
cd display-app

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

echo "🛑 检查并停止现有服务..."
pkill -f "next.*8081" || true
sleep 2

echo "🚀 启动Display App (端口 8081)..."
npm run dev