from fastapi import FastAPI, HTTPException
import os
import uuid
import requests
from dashscope import MultiModalConversation
from dotenv import load_dotenv
from urllib.parse import urlparse
import time
import random

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

def generate_prompt_variants(original_prompt: str) -> list[str]:
    """基于原始prompt生成5种智能变体"""
    # 基础GOSIM主题
    base_theme = "卡通风格，GOSIM开发者大会风格，杭州科技氛围，开源精神体现，现代简洁设计"
    
    if not original_prompt or original_prompt.strip() == '':
        # 如果没有用户输入，使用默认程序员风格变体
        base_default = f"{base_theme}，专业程序员形象，科技感十足，代码元素背景，体现开发者气质和创新精神"
        return [
            base_default,
            f"{base_theme}，温和友好的程序员形象，轻松活泼风格，体现团队合作精神",
            f"{base_theme}，专注专业的技术人员风格，简洁大方，突出技术实力",
            f"{base_theme}，创新思维的开发者风格，充满想象力，体现开源社区活力",
            f"{base_theme}，亲和可爱的程序员形象，色彩鲜明，适合会议展示环境"
        ]
    
    # 有用户输入时，基于用户需求创建变体
    user_content = original_prompt.strip()
    
    variants = [
        # 原始版本
        f"{user_content}，{base_theme}，结合GOSIM大会特色，突出开源社区氛围",
        
        # 强化版本 - 加强用户的原意
        f"更加突出{user_content}，{base_theme}，色彩更鲜明，细节更丰富",
        
        # 简化版本 - 保持用户意图但更简洁
        f"{user_content}，{base_theme}，简洁明快风格，线条清晰",
        
        # 温和版本 - 柔化色调
        f"温和版{user_content}，{base_theme}，色调柔和，亲和可爱",
        
        # 专业版本 - 突出技术感
        f"{user_content}，{base_theme}，专业技术风格，现代科技感十足"
    ]
    
    return variants

def attempt_ai_generation(api_key: str, base_image_url: str, prompt_instruction: str, attempt_num: int) -> dict:
    """单次AI生成尝试"""
    try:
        print(f"第{attempt_num}次尝试 - 使用prompt: {prompt_instruction[:100]}...")
        
        messages = [
            {
                "role": "user",
                "content": [
                    {"image": base_image_url},
                    {"text": prompt_instruction}
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
            response_data = dict(response)
            choices = response_data['output']['choices']

            image_paths = []
            for choice in choices:
                for content_item in choice['message']['content']:
                    if 'image' in content_item:
                        saved_path = save_image_from_url(content_item['image'])
                        image_paths.append(saved_path)
                        print(f"第{attempt_num}次尝试成功 - 保存图片: {saved_path}")

            if image_paths:
                return {"success": True, "image_paths": image_paths}
            else:
                return {"success": False, "error": "未生成图片"}
        else:
            return {"success": False, "error": f"API返回错误: {response.message}"}
            
    except Exception as e:
        return {"success": False, "error": f"第{attempt_num}次尝试异常: {str(e)}"}

@app.get("/")
def read_root():
    return {"message": "GOSIM Wonderland AI Service", "status": "running"}

@app.get("/health")
def health_check():
    """API健康检查"""
    return {
        "status": "healthy",
        "ai_photos_dir": AI_PHOTOS_DIR,
        "original_photos_dir": ORIGINAL_PHOTOS_DIR,
        "api_key_configured": bool(os.getenv("DASHSCOPE_API_KEY") and os.getenv("DASHSCOPE_API_KEY") != "your_dashscope_api_key_here")
    }

@app.post("/generate-image/")
def generate_image(request: dict):
    """带自动重试机制的卡通图片生成"""
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
            public_url = download_and_cache_original_image(base_image_url)
            print(f"AI服务器图片URL: {public_url}")
            base_image_url = public_url

        # 生成基于用户prompt的多种变体
        prompt_variants = generate_prompt_variants(prompt)
        print(f"为用户prompt '{prompt}' 生成了 {len(prompt_variants)} 个变体")
        
        # 记录所有尝试的错误
        all_errors = []
        
        # 重试最多5次，使用不同的prompt变体
        for attempt in range(5):
            current_prompt = prompt_variants[attempt % len(prompt_variants)]
            
            # 构建完整的指令
            base_instruction = f"""用户需求：{current_prompt}

请将参考图中的内容按照用户需求重新绘制为卡通风格，适用于开发者会议场景：
1. 如果是人物：保持面部特征、发型、服装等个人识别要素，突出开发者/参会者的专业形象
2. 如果是会场场景：保持会议室布局、演讲台、投影屏幕、座椅排列等空间特征
3. 如果是技术展示：保持代码界面、设备外观、屏幕内容等科技元素的可识别性
4. 采用卡通化表现手法：线条清晰流畅，色彩鲜明饱和，风格统一现代
5. 融入GOSIM开发者大会的氛围元素：科技感、创新感、专业感
6. 背景可适当融入杭州科技园区或会议场馆的特色，但保持简洁不抢夺主体
7. 避免添加文字、水印、多余装饰，保持专业简洁

最终效果要求：既有卡通趣味性又保持技术会议的专业感，色彩和谐，构图完整。"""
            
            # 尝试AI生成
            result = attempt_ai_generation(api_key, base_image_url, base_instruction, attempt + 1)
            
            if result["success"]:
                print(f"\n✅ 第{attempt + 1}次尝试成功！")
                return {"status": "success", "image_paths": result["image_paths"]}
            else:
                error_msg = result["error"]
                all_errors.append(f"第{attempt + 1}次: {error_msg}")
                print(f"\n⚠️ 第{attempt + 1}次尝试失败: {error_msg}")
                
                # 在重试之间稍微等待，避免频繁请求
                if attempt < 4:  # 最后一次不等待
                    wait_time = (attempt + 1) * 2  # 递增等待时间
                    print(f"等待 {wait_time} 秒后重试...")
                    time.sleep(wait_time)
        
        # 所有尝试都失败了
        print(f"\n❌ 所有 5 次尝试都失败了")
        error_summary = "; ".join(all_errors)
        raise HTTPException(
            status_code=500,
            detail=f"AI生成失败，已重试5次: {error_summary}"
        )

    except HTTPException:
        raise  # 重新抛出HTTP异常
    except Exception as e:
        print(f"生成图片错误: {e}")
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")
