#!/usr/bin/env python3
"""
Gemini 2.5 Flash 图像生成测试脚本
测试中文prompt和卡通风格生成效果
"""

import os
import sys
from pathlib import Path
from PIL import Image
from io import BytesIO

# 检查是否安装了必要的包
try:
    from google import genai
except ImportError:
    print("❌ 需要安装 google-genai 包")
    print("运行: pip install google-genai")
    sys.exit(1)

def test_gemini_generation():
    """测试Gemini图像生成功能"""
    
    # 设置API密钥
    api_key = "AIzaSyACQ4JC69ixCVb0zmo1M8FQBaSR91ufes8"
    
    try:
        # 初始化客户端
        print("🚀 初始化Gemini客户端...")
        client = genai.Client(api_key=api_key)
        
        # 测试用的图片路径
        test_image_path = None
        
        # 寻找测试图片
        possible_images = [
            "original-photos/",
            "ai-photos/",
            "../original-photos/",
            "../ai-photos/"
        ]
        
        for img_dir in possible_images:
            if os.path.exists(img_dir):
                image_files = list(Path(img_dir).glob("*.jpg")) + list(Path(img_dir).glob("*.png"))
                if image_files:
                    test_image_path = str(image_files[0])
                    break
        
        if not test_image_path:
            print("❌ 未找到测试图片，请确保original-photos或ai-photos目录中有图片")
            return
            
        print(f"📷 使用测试图片: {test_image_path}")
        
        # 加载图片
        try:
            image = Image.open(test_image_path)
            print(f"✅ 图片加载成功，尺寸: {image.size}")
        except Exception as e:
            print(f"❌ 图片加载失败: {e}")
            return
        
        # 测试多个prompt
        test_prompts = [
            # 英文基础测试
            "Convert this photo to cartoon style",
            
            # 中文基础测试  
            "将这张照片转换为卡通风格",
            
            # GOSIM风格测试（英文）
            "Convert to cartoon style, GOSIM developer conference style, modern tech atmosphere, professional programmer image",
            
            # GOSIM风格测试（中文）
            "卡通风格，GOSIM开发者大会风格，杭州科技氛围，开源精神体现，现代简洁设计，专业程序员形象，科技感十足",
            
            # 复合测试
            "Transform into cartoon style for GOSIM developer conference, 卡通风格，适合技术大会展示，保持专业感"
        ]
        
        for i, prompt in enumerate(test_prompts, 1):
            print(f"\n🎨 测试 {i}/{len(test_prompts)}: {prompt[:50]}...")
            
            try:
                # 调用Gemini API
                response = client.models.generate_content(
                    model="gemini-2.5-flash-image-preview",
                    contents=[prompt, image],
                )
                
                # 处理响应
                generated_count = 0
                text_responses = []
                
                for part in response.candidates[0].content.parts:
                    if part.text is not None:
                        text_responses.append(part.text)
                        print(f"📝 文字响应: {part.text[:100]}...")
                    elif part.inline_data is not None:
                        # 保存生成的图片
                        generated_image = Image.open(BytesIO(part.inline_data.data))
                        output_path = f"gemini_test_{i}.png"
                        generated_image.save(output_path)
                        generated_count += 1
                        print(f"✅ 图片已保存: {output_path} (尺寸: {generated_image.size})")
                
                if generated_count == 0 and not text_responses:
                    print("⚠️ 没有生成任何内容")
                elif generated_count == 0:
                    print("ℹ️ 只返回了文字，没有生成图片")
                    
            except Exception as e:
                print(f"❌ 生成失败: {e}")
                continue
                
            print("-" * 50)
        
        print("\n🎉 测试完成！")
        print("📁 生成的图片文件: gemini_test_*.png")
        
    except Exception as e:
        print(f"❌ 测试过程中出错: {e}")

if __name__ == "__main__":
    print("🧪 Gemini 2.5 Flash 图像生成测试")
    print("=" * 50)
    test_gemini_generation()