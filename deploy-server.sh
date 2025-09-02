#!/bin/bash

echo "🚀 GOSIM Wonderland 服务器部署脚本"

# 自动安装系统依赖
install_dependencies() {
    echo "🔧 自动安装系统依赖..."
    
    # 检测操作系统
    if [ -f /etc/debian_version ]; then
        echo "🐧 检测到 Debian/Ubuntu 系统"
        
        # 更新包管理器
        sudo apt update
        
        # 安装 Node.js 20
        if ! command -v node >/dev/null 2>&1; then
            echo "📦 安装 Node.js 20..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
        
        # 安装 Python 3.11
        if ! command -v python3.11 >/dev/null 2>&1; then
            echo "🐍 安装 Python 3.11..."
            sudo apt update
            sudo apt install -y software-properties-common
            sudo add-apt-repository -y ppa:deadsnakes/ppa
            sudo apt update
            sudo apt install -y python3.11 python3.11-pip python3.11-dev
            
            # 设置 python3 别名
            sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
        fi
        
        # 安装 pip
        if ! command -v pip3 >/dev/null 2>&1; then
            echo "📦 安装 pip3..."
            sudo apt install -y python3-pip
        fi
        
        # 安装 PM2
        if ! command -v pm2 >/dev/null 2>&1; then
            echo "⚙️ 安装 PM2..."
            sudo npm install -g pm2
        fi
        
        # 安装 Nginx (可选)
        if ! command -v nginx >/dev/null 2>&1; then
            echo "🌐 安装 Nginx..."
            sudo apt install -y nginx
        fi
        
    elif [ -f /etc/redhat-release ]; then
        echo "🔴 检测到 RedHat/CentOS 系统"
        
        # 安装 Node.js 20
        if ! command -v node >/dev/null 2>&1; then
            echo "📦 安装 Node.js 20..."
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
            sudo yum install -y nodejs
        fi
        
        # 安装 Python 3.11
        if ! command -v python3.11 >/dev/null 2>&1; then
            echo "🐍 安装 Python 3.11..."
            sudo yum update -y
            sudo yum groupinstall -y "Development Tools"
            sudo yum install -y python3.11 python3.11-pip python3.11-devel
        fi
        
        # 安装 PM2
        if ! command -v pm2 >/dev/null 2>&1; then
            echo "⚙️ 安装 PM2..."
            sudo npm install -g pm2
        fi
        
    else
        echo "⚠️ 未识别的操作系统，请手动安装依赖"
    fi
}

# 安装系统依赖
install_dependencies

# 验证安装
echo "✅ 验证环境..."
node --version
python3 --version
pm2 --version || echo "PM2未安装"

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