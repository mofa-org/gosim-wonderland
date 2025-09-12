#!/usr/bin/env python3
"""
测试Gemini 2.5 Flash的prompt优化功能
"""

import os
from dotenv import load_dotenv

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("❌ 需要安装 google-genai 包")
    print("运行: pip install google-genai")
    exit(1)

def test_prompt_optimization():
    """测试prompt优化功能"""
    
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("❌ GEMINI_API_KEY 未配置")
        return
    
    print("🧪 Gemini 2.5 Flash Prompt 优化测试")
    print("=" * 60)
    
    # 测试用的原始prompts
    test_prompts = [
        "生成可爱的卡通形象",
        "程序员头像",
        "杭州开发者",
        "GOSIM大会参与者",
        "科技感十足的程序员卡通形象，体现开源精神"
    ]
    
    client = genai.Client(api_key=api_key)
    
    for i, original_prompt in enumerate(test_prompts, 1):
        print(f"\n🎨 测试 {i}/{len(test_prompts)}")
        print(f"📝 原始prompt: {original_prompt}")
        
        try:
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
                print(f"✅ 优化成功!")
                print(f"🎯 优化后prompt: {optimized_prompt}")
                print(f"📏 长度: {len(optimized_prompt)} 字符")
            else:
                print("❌ 优化失败: 没有返回结果")
                
        except Exception as e:
            print(f"❌ 优化异常: {e}")
        
        print("-" * 60)
    
    print("\n🎉 Prompt优化测试完成!")

if __name__ == "__main__":
    test_prompt_optimization()