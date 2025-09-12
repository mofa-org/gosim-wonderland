from fastapi import FastAPI, HTTPException
import os
import uuid
import requests
from dashscope import MultiModalConversation
from dotenv import load_dotenv
from urllib.parse import urlparse
import time
import random
from PIL import Image
from io import BytesIO
import threading
import signal

try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("⚠️ Gemini不可用，请运行: pip install google-genai")

load_dotenv()

app = FastAPI(title="GOSIM Wonderland AI Service")

# 定义目录路径
AI_PHOTOS_DIR = "../ai-photos"
ORIGINAL_PHOTOS_DIR = "../original-photos-cache"

# 创建目录
os.makedirs(AI_PHOTOS_DIR, exist_ok=True)  
os.makedirs(ORIGINAL_PHOTOS_DIR, exist_ok=True)

# 全局任务管理
running_tasks = {}  # 存储正在运行的任务
task_lock = threading.Lock()


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

def optimize_prompt_with_gemini_flash(original_prompt: str, api_key: str) -> str:
    """使用Gemini 2.5 Flash优化图像生成prompt"""
    if not GEMINI_AVAILABLE or not api_key:
        return original_prompt
    
    try:
        client = genai.Client(api_key=api_key)
        
        optimization_instruction = f"""
你是一个专业的AI图像生成prompt优化专家。请将以下用户输入的prompt优化为更适合图像生成的描述：

用户原始prompt: "{original_prompt}"

请基于以下要求优化：
1. 保持用户的核心意图
2. 适合GOSIM开发者大会的场景（杭州科技氛围，开源精神）
3. 添加卡通风格相关的细节描述
4. 突出专业程序员形象
5. 使用清晰、具体的视觉描述词汇
6. 避免模糊或抽象的表达

请只返回优化后的prompt，不要包含其他解释。优化后的prompt应该在100-150字之间。
"""
        
        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=optimization_instruction),
                ],
            ),
        ]
        
        generate_content_config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(
                thinking_budget=0,
            ),
        )
        
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=contents,
            config=generate_content_config,
        )
        
        if response and response.candidates:
            optimized_prompt = response.candidates[0].content.parts[0].text.strip()
            print(f"🎨 Gemini优化prompt: {original_prompt} -> {optimized_prompt}")
            return optimized_prompt
        else:
            print("⚠️ Gemini优化返回空结果，使用原prompt")
            return original_prompt
            
    except Exception as e:
        print(f"⚠️ Gemini prompt优化失败: {e}，使用原prompt")
        return original_prompt

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

def attempt_vidu_generation(api_key: str, base_image_url: str, prompt_instruction: str, attempt_num: int) -> dict:
    """Vidu AI生成尝试"""
    try:
        print(f"第{attempt_num}次尝试 - 使用Vidu，prompt: {prompt_instruction[:100]}...")
        
        # 简化prompt，去掉复杂的中文描述，Vidu可能对英文支持更好
        simplified_prompt = f"cartoon style, professional programmer, tech conference style"
        if "卡通" in prompt_instruction:
            simplified_prompt = "cartoon style, professional developer, modern tech atmosphere"
        
        # Vidu API调用
        payload = {
            "model": "viduq1",
            "images": [base_image_url],
            "prompt": simplified_prompt,
            "aspect_ratio": "1:1"
        }
        
        headers = {
            "Authorization": f"Token {api_key}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            "https://api.vidu.com/ent/v2/reference2image",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            task_id = result.get("task_id")
            state = result.get("state")
            credits = result.get("credits")
            
            if task_id:
                print(f"Vidu任务创建成功，task_id: {task_id}, 状态: {state}, 消耗积分: {credits}")
                # 注意：Vidu是纯异步API，无法立即获取结果
                # 在生产环境中需要实现回调或后台轮询机制
                # 这里我们返回任务创建成功的信息
                placeholder_path = f"/ai-photos/vidu_{task_id}.png"
                return {
                    "success": True, 
                    "image_paths": [placeholder_path], 
                    "task_id": task_id,
                    "async": True,  # 标记为异步任务
                    "message": f"Vidu异步任务已创建，task_id: {task_id}"
                }
            else:
                return {"success": False, "error": "Vidu未返回task_id"}
        elif response.status_code == 400:
            error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
            if error_data.get("reason") == "CreditInsufficient":
                return {"success": False, "error": "Vidu积分不足"}
            else:
                return {"success": False, "error": f"Vidu请求错误: {error_data.get('message', response.text)}"}
        else:
            return {"success": False, "error": f"Vidu API错误: {response.status_code} - {response.text[:200]}"}
            
    except Exception as e:
        return {"success": False, "error": f"Vidu第{attempt_num}次尝试异常: {str(e)}"}

def attempt_gemini_generation(api_key: str, base_image_url: str, prompt_instruction: str, attempt_num: int) -> dict:
    """Gemini AI生成尝试"""
    if not GEMINI_AVAILABLE:
        return {"success": False, "error": "Gemini包未安装"}
    
    try:
        print(f"第{attempt_num}次尝试 - 使用Gemini，prompt: {prompt_instruction[:100]}...")
        
        # 初始化Gemini客户端
        client = genai.Client(api_key=api_key)
        
        # 下载图片
        response = requests.get(base_image_url, timeout=30)
        response.raise_for_status()
        image = Image.open(BytesIO(response.content))
        
        # 调用Gemini API
        response = client.models.generate_content(
            model="gemini-2.5-flash-image-preview",
            contents=[prompt_instruction, image],
        )
        
        # 处理响应
        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                # 保存生成的图片
                generated_image = Image.open(BytesIO(part.inline_data.data))
                unique_id = uuid.uuid4()
                file_name = f"gemini_{unique_id}.png"
                file_path = os.path.join(AI_PHOTOS_DIR, file_name)
                generated_image.save(file_path)
                
                image_path = f"/ai-photos/{file_name}"
                print(f"Gemini第{attempt_num}次尝试成功 - 保存图片: {image_path}")
                return {"success": True, "image_paths": [image_path]}
        
        return {"success": False, "error": "Gemini未生成图片"}
        
    except Exception as e:
        return {"success": False, "error": f"Gemini第{attempt_num}次尝试异常: {str(e)}"}

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

@app.get("/running-tasks")
def get_running_tasks():
    """获取所有正在运行的任务"""
    with task_lock:
        return {
            "running_tasks": list(running_tasks.keys()),
            "count": len(running_tasks)
        }

@app.post("/cancel-task/{task_id}")
def cancel_task(task_id: str):
    """取消指定的任务"""
    with task_lock:
        if task_id not in running_tasks:
            raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在或已完成")
        
        task_info = running_tasks[task_id]
        task_info["cancelled"] = True
        
        print(f"🚫 任务 {task_id} 被标记为取消")
        
        return {
            "status": "success", 
            "message": f"任务 {task_id} 已标记为取消",
            "task_id": task_id
        }

@app.get("/vidu-task/{task_id}")
def get_vidu_task_status(task_id: str):
    """查询Vidu任务状态（实验性接口）"""
    vidu_api_key = os.getenv("VIDU_API_KEY")
    
    if not vidu_api_key:
        raise HTTPException(status_code=500, detail="Vidu API key未配置")
    
    headers = {
        "Authorization": f"Token {vidu_api_key}",
        "Content-Type": "application/json"
    }
    
    # 尝试不同的可能端点
    possible_endpoints = [
        f"https://api.vidu.com/ent/v2/generation/{task_id}",
        f"https://api.vidu.com/ent/v1/generation/{task_id}",
        f"https://api.vidu.com/ent/v2/task/{task_id}",
        f"https://api.vidu.com/ent/v1/task/{task_id}"
    ]
    
    last_error = None
    
    for endpoint in possible_endpoints:
        try:
            response = requests.get(endpoint, headers=headers, timeout=10)
            if response.status_code == 200:
                return response.json()
            elif response.status_code != 404:
                last_error = f"{response.status_code}: {response.text}"
        except Exception as e:
            last_error = str(e)
    
    raise HTTPException(
        status_code=404, 
        detail=f"无法查询任务状态，task_id: {task_id}，最后错误: {last_error}"
    )

@app.get("/health")
def health_check():
    """API健康检查"""
    return {
        "status": "healthy",
        "ai_photos_dir": AI_PHOTOS_DIR,
        "original_photos_dir": ORIGINAL_PHOTOS_DIR,
        "dashscope_api_key_configured": bool(os.getenv("DASHSCOPE_API_KEY") and os.getenv("DASHSCOPE_API_KEY") != "your_dashscope_api_key_here"),
        "gemini_api_key_configured": bool(os.getenv("GEMINI_API_KEY")),
        "gemini_available": GEMINI_AVAILABLE,
        "gemini_prompt_optimization": GEMINI_AVAILABLE and bool(os.getenv("GEMINI_API_KEY")),
        "vidu_api_key_configured": bool(os.getenv("VIDU_API_KEY")),
        "fallback_strategy": "通义5次 → Gemini1次 → Vidu1次 (共7次重试)"
    }

def is_task_cancelled(task_id: str) -> bool:
    """检查任务是否被取消"""
    with task_lock:
        task_info = running_tasks.get(task_id)
        return task_info and task_info.get("cancelled", False)

@app.post("/generate-image/")
def generate_image(request: dict):
    """带自动重试机制的卡通图片生成"""
    # 生成任务ID
    task_id = str(uuid.uuid4())
    
    # 注册任务
    with task_lock:
        running_tasks[task_id] = {
            "created_at": time.time(),
            "cancelled": False,
            "request": request
        }
    
    try:
        print(f"🚀 开始任务 {task_id}")
        
        model_name = request.get("model_name", "qwen-image-edit")
        prompt = request.get("prompt", "生成可爱的卡通形象")
        base_image_url = request.get("base_image_url")

        if not base_image_url:
            raise HTTPException(status_code=400, detail="缺少base_image_url参数")

        # 获取API keys
        dashscope_api_key = os.getenv("DASHSCOPE_API_KEY")
        gemini_api_key = os.getenv("GEMINI_API_KEY") 
        vidu_api_key = os.getenv("VIDU_API_KEY")
        
        if not dashscope_api_key or dashscope_api_key == "your_dashscope_api_key_here":
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

        # 使用Gemini 2.5 Flash优化用户prompt
        print(f"📝 原始prompt: {prompt}")
        if gemini_api_key and GEMINI_AVAILABLE:
            optimized_prompt = optimize_prompt_with_gemini_flash(prompt, gemini_api_key)
        else:
            optimized_prompt = prompt
            print("⚠️ Gemini不可用，跳过prompt优化")
        
        # 生成基于优化prompt的多种变体
        prompt_variants = generate_prompt_variants(optimized_prompt)
        print(f"为优化后的prompt生成了 {len(prompt_variants)} 个变体")
        
        # 记录所有尝试的错误
        all_errors = []
        
        # 构建完整的指令模板
        def build_instruction(prompt_text):
            return f"""用户需求：{prompt_text}

请将参考图中的内容按照用户需求重新绘制为卡通风格，适用于开发者会议场景：
1. 如果是人物：保持面部特征、发型、服装等个人识别要素，突出开发者/参会者的专业形象
2. 如果是会场场景：保持会议室布局、演讲台、投影屏幕、座椅排列等空间特征
3. 如果是技术展示：保持代码界面、设备外观、屏幕内容等科技元素的可识别性
4. 采用卡通化表现手法：线条清晰流畅，色彩鲜明饱和，风格统一现代
5. 融入GOSIM开发者大会的氛围元素：科技感、创新感、专业感
6. 背景可适当融入杭州科技园区或会议场馆的特色，但保持简洁不抢夺主体
7. 避免添加文字、水印、多余装饰，保持专业简洁

最终效果要求：既有卡通趣味性又保持技术会议的专业感，色彩和谐，构图完整。"""
        
        # 保持原有的5次通义重试，然后增加额外的fallback选项
        max_attempts = 7  # 5次通义 + 1次Gemini + 1次Vidu
        
        for attempt in range(max_attempts):
            # 检查任务是否被取消
            if is_task_cancelled(task_id):
                print(f"🚫 任务 {task_id} 已被取消，停止处理")
                with task_lock:
                    running_tasks.pop(task_id, None)
                raise HTTPException(status_code=499, detail="任务已被取消")
            
            current_prompt = prompt_variants[attempt % len(prompt_variants)]
            base_instruction = build_instruction(current_prompt)
            
            if attempt < 5:
                # 前5次尝试用通义（保持原有逻辑）
                result = attempt_ai_generation(dashscope_api_key, base_image_url, base_instruction, attempt + 1)
                service_name = "通义"
            elif attempt == 5:
                # 第6次尝试用Gemini作为fallback
                if gemini_api_key and GEMINI_AVAILABLE:
                    result = attempt_gemini_generation(gemini_api_key, base_image_url, current_prompt, attempt + 1)
                    service_name = "Gemini"
                else:
                    # 如果Gemini不可用，继续用通义
                    result = attempt_ai_generation(dashscope_api_key, base_image_url, base_instruction, attempt + 1)
                    service_name = "通义"
            else:
                # 第7次最后尝试用Vidu
                if vidu_api_key:
                    result = attempt_vidu_generation(vidu_api_key, base_image_url, current_prompt, attempt + 1)
                    service_name = "Vidu"
                else:
                    # 如果Vidu不可用，继续用通义
                    result = attempt_ai_generation(dashscope_api_key, base_image_url, base_instruction, attempt + 1)
                    service_name = "通义"
            
            if result["success"]:
                print(f"\n✅ {service_name}第{attempt + 1}次尝试成功！")
                # 清理任务记录
                with task_lock:
                    running_tasks.pop(task_id, None)
                print(f"🏁 任务 {task_id} 完成")
                return {"status": "success", "image_paths": result["image_paths"], "task_id": task_id}
            else:
                error_msg = result["error"]
                all_errors.append(f"{service_name}第{attempt + 1}次: {error_msg}")
                print(f"\n⚠️ {service_name}第{attempt + 1}次尝试失败: {error_msg}")
                
                # 在重试之间稍微等待，避免频繁请求
                if attempt < max_attempts - 1:  # 最后一次不等待
                    wait_time = min((attempt + 1) * 2, 10)  # 递增等待时间，最多10秒
                    print(f"等待 {wait_time} 秒后重试...")
                    time.sleep(wait_time)
        
        # 所有尝试都失败了
        print(f"\n❌ 所有 {max_attempts} 次尝试都失败了（通义5次 + Gemini1次 + Vidu1次）")
        error_summary = "; ".join(all_errors)
        
        # 清理任务记录
        with task_lock:
            running_tasks.pop(task_id, None)
        print(f"💀 任务 {task_id} 失败")
        
        raise HTTPException(
            status_code=500,
            detail=f"AI生成失败，已重试{max_attempts}次: {error_summary}"
        )

    except HTTPException:
        raise  # 重新抛出HTTP异常
    except Exception as e:
        print(f"生成图片错误: {e}")
        # 清理任务记录
        with task_lock:
            running_tasks.pop(task_id, None)
        print(f"💀 任务 {task_id} 异常失败")
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")
