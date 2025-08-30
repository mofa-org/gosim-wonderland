from pydantic import BaseModel, Field
from typing import Optional

class ImageGenerationRequest(BaseModel):
    model_name: str = Field(
        ...,
        description="The name of the model to use for image generation, as registered in the registry.",
        examples=["wanx2.1-imageedit"]
    )
    prompt: str = Field(
        ...,
        description="The text prompt to generate the image from."
    )
    base_image_url: Optional[str] = Field(
        default=None,
        description="Optional URL of a base image for edit or stylization tasks."
    )
    n: int = Field(
        default=1,
        description="The number of images to generate."
    )
