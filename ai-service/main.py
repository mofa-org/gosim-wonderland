from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import base64
import httpx
from PIL import Image
import io
from typing import Optional
from pydantic import BaseModel
from dotenv import load_dotenv
import openai

load_dotenv()

app = FastAPI(title="GOSIM Wonderland AI Service", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAI client
openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ProcessImageRequest(BaseModel):
    image_base64: str
    caption: Optional[str] = None
    user_session: Optional[str] = None

class ProcessImageResponse(BaseModel):
    success: bool
    cartoon_image_url: Optional[str] = None
    error: Optional[str] = None
    processing_id: str

def optimize_image(image_data: bytes, max_size: int = 1024) -> bytes:
    """优化图片大小和质量"""
    try:
        image = Image.open(io.BytesIO(image_data))
        
        # 转换为RGB（如果是RGBA）
        if image.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        
        # 调整大小
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        # 保存为JPEG
        output = io.BytesIO()
        image.save(output, format='JPEG', quality=85, optimize=True)
        return output.getvalue()
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"图片处理失败: {str(e)}")

async def analyze_image_with_gpt4(image_base64: str, user_caption: Optional[str]) -> str:
    """使用GPT-4 Vision分析图片特征"""
    try:
        # 构建prompt
        base_prompt = "请详细描述这张照片中人物的特征，包括：面部特征、发型、表情、姿势、服装等。用英文回答，控制在100词以内。"
        
        if user_caption:
            base_prompt = f"{base_prompt}\n\n用户补充说明：{user_caption}\n请结合用户的描述生成更准确的特征描述。"
        
        messages = [
            {
                "role": "user", 
                "content": [
                    {
                        "type": "text",
                        "text": base_prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_base64}"
                        }
                    }
                ]
            }
        ]
        
        response = await openai_client.chat.completions.acreate(
            model="gpt-4-vision-preview",
            messages=messages,
            max_tokens=150
        )
        
        return response.choices[0].message.content or "a person"
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"图片分析失败: {str(e)}")

async def generate_cartoon_with_dalle(description: str, user_caption: Optional[str]) -> str:
    """使用DALL-E 3生成卡通图像"""
    try:
        # 构建生成prompt
        base_style_prompt = """Create a cute cartoon avatar in GOSIM style based on: {description}. 

Style requirements:
- Bright pastel colors (macaroon color palette)
- Simplified but adorable cartoon style  
- Clean lines and cute proportions
- Maintain the person's key facial features and expression
- Simple solid color background
- High quality, professional cartoon illustration"""

        if user_caption:
            base_style_prompt += f"\n\nUser's personalization request: {user_caption}\nPlease incorporate these preferences while maintaining the GOSIM cartoon style."
        
        prompt = base_style_prompt.format(description=description)
        
        response = await openai_client.images.agenerate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024", 
            quality="standard",
            n=1
        )
        
        image_url = response.data[0].url
        if not image_url:
            raise HTTPException(status_code=500, detail="未能生成图像")
            
        return image_url
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"图像生成失败: {str(e)}")

@app.get("/")
async def root():
    return {"message": "GOSIM Wonderland AI Service", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-service"}

@app.post("/process-image", response_model=ProcessImageResponse)
async def process_image(
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    user_session: Optional[str] = Form(None)
):
    """处理图片生成卡通头像"""
    
    # 验证文件类型
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="请上传图片文件")
    
    # 验证文件大小 (10MB)
    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="图片文件过大，请选择小于10MB的图片")
    
    try:
        # 读取文件数据
        image_data = await file.read()
        
        # 优化图片
        optimized_image = optimize_image(image_data)
        
        # 转换为base64
        image_base64 = base64.b64encode(optimized_image).decode('utf-8')
        
        # 第一步：分析图片特征
        description = await analyze_image_with_gpt4(image_base64, caption)
        
        # 第二步：生成卡通图像
        cartoon_url = await generate_cartoon_with_dalle(description, caption)
        
        return ProcessImageResponse(
            success=True,
            cartoon_image_url=cartoon_url,
            processing_id=user_session or "default"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        return ProcessImageResponse(
            success=False,
            error=f"处理失败: {str(e)}",
            processing_id=user_session or "default"
        )

@app.post("/process-image-base64", response_model=ProcessImageResponse) 
async def process_image_base64(request: ProcessImageRequest):
    """处理base64图片数据"""
    
    try:
        # 解码base64图片
        try:
            # 处理data URL格式
            if request.image_base64.startswith('data:image'):
                image_base64 = request.image_base64.split(',')[1]
            else:
                image_base64 = request.image_base64
                
            image_data = base64.b64decode(image_base64)
        except Exception:
            raise HTTPException(status_code=400, detail="无效的图片数据")
        
        # 优化图片
        optimized_image = optimize_image(image_data)
        
        # 转换为base64
        optimized_base64 = base64.b64encode(optimized_image).decode('utf-8')
        
        # 第一步：分析图片特征  
        description = await analyze_image_with_gpt4(optimized_base64, request.caption)
        
        # 第二步：生成卡通图像
        cartoon_url = await generate_cartoon_with_dalle(description, request.caption)
        
        return ProcessImageResponse(
            success=True,
            cartoon_image_url=cartoon_url,
            processing_id=request.user_session or "default"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        return ProcessImageResponse(
            success=False,
            error=f"处理失败: {str(e)}",
            processing_id=request.user_session or "default"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)