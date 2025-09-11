import os
from http import HTTPStatus
from dashscope import ImageSynthesis, MultiModalConversation, VideoSynthesis
from dashscope.api_entities.dashscope_response import ImageSynthesisResponse, VideoSynthesisResponse
import requests
import pathlib
import json
import uuid



def call_tongyi_wanxiang(prompt: str, base_image_url: str = None, n: int = 1, api_key: str = None) -> ImageSynthesisResponse:
    """
    Calls the Tongyi Wanxiang image synthesis API.
    """
    if api_key is None:
        api_key = os.getenv("DASHSCOPE_API_KEY")
        if api_key is None:
            raise ValueError("DASHSCOPE_API_KEY environment variable not set.")

    # Determine the function and model based on whether a base_image_url is provided
    if base_image_url:
        model = "wanx2.1-imageedit"
        function = "stylization_all" # Or another appropriate function
    else:
        raise ValueError("Base image URL is required for this model.")

    # Build the parameters
    call_params = {
        "api_key": api_key,
        "model": model,
        "prompt": prompt,
        "n": n,
    }
    if base_image_url:
        call_params["base_image_url"] = base_image_url
    if function:
        call_params["function"] = function

    # Asynchronous call
    rsp = ImageSynthesis.async_call(**call_params)

    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
        print("task_id: %s" % rsp.output.task_id)
    else:
        raise SystemExit('Failed, status_code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))

    status = ImageSynthesis.fetch(rsp, api_key=api_key)
    if status.status_code == HTTPStatus.OK:
        print(status.output.task_status)
    else:
        raise SystemExit('Failed, status_code: %s, code: %s, message: %s' %
              (status.status_code, status.code, status.message))

    rsp = ImageSynthesis.wait(rsp, api_key=api_key)
    
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
        print(rsp.output)
        for result in rsp.output.results:
            print("---------------------------")
            print(result.url)
    else:
        raise SystemExit('Failed, status_code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))
        
    return rsp

def call_tongyi_qianwen_image_edit(prompt: str, base_image_url: str = None, n: int = 1, api_key: str = None) -> ImageSynthesisResponse:
    if api_key is None:
        api_key = os.getenv("DASHSCOPE_API_KEY")
    
    # Mock mode: if no API key or placeholder key  
    if api_key is None or api_key == "your_dashscope_api_key_here":
        import random
        import uuid
        from PIL import Image
        
        # 创建AI图片公共目录
        ai_photos_dir = "../ai-photos"
        os.makedirs(ai_photos_dir, exist_ok=True)
        
        # 生成随机颜色的512x512图片
        colors = ["#FC6A59", "#FFC63E", "#FD543F", "#6CC8CC"]
        mock_color = random.choice(colors)
        
        # 创建纯色图片
        image = Image.new('RGB', (512, 512), mock_color)
        
        # 保存文件到AI图片目录
        unique_id = uuid.uuid4()
        file_name = f"cartoon_{unique_id}.png"
        file_path = f"{ai_photos_dir}/{file_name}"
        image.save(file_path)
        
        # 返回相对路径
        return type('MockResponse', (), {
            'status_code': 200,
            'output': type('Output', (), {
                'results': [type('Result', (), {
                    'url': f"/ai-photos/{file_name}"
                })()]
            })()
        })()

    # 如果是本地URL，下载并缓存到AI服务器，返回8080端口URL  
    if base_image_url and (base_image_url.startswith('http://localhost:') or base_image_url.startswith('http://127.0.0.1:')):
        print(f"本地图片URL detected: {base_image_url}, 正在下载并缓存...")
        
        try:
            # 下载原始图片
            response = requests.get(base_image_url, timeout=30)
            response.raise_for_status()
            
            # 生成唯一文件名
            unique_id = uuid.uuid4()
            file_extension = ".jpg"
            file_name = f"original_{unique_id}{file_extension}"
            
            # 保存到缓存目录
            cache_dir = "../original-photos-cache"
            os.makedirs(cache_dir, exist_ok=True)
            file_path = os.path.join(cache_dir, file_name)
            
            with open(file_path, "wb") as f:
                f.write(response.content)
            
            # 返回8080端口可访问的URL
            public_url = f"http://us.liyao.space:8080/original-images/{file_name}"
            print(f"AI服务器图片URL: {public_url}")
            base_image_url = public_url
            
        except Exception as e:
            print(f"下载原始图片失败: {e}, 使用原始URL")
            # 如果下载失败，还是尝试直接替换
            base_image_url = base_image_url.replace('http://localhost:', 'http://us.liyao.space:').replace('http://127.0.0.1:', 'http://us.liyao.space:')

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
        watermark=True,
        negative_prompt=""
    )

    if response.status_code == 200:
        print(json.dumps(response, ensure_ascii=False))
        print(response["output"]["choices"][0]["message"]["content"][0]["image"])
        return response
    else:
        print(f"错误码：{response.code}")
        print(f"错误信息：{response.message}")
        print("请参考文档：https://help.aliyun.com/zh/model-studio/developer-reference/error-code")
        raise Exception(f"HTTP返回码：{response.status_code}")
    
def call_tongyi_wanxiang_video_flash(prompt: str, base_image_url: str = None, n: int = 1, api_key: str = None) -> VideoSynthesisResponse:
    if api_key is None:
        api_key = os.getenv("DASHSCOPE_API_KEY")
        if api_key is None:
            raise ValueError("DASHSCOPE_API_KEY environment variable not set.")

    rsp = VideoSynthesis.async_call(api_key=api_key,
                                    model='wan2.2-i2v-flash',
                                    prompt=prompt,
                                    resolution="480P",
                                    img_url=base_image_url)

    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
        print("task_id: %s" % rsp.output.task_id)
    else:
        raise Exception('Failed, status_code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))

    status = VideoSynthesis.fetch(rsp, api_key=api_key)
    if status.status_code == HTTPStatus.OK:
        print(status.output.task_status)
    else:
        raise Exception('Failed, status_code: %s, code: %s, message: %s' %
              (status.status_code, status.code, status.message))

    rsp = VideoSynthesis.wait(rsp, api_key=api_key)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
        print(rsp.output.video_url)
    else:
        raise Exception('Failed, status_code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))
    
    return rsp