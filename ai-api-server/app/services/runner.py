import os
import requests
import uuid
from app.services.registry import get_runner

OUTPUTS_DIR = "../ai-photos"

def ensure_outputs_dir(model_name: str):
    """Ensures the outputs directory exists."""
    os.makedirs(OUTPUTS_DIR, exist_ok=True)

def save_image_from_url(url: str, file_name: str, model_name: str) -> str:
    """Downloads an image from a URL and saves it locally."""
    ensure_outputs_dir(model_name)
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    # 保存到共享uploads目录，文件名加上model前缀
    prefixed_name = f"cartoon_{file_name}"
    file_path = os.path.join(OUTPUTS_DIR, prefixed_name)
    with open(file_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
            
    return f"/ai-photos/{prefixed_name}"

def generate_image(model_name: str, prompt: str, base_image_url: str = None, n: int = 1) -> list[str]:
    # Set runner
    runner_func = get_runner(model_name)
    
    # Execute runner
    response = runner_func(
        prompt=prompt,
        base_image_url=base_image_url,
        n=n
    )
    
    # Save the images
    saved_files = []
    if response and response.output and response.output.results:
        for i, result in enumerate(response.output.results):
            if result.url:
                # Handle both mock mode and real API responses
                if result.url.startswith('/ai-photos/'):
                    # Mock mode already saved file, returns relative path
                    saved_files.append(result.url)
                elif result.url.startswith('/uploads/'):
                    # Legacy path format
                    saved_files.append(result.url)
                elif result.url.startswith('data:'):
                    # Old mock mode data URLs - not used anymore
                    saved_files.append(result.url)
                else:
                    # Real API URL - download and save
                    unique_id = uuid.uuid4()
                    file_name = f"{model_name}_{unique_id}_{i}.png"
                    try:
                        saved_path = save_image_from_url(result.url, file_name, model_name)
                        saved_files.append(saved_path)
                    except Exception as e:
                        print(f"Error saving image from {result.url}: {e}")

    return saved_files
