from typing import Callable, Dict
from app.services.clients.tongyi import call_tongyi_wanxiang
from app.services.clients.tongyi import call_tongyi_qianwen_image_edit
from app.services.clients.tongyi import call_tongyi_wanxiang_video_flash

# The RunnerFunc is a callable that takes a prompt and other optional args
# and returns a response object. This is a flexible signature.
RunnerFunc = Callable[..., object]

# REGISTRY maps a model name to the function that runs it.
REGISTRY: Dict[str, RunnerFunc] = {
    "wanx2.1-imageedit": call_tongyi_wanxiang,
    "qwen-image-edit": call_tongyi_qianwen_image_edit,
    "wan2.2-i2v-flash": call_tongyi_wanxiang_video_flash,
}

def get_runner(model_name: str) -> RunnerFunc:
    """
    Retrieves the runner function for a given model name from the registry.
    """
    if model_name not in REGISTRY:
        raise ValueError(f"Model '{model_name}' not found in registry.")
    return REGISTRY[model_name]
