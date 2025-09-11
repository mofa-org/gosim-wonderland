import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


user_input = "把图片变成丁丁历险记风"

prompt = f"You are an expert in image generation. This is a prompt from user with 0 knowledge of image generation: {user_input}. Provide a extended prompt that is more detailed and accurate for image generation. Your answer should be ONLY the ready-to-use prompt, and is returned in Chinese"

client = OpenAI(
    # 若没有配置环境变量，请用阿里云百炼API Key将下行替换为：api_key="sk-xxx",
    api_key=os.getenv("DASHSCOPE_API_KEY"),  
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
)

completion = client.chat.completions.create(
    model="deepseek-v3.1",  # 此处以 deepseek-v3.1 为例，可按需更换模型名称。
    messages=[
        {'role': 'user', 'content': prompt}
    ]
)

# 判断是否有reasoning_content
# deepseek-v3.1默认不输出思考过程。如需输出思考过程，请参见流式输出的代码。
if hasattr(completion.choices[0].message, 'reasoning_content'):
    print("思考过程：")
    print(completion.choices[0].message.reasoning_content)

print("最终答案：")
print(completion.choices[0].message.content)