#!/bin/bash

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Check for .env file
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. Please create one based on .env.example"
    exit 1
fi

# Start the server
echo "Starting AI service on port 8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload