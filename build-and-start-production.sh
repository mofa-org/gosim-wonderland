#!/bin/bash

echo "🚀 GOSIM Wonderland 生产环境部署脚本"

# 检查Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js未安装"
    exit 1
fi

# 检查Python
if ! command -v python3 >/dev/null 2>&1; then
    echo "❌ Python3未安装"
    exit 1
fi

echo "🛑 停止现有服务..."
pkill -f "node.*3004\|node.*8080\|node.*8081\|node.*8082" || true
pkill -f "uvicorn.*8000" || true
sleep 3

echo "📁 创建必要目录..."
mkdir -p original-photos ai-photos data logs
chmod 755 original-photos ai-photos data logs

echo "📦 安装依赖..."
cd photo-app && npm install && cd ..
cd display-app && npm install && cd ..
cd admin-panel && npm install && cd ..
cd ai-api-server && pip3 install -r requirements.txt && cd ..

echo "🔨 构建生产版本..."
cd photo-app && npm run build && cd ..
cd display-app && npm run build && cd ..
cd admin-panel && npm run build && cd ..

echo "🚀 启动所有服务..."

# 启动AI服务器
echo "🤖 启动AI API服务器 (端口 8000)..."
cd ai-api-server
if command -v python3.11 >/dev/null 2>&1; then
    nohup python3.11 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > ../logs/ai-server.log 2>&1 &
elif command -v python3 >/dev/null 2>&1; then
    nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > ../logs/ai-server.log 2>&1 &
fi
cd ..

# 等待AI服务启动
sleep 3

# 启动Next.js应用 - 绑定到所有IP
echo "📱 启动Photo App (端口 8080)..."
cd photo-app
PORT=80 HOSTNAME=0.0.0.0 nohup npm start > ../logs/photo-app.log 2>&1 &
cd ..

echo "📺 启动Display App (端口 8081)..."
cd display-app
PORT=8081 HOSTNAME=0.0.0.0 nohup npm start > ../logs/display-app.log 2>&1 &
cd ..

echo "⚙️ 启动Admin Panel (端口 8082)..."
cd admin-panel
PORT=8082 HOSTNAME=0.0.0.0 nohup npm start > ../logs/admin-panel.log 2>&1 &
cd ..

# 移动日志目录创建到前面
# (已经在前面创建了)

echo ""
echo "🎉 所有服务已启动!"
echo "🤖 AI后端: http://localhost:8000"
echo "📱 用户端: http://localhost:8080"
echo "📺 展示端: http://localhost:8081"
echo "⚙️ 管理端: http://localhost:8082"
echo ""
echo "📋 日志文件:"
echo "- AI服务器: logs/ai-server.log"
echo "- 用户端: logs/photo-app.log"
echo "- 展示端: logs/display-app.log"
echo "- 管理端: logs/admin-panel.log"
echo ""
echo "💡 停止服务: pkill -f 'node.*808\|uvicorn.*8000'"
