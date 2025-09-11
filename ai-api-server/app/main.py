from fastapi import FastAPI, HTTPException
import os
import uuid
import requests
from dashscope import MultiModalConversation
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

app = FastAPI(title="GOSIM Wonderland AI Service")

# 定义目录路径
AI_PHOTOS_DIR = "../ai-photos"
ORIGINAL_PHOTOS_DIR = "../original-photos-cache"

# 创建目录
os.makedirs(AI_PHOTOS_DIR, exist_ok=True)  
os.makedirs(ORIGINAL_PHOTOS_DIR, exist_ok=True)


def download_and_cache_original_image(url: str) -> str:
    """下载原始图片并缓存到本地，返回公网可访问的URL"""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        # 生成唯一文件名
        unique_id = uuid.uuid4()
        file_extension = ".jpg"  # 默认jpg，也可以从原始URL提取
        file_name = f"original_{unique_id}{file_extension}"
        file_path = os.path.join(ORIGINAL_PHOTOS_DIR, file_name)
        
        # 保存原始图片
        with open(file_path, "wb") as f:
            f.write(response.content)
        
        # 返回8080端口可访问的URL
        return f"http://us.liyao.space:8080/original-images/{file_name}"
    except Exception as e:
        print(f"下载原始图片失败: {e}")
        return url

def save_image_from_url(url: str) -> str:
    """从URL下载图片并保存到本地"""
    try:
        os.makedirs(AI_PHOTOS_DIR, exist_ok=True)

        response = requests.get(url, timeout=30)
        response.raise_for_status()

        unique_id = uuid.uuid4()
        file_name = f"cartoon_{unique_id}.png"
        file_path = os.path.join(AI_PHOTOS_DIR, file_name)

        with open(file_path, "wb") as f:
            f.write(response.content)

        return f"/ai-photos/{file_name}"
    except Exception as e:
        print(f"保存图片失败: {e}")
        return url

@app.get("/")
def read_root():
    return {"message": "GOSIM Wonderland AI Service", "status": "running"}

@app.post("/generate-image/")
def generate_image(request: dict):
    """生成卡通图片"""
    try:
        model_name = request.get("model_name", "qwen-image-edit")
        prompt = request.get("prompt", "生成可爱的卡通形象")
        base_image_url = request.get("base_image_url")

        if not base_image_url:
            raise HTTPException(status_code=400, detail="缺少base_image_url参数")

        # 获取API key
        api_key = os.getenv("DASHSCOPE_API_KEY")
        if not api_key or api_key == "your_dashscope_api_key_here":
            # Mock模式：生成随机彩色图片
            import random
            from PIL import Image

            os.makedirs(AI_PHOTOS_DIR, exist_ok=True)
            colors = ["#FC6A59", "#FFC63E", "#FD543F", "#6CC8CC"]
            mock_color = random.choice(colors)

            image = Image.new('RGB', (512, 512), mock_color)
            unique_id = uuid.uuid4()
            file_name = f"cartoon_{unique_id}.png"
            file_path = os.path.join(AI_PHOTOS_DIR, file_name)
            image.save(file_path)

            return {"status": "success", "image_paths": [f"/ai-photos/{file_name}"]}

        # 如果是本地URL，下载并缓存到AI服务器，返回8080端口URL
        if base_image_url.startswith(('http://localhost:', 'http://127.0.0.1:')):
            print(f"本地图片URL: {base_image_url}，正在下载并缓存...")
            # 下载原始图片并保存到AI服务器，返回8080端口可访问的URL
            public_url = download_and_cache_original_image(base_image_url)
            print(f"AI服务器图片URL: {public_url}")
            base_image_url = public_url

        # 构建智能prompt，根据用户需求生成合适的指令
        user_prompt = prompt if prompt and prompt.strip() else "生成可爱的卡通风格"

        # 专为开发者会议场景优化的卡通化指令
        base_instruction = f"""用户需求：{user_prompt}

请将参考图中的内容按照用户需求重新绘制为卡通风格，适用于开发者会议场景：
1. 如果是人物：保持面部特征、发型、服装等个人识别要素，突出开发者/参会者的专业形象
2. 如果是会场场景：保持会议室布局、演讲台、投影屏幕、座椅排列等空间特征
3. 如果是技术展示：保持代码界面、设备外观、屏幕内容等科技元素的可识别性
4. 采用卡通化表现手法：线条清晰流畅，色彩鲜明饱和，风格统一现代
5. 融入GOSIM开发者大会的氛围元素：科技感、创新感、专业感
6. 背景可适当融入杭州科技园区或会议场馆的特色，但保持简洁不抢夺主体
7. 避免添加文字、水印、多余装饰，保持专业简洁

最终效果要求：既有卡通趣味性又保持技术会议的专业感，色彩和谐，构图完整。"""

        # 调用通义万相API
        messages = [
            {
                "role": "user",
                "content": [
                    {"image": base_image_url},
                    {"text": base_instruction}
                ]
            }
        ]

        response = MultiModalConversation.call(
            api_key=api_key,
            model="qwen-image-edit",
            messages=messages,
            result_format='message',
            stream=False,
            watermark=True
        )

        if response.status_code == 200:
            # 解析响应并下载图片
            response_data = dict(response)
            choices = response_data['output']['choices']

            image_paths = []
            for choice in choices:
                for content_item in choice['message']['content']:
                    if 'image' in content_item:
                        # 下载并保存图片
                        saved_path = save_image_from_url(content_item['image'])
                        image_paths.append(saved_path)
                        print(f"保存图片: {saved_path}")

            return {"status": "success", "image_paths": image_paths}
        else:
            raise HTTPException(
                status_code=500,
                detail=f"AI生成失败: {response.message}"
            )

    except Exception as e:
        print(f"生成图片错误: {e}")
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")
