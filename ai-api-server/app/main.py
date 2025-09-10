from fastapi import FastAPI, HTTPException
import os
import uuid
import requests
from dashscope import MultiModalConversation
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="GOSIM Wonderland AI Service")

PICGO_API_KEY = os.getenv("PICGO_API_KEY", "chv_SRYm7_d0bb9dda7dea5abe1451c8c5a1b38531bff31f3702fc8de3555f93fe95b9fb801fdebc7a509633f1f6a1b41b320cba398ff80ced0c2b545ff107ce7bc519273d")
AI_PHOTOS_DIR = "../ai-photos"

def upload_to_picgo(image_url: str) -> str:
    """上传图片到PicGo图床"""
    try:
        image_response = requests.get(image_url, timeout=10)
        image_response.raise_for_status()

        files = {'source': ('image.jpg', image_response.content, 'image/jpeg')}
        headers = {'X-API-Key': PICGO_API_KEY}

        upload_response = requests.post(
            'https://www.picgo.net/api/1/upload',
            headers=headers,
            files=files,
            timeout=30
        )

        if upload_response.status_code == 200:
            result = upload_response.json()
            return result['image']['url']
        else:
            print(f"图床上传失败: {upload_response.text}")
            return image_url
    except Exception as e:
        print(f"图床上传错误: {e}")
        return image_url

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

        # 如果是本地URL，转换为公网可访问URL
        if base_image_url.startswith(('http://localhost:', 'http://127.0.0.1:')):
            print(f"本地图片URL: {base_image_url}")
            # 将localhost替换为公网域名
            public_url = base_image_url.replace('http://localhost:80', 'http://us.liyao.space:80')
            print(f"公网URL: {public_url}")
            base_image_url = public_url
                    # files = {'source': (unique_filename, f.read(), 'image/jpeg')}
                    # headers = {'X-API-Key': PICGO_API_KEY}

                    # upload_response = requests.post(
                    #     'https://www.picgo.net/api/1/upload',
                    #     headers=headers,
                    #     files=files,
                    #     timeout=30
                    # )

                    # if upload_response.status_code == 200:
                    #     result = upload_response.json()
                    #     base_image_url = result['image']['url']
                    #     print(f"图床URL: {base_image_url}")
                    # else:
                    #     print(f"图床上传失败: {upload_response.text}")
                    #     raise HTTPException(status_code=500, detail="图床上传失败")
            # except FileNotFoundError:
            #     raise HTTPException(status_code=400, detail=f"找不到本地文件: {local_file_path}")
            # except Exception as e:
            #     print(f"本地文件上传错误: {e}")
            #     raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")

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
