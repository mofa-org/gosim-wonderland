import os
from http import HTTPStatus
from dashscope import ImageSynthesis, MultiModalConversation, VideoSynthesis
from dashscope.api_entities.dashscope_response import ImageSynthesisResponse, VideoSynthesisResponse
import requests
import pathlib
import json

def call_tongyi_wanxiang(prompt: str, base_image_url: str = None, n: int = 1, api_key: str = None) -> list[str]:
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
    list_of_results = []
    for result in rsp.output.results:
        list_of_results.append(result.url)
        
    return list_of_results

def call_tongyi_qianwen_image_edit(prompt: str, base_image_url: str = None, n: int = 1, api_key: str = None) -> list[str]:
    if api_key is None:
        api_key = os.getenv("DASHSCOPE_API_KEY")
        if api_key is None:
            raise ValueError("DASHSCOPE_API_KEY environment variable not set.")

    messages = [
        {
            "role": "user",
            "content": [
                {"image": base_image_url},
                {"text": prompt}
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
        list_of_results = []
        list_of_results.append(response["output"]["choices"][0]["message"]["content"][0]["image"])
        return list_of_results
    else:
        print(f"错误码：{response.code}")
        print(f"错误信息：{response.message}")
        print("请参考文档：https://help.aliyun.com/zh/model-studio/developer-reference/error-code")
        raise Exception(f"HTTP返回码：{response.status_code}")
    
def call_tongyi_wanxiang_video_flash(prompt: str, base_image_url: str = None, n: int = 1, api_key: str = None) -> list[str]:
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
    
    return list(rsp.output.video_url)