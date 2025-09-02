#!/bin/bash

echo "🤖 启动 AI API 服务器..."

# 进入ai-api-server目录
cd ai-api-server

# 检查Python依赖
if [ ! -f "requirements.txt" ]; then
    echo "❌ 找不到requirements.txt"
    exit 1
fi

echo "🛑 检查并停止现有服务..."
pkill -f "uvicorn.*8000" || true

echo "🚀 启动AI API服务器 (端口 8000)..."
/opt/homebrew/bin/python3.11 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000