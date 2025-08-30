# Model Runner API

This project is a FastAPI-based server for running various image generation models.

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd model-runner-api
    ```

2.  **Create a virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure environment variables:**
    Create a `.env` file in the project root and add your API key:
    ```
    DASHSCOPE_API_KEY="your_api_key_here"
    ```

## Running the Server

To run the application, use uvicorn:
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.
