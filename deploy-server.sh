#!/bin/bash

echo "🚀 GOSIM Wonderland 服务器部署脚本"

# 检查系统环境
echo "🔧 检查系统环境..."
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js未安装，请先安装 Node.js 20+"
    exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
    echo "❌ Python3未安装，请先安装 Python 3.11+"
    exit 1
fi

# 创建必要目录
echo "📁 创建目录..."
mkdir -p original-photos ai-photos data
chmod 755 original-photos ai-photos data

# 安装Python依赖
echo "🐍 安装Python依赖..."
cd ai-api-server
pip3 install -r requirements.txt
cd ..

# 安装Node.js依赖
echo "📦 安装Node.js依赖..."
cd photo-app && npm install && cd ..
cd display-app && npm install && cd ..
cd admin-panel && npm install && cd ..

# 构建生产版本
echo "🔨 构建生产版本..."
cd photo-app && npm run build && cd ..
cd display-app && npm run build && cd ..
cd admin-panel && npm run build && cd ..

echo "✅ 部署准备完成！"
echo ""
echo "📝 接下来需要："
echo "1. 配置 ai-api-server/.env 文件，添加 DASHSCOPE_API_KEY"
echo "2. 修改 ai-api-server/app/main.py:12 的PicGo API密钥"
echo "3. 配置反向代理 (Nginx)"
echo "4. 使用 PM2 管理进程"