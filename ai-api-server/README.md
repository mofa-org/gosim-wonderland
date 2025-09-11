# GOSIM Wonderland AI API Server

AI服务器，负责调用阿里云通义万相生成卡通图片。包含两个服务：
- 主API服务 (8000端口): 业务接口
- 静态文件服务 (8080端口): 供阿里云访问原始图片

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd model-runner-api
    ```

2.  **Create a virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure environment variables:**
    Create a `.env` file in the project root and add your API key:
    ```
    DASHSCOPE_API_KEY="your_api_key_here"
    ```

## Running the Server

使用启动脚本启动两个服务：
```bash
./start-ai-server.sh
```

或手动启动：
```bash
# 启动静态文件服务 (8080端口)
python3 static_server.py &

# 启动主API服务 (8000端口)  
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

服务地址：
- 主API: `http://127.0.0.1:8000` (业务接口)
- 静态文件: `http://127.0.0.1:8080` (供阿里云访问图片)
