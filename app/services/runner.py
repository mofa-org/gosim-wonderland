import os
import requests
import uuid
from app.services.registry import get_runner
from openai import OpenAI

OUTPUTS_DIR = "outputs"

def ensure_outputs_dir(model_name: str):
    """Ensures the outputs directory exists."""
    os.makedirs(os.path.join(OUTPUTS_DIR, model_name), exist_ok=True)

def save_image_from_url(url: str, file_name: str, model_name: str) -> str:
    """Downloads an image from a URL and saves it locally."""
    ensure_outputs_dir(model_name)
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    file_path = os.path.join(os.path.join(OUTPUTS_DIR, model_name), file_name)
    with open(file_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
            
    return file_path

def generate_image(model_name: str, prompt: str, base_image_url: str = None, n: int = 1) -> list[str]:
    # Set runner
    runner_func = get_runner(model_name)
    
    user_input = prompt

    txt_generator_prompt = f"""You are an expert prompt engineer for an advanced image generation AI. Your task is to analyze a user's simple, initial prompt, infer the user's intent regarding a provided image, and then transform that prompt into a detailed, rich, and effective prompt for the image AI to execute.

        **Your First and Most Important Step: Analyze the [Initial User Prompt] to determine the implied content type of the reference image.**

        1.  Read the prompt carefully.
        2.  **If the prompt contains keywords referring to people** (like "my photo," "this picture," "my selfie," "make me look like," "change the style," "group photo"), you must assume the task is to **re-style a photo of a person/people (Path A)**.
        3.  **If the prompt refers to text or a document** (like "illustrate this script," "a character for these words," "put this in a scene"), you must assume the task is to **create a scene featuring the text from the image (Path B)**.
        4.  **If the prompt is ambiguous** (e.g., "make it cyberpunk," "fantasy style"), you must **default to the 'Photo' instructions (Path A)**.

        After determining the intent, follow the appropriate instructions below. You will also have access to the actual text content extracted from the image if you follow Path B.

        ---

        **Path A: Instructions for 'Photo' Intent (or as Default)**

        Your goal is to **re-style the entire scene in the reference photo**, preserving its core composition and all recognizable subjects, whether they are people, objects, or landscapes.

        1.  **Elaborate on the style** requested in the [Initial User Prompt]. Expand on it with rich, descriptive keywords about artistic medium, style, lighting, and color.
        2.  **Crucially, add commands to preserve the fundamental structure of the original image.** The new prompt must explicitly instruct the image AI to maintain:
            *   **Overall Composition:** The layout, framing, and relative positions of all foreground, mid-ground, and background elements must be kept the same.
            *   **Recognizable Subjects:** Any key subjects (which could be people, animals, buildings, or objects) must retain their form, location, and orientation within the scene.
            *   **If People are Present:** For any individuals in the photo, it is absolutely essential to maintain their exact facial identity, features, expression, pose, and clothing, translating their likeness into the new style.
        3.  **Combine everything** into a cohesive, descriptive paragraph that clearly directs the AI to apply a new style to the existing scene without changing its content or layout.

        **Example for 'Photo' Intent (Scene with People):**
        *   `[Initial User Prompt]`: "make this photo look like a Studio Ghibli movie"
        *   **Your Inferred Intent:** Photo
        *   **Your Generated Prompt should be like:**
            > Redraw the entire scene from the reference photo in the enchanting and nostalgic art style of a Studio Ghibli anime film. The style should feature lush, watercolor-style backgrounds, soft, warm lighting, and a gentle, hand-drawn feel. It is essential to maintain the original composition of the image, including the placement of all characters and background elements. The exact facial identities, poses, and clothing of all people must be preserved, translating their likenesses faithfully into the Ghibli anime style.

        **Example for 'Photo' Intent (Landscape without People):**
        *   `[Initial User Prompt]`: "turn this into a moody oil painting"
        *   **Your Inferred Intent:** Photo
        *   **Your Generated Prompt should be like:**
            > Recreate the landscape from the reference photo as a moody, atmospheric oil painting in the style of the old masters. Use thick, textured brushstrokes, a dark and dramatic color palette, and cinematic lighting that emphasizes deep shadows and stark highlights. The fundamental composition of the scene, including the position of the mountains, trees, and river, must be perfectly preserved.

        ---

        **Path B: Instructions for 'Text/Script' Intent**

        Your goal is to **create a new scene where a character presents the text from the reference image.**

        1.  **Analyze the [Initial User Prompt]** to see if a specific character is described (e.g., "a wizard," "a news anchor"). If no character is described, invent one that is thematically appropriate for the text (e.g., a scholar for a historical document, a robot for a futuristic script).
        2.  **Describe the character and the surrounding scene.** Detail their appearance, clothing, expression, and the background that complements the theme.
        3.  **Prioritize Text Clarity and Accuracy Above All Else.** This is the most critical instruction. The generated prompt must heavily emphasize that the text from the reference image is the primary subject.
            *   The text must be rendered with **perfect accuracy, spelling, and grammar**, identical to the source.
            *   Instruct the AI to use **sharp, high-contrast, clean typography** to ensure it is **perfectly legible**.
            *   Include explicit commands to **avoid common text errors**, such as "no blurry text, no distorted letters, no spelling mistakes."
            *   The object displaying the text (e.g., a scroll, screen, book) should be the **central and dominant element** of the composition. It must occupy at least 80% of the image.
        4.  **Combine everything** into a descriptive paragraph that emphasizes the visual prominence and perfect clarity of the text.

        **Example for 'Text/Script' Intent:**
        *   `[Initial User Prompt]`: "make this look like a fantasy prophecy"
        *   **(You would also be provided the text from the image, e.g., "When the twin moons align, the forgotten king shall return.")**
        *   **Your Inferred Intent:** Text/Script
        *   **Your Generated Prompt should be like:**
            > A dramatic close-up shot focusing on an ancient scroll, the central element of the image. The text 'When the twin moons align, the forgotten king shall return' is written in sharp, high-contrast, elegant calligraphy. The text must be perfectly legible, with no blurry letters, no distortion, and no spelling errors. The scroll is held by the hands of a partially visible scribe in a dimly lit library.

        ---

        Now, analyze the following user prompt and generate the new, detailed prompt. Only return the prompt, do not include any other text. The prompt should be returned in Chinese.

        **[Initial User Prompt]:** {user_input}"""

    client = OpenAI(
        # 若没有配置环境变量，请用阿里云百炼API Key将下行替换为：api_key="sk-xxx",
        api_key=os.getenv("DASHSCOPE_API_KEY"),  
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
    )

    completion = client.chat.completions.create(
        model="deepseek-v3.1",  # 此处以 deepseek-v3.1 为例，可按需更换模型名称。
        messages=[
            {'role': 'user', 'content': txt_generator_prompt}
        ]
    )
    
    txt_generator_result = completion.choices[0].message.content
    print(f"txt_generator_result: {txt_generator_result}")
    # Execute runner
    response = runner_func(
        prompt=txt_generator_result,
        base_image_url=base_image_url,
        n=n
    )
    
    # Save the images
    saved_files = []
    if response:
        for i, result in enumerate(response):
            if result:
                unique_id = uuid.uuid4()
                file_name = f"{model_name}_{unique_id}_{user_input}_{i}.png"
                try:
                    saved_path = save_image_from_url(result, file_name, model_name)
                    saved_files.append(saved_path)
                except Exception as e:
                    print(f"Error saving image from {result}: {e}")

    return saved_files
