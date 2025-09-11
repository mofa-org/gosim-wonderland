#!/usr/bin/env python3
"""
静态文件服务器 - 8080端口
用于向阿里云提供原始图片访问
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="AI Image Static Server")

# 确保目录存在
ORIGINAL_PHOTOS_DIR = "../original-photos-cache"
os.makedirs(ORIGINAL_PHOTOS_DIR, exist_ok=True)

# 挂载静态文件服务
app.mount("/original-images", StaticFiles(directory=ORIGINAL_PHOTOS_DIR), name="original-images")

@app.get("/")
def health_check():
    return {"message": "AI Static Server", "status": "running", "port": 8080}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)