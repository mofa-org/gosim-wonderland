#!/usr/bin/env python3
"""
Vidu API 完整测试脚本
测试图像生成、任务查询和状态监控
"""

import os
import sys
import time
import requests
import json
from pathlib import Path
from dotenv import load_dotenv

def test_vidu_api():
    """测试Vidu API完整流程"""
    
    # 加载环境变量
    load_dotenv()
    api_key = os.getenv("VIDU_API_KEY")
    
    if not api_key:
        print("❌ VIDU_API_KEY 未配置")
        sys.exit(1)
    
    print("🧪 Vidu API 完整测试")
    print("=" * 50)
    print(f"🔑 API Key: {api_key[:20]}...")
    
    # 测试图片URL列表
    test_images = [
        "https://picsum.photos/512/512",
        "https://picsum.photos/400/600", 
        "https://via.placeholder.com/512x512/FF6B6B/FFFFFF?text=Test"
    ]
    
    # 测试prompts
    test_prompts = [
        # 基础英文测试
        "cartoon style, professional programmer at tech conference",
        
        # 中文测试
        "卡通风格，GOSIM开发者大会风格，杭州科技氛围，开源精神体现",
        
        # 混合测试
        "Transform into cartoon style for GOSIM developer conference, 专业程序员形象，现代简洁设计"
    ]
    
    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": "application/json"
    }
    
    # 测试不同的配置组合
    for i, (image_url, prompt) in enumerate(zip(test_images, test_prompts), 1):
        print(f"\n🎨 测试 {i}/{len(test_prompts)}")
        print(f"📷 图片: {image_url}")
        print(f"📝 Prompt: {prompt[:60]}...")
        
        # 构建请求payload
        payload = {
            "model": "viduq1",
            "images": [image_url],
            "prompt": prompt,
            "aspect_ratio": "1:1"
        }
        
        try:
            print("\n🚀 创建生成任务...")
            
            # 创建任务
            response = requests.post(
                "https://api.vidu.com/ent/v2/reference2image",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            print(f"📊 响应状态: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                task_id = result.get("task_id")
                state = result.get("state")
                credits = result.get("credits")
                
                print(f"✅ 任务创建成功!")
                print(f"🆔 Task ID: {task_id}")
                print(f"📊 状态: {state}")
                print(f"💰 消耗积分: {credits}")
                print(f"📄 完整响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
                
                # 尝试查询任务状态
                print(f"\n🔍 查询任务状态...")
                query_task_status(headers, task_id)
                
            else:
                print(f"❌ 任务创建失败: {response.status_code}")
                print(f"📄 错误响应: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ 网络请求异常: {e}")
        except Exception as e:
            print(f"❌ 其他异常: {e}")
        
        print("-" * 50)

def query_task_status(headers, task_id):
    """尝试不同的方式查询任务状态"""
    
    # 可能的查询API路径
    possible_endpoints = [
        f"https://api.vidu.com/ent/v1/get/{task_id}",
        f"https://api.vidu.com/ent/v2/get/{task_id}",
        f"https://api.vidu.com/ent/v1/generation/{task_id}",
        f"https://api.vidu.com/ent/v2/generation/{task_id}",
        f"https://api.vidu.com/ent/v1/task/{task_id}",
        f"https://api.vidu.com/ent/v2/task/{task_id}"
    ]
    
    for endpoint in possible_endpoints:
        try:
            print(f"🔍 尝试查询: {endpoint}")
            response = requests.get(endpoint, headers=headers, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ 查询成功!")
                print(f"📄 任务状态: {json.dumps(result, indent=2, ensure_ascii=False)}")
                return result
            elif response.status_code == 404:
                print(f"⚠️ 端点不存在 (404)")
            else:
                print(f"❌ 查询失败: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ 查询异常: {e}")
    
    print("❌ 所有查询端点都失败了")
    return None

def test_account_info():
    """测试账户信息查询"""
    load_dotenv()
    api_key = os.getenv("VIDU_API_KEY")
    
    if not api_key:
        return
    
    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": "application/json"
    }
    
    print("\n💳 测试账户信息查询...")
    
    # 可能的账户信息端点
    account_endpoints = [
        "https://api.vidu.com/ent/v1/account",
        "https://api.vidu.com/ent/v2/account",
        "https://api.vidu.com/ent/v1/user",
        "https://api.vidu.com/ent/v2/user",
        "https://api.vidu.com/ent/v1/info",
        "https://api.vidu.com/ent/v2/info"
    ]
    
    for endpoint in account_endpoints:
        try:
            print(f"🔍 尝试账户查询: {endpoint}")
            response = requests.get(endpoint, headers=headers, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ 账户查询成功!")
                print(f"📄 账户信息: {json.dumps(result, indent=2, ensure_ascii=False)}")
                return result
            elif response.status_code == 404:
                print(f"⚠️ 端点不存在 (404)")
            else:
                print(f"❌ 查询失败: {response.status_code}")
                
        except Exception as e:
            print(f"❌ 查询异常: {e}")

if __name__ == "__main__":
    # 测试API功能
    test_vidu_api()
    
    # 测试账户信息
    test_account_info()
    
    print("\n🎉 Vidu API 测试完成!")
    print("\n💡 总结:")
    print("- 如果任务创建成功，说明API key有效且有足够积分")
    print("- 如果查询失败，可能需要等待处理完成或使用回调机制")
    print("- Vidu是异步API，通常需要轮询或回调获取最终结果")