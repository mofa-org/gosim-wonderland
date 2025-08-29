from fastapi import FastAPI, HTTPException
from app.models.requests import ImageGenerationRequest
from app.services.runner import generate_image
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Model Runner API",
    description="API for running various image generation models.",
    version="0.1.0",
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Model Runner API"}

@app.post("/generate-image/")
def create_generation_task(request: ImageGenerationRequest):
    """
    Accepts an image generation request, runs the specified model,
    and returns the paths to the generated images.
    """

    try:
        image_paths = generate_image(
            model_name=request.model_name,
            prompt=request.prompt,
            base_image_url=request.base_image_url,
            n=request.n
        )
        if not image_paths:
            raise HTTPException(
                status_code=500,
                detail="Image generation failed. No images were produced."
            )
        return {"status": "success", "image_paths": image_paths}
    except ValueError as e:
        # This is for model not found errors from the registry
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # General exception for API failures or other issues
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

@app.get("/healthz")
def healthz():
    return {"ok": True}