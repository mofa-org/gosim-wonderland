#!/bin/bash

# GOSIM Wonderland 服务启动脚本
# ai-api-server: 端口8000
# photo-app: 端口80
# display-app: 端口8081  
# admin-panel: 端口8082

echo "🚀 启动 GOSIM Wonderland 服务..."

# 检查Node.js依赖是否已安装
check_node_deps() {
    if [ ! -d "$1/node_modules" ]; then
        echo "📦 安装 $1 依赖..."
        cd "$1" && npm install
        cd ..
    fi
}

# 检查Python依赖是否已安装
check_python_deps() {
    echo "🐍 安装Python依赖..."
    cd ai-api-server
    pip3 install --user -r requirements.txt
    echo "🔧 确保uvicorn可用..."
    pip3 install --user uvicorn[standard]
    cd ..
}

# 检查所有应用的依赖
check_python_deps
check_node_deps "photo-app"
check_node_deps "display-app" 
check_node_deps "admin-panel"

echo "✅ 依赖检查完成"

# 启动服务
echo "🤖 启动 ai-api-server (端口 8000)..."
(cd ai-api-server && python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000) &
AI_PID=$!

echo "🎯 启动 photo-app (端口 80)..."
(cd photo-app && npm run dev -- --port 80) &
PHOTO_PID=$!

echo "📺 启动 display-app (端口 8081)..."
(cd display-app && npm run dev -- --port 8081) &
DISPLAY_PID=$!

echo "⚙️ 启动 admin-panel (端口 8082)..."
(cd admin-panel && npm run dev -- --port 8082) &
ADMIN_PID=$!

echo ""
echo "🎉 所有服务已启动!"
echo "🤖 AI后端: http://localhost:8000"
echo "📱 用户端: http://localhost:80"
echo "📺 展示端: http://localhost:8081" 
echo "⚙️ 管理端: http://localhost:8082"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待中断信号
trap 'echo "🛑 正在停止服务..."; kill $AI_PID $PHOTO_PID $DISPLAY_PID $ADMIN_PID; exit' INT

# 保持脚本运行
wait