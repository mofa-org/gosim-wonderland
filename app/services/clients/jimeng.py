from __future__ import print_function

import os
from volcengine import visual
from volcengine.visual.VisualService import VisualService

def call_jimeng_image_edit(prompt: str, base_image_url: str = None, n: int = 1, jimeng_ak: str = None, jimeng_sk: str = None) -> str:
    if jimeng_ak is None:
        jimeng_ak = os.getenv("VOLCENG_AK")
        if jimeng_ak is None:
            raise ValueError("VOLCENG_AK environment variable not set.")
    if jimeng_sk is None:
        jimeng_sk = os.getenv("VOLCENG_SK")
        if jimeng_sk is None:
            raise ValueError("VOLCENG_SK environment variable not set.")
        
    visual_service = VisualService()
    
    visual_service.set_ak(jimeng_ak)
    visual_service.set_sk(jimeng_sk)
    print("visual service set")
    print(f"ak: {jimeng_ak}, sk: {jimeng_sk}")
    form_request = {
        "req_key": "jimeng_i2i_v30",
        "image_urls": [
            base_image_url
        ],
        "prompt": prompt,
        "seed": -1,
        "scale": 0.5
    }
    
    resp = visual_service.cv_submit_task(form_request)
    print(resp)
    print("task submitted")
    form_respond = {
        "req_key": "jimeng_i2i_v30",
        "task_id": resp["data"]["task_id"]
    }

    resp = visual_service.cv_get_result(form_respond)
    print("task result received")
    print(resp)
    print(type(resp))
    return resp