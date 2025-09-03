#!/bin/bash

echo "🛑 停止所有GOSIM Wonderland服务..."

# 停止所有相关进程
pkill -f "node.*8080" || true
pkill -f "node.*8081" || true  
pkill -f "node.*8082" || true
pkill -f "uvicorn.*8000" || true

echo "✅ 所有服务已停止"

# 显示进程状态
echo "📋 检查剩余进程:"
ps aux | grep -E "(node.*808|uvicorn.*8000)" | grep -v grep || echo "无相关进程运行"