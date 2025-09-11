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

# 检查Git
if ! command -v git >/dev/null 2>&1; then
    echo "❌ Git未安装"
    exit 1
fi

echo "🗑️ 清理旧项目..."
cd ..
rm -rf gosim-wonderland

echo "🔑 配置阿里云API密钥..."
read -p "请输入你的阿里云DashScope API Key: " DASHSCOPE_API_KEY

echo "📥 克隆最新代码..."
git clone git@github.com:mofa-org/gosim-wonderland.git
cd gosim-wonderland

echo "⚙️ 配置环境变量..."
mkdir -p ai-api-server
cat > ai-api-server/.env << EOF
DASHSCOPE_API_KEY=$DASHSCOPE_API_KEY
EOF
echo "✅ API Key已保存到 ai-api-server/.env"
echo ""

# 询问用户选择
echo "请选择操作："
echo "1) 继续构建和部署服务"
echo "2) 重启服务器"
read -p "请输入选择 (1 或 2): " USER_CHOICE

if [ "$USER_CHOICE" = "2" ]; then
    echo "🔄 重启服务器中..."
    sudo reboot now
    exit 0
elif [ "$USER_CHOICE" = "1" ]; then
    echo "🚀 继续构建和部署..."
else
    echo "❌ 无效选择，默认继续构建..."
fi

echo "🛑 停止现有服务..."
pkill -f "node.*80\|node.*8081\|node.*8082" || true
pkill -f "uvicorn.*8000" || true
pkill -f "static_server.py" || true
sleep 3

echo "🧹 清理旧依赖..."
rm -rf photo-app/node_modules display-app/node_modules admin-panel/node_modules
rm -rf photo-app/.next display-app/.next admin-panel/.next

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

# 启动AI静态文件服务器 (8080端口)
echo "🗂️ 启动AI静态文件服务器 (端口 8080)..."
cd ai-api-server
if command -v python3.11 >/dev/null 2>&1; then
    nohup python3.11 static_server.py > ../logs/ai-static.log 2>&1 &
elif command -v python3 >/dev/null 2>&1; then
    nohup python3 static_server.py > ../logs/ai-static.log 2>&1 &
fi
cd ..

sleep 2

# 启动AI主服务器 (8000端口)
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
echo "📱 启动Photo App (端口 80)..."
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
echo "🤖 AI主服务: http://localhost:8000 (业务接口)"
echo "🗂️ AI静态服务: http://localhost:8080 (供阿里云访问)"
echo "📱 用户端: http://localhost:80 (Photo App)"
echo "📺 展示端: http://localhost:8081 (Display App)"
echo "⚙️ 管理端: http://localhost:8082 (Admin Panel)"
echo ""
echo "📋 日志文件:"
echo "- AI主服务器: logs/ai-server.log"
echo "- AI静态服务: logs/ai-static.log"
echo "- 用户端: logs/photo-app.log"
echo "- 展示端: logs/display-app.log"
echo "- 管理端: logs/admin-panel.log"
echo ""
echo "💡 停止服务: pkill -f 'node.*80\|node.*8081\|node.*8082\|uvicorn.*8000\|static_server.py'"
echo ""
echo "🎉 部署完成！所有服务已启动并运行在后台。"
