#!/bin/bash

echo "📱 启动 Photo App..."

# 进入photo-app目录
cd photo-app

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

echo "🛑 检查并停止现有服务..."
pkill -f "next.*8080" || true
sleep 2

echo "🚀 启动Photo App (端口 8080)..."
npm run dev