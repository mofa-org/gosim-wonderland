# coding:utf-8
from __future__ import print_function

from volcengine.visual.VisualService import VisualService
import os
from dotenv import load_dotenv

load_dotenv()

if __name__ == '__main__':
    visual_service = VisualService()

    # call below method if you don't set ak and sk in $HOME/.volc/config
    visual_service.set_ak(os.getenv("VOLCENG_AK"))
    visual_service.set_sk(os.getenv("VOLCENG_SK"))
    
    # 请求Body(查看接口文档请求参数-请求示例，将请求参数内容复制到此)
    form = {
        "req_key": "jimeng_i2i_v30",
        "image_urls": [
            "https://media.themoviedb.org/t/p/w235_and_h235_face/wVsQG1eNFFmCI3HTaje4Rox8SFA.jpg"
        ],
        "prompt": "背景换成演唱会现场",
        "seed": -1,
        "scale": 0.5
    }

    resp = visual_service.cv_submit_task(form)
    print(resp)