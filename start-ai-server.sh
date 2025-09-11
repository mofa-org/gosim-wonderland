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
pkill -f "static_server.py" || true
pkill -f "uvicorn.*8080" || true

echo "🚀 启动静态文件服务器 (端口 8080)..."
# 启动静态文件服务器（后台运行）
if command -v python3.11 >/dev/null 2>&1; then
    python3.11 static_server.py &
elif command -v python3 >/dev/null 2>&1; then
    python3 static_server.py &
else
    echo "❌ 找不到Python，请先安装Python3"
    exit 1
fi

sleep 2
echo "🚀 启动AI API服务器 (端口 8000)..."
# 启动主API服务器
if command -v python3.11 >/dev/null 2>&1; then
    python3.11 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
elif command -v python3 >/dev/null 2>&1; then
    python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
else
    echo "❌ 找不到Python，请先安装Python3"
    exit 1
fi